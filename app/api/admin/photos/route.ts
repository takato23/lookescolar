/* eslint-disable @typescript-eslint/no-unused-vars */

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
    const buildPreviewProxyUrl = (path?: string | null) => {
      if (!path || typeof path !== 'string') return null;
      if (path.startsWith('http')) return path;
      const normalized = path.replace(/^\/+/, '').trim();
      if (!normalized) return null;
      if (!/\.(png|jpg|jpeg|webp|gif|avif)$/i.test(normalized)) return null;
      if (
        normalized.includes('/') &&
        !/(^|\/)(previews|watermarks|watermarked|originals)\//i.test(normalized)
      ) {
        return null;
      }
      return `/admin/previews/${normalized}`;
    };

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
    const selectColumns = `
      id,
      folder_id,
      filename,
      original_path,
      storage_path,
      preview_path,
      watermark_path,
      file_size,
      mime_type,
      status,
      created_at,
      metadata,
      folders!inner(
        id,
        event_id,
        path
      )
    `;

    const buildBaseQuery = () =>
      serviceClient
        .from('assets')
        .select(selectColumns, { count: 'exact' });

    let query = buildBaseQuery();

    if (eventId) {
      query = query.eq('folders.event_id', eventId);
    }

    if (codeId === 'null') {
      query = query.is('folder_id', null);
    } else if (codeId) {
      query = query.eq('folder_id', codeId);
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
    const { data: photos, error, count } = await query;
    const queryDuration = Date.now() - queryStartTime;

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
      const folderInfo = Array.isArray(asset.folders)
        ? asset.folders[0]
        : asset.folders;
      const derivedEventId =
        folderInfo && typeof folderInfo.event_id === 'string'
          ? folderInfo.event_id
          : null;
      const storagePath =
        asset.original_path ??
        asset.storage_path ??
        null;

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

      const proxyPreview =
        preview_url ??
        buildPreviewProxyUrl(
          asset.preview_path ?? asset.watermark_path ?? asset.original_path ?? null
        );
      
      // Map assets table fields to photos API response format
      return {
        id: asset.id,
        event_id: derivedEventId,
        folder_id: asset.folder_id,
        filename: asset.filename,
        original_filename: asset.filename, // Map filename to original_filename for compatibility
        storage_path: storagePath,
        original_path: asset.original_path ?? null,
        preview_path: asset.preview_path ?? null,
        watermark_path: asset.watermark_path ?? null, // Include watermark_path for fallback
        preview_url: proxyPreview,
        approved:
          asset.metadata && typeof asset.metadata?.approved === 'boolean'
            ? asset.metadata.approved
            : true,
        created_at: asset.created_at,
        file_size: asset.file_size ?? null,
        width: null, // Not in current assets schema
        height: null, // Not in current assets schema
        subjects: [], // Empty for now to save memory - can be loaded separately if needed
        tagged: false, // Simplified for memory - can be enhanced later
        status: asset.status || 'ready', // Include status from assets table
        metadata: asset.metadata ?? null,
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
    let assetsToDelete: any[] | null = null;
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

      // Build query to get asset IDs by filter
      let query = supabase
        .from('assets')
        .select(
          `
          id,
          folder_id,
          original_path,
          storage_path,
          preview_path,
          watermark_path,
          folders!inner(
            event_id
          )
        `
        )
        .eq('folders.event_id', eventId);

      if (codeId === 'null') {
        query = query.is('folder_id', null);
      } else {
        query = query.eq('folder_id', codeId);
      }

      const { data: records, error: queryError } = await query;

      if (queryError) {
        console.error('Error querying assets by filter:', queryError);
        return NextResponse.json(
          { error: 'Error finding photos to delete' },
          { status: 500 }
        );
      }

      if (!records || records.length === 0) {
        // No photos match the filter - return success with 0 deleted
        return NextResponse.json({
          success: true,
          message: 'No photos found matching the filter',
          deleted: 0,
        });
      }
      assetsToDelete = records;
      photoIds = records.map((p) => p.id);
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

    if (!assetsToDelete) {
      const { data, error: fetchError } = await supabase
        .from('assets')
        .select(
          `
          id,
          folder_id,
          original_path,
          storage_path,
          preview_path,
          watermark_path,
          folders(
            event_id
          )
        `
        )
        .in('id', photoIds);

      if (fetchError) {
        console.error('Error obteniendo assets:', fetchError);
        return NextResponse.json(
          { error: 'Error obteniendo fotos' },
          { status: 500 }
        );
      }

      assetsToDelete = data ?? [];
    }

    if (!assetsToDelete || assetsToDelete.length === 0) {
      return NextResponse.json(
        { error: 'No photos found for the provided identifiers' },
        { status: 404 }
      );
    }

    const eventIds = new Set(
      assetsToDelete
        .map((asset: any) => {
          const folderInfo = Array.isArray(asset.folders)
            ? asset.folders[0]
            : asset.folders;
          return folderInfo?.event_id ?? null;
        })
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

    const bucketGroups = new Map<string, Set<string>>();
    const ORIGINAL_BUCKET =
      process.env['STORAGE_BUCKET_ORIGINAL'] ||
      process.env['STORAGE_BUCKET'] ||
      'photo-private';
    const PREVIEW_BUCKET =
      process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';

    const normalizePath = (raw: string | null | undefined) => {
      if (!raw || !SecurityValidator.isValidStoragePath(raw)) {
        return null;
      }
      let normalized = raw.replace(/^\/+/, '').trim();
      if (!normalized) return null;
      const segments = normalized.split('/');
      let bucket: string | null = null;
      if (segments[0] === PREVIEW_BUCKET || segments[0] === ORIGINAL_BUCKET) {
        bucket = segments.shift() || null;
        normalized = segments.join('/');
      }
      if (!bucket) {
        if (
          /(previews|uploads|thumbnails|watermark)/i.test(normalized)
        ) {
          bucket = PREVIEW_BUCKET;
        } else {
          bucket = ORIGINAL_BUCKET;
        }
      }
      if (!bucket || !normalized) {
        return null;
      }
      return { bucket, key: normalized };
    };

    const resolvedAssets = assetsToDelete ?? [];

    resolvedAssets.forEach((asset: any) => {
      [
        asset.original_path,
        asset.storage_path,
        asset.preview_path,
        asset.watermark_path,
      ].forEach((maybePath) => {
        const resolved = normalizePath(maybePath);
        if (!resolved) return;
        const existing = bucketGroups.get(resolved.bucket) ?? new Set<string>();
        existing.add(resolved.key);
        bucketGroups.set(resolved.bucket, existing);
      });
    });

    for (const [bucket, keys] of bucketGroups) {
      if (keys.size === 0) continue;
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove(Array.from(keys));
      if (storageError) {
        console.error(`Error borrando archivos del bucket ${bucket}:`, storageError);
      }
    }

    // Borrar registros de la DB
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .in('id', photoIds);

    if (deleteError) {
      console.error('Error borrando assets de la DB:', deleteError);
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
