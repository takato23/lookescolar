import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { pdfService } from '@/lib/services/pdf.service';
import { z } from 'zod';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { AuthMiddleware, SecurityLogger } from '@/lib/middleware/auth.middleware';

// Rate limiting para generación de PDFs
const pdfLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 300000; // 5 minutos
  const maxRequests = 3; // 3 PDFs por 5 minutos

  const record = pdfLimiter.get(userId);

  if (!record || now > record.resetTime) {
    pdfLimiter.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Schema de validación para opciones de PDF
const pdfOptionsSchema = z.object({
  layout: z.enum(['portrait', 'landscape']).optional().default('portrait'),
  pageSize: z.enum(['A4', 'Letter']).optional().default('A4'),
  qrsPerRow: z.number().min(1).max(6).optional().default(3),
  qrsPerColumn: z.number().min(1).max(8).optional().default(4),
  includeWatermark: z.boolean().optional().default(false),
});

async function handleGET(
  request: NextRequest,
  _authContext: any,
  { params }: { params: { eventId: string } }
) {
  const { eventId } = params;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    // Verificar autenticación admin vía Supabase (redundante pero mantiene compat)
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      SecurityLogger.logSecurityEvent('pdf_generation_unauthorized', { requestId, eventId }, 'warning');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      SecurityLogger.logSecurityEvent('pdf_generation_rate_limit', { requestId, userId: user.id, eventId }, 'warning');
      return NextResponse.json(
        { error: 'Demasiadas generaciones de PDF. Espere 5 minutos.' },
        { status: 429 }
      );
    }

    // Validar UUID del evento
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return NextResponse.json(
        { error: 'ID de evento inválido' },
        { status: 400 }
      );
    }

    // Verificar que el evento existe y está activo
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      SecurityLogger.logSecurityEvent('pdf_generation_event_not_found', { requestId, eventId }, 'warning');
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    if (!event.active) {
      SecurityLogger.logSecurityEvent('pdf_generation_inactive_event', { requestId, eventId, eventName: event.name }, 'warning');
      return NextResponse.json(
        { error: 'El evento no está activo' },
        { status: 400 }
      );
    }

    // Parsear opciones de la query string
    const { searchParams } = new URL(request.url);
    const optionsValidation = pdfOptionsSchema.safeParse({
      layout: searchParams.get('layout') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      qrsPerRow: searchParams.get('qrsPerRow')
        ? parseInt(searchParams.get('qrsPerRow')!)
        : undefined,
      qrsPerColumn: searchParams.get('qrsPerColumn')
        ? parseInt(searchParams.get('qrsPerColumn')!)
        : undefined,
      includeWatermark: searchParams.get('includeWatermark') === 'true',
    });

    if (!optionsValidation.success) {
      SecurityLogger.logSecurityEvent('pdf_generation_options_invalid', { requestId, errors: optionsValidation.error.errors }, 'warning');
      return NextResponse.json(
        {
          error: 'Opciones de PDF inválidas',
          details: optionsValidation.error.errors,
        },
        { status: 400 }
      );
    }

    const options = optionsValidation.data;

    // Verificar que hay sujetos en el evento
    const { data: subjectCount } = await supabase
      .from('subjects')
      .select('id', { count: 'exact' })
      .eq('event_id', eventId);

    if (!subjectCount || subjectCount.length === 0) {
      SecurityLogger.logSecurityEvent('pdf_generation_no_subjects', { requestId, eventId, eventName: event.name }, 'warning');
      return NextResponse.json(
        { error: 'El evento no tiene sujetos registrados' },
        { status: 400 }
      );
    }

    SecurityLogger.logSecurityEvent('pdf_generation_start', { requestId, userId: user.id, eventId, eventName: event.name, subjectCount: subjectCount.length, options }, 'info');

    // Generar PDF
    const pdfBuffer = await pdfService.generateEventQRPDF(eventId, options);
    const duration = Date.now() - startTime;

    SecurityLogger.logSecurityEvent('pdf_generation_success', { requestId, userId: user.id, eventId, eventName: event.name, subjectCount: subjectCount.length, pdfSize: pdfBuffer.length, duration }, 'info');

    // Generar nombre de archivo
    const eventDate = new Date(event.date).toISOString().split('T')[0];
    const filename = `QRs_${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_${eventDate}.pdf`;

    // Responder con el PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;

    SecurityLogger.logSecurityEvent('pdf_generation_error', { requestId, eventId, error: error.message, duration }, 'error');

    // Error específico para PDFs demasiado grandes
    if (
      error.message.includes('too large') ||
      error.message.includes('memory')
    ) {
      return NextResponse.json(
        {
          error:
            'El PDF es demasiado grande para generar. Intente con menos QRs por página.',
          suggestion: 'Reduzca qrsPerRow o qrsPerColumn',
        },
        { status: 413 }
      );
    }

    return NextResponse.json(
      { error: 'Error generando PDF de códigos QR' },
      { status: 500 }
    );
  }
}

async function handlePOST(
  request: NextRequest,
  _authContext: any,
  { params }: { params: { eventId: string } }
) {
  const { eventId } = params;
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

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Demasiadas generaciones de PDF. Espere 5 minutos.' },
        { status: 429 }
      );
    }

    // Validar request body
    const body = await request.json();
    const validation = pdfOptionsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Opciones inválidas', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Verificar evento
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (!event || !event.active) {
      return NextResponse.json(
        { error: 'Evento no encontrado o inactivo' },
        { status: 404 }
      );
    }

    SecurityLogger.logSecurityEvent('pdf_generation_custom_start', { requestId, userId: user.id, eventId, options: validation.data }, 'info');

    // Generar PDF con opciones personalizadas
    const pdfBuffer = await pdfService.generateEventQRPDF(
      eventId,
      validation.data
    );

    // Generar nombre de archivo
    const eventDate = new Date(event.date).toISOString().split('T')[0];
    const filename = `QRs_Custom_${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_${eventDate}.pdf`;

    SecurityLogger.logSecurityEvent('pdf_generation_custom_success', { requestId, userId: user.id, eventId, pdfSize: pdfBuffer.length }, 'info');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    SecurityLogger.logSecurityEvent('pdf_generation_custom_error', { requestId, eventId, error: error.message }, 'error');

    return NextResponse.json(
      { error: 'Error generando PDF personalizado' },
      { status: 500 }
    );
  }
}

export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(handleGET, 'admin')
);
export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(handlePOST, 'admin')
);
