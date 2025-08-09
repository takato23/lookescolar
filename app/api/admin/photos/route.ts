import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServerSupabaseServiceClient,
} from '@/lib/supabase/server';
import { withAuth, SecurityLogger } from '@/lib/middleware/auth.middleware';
import {
  searchParamsSchema,
  SecurityValidator,
  SECURITY_CONSTANTS,
} from '@/lib/security/validation';
import { z } from 'zod';
import { getPhotoStatsByEvent } from '@/lib/services/photo-stats.service';
import { signedUrlForKey } from '@/lib/storage/signedUrl';

async function handleGET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';

  try {
    // Check authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // En desarrollo, permitir continuar sin sesión y consultar datos reales
    if (!user && process.env.NODE_ENV === 'development') {
      SecurityLogger.logSecurityEvent(
        'dev_mode_bypass_auth_photos',
        {
          requestId,
          ip: request.headers.get('x-forwarded-for'),
        },
        'info'
      );
    } else if (!user) {
      SecurityLogger.logSecurityEvent(
        'unauthorized_photo_access',
        {
          requestId,
          ip: request.headers.get('x-forwarded-for'),
        },
        'warning'
      );
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // A partir de aquí, en dev se permite sin user; en prod requiere user
    const effectiveUserId = user?.id ?? 'dev-user';

    // Usar service client para consultas
    const serviceClient = await createServerSupabaseServiceClient();

    // Validar y sanitizar parámetros
    const { searchParams } = new URL(request.url);
    const getParam = (key: string): string | undefined => {
      const v = searchParams.get(key);
      return v === null || v === '' ? undefined : v;
    };

    const status = getParam('status');
    const approvedFromStatus =
      status === 'approved' ? 'true' : status === 'pending' ? 'false' : undefined;
    const taggedFromStatus =
      status === 'tagged' ? 'true' : status === 'untagged' ? 'false' : undefined;

    const rawParams = {
      event_id: getParam('event_id'),
      approved: approvedFromStatus,
      tagged: getParam('tagged') ?? taggedFromStatus,
      limit: getParam('limit'),
      offset: getParam('offset'),
    };

    // Validate with schema
    const validationResult = searchParamsSchema.safeParse(rawParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      event_id: eventId,
      approved,
      tagged,
      limit,
      offset,
    } = validationResult.data;

    let query = serviceClient
      .from('photos')
      .select(
        `
        id,
        event_id,
        storage_path,
        preview_path,
        original_filename,
        approved,
        subject_id,
        width,
        height,
        file_size,
        mime_type,
        created_at,
        updated_at
      `
      )
      .order('created_at', { ascending: false });

    // Si hay event_id, filtrar por evento (validado como UUID)
    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    // Aplicar filtros validados
    if (approved === 'true') {
      query = query.eq('approved', true);
    } else if (approved === 'false') {
      query = query.eq('approved', false);
    }

    if (tagged === 'true') {
      query = query.not('subject_id', 'is', null);
    } else if (tagged === 'false') {
      query = query.is('subject_id', null);
    }

    // Aplicar paginación
    query = query.range(offset, offset + limit - 1);

    const { data: photos, error } = await query;

    if (error) {
      console.error('Error fetching photos:', error);
      return NextResponse.json(
        { error: 'Error obteniendo fotos' },
        { status: 500 }
      );
    }

    SecurityLogger.logSecurityEvent(
      'photos_fetched',
      {
        requestId,
        userId: effectiveUserId,
        count: photos?.length || 0,
        eventId,
      },
      'info'
    );

    // Procesar datos para incluir información de etiquetado
    const processedPhotos = await Promise.all(
      (photos || []).map(async (photo) => {
        let preview_url: string | null = null;
        try {
          const key = (photo as any).preview_path || photo.storage_path;
          if (key) {
            preview_url = await signedUrlForKey(key, 3600);
          }
        } catch (e) {
          console.error('[AdminPhotos] Error firmando URL', e);
          preview_url = null;
        }

        return {
          id: photo.id,
          event_id: photo.event_id,
          filename: photo.original_filename,
          original_filename: photo.original_filename,
          storage_path: photo.storage_path,
          preview_path: (photo as any).preview_path,
          preview_url,
          signed_url: preview_url,
          approved: photo.approved,
          tagged: !!photo.subject_id,
          width: photo.width,
          height: photo.height,
          file_size: photo.file_size,
          mime_type: photo.mime_type,
          created_at: photo.created_at,
          updated_at: photo.updated_at,
          subject: photo.subject_id
            ? {
                id: photo.subject_id,
                name: 'Sujeto asignado',
              }
            : null,
        };
      })
    );

    // Get optimized statistics using the stats service
    const stats = await getPhotoStatsByEvent(eventId, true);

    SecurityLogger.logSecurityEvent(
      'photos_response',
      {
        requestId,
        userId: effectiveUserId,
        photosCount: processedPhotos.length,
        statsTotal: stats.total,
      },
      'info'
    );

    return NextResponse.json(
      {
        success: true,
        photos: processedPhotos,
        meta: {
          ...stats,
          limit,
          offset,
        },
      },
      {
        // Agregar headers de cache para mejorar performance
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: any) {
    SecurityLogger.logSecurityEvent(
      'photo_fetch_error',
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export with conditional authentication based on environment
export const GET = process.env.NODE_ENV === 'development' 
  ? handleGET 
  : withAuth(handleGET);

// DELETE - Borrar múltiples fotos
const deletePhotosSchema = z.object({
  photoIds: z
    .array(z.string().uuid())
    .min(1)
    .max(SECURITY_CONSTANTS.MAX_BATCH_SIZE),
});

async function handleDELETE(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const userId = request.headers.get('x-user-id') || 'unknown';

  try {
    const body = await request.json();

    // Validate input
    const validation = deletePhotosSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { photoIds } = validation.data;

    SecurityLogger.logSecurityEvent(
      'photo_deletion_attempt',
      {
        requestId,
        userId,
        count: photoIds.length,
      },
      'info'
    );

    const supabase = await createServerSupabaseServiceClient();

    // Obtener paths de las fotos para borrar del storage
    const { data: photos, error: fetchError } = await supabase
      .from('photos')
      .select('storage_path, preview_path')
      .in('id', photoIds);

    if (fetchError) {
      console.error('Error obteniendo fotos:', fetchError);
      return NextResponse.json(
        { error: 'Error obteniendo fotos' },
        { status: 500 }
      );
    }

    // Validate and collect paths to delete
    const filesToDelete: string[] = [];
    photos?.forEach((photo) => {
      if (
        photo.storage_path &&
        SecurityValidator.isValidStoragePath(photo.storage_path)
      ) {
        filesToDelete.push(photo.storage_path);
      }
      if (
        photo.preview_path &&
        SecurityValidator.isValidStoragePath(photo.preview_path)
      ) {
        filesToDelete.push(photo.preview_path);
      }
    });

    // Borrar archivos del storage
    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove(filesToDelete);

      if (storageError) {
        console.error('Error borrando archivos del storage:', storageError);
      }
    }

    // Borrar registros de la DB
    const { error: deleteError } = await supabase
      .from('photos')
      .delete()
      .in('id', photoIds);

    if (deleteError) {
      console.error('Error borrando fotos de la DB:', deleteError);
      return NextResponse.json(
        { error: 'Error borrando fotos' },
        { status: 500 }
      );
    }

    SecurityLogger.logSecurityEvent(
      'photos_deleted',
      {
        requestId,
        userId,
        count: photoIds.length,
      },
      'info'
    );

    return NextResponse.json({
      success: true,
      message: `${photoIds.length} foto(s) borrada(s)`,
      deleted: photoIds.length,
    });
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'photo_deletion_error',
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export with conditional authentication based on environment
export const DELETE = process.env.NODE_ENV === 'development' 
  ? handleDELETE 
  : withAuth(handleDELETE);
