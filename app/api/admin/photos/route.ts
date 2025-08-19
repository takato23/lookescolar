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
import { signedUrlForKey } from '@/lib/storage/signedUrl';
import {
  createErrorResponse,
  createSuccessResponse,
  parsePaginationParams,
  createPaginationMeta,
  logDevRequest,
} from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

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

    // Validar y sanitizar parámetros mínimos requeridos
    const { searchParams } = new URL(request.url);
    const getParam = (key: string): string | undefined => {
      const v = searchParams.get(key);
      return v === null || v === '' ? undefined : v;
    };

    // Pagination params
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');
    const offset = (page - 1) * limit;

    // Optional filters (keep backwards compatibility but do not require)
    const status = getParam('status');
    const approvedFromStatus =
      status === 'approved' ? 'true' : status === 'pending' ? 'false' : undefined;
    const taggedFromStatus =
      status === 'tagged' ? 'true' : status === 'untagged' ? 'false' : undefined;

    const search = getParam('search');
    const dateFrom = getParam('date_from');
    const dateTo = getParam('date_to');
    const sortBy = getParam('sort_by') || 'created_at';
    const sortOrder = getParam('sort_order') || 'desc';

    const rawParams = {
      event_id: getParam('event_id') || getParam('eventId'),
      code_id: getParam('code_id') || undefined,
      approved: approvedFromStatus,
      tagged: getParam('tagged') ?? taggedFromStatus,
      limit: limit.toString(),
      offset: offset.toString(),
    };

    // Validate known params with schema and enforce event_id required for this endpoint
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
    const { event_id: eventId, code_id: codeId, approved, tagged, limit: parsedLimit, offset: parsedOffset } =
      validationResult.data as any;
    
    // event_id is now OPTIONAL - if not provided, show all photos

    if (process.env.NODE_ENV === 'development') {
      // Debug log solo en dev
      // eslint-disable-next-line no-console
      console.debug('photos_query', { eventId: eventId || 'ALL', codeId, page, limit, offset });
    }

    const buildBaseQuery = () => serviceClient
      .from('photos')
      .select(
        `id, event_id, original_filename, storage_path, preview_path, approved, created_at, file_size, width, height,
         photo_subjects(subject_id, subjects(id, name))`,
        { count: 'exact' }
      );
    let query = buildBaseQuery();
    
    // Only filter by event_id if provided
    if (eventId) {
      query = query.eq('event_id', eventId);
    }
    // Filter by code_id when provided (supports 'null' to mean unassigned)
    if (codeId === 'null') {
      query = query.is('code_id', null as any);
    } else if (codeId) {
      query = query.eq('code_id', codeId);
    }

    // Aplicar filtros validados
    if (approved === 'true') {
      query = query.eq('approved', true);
    } else if (approved === 'false') {
      query = query.eq('approved', false);
    }

    // Filter by tagged status - we'll handle this in the application layer
    // since Supabase doesn't support complex joins easily in this context

    // Nota: si la columna code_id no existe en el esquema, el filtro anterior será ignorado por Supabase
    // y el resultado seguirá siendo consistente (sin error) en entornos legacy
    
    // Apply search filter
    if (search) {
      query = query.ilike('original_filename', `%${search}%`);
    }
    
    // Apply date filters
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }
    
    // Apply sorting
    const validSortColumns = ['created_at', 'original_filename'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const ascending = sortOrder === 'asc';
    query = query.order(sortColumn, { ascending });

    // Aplicar paginación
    query = query.range(parsedOffset, parsedOffset + parsedLimit - 1);

    let { data: photos, error, count } = await query;

    // Fallback: if schema lacks code_id (legacy), retry without code filter instead of 500
    if (error && codeId) {
      const message = (error as any)?.message || '';
      const details = JSON.stringify(error);
      if (/code_id/i.test(message) || /code_id/i.test(details)) {
        try {
          let fallback = buildBaseQuery();
          if (eventId) fallback = fallback.eq('event_id', eventId);
          if (approved === 'true') {
            fallback = fallback.eq('approved', true);
          } else if (approved === 'false') {
            fallback = fallback.eq('approved', false);
          }
          if (search) fallback = fallback.ilike('original_filename', `%${search}%`);
          if (dateFrom) fallback = fallback.gte('created_at', dateFrom);
          if (dateTo) fallback = fallback.lte('created_at', dateTo);
          const validSortColumns = ['created_at', 'original_filename'];
          const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
          const ascending = sortOrder === 'asc';
          fallback = fallback.order(sortColumn, { ascending });
          fallback = fallback.range(parsedOffset, parsedOffset + parsedLimit - 1);
          const rerun = await fallback;
          photos = rerun.data as any;
          count = (rerun as any).count as any;
          error = null as any;
        } catch (_) {
          // keep original error
        }
      }
    }

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

    // Procesar datos y firmar preview_url server-side
    let processedPhotos = await Promise.all(
      (photos || []).map(async (photo: any) => {
        let preview_url: string | null = null;
        try {
          // Intentar en orden: preview_path, watermark_path (nunca original)
          const preferredKey = photo.preview_path || photo.watermark_path;
          if (preferredKey) {
            preview_url = await signedUrlForKey(preferredKey, 900);
          }
        } catch (err) {
          console.warn('Failed to generate signed URL for photo:', photo.id, err);
          preview_url = null;
        }
        
        // Extract subject information from the joined data
        const subjects = photo.photo_subjects?.map((ps: any) => ({
          id: ps.subjects?.id,
          name: ps.subjects?.name,
        })).filter((s: any) => s.id) || [];
        
        return {
          id: photo.id,
          event_id: photo.event_id,
          original_filename: photo.original_filename,
          storage_path: photo.storage_path,
          preview_path: photo.preview_path ?? null,
          watermark_path: photo.watermark_path ?? null,
          preview_url,
          approved: photo.approved,
          created_at: photo.created_at,
          file_size: photo.file_size ?? (photo.file_size_bytes ?? null),
          width: photo.width ?? null,
          height: photo.height ?? null,
          subjects, // Include subjects array
          tagged: subjects.length > 0, // Photo is tagged if it has subjects
        };
      })
    );

    // Apply tagged filter in application layer if needed
    if (tagged === 'true') {
      processedPhotos = processedPhotos.filter(photo => photo.tagged);
    } else if (tagged === 'false') {
      processedPhotos = processedPhotos.filter(photo => !photo.tagged);
    }

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug('photos_query_result', { count: processedPhotos.length });
    }

    return NextResponse.json(
      {
        success: true,
        photos: processedPhotos,
        counts: { total: count || 0 },
      },
      {
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
// Support two deletion modes:
// 1. By photo IDs: { photoIds: string[] }
// 2. By filter: { eventId: string, codeId: string | "null" }
const deleteByIdsSchema = z.object({
  photoIds: z
    .array(z.string().uuid())
    .min(1)
    .max(SECURITY_CONSTANTS.MAX_BATCH_SIZE),
});

const deleteByFilterSchema = z.object({
  eventId: z.string().uuid(),
  codeId: z.union([z.string().uuid(), z.literal('null')]),
});

const deletePhotosSchema = z.union([deleteByIdsSchema, deleteByFilterSchema]);

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

    let photoIds: string[] = [];
    const supabase = await createServerSupabaseServiceClient();

    // Determine deletion mode
    if ('photoIds' in validation.data) {
      // Mode 1: Delete by specific photo IDs
      photoIds = validation.data.photoIds;
    } else {
      // Mode 2: Delete by filter (eventId + codeId)
      const { eventId, codeId } = validation.data;
      
      // Build query to get photo IDs by filter
      let query = supabase
        .from('photos')
        .select('id')
        .eq('event_id', eventId);
      
      // Handle codeId filter
      if (codeId === 'null') {
        // Photos without folder (null code_id)
        query = query.is('code_id', null);
      } else {
        // Photos in specific folder
        query = query.eq('code_id', codeId);
      }
      
      const { data: photosToDelete, error: queryError } = await query;
      
      if (queryError) {
        console.error('Error querying photos by filter:', queryError);
        return NextResponse.json(
          { error: 'Error finding photos to delete' },
          { status: 500 }
        );
      }
      
      if (!photosToDelete || photosToDelete.length === 0) {
        // No photos match the filter - return success with 0 deleted
        return NextResponse.json({
          success: true,
          message: 'No photos found matching the filter',
          deleted: 0,
        });
      }
      
      photoIds = photosToDelete.map(p => p.id);
    }

    SecurityLogger.logSecurityEvent(
      'photo_deletion_attempt',
      {
        requestId,
        userId,
        count: photoIds.length,
      },
      'info'
    );

    // Reuse previously created supabase service client

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

    // Borrar archivos del storage, respetando el bucket correcto
    if (filesToDelete.length > 0) {
      const ORIGINAL_BUCKET = process.env['STORAGE_BUCKET_ORIGINAL'] || process.env['STORAGE_BUCKET'] || 'photo-private';
      const PREVIEW_BUCKET = process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';

      const originals: string[] = [];
      const previews: string[] = [];

      for (const path of filesToDelete) {
        if ((/(^|\/)previews\//.test(path)) || /watermark/i.test(path)) {
          previews.push(path);
        } else {
          originals.push(path);
        }
      }

      // Remove previews
      if (previews.length > 0) {
        const { error: storageErrorPrev } = await supabase.storage
          .from(PREVIEW_BUCKET)
          .remove(previews);
        if (storageErrorPrev) {
          console.error('Error borrando previews del storage:', storageErrorPrev);
        }
      }

      // Remove originals
      if (originals.length > 0) {
        const { error: storageErrorOrig } = await supabase.storage
          .from(ORIGINAL_BUCKET)
          .remove(originals);
        if (storageErrorOrig) {
          console.error('Error borrando originales del storage:', storageErrorOrig);
        }
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
