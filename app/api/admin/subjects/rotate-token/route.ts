import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { tokenService } from '@/lib/services/token.service';
import { maskToken } from '@/lib/utils/tokens';
import { z } from 'zod';

// Rate limiting para rotación de tokens
const rotateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 300000; // 5 minutos
  const maxRequests = 5; // 5 rotaciones por 5 minutos

  const record = rotateLimiter.get(userId);

  if (!record || now > record.resetTime) {
    rotateLimiter.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Schema de validación
const rotateTokenSchema = z.object({
  subjectId: z.string().uuid('ID de sujeto inválido'),
  reason: z.string().min(1, 'Se requiere una razón').optional(),
  expiryDays: z.number().min(1).max(365).optional().default(30),
});

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    // Verificar autenticación admin
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log({
        requestId,
        event: 'rotate_token_unauthorized',
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      console.log({
        requestId,
        event: 'rotate_token_rate_limit',
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Demasiadas rotaciones. Espere 5 minutos.' },
        { status: 429 }
      );
    }

    // Validar request body
    const body = await request.json();
    const validation = rotateTokenSchema.safeParse(body);

    if (!validation.success) {
      console.log({
        requestId,
        event: 'rotate_token_validation_error',
        errors: validation.error.errors,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { subjectId, reason, expiryDays } = validation.data;

    // Verificar que el sujeto existe y obtener token anterior
    const { data: existingToken } = await supabase
      .from('subject_tokens')
      .select(
        `
        *,
        subjects (
          first_name,
          last_name,
          type,
          events (name, school, active)
        )
      `
      )
      .eq('subject_id', subjectId)
      .single();

    if (!existingToken) {
      console.log({
        requestId,
        event: 'rotate_token_subject_not_found',
        subjectId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Sujeto no encontrado o sin token' },
        { status: 404 }
      );
    }

    const subject = existingToken.subjects as any;
    const event = subject.events;

    // Verificar que el evento está activo
    if (!event.active) {
      console.log({
        requestId,
        event: 'rotate_token_inactive_event',
        subjectId,
        eventName: event.name,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'No se puede rotar token de evento inactivo' },
        { status: 400 }
      );
    }

    const oldToken = existingToken.token;
    const subjectName = subject.last_name
      ? `${subject.first_name} ${subject.last_name}`
      : subject.first_name;

    // Auditar la rotación
    console.log({
      requestId,
      event: 'rotate_token_start',
      userId: user.id,
      subjectId,
      subjectName,
      oldToken: maskToken(oldToken),
      reason,
      eventName: event.name,
      timestamp: new Date().toISOString(),
    });

    // Generar nuevo token (forzar rotación)
    const result = await tokenService.generateTokenForSubject(subjectId, {
      expiryDays,
      rotateExisting: true,
    });

    const duration = Date.now() - startTime;

    console.log({
      requestId,
      event: 'rotate_token_success',
      userId: user.id,
      subjectId,
      subjectName,
      oldToken: maskToken(oldToken),
      newToken: maskToken(result.token),
      expiresAt: result.expiresAt.toISOString(),
      reason,
      duration,
      timestamp: new Date().toISOString(),
    });

    // Respuesta sin exponer tokens completos
    return NextResponse.json({
      success: true,
      message: `Token rotado exitosamente para ${subjectName}`,
      subject: {
        id: subjectId,
        name: subjectName,
        event: {
          name: event.name,
          school: event.school,
        },
      },
      token: {
        old: maskToken(oldToken),
        new: maskToken(result.token),
        expiresAt: result.expiresAt.toISOString(),
      },
      portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/store-unified/${maskToken(result.token)}`,
      rotatedAt: new Date().toISOString(),
      reason,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error({
      requestId,
      event: 'rotate_token_error',
      error: error.message,
      stack: error.stack,
      duration,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ error: 'Error rotando token' }, { status: 500 });
  }
}

// Endpoint para obtener historial de rotaciones (para auditoría)
export async function GET(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Verificar autenticación admin
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const eventId = searchParams.get('eventId');
    const days = parseInt(searchParams.get('days') || '7');

    if (!subjectId && !eventId) {
      return NextResponse.json(
        { error: 'Se requiere subjectId o eventId' },
        { status: 400 }
      );
    }

    // Esta consulta requeriría una tabla de auditoría para tokens
    // Por ahora retornamos información básica
    let query = supabase.from('subject_tokens').select(`
        subject_id,
        expires_at,
        created_at,
        subjects (
          first_name,
          last_name,
          events (name, school)
        )
      `);

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    if (eventId) {
      query = query.eq('subjects.event_id', eventId);
    }

    // Filtrar por fecha
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    query = query.gte('created_at', fromDate.toISOString());

    const { data: tokens } = await query;

    const history =
      tokens?.map((token) => {
        const subject = token.subjects as any;
        return {
          subjectId: token.subject_id,
          subjectName: subject.last_name
            ? `${subject.first_name} ${subject.last_name}`
            : subject.first_name,
          event: subject.events?.name,
          expiresAt: token.expires_at,
          createdAt: token.created_at,
        };
      }) || [];

    return NextResponse.json({
      history,
      period: `${days} días`,
      total: history.length,
    });
  } catch (error: any) {
    console.error({
      requestId,
      event: 'get_rotation_history_error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Error obteniendo historial' },
      { status: 500 }
    );
  }
}
