import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { tokenService } from '@/lib/services/token.service';
import { SecurityLogger, generateRequestId } from '@/lib/middleware/auth.middleware';

/**
 * GET /api/admin/events/[id]/tokens/export?format=csv
 * Exporta tokens de un evento en formato CSV para entregar a la escuela
 * También genera URLs del portal familia para cada token
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = generateRequestId();
    const eventId = params.id;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const includeExpired = searchParams.get('include_expired') === 'true';

    console.log(`[${requestId}] Exporting tokens for event:`, { 
      eventId: `${eventId.substring(0, 8)}***`,
      format,
      includeExpired
    });

    // Validar formato UUID del eventId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return NextResponse.json(
        { error: 'ID de evento inválido' },
        { status: 400 }
      );
    }

    // Validar formato solicitado
    if (!['csv', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'Formato no soportado. Use: csv, json' },
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
      console.log(`[${requestId}] Event not found:`, { eventId: `${eventId.substring(0, 8)}***` });
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    // Obtener todos los tokens del evento
    const eventTokens = await tokenService.getEventTokens(eventId);

    if (eventTokens.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron tokens para este evento' },
        { status: 404 }
      );
    }

    // Filtrar tokens expirados si no se incluyen
    const now = new Date();
    const tokensToExport = includeExpired 
      ? eventTokens 
      : eventTokens.filter(token => token.expiresAt > now);

    // Obtener información sobre qué estudiantes tienen fotos asignadas
    const { data: studentsWithPhotos } = await supabase
      .from('photo_subjects')
      .select('subject_id')
      .in('subject_id', tokensToExport.map(t => t.subjectId));

    const studentsWithPhotosSet = new Set(
      (studentsWithPhotos || []).map(p => p.subject_id)
    );

    // Preparar datos de exportación
    const exportData = tokensToExport.map(token => {
      const portalUrl = tokenService.generatePortalUrl(token.token);
      const hasPhotos = studentsWithPhotosSet.has(token.subjectId);
      
      return {
        student_name: token.subjectName,
        token: token.token,
        portal_url: portalUrl,
        qr_url: portalUrl, // Same as portal URL for QR generation
        expires_at: token.expiresAt.toISOString(),
        is_expired: token.expiresAt <= now,
        has_photos: hasPhotos,
        photo_count: 0, // Could be calculated if needed
        created_date: new Date().toISOString().split('T')[0]
      };
    });

    // Log export activity
    SecurityLogger.logSecurityEvent(
      'tokens_exported',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        eventName: event.name,
        format,
        tokenCount: tokensToExport.length,
        includeExpired,
        tokensWithPhotos: exportData.filter(d => d.has_photos).length
      },
      'info'
    );

    console.log(`[${requestId}] Tokens exported:`, {
      eventId: `${eventId.substring(0, 8)}***`,
      format,
      tokenCount: tokensToExport.length,
      withPhotos: exportData.filter(d => d.has_photos).length
    });

    if (format === 'csv') {
      // Generar CSV
      const csvHeaders = [
        'Estudiante',
        'Token de Acceso',
        'URL del Portal',
        'Fecha Expiración',
        'Estado',
        'Tiene Fotos',
        'Fecha Generación'
      ];

      const csvRows = exportData.map(item => [
        `"${item.student_name}"`,
        `"${item.token}"`,
        `"${item.portal_url}"`,
        `"${item.expires_at.split('T')[0]}"`,
        item.is_expired ? 'EXPIRADO' : 'ACTIVO',
        item.has_photos ? 'SÍ' : 'NO',
        `"${item.created_date}"`
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      // Crear nombre de archivo descriptivo
      const dateStr = new Date().toISOString().split('T')[0];
      const schoolName = (event.school_name || 'Escuela').replace(/[^a-zA-Z0-9]/g, '_');
      const eventName = event.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `tokens_${schoolName}_${eventName}_${dateStr}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Request-Id': requestId,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    if (format === 'json') {
      // Generar JSON estructurado
      const jsonResponse = {
        export_info: {
          event: {
            id: event.id,
            name: event.name,
            school_name: event.school_name,
            date: event.date
          },
          export_date: new Date().toISOString(),
          total_tokens: tokensToExport.length,
          active_tokens: exportData.filter(d => !d.is_expired).length,
          tokens_with_photos: exportData.filter(d => d.has_photos).length
        },
        instructions: {
          distribution: "Entregar a cada estudiante su token único",
          access: "Los estudiantes pueden acceder usando la URL del portal o escaneando QR",
          expiry: `Los tokens expiran en ${Math.ceil((tokensToExport[0]?.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} días aproximadamente`,
          support: "Para soporte técnico, contactar al fotógrafo"
        },
        tokens: exportData
      };

      return NextResponse.json(jsonResponse, {
        status: 200,
        headers: {
          'X-Request-Id': requestId,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    return NextResponse.json(
      { error: 'Formato no implementado' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error exporting event tokens:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/events/[id]/tokens/export
 * Genera y envía por email los tokens a las familias (funcionalidad futura)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = generateRequestId();
    const eventId = params.id;
    
    console.log(`[${requestId}] Email distribution requested for event:`, { 
      eventId: `${eventId.substring(0, 8)}***`
    });

    // Esta funcionalidad será implementada cuando se configure el servicio de email
    return NextResponse.json(
      { 
        error: 'Distribución por email no implementada aún',
        suggestion: 'Use GET /api/admin/events/[id]/tokens/export?format=csv para exportar tokens'
      },
      { status: 501 }
    );

  } catch (error) {
    console.error('Error in email distribution:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}