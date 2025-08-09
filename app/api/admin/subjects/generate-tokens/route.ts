import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { tokenService } from '@/lib/services/token.service';
import { maskToken } from '@/lib/utils/tokens';
import { z } from 'zod';

// Rate limiting para generación de tokens
const tokenLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minuto
  const maxRequests = 10; // 10 generaciones por minuto

  const record = tokenLimiter.get(userId);

  if (!record || now > record.resetTime) {
    tokenLimiter.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Schema de validación
const generateTokensSchema = z.object({
  subjectIds: z
    .array(z.string().uuid())
    .min(1, 'Se requiere al menos un sujeto'),
  expiryDays: z.number().min(1).max(365).optional().default(30),
  rotateExisting: z.boolean().optional().default(false),
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
        event: 'generate_tokens_unauthorized',
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      console.log({
        requestId,
        event: 'generate_tokens_rate_limit',
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Demasiadas solicitudes' },
        { status: 429 }
      );
    }

    // Validar request body
    const body = await request.json();
    const validation = generateTokensSchema.safeParse(body);

    if (!validation.success) {
      console.log({
        requestId,
        event: 'generate_tokens_validation_error',
        errors: validation.error.errors,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { subjectIds, expiryDays, rotateExisting } = validation.data;

    // Verificar que todos los sujetos existen y pertenecen a eventos activos
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select(
        `
        id,
        first_name,
        last_name,
        type,
        events!inner(active)
      `
      )
      .in('id', subjectIds);

    if (subjectsError) {
      console.error({
        requestId,
        event: 'generate_tokens_subjects_error',
        error: subjectsError.message,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Error verificando sujetos' },
        { status: 500 }
      );
    }

    if (!subjects || subjects.length !== subjectIds.length) {
      const foundIds = subjects?.map((s) => s.id) || [];
      const missingIds = subjectIds.filter((id) => !foundIds.includes(id));

      console.log({
        requestId,
        event: 'generate_tokens_subjects_not_found',
        requestedIds: subjectIds.length,
        foundIds: foundIds.length,
        missingIds,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Algunos sujetos no fueron encontrados', missingIds },
        { status: 404 }
      );
    }

    // Verificar eventos activos
    const inactiveSubjects = subjects.filter((s) => !(s.events as any).active);
    if (inactiveSubjects.length > 0) {
      console.log({
        requestId,
        event: 'generate_tokens_inactive_events',
        inactiveCount: inactiveSubjects.length,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        {
          error: 'Algunos sujetos pertenecen a eventos inactivos',
          inactiveSubjects: inactiveSubjects.map((s) => s.id),
        },
        { status: 400 }
      );
    }

    // Generar tokens
    console.log({
      requestId,
      event: 'generate_tokens_start',
      userId: user.id,
      subjectCount: subjectIds.length,
      expiryDays,
      rotateExisting,
      timestamp: new Date().toISOString(),
    });

    const results = await tokenService.generateTokensForSubjects(subjectIds, {
      expiryDays,
      rotateExisting,
    });

    // Preparar respuesta con información de los tokens
    const responseData = Array.from(results.entries()).map(
      ([subjectId, result]) => {
        const subject = subjects.find((s) => s.id === subjectId)!;
        const subjectName = subject.last_name
          ? `${subject.first_name} ${subject.last_name}`
          : subject.first_name;

        return {
          subjectId,
          subjectName,
          token: maskToken(result.token), // NUNCA devolver token completo
          expiresAt: result.expiresAt.toISOString(),
          isNew: result.isNew,
          portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/f/${maskToken(result.token)}`,
        };
      }
    );

    const duration = Date.now() - startTime;

    console.log({
      requestId,
      event: 'generate_tokens_success',
      userId: user.id,
      subjectCount: subjectIds.length,
      successCount: results.size,
      newTokens: responseData.filter((r) => r.isNew).length,
      existingTokens: responseData.filter((r) => !r.isNew).length,
      duration,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `${results.size} tokens generados exitosamente`,
      results: responseData,
      stats: {
        total: subjectIds.length,
        successful: results.size,
        failed: subjectIds.length - results.size,
        newTokens: responseData.filter((r) => r.isNew).length,
        existingTokens: responseData.filter((r) => !r.isNew).length,
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error({
      requestId,
      event: 'generate_tokens_error',
      error: error.message,
      stack: error.stack,
      duration,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Error interno generando tokens' },
      { status: 500 }
    );
  }
}

// Endpoint para obtener información de un token específico (para admin)
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

    if (!subjectId) {
      return NextResponse.json(
        { error: 'Se requiere subjectId' },
        { status: 400 }
      );
    }

    // Obtener información del token
    const { data: tokenInfo } = await supabase
      .from('subject_tokens')
      .select(
        `
        *,
        subjects (
          first_name,
          last_name,
          type,
          events (name, school, date)
        )
      `
      )
      .eq('subject_id', subjectId)
      .single();

    if (!tokenInfo) {
      return NextResponse.json(
        { error: 'Token no encontrado' },
        { status: 404 }
      );
    }

    const subject = tokenInfo.subjects as any;
    const event = subject.events;

    return NextResponse.json({
      subjectId,
      subjectName: subject.last_name
        ? `${subject.first_name} ${subject.last_name}`
        : subject.first_name,
      token: maskToken(tokenInfo.token), // Enmascarado para admin
      expiresAt: tokenInfo.expires_at,
      isExpired: new Date(tokenInfo.expires_at) < new Date(),
      event: {
        name: event.name,
        school: event.school,
        date: event.date,
      },
      portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/f/${maskToken(tokenInfo.token)}`,
    });
  } catch (error: any) {
    console.error({
      requestId,
      event: 'get_token_info_error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Error obteniendo información del token' },
      { status: 500 }
    );
  }
}
