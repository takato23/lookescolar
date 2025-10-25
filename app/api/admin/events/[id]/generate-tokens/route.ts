import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { tokenService } from '@/lib/services/token.service';
import {
  SecurityLogger,
  generateRequestId,
} from '@/lib/middleware/auth.middleware';
import type { RouteContext } from '@/types/next-route';

/**
 * POST /api/admin/events/[id]/generate-tokens
 * Genera tokens automáticamente para todos los estudiantes de un evento
 * Útil para generar tokens masivamente antes de entregar códigos a la escuela
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  try {
    const requestId = generateRequestId();
    const { id: eventId } = await context.params;

    console.log(`[${requestId}] Mass token generation for event:`, {
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
    const {
      force_regenerate = false,
      expiry_days = 30,
      only_students_with_photos = false,
    } = body;

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

    // Obtener todos los estudiantes del evento
    let subjectsQuery = supabase
      .from('subjects')
      .select('id, first_name, last_name, type, couple_first_name, family_name')
      .eq('event_id', eventId);

    // Si solo queremos estudiantes con fotos, hacer join
    if (only_students_with_photos) {
      const { data: studentsWithPhotos } = await supabase
        .from('photo_subjects')
        .select('subject_id')
        .eq('subjects.event_id', eventId);

      if (!studentsWithPhotos || studentsWithPhotos.length === 0) {
        return NextResponse.json(
          { error: 'No se encontraron estudiantes con fotos asignadas' },
          { status: 404 }
        );
      }

      const subjectIds = studentsWithPhotos.map((p) => p.subject_id);
      subjectsQuery = subjectsQuery.in('id', subjectIds);
    }

    const { data: subjects, error: subjectsError } = await subjectsQuery;

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
        {
          error: only_students_with_photos
            ? 'No se encontraron estudiantes con fotos en este evento'
            : 'No se encontraron estudiantes en este evento',
        },
        { status: 404 }
      );
    }

    // Si no es forzar regeneración, filtrar estudiantes que ya tienen tokens activos
    let subjectsToProcess = subjects;
    if (!force_regenerate) {
      const existingTokens = await tokenService.getEventTokens(eventId);
      const existingSubjectIds = new Set(
        existingTokens
          .filter((token) => token.expiresAt > new Date()) // Solo tokens activos
          .map((token) => token.subjectId)
      );

      subjectsToProcess = subjects.filter(
        (subject) => !existingSubjectIds.has(subject.id)
      );

      if (subjectsToProcess.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'Todos los estudiantes ya tienen tokens activos',
          results: {
            total_subjects: subjects.length,
            already_had_tokens: subjects.length,
            tokens_generated: 0,
            tokens_failed: 0,
          },
          existing_tokens: existingTokens.length,
        });
      }
    }

    const subjectIds = subjectsToProcess.map((s) => s.id);

    console.log(
      `[${requestId}] Generating tokens for ${subjectIds.length} subjects`
    );

    // Generar tokens usando el servicio
    const tokenResults = await tokenService.generateTokensForSubjects(
      subjectIds,
      {
        expiryDays: expiry_days,
        rotateExisting: force_regenerate,
      }
    );

    const successful = Array.from(tokenResults.keys());
    const failed = subjectIds.filter((id) => !tokenResults.has(id));

    // Obtener información sobre cuántos estudiantes tienen fotos
    const { data: studentsWithPhotos } = await supabase
      .from('photo_subjects')
      .select('subject_id')
      .in('subject_id', successful);

    const studentsWithPhotosCount = new Set(
      (studentsWithPhotos || []).map((p) => p.subject_id)
    ).size;

    // Log de la operación
    SecurityLogger.logSecurityEvent(
      'mass_token_generation',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        eventName: event.name,
        totalSubjects: subjects.length,
        processedSubjects: subjectIds.length,
        successful: successful.length,
        failed: failed.length,
        forceRegenerate: force_regenerate,
        onlyStudentsWithPhotos: only_students_with_photos,
        expiryDays: expiry_days,
        studentsWithPhotos: studentsWithPhotosCount,
      },
      'info'
    );

    console.log(`[${requestId}] Mass token generation completed:`, {
      eventId: `${eventId.substring(0, 8)}***`,
      totalSubjects: subjects.length,
      processedSubjects: subjectIds.length,
      successful: successful.length,
      failed: failed.length,
      studentsWithPhotos: studentsWithPhotosCount,
    });

    return NextResponse.json(
      {
        success: true,
        event: {
          id: event.id,
          name: event.name,
          school_name: event.school_name,
          date: event.date,
        },
        results: {
          total_subjects: subjects.length,
          processed_subjects: subjectIds.length,
          tokens_generated: successful.length,
          tokens_failed: failed.length,
          students_with_photos: studentsWithPhotosCount,
          force_regenerate: force_regenerate,
          only_students_with_photos: only_students_with_photos,
        },
        token_settings: {
          expiry_days: expiry_days,
          expires_at: new Date(
            Date.now() + expiry_days * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
        next_steps: {
          export_url: `/api/admin/events/${eventId}/tokens/export?format=csv`,
          view_tokens_url: `/api/admin/events/${eventId}/tokens`,
        },
        generated_at: new Date().toISOString(),
      },
      { headers: { 'X-Request-Id': requestId } }
    );
  } catch (error) {
    console.error('Error in mass token generation:', error);
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
 * GET /api/admin/events/[id]/generate-tokens
 * Obtiene un resumen del estado de tokens para el evento
 * (cuántos estudiantes tienen tokens, cuántos necesitan, etc.)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  try {
    const requestId = generateRequestId();
    const { id: eventId } = await context.params;

    console.log(`[${requestId}] Getting token generation summary for event:`, {
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

    // Obtener conteo de estudiantes
    const { count: totalSubjects } = await supabase
      .from('subjects')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);

    // Obtener tokens existentes
    const eventTokens = await tokenService.getEventTokens(eventId);
    const now = new Date();
    const activeTokens = eventTokens.filter((token) => token.expiresAt > now);
    const expiredTokens = eventTokens.filter((token) => token.expiresAt <= now);

    // Obtener estudiantes con fotos
    const { count: studentsWithPhotos } = await supabase
      .from('photo_subjects')
      .select('subject_id', { count: 'exact', head: true })
      .eq('subjects.event_id', eventId);

    const needTokens = (totalSubjects || 0) - activeTokens.length;

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
        summary: {
          total_subjects: totalSubjects || 0,
          subjects_with_photos: studentsWithPhotos || 0,
          subjects_without_photos:
            (totalSubjects || 0) - (studentsWithPhotos || 0),
          total_tokens: eventTokens.length,
          active_tokens: activeTokens.length,
          expired_tokens: expiredTokens.length,
          subjects_need_tokens: Math.max(0, needTokens),
        },
        recommendations: {
          should_generate_tokens: needTokens > 0,
          ready_for_distribution:
            activeTokens.length > 0 && (studentsWithPhotos || 0) > 0,
          has_photos_assigned: (studentsWithPhotos || 0) > 0,
        },
        actions: {
          generate_missing_tokens:
            needTokens > 0
              ? `/api/admin/events/${eventId}/generate-tokens`
              : null,
          export_existing_tokens:
            activeTokens.length > 0
              ? `/api/admin/events/${eventId}/tokens/export?format=csv`
              : null,
          view_all_tokens: `/api/admin/events/${eventId}/tokens`,
        },
        generated_at: new Date().toISOString(),
      },
      { headers: { 'X-Request-Id': requestId } }
    );
  } catch (error) {
    console.error('Error getting token generation summary:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
