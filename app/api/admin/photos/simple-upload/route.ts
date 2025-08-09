import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { processAndUploadImage } from '@/lib/services/watermark.service';
import { SecurityLogger, generateRequestId } from '@/lib/middleware/auth.middleware';

export async function POST(request: NextRequest) {
  try {
    const requestId = generateRequestId();
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No se enviaron archivos' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();
    SecurityLogger.logSecurityEvent(
      'photo_upload_attempt',
      {
        requestId,
        totalFiles: files.length,
      },
      'info'
    );
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        // Convertir File a Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Procesar y subir imagen con watermark
        const uploadResult = await processAndUploadImage(
          buffer,
          file.name,
          null // Sin event_id por ahora
        );

        if (uploadResult.success && uploadResult.data) {
          // Usar el primer evento disponible como temporal
          // TODO: Cambiar cuando se pueda usar event_id NULL
          const { data: events } = await supabase
            .from('events')
            .select('id')
            .limit(1);

          const tempEventId =
            events?.[0]?.id || 'ca9cdc39-2f26-468a-a0ca-0d3e7a6be9f6';

          // Guardar en la base de datos con event_id temporal
          const { data: photo, error: dbError } = await supabase
            .from('photos')
            .insert({
              storage_path: uploadResult.data.storage_path,
              preview_path: uploadResult.data.preview_path,
              original_filename: file.name,
              file_size: file.size,
              mime_type: file.type,
              width: uploadResult.data.width,
              height: uploadResult.data.height,
              approved: true, // Auto-aprobar en upload simple
              event_id: tempEventId, // Evento temporal hasta que se asigne uno real
            })
            .select()
            .single();

          if (dbError) {
            console.error('Database error:', dbError);
            throw new Error(
              `DB Error: ${dbError.message || 'Unknown database error'}`
            );
          }

          results.push({
            id: photo.id,
            filename: file.name,
            preview_path: uploadResult.data.preview_path,
            storage_path: uploadResult.data.storage_path,
            success: true,
          });

          SecurityLogger.logSecurityEvent(
            'photo_upload_success',
            {
              requestId,
              photoId: photo.id,
              filename: file.name,
              storagePath: uploadResult.data.storage_path,
              previewPath: uploadResult.data.preview_path,
              size: file.size,
              mimeType: file.type,
            },
            'info'
          );
        } else {
          throw new Error(uploadResult.error || 'Error procesando imagen');
        }
      } catch (error) {
        console.error('Error procesando archivo:', {
          filename: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });

        SecurityLogger.logSecurityEvent(
          'photo_upload_error',
          {
            requestId,
            filename: file.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'error'
        );

        errors.push({
          filename: file.name,
          error: error instanceof Error ? error.message : 'Error desconocido',
          details: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    SecurityLogger.logSecurityEvent(
      'photo_upload_complete',
      {
        requestId,
        total: files.length,
        successful: results.length,
        failed: errors.length,
      },
      'info'
    );

    return NextResponse.json({
      success: results.length > 0,
      uploaded: results,
      errors: errors,
      total: files.length,
      successful: results.length,
      failed: errors.length,
    }, { headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    console.error('Error en simple upload:', error);
    return NextResponse.json(
      { error: 'Error procesando la solicitud' },
      { status: 500 }
    );
  }
}

// GET para verificar fotos sin evento
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseServiceClient();

    // Obtener fotos sin evento asignado
    const { data: photos, error } = await supabase
      .from('photos')
      .select('*')
      .is('event_id', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      photos: photos || [],
      total: photos?.length || 0,
    });
  } catch (error) {
    console.error('Error obteniendo fotos sin evento:', error);
    return NextResponse.json(
      { error: 'Error obteniendo fotos' },
      { status: 500 }
    );
  }
}
