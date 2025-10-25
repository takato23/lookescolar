import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { tokenService } from '@/lib/services/token.service';
import {
  SecurityLogger,
  generateRequestId,
} from '@/lib/middleware/auth.middleware';

/**
 * GET /api/admin/events/[id]/tokens
 * Obtiene todos los tokens generados para un evento específico
 * Incluye información del estudiante y estado del token
 */
export async function GET(
  request: NextRequest, context: RouteContext<{ id: string }>) {
  const params = await context.params;
  try {
    const requestId = generateRequestId();
    const eventId = params.id;

    console.log(`[${requestId}] Getting tokens for event:`, {
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

    const supabase = await createServerSupabaseServiceClient();

    // Verificar que el evento existe
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, school_name, date, active')
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

    // Obtener todos los tokens del evento usando el tokenService
    const eventTokens = await tokenService.getEventTokens(eventId);

    // Obtener estadísticas adicionales
    const now = new Date();
    const stats = {
      total: eventTokens.length,
      active: eventTokens.filter((t) => t.expiresAt > now).length,
      expired: eventTokens.filter((t) => t.expiresAt <= now).length,
      with_photos: 0, // Will be calculated below
      without_photos: 0,
    };

    // Obtener información sobre qué estudiantes tienen fotos asignadas
    const { data: studentsWithPhotos } = await supabase
      .from('photo_subjects')
      .select('subject_id')
      .in(
        'subject_id',
        eventTokens.map((t) => t.subjectId)
      );

    const studentsWithPhotosSet = new Set(
      (studentsWithPhotos || []).map((p) => p.subject_id)
    );

    // Enriquecer tokens con información de fotos
    const enrichedTokens = eventTokens.map((token) => {
      const hasPhotos = studentsWithPhotosSet.has(token.subjectId);
      return {
        ...token,
        has_photos: hasPhotos,
        portal_url: tokenService.generatePortalUrl(token.token),
        is_expired: token.expiresAt <= now,
        // Mask token for security
        token_masked: `${token.token.substring(0, 8)}***${token.token.slice(-4)}`,
      };
    });

    stats.with_photos = enrichedTokens.filter((t) => t.has_photos).length;
    stats.without_photos = stats.total - stats.with_photos;

    SecurityLogger.logSecurityEvent(
      'event_tokens_accessed',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        eventName: event.name,
        totalTokens: stats.total,
        activeTokens: stats.active,
        tokensWithPhotos: stats.with_photos,
      },
      'info'
    );

    console.log(`[${requestId}] Event tokens retrieved:`, {
      eventId: `${eventId.substring(0, 8)}***`,
      totalTokens: stats.total,
      activeTokens: stats.active,
      tokensWithPhotos: stats.with_photos,
    });

    // Respuesta con información completa pero tokens enmascarados
    return NextResponse.json(
      {
        success: true,
        event: {
          id: event.id,
          name: event.name,
          school_name: event.school_name,
          date: event.date,
          active: event.active,
        },
        tokens: enrichedTokens.map((token) => ({
          subject_id: token.subjectId,
          subject_name: token.subjectName,
          token_masked: token.token_masked,
          expires_at: token.expiresAt.toISOString(),
          is_expired: token.is_expired,
          has_photos: token.has_photos,
          portal_url: token.portal_url,
        })),
        stats,
        generated_at: new Date().toISOString(),
      },
      { headers: { 'X-Request-Id': requestId } }
    );
  } catch (error) {
    console.error('Error getting event tokens:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/events/[id]/tokens
 * Genera tokens para todos los estudiantes de un evento que aún no los tienen
 * O regenera tokens existentes si se especifica
 */
export async function POST(
  request: NextRequest, context: RouteContext<{ id: string }>) {
  const params = await context.params;
  try {
    const requestId = generateRequestId();
    const eventId = params.id;

    console.log(`[${requestId}] Generating tokens for event:`, {
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
    const { regenerate_existing = false, expiry_days = 30 } = body;

    const supabase = await createServerSupabaseServiceClient();

    // Verificar que el evento existe
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name')
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

    // Obtener todos los estudiantes del evento
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, first_name, last_name, type')
      .eq('event_id', eventId);

    if (subjectsError) {
      console.error(`[${requestId}] Error fetching subjects:`, subjectsError);
      return NextResponse.json(
        { error: 'Error obteniendo estudiantes del evento' },
        { status: 500 }
      );
    }

    if (!subjects || subjects.length === 0) {
      console.log(`[${requestId}] No subjects found for event:`, {
        eventId: `${eventId.substring(0, 8)}***`,
      });
      return NextResponse.json(
        { error: 'No se encontraron estudiantes en este evento' },
        { status: 404 }
      );
    }

    const subjectIds = subjects.map((s) => s.id);

    // Generar tokens para todos los estudiantes
    const tokenResults = await tokenService.generateTokensForSubjects(
      subjectIds,
      {
        expiryDays: expiry_days,
        rotateExisting: regenerate_existing,
      }
    );

    const successful = Array.from(tokenResults.keys());
    const failed = subjectIds.filter((id) => !tokenResults.has(id));

    SecurityLogger.logSecurityEvent(
      'bulk_token_generation',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        eventName: event.name,
        totalSubjects: subjectIds.length,
        successful: successful.length,
        failed: failed.length,
        regenerateExisting: regenerate_existing,
        expiryDays: expiry_days,
      },
      'info'
    );

    console.log(`[${requestId}] Bulk token generation completed:`, {
      eventId: `${eventId.substring(0, 8)}***`,
      totalSubjects: subjectIds.length,
      successful: successful.length,
      failed: failed.length,
    });

    return NextResponse.json(
      {
        success: true,
        event: {
          id: event.id,
          name: event.name,
        },
        results: {
          total_subjects: subjectIds.length,
          tokens_generated: successful.length,
          tokens_failed: failed.length,
          regenerated_existing: regenerate_existing,
        },
        expiry_days,
        generated_at: new Date().toISOString(),
      },
      { headers: { 'X-Request-Id': requestId } }
    );
  } catch (error) {
    console.error('Error generating event tokens:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/events/[id]/tokens
 * Invalida todos los tokens de un evento (por seguridad)
 */
export async function DELETE(
  request: NextRequest, context: RouteContext<{ id: string }>) {
  const params = await context.params;
  try {
    const requestId = generateRequestId();
    const eventId = params.id;

    console.log(`[${requestId}] Invalidating all tokens for event:`, {
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
    const { reason = 'admin_request' } = body;

    const supabase = await createServerSupabaseServiceClient();

    // Obtener todos los tokens del evento
    const eventTokens = await tokenService.getEventTokens(eventId);

    if (eventTokens.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron tokens para este evento' },
        { status: 404 }
      );
    }

    // Invalidar todos los tokens
    const invalidationPromises = eventTokens.map((tokenInfo) =>
      tokenService.invalidateToken(tokenInfo.token, reason)
    );

    const invalidationResults = await Promise.all(invalidationPromises);
    const successful = invalidationResults.filter(
      (result) => result === true
    ).length;
    const failed = invalidationResults.length - successful;

    SecurityLogger.logSecurityEvent(
      'bulk_token_invalidation',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        totalTokens: eventTokens.length,
        successful,
        failed,
        reason,
      },
      'warning'
    );

    console.log(`[${requestId}] Bulk token invalidation completed:`, {
      eventId: `${eventId.substring(0, 8)}***`,
      totalTokens: eventTokens.length,
      successful,
      failed,
    });

    return NextResponse.json(
      {
        success: true,
        results: {
          total_tokens: eventTokens.length,
          invalidated: successful,
          failed: failed,
        },
        reason,
        invalidated_at: new Date().toISOString(),
      },
      { headers: { 'X-Request-Id': requestId } }
    );
  } catch (error) {
    console.error('Error invalidating event tokens:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
