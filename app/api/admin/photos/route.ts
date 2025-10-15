/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { SecurityLogger } from '@/lib/middleware/auth.middleware';
import { withRobustAuth } from '@/lib/middleware/auth-robust.middleware';
import {
  searchParamsSchema,
  SecurityValidator,
  SECURITY_CONSTANTS,
} from '@/lib/security/validation';
import { z } from 'zod';
import { signedUrlForKey } from '@/lib/storage/signedUrl';

export const dynamic = 'force-dynamic';

async function handleGETRobust(request: NextRequest, context: { user: any; requestId: string }) {
  const { user, requestId } = context;
  const startTime = Date.now();

  try {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${requestId}] Photos API request started with robust auth`);
    }

    const effectiveUserId = user.id;

    // Use service client for queries - simplified
    const serviceClient = await createServerSupabaseServiceClient();
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${requestId}] Service client created successfully`);
    }

    // Validar y sanitizar parámetros mínimos requeridos
    const { searchParams } = new URL(request.url);
    const getParam = (key: string): string | undefined => {
      const v = searchParams.get(key);
      return v === null || v === '' ? undefined : v;
    };

    // Pagination params - MEMORY OPTIMIZATION: Reduce default limit
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '24');
    // Cap limit to prevent memory issues
    const limit = Math.min(requestedLimit, 50);
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
       
      console.debug('photos_query', { eventId: eventId || 'ALL', codeId, page, limit, offset });
    }

    // MEMORY OPTIMIZATION: Simplified query, fetch subjects separately if needed
    const buildBaseQuery = () => serviceClient
      .from('assets')
      .select(
        `id, folder_id, filename, original_path, preview_path, watermark_path, file_size, created_at, status`,
        { count: 'exact' }
      );
    let query = buildBaseQuery();
    
    // Only filter by folder_id if provided (replacing event_id logic)
    if (eventId) {
      // For now, we'll skip the event_id filter and show all assets
      // TODO: Need to join with folders table to filter by event_id
      // query = query.eq('folder_id', eventId);
    }
    // Note: assets table doesn't have code_id or approved columns
    // These filters are temporarily disabled until we map the proper structure
    // if (codeId === 'null') {
    //   query = query.is('code_id', null as any);
    // } else if (codeId) {
    //   query = query.eq('code_id', codeId);
    // }

    // if (approved === 'true') {
    //   query = query.eq('approved', true);
    // } else if (approved === 'false') {
    //   query = query.eq('approved', false);
    // }

    // Filter by tagged status - we'll handle this in the application layer
    // since Supabase doesn't support complex joins easily in this context

    // Nota: si la columna code_id no existe en el esquema, el filtro anterior será ignorado por Supabase
    // y el resultado seguirá siendo consistente (sin error) en entornos legacy
    
    // Apply search filter
    if (search) {
      query = query.ilike('filename', `%${search}%`);
    }
    
    // Apply date filters
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }
    
    // Apply sorting
    const validSortColumns = ['created_at', 'filename'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const ascending = sortOrder === 'asc';
    query = query.order(sortColumn, { ascending });

    // Aplicar paginación
    query = query.range(parsedOffset, parsedOffset + parsedLimit - 1);

    const queryStartTime = Date.now();
    let { data: photos, error, count } = await query;
    const queryDuration = Date.now() - queryStartTime;

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

    // MEMORY OPTIMIZATION: Process assets efficiently with conditional preview URL generation  
    let processedPhotos = await Promise.all((photos || []).map(async (asset: any) => {
      // Generate preview URL conditionally based on request size to avoid OOM
      let preview_url = null;
      
      if ((photos?.length || 0) <= 20 && asset.preview_path) {
        try {
          const urlResult = await signedUrlForKey(asset.preview_path);
          // Ensure we only accept valid string URLs
          if (typeof urlResult === 'string' && urlResult.length > 0) {
            preview_url = urlResult;
          }
        } catch (error) {
          console.warn(`Failed to generate preview URL for asset ${asset.id}:`, error);
          preview_url = null;
        }
      }
      
      // Map assets table fields to photos API response format
      return {
        id: asset.id,
        event_id: null, // assets table uses folder_id instead
        folder_id: asset.folder_id,
        filename: asset.filename,
        original_filename: asset.filename, // Map filename to original_filename for compatibility
        storage_path: asset.original_path, // Map original_path to storage_path for compatibility
        original_path: asset.original_path,
        preview_path: asset.preview_path ?? null,
        watermark_path: asset.watermark_path ?? null, // Include watermark_path for fallback
        preview_url,
        approved: true, // Default to approved since assets table doesn't have this field yet
        created_at: asset.created_at,
        file_size: asset.file_size ?? null,
        width: null, // Not in current assets schema
        height: null, // Not in current assets schema
        subjects: [], // Empty for now to save memory - can be loaded separately if needed
        tagged: false, // Simplified for memory - can be enhanced later
        status: asset.status || 'ready', // Include status from assets table
      };
    }));

    // Apply tagged filter in application layer if needed
    if (tagged === 'true') {
      processedPhotos = processedPhotos.filter(photo => photo.tagged);
    } else if (tagged === 'false') {
      processedPhotos = processedPhotos.filter(photo => !photo.tagged);
    }

    const totalDuration = Date.now() - startTime;

    // Performance logging
    SecurityLogger.logSecurityEvent(
      'photos_performance',
      {
        requestId,
        queryDuration,
        totalDuration,
        photosCount: processedPhotos.length,
        totalPhotos: count || 0,
        limit: parsedLimit,
        eventId: eventId || 'ALL',
      },
      'info'
    );

    if (process.env.NODE_ENV === 'development') {
      console.debug('photos_performance', { 
        queryDuration: `${queryDuration}ms`,
        totalDuration: `${totalDuration}ms`,
        count: processedPhotos.length 
      });
    }

    return NextResponse.json(
      {
        success: true,
        photos: processedPhotos,
        counts: { total: count || 0 },
        _performance: process.env.NODE_ENV === 'development' ? {
          query_duration_ms: queryDuration,
          total_duration_ms: totalDuration,
        } : undefined,
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

export const GET = withRobustAuth(handleGETRobust);

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

async function handleDELETE(
  request: NextRequest,
  context: { user: any; requestId: string }
) {
  const { user, requestId } = context;
  const userId = user?.id || 'unknown';

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
    let targetEventId: string | null = null;
    const supabase = await createServerSupabaseServiceClient();

    // Determine deletion mode
    if ('photoIds' in validation.data) {
      // Mode 1: Delete by specific photo IDs
      photoIds = validation.data.photoIds;
    } else {
      // Mode 2: Delete by filter (eventId + codeId)
      const { eventId, codeId } = validation.data;
      targetEventId = eventId;
      
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
        eventId: targetEventId,
      },
      'info'
    );

    // Reuse previously created supabase service client

    // Obtener paths de las fotos para borrar del storage
    const { data: photos, error: fetchError } = await supabase
      .from('photos')
      .select('id, event_id, storage_path, preview_path')
      .in('id', photoIds);

    if (fetchError) {
      console.error('Error obteniendo fotos:', fetchError);
      return NextResponse.json(
        { error: 'Error obteniendo fotos' },
        { status: 500 }
      );
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: 'No photos found for the provided identifiers' },
        { status: 404 }
      );
    }

    const eventIds = new Set(
      photos
        .map((photo) => photo.event_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );

    if (targetEventId) {
      if (eventIds.size > 0 && (!eventIds.has(targetEventId) || eventIds.size > 1)) {
        return NextResponse.json(
          { error: 'Photos do not belong exclusively to the requested event' },
          { status: 400 }
        );
      }
    } else {
      if (eventIds.size === 0) {
        return NextResponse.json(
          { error: 'Unable to determine event ownership for selected photos' },
          { status: 400 }
        );
      }
      if (eventIds.size > 1) {
        return NextResponse.json(
          { error: 'Photos belong to multiple events. Delete per event to avoid mistakes.' },
          { status: 400 }
        );
      }
      targetEventId = Array.from(eventIds)[0] ?? null;
    }

    if (targetEventId) {
      const { data: eventRecord, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', targetEventId)
        .maybeSingle();

      if (eventError || !eventRecord) {
        return NextResponse.json(
          { error: 'Event not found or not accessible' },
          { status: 404 }
        );
      }
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
        eventId: targetEventId,
      },
      'info'
    );

    return NextResponse.json({
      success: true,
      message: `${photoIds.length} foto(s) borrada(s)`,
      deleted: photoIds.length,
      eventId: targetEventId,
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

export const DELETE = withRobustAuth(handleDELETE);
