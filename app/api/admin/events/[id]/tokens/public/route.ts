import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { accessTokenService } from '@/lib/services/access-token.service';
import {
  SecurityLogger,
  generateRequestId,
} from '@/lib/middleware/auth.middleware';

/**
 * POST /api/admin/events/[id]/tokens/public
 * Genera un token público de corta duración para acceso a la tienda desde la galería
 * Este token permite acceso temporal a la tienda unificada sin requerir datos de familia
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = generateRequestId();
    const eventId = params.id;

    console.log(`[${requestId}] Generating public token for event:`, {
      eventId: `${eventId.substring(0, 8)}***`,
    });

    // Validar formato UUID del eventId
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return NextResponse.json(
        { error: 'ID de evento inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { expiry_days = 1 } = body; // Default 1 day for public access

    const supabase = await createServerSupabaseServiceClient();

    // Verificar que el evento existe y está activo
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, status, settings')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.log(`[${requestId}] Event not found:`, {
        eventId: `${eventId.substring(0, 8)}***`,
      });
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el evento permite tienda pública
    const settings = event.settings || {};
    if (!settings.store?.enabled) {
      return NextResponse.json(
        { error: 'La tienda no está habilitada para este evento' },
        { status: 403 }
      );
    }

    // Generar token de evento público usando access-token.service
    const tokenResult = await accessTokenService.createToken({
      scope: 'event',
      resourceId: eventId,
      permissions: {
        canView: true,
        canDownload: false, // Public access usually doesn't allow downloads
        canShare: false,
        canComment: false,
      },
      expiryDays: expiry_days,
      metadata: {
        type: 'public_store_access',
        generatedAt: new Date().toISOString(),
        sourceIp: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Log the public token generation
    SecurityLogger.logSecurityEvent(
      'public_token_generation',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        eventName: event.name,
        tokenId: `${tokenResult.tokenId.substring(0, 8)}***`,
        expiryDays: expiry_days,
        sourceIp: request.headers.get('x-forwarded-for') || 'unknown',
      },
      'info'
    );

    console.log(`[${requestId}] Public token generated successfully:`, {
      eventId: `${eventId.substring(0, 8)}***`,
      tokenId: `${tokenResult.tokenId.substring(0, 8)}***`,
      expiryDays: expiry_days,
    });

    return NextResponse.json(
      {
        success: true,
        token: tokenResult.token,
        token_id: tokenResult.tokenId,
        event: {
          id: event.id,
          name: event.name,
        },
        expires_in_days: expiry_days,
        store_url: `/store-unified/${tokenResult.token}`,
        generated_at: new Date().toISOString(),
      },
      { headers: { 'X-Request-Id': requestId } }
    );
  } catch (error) {
    console.error('Error generating public event token:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}




