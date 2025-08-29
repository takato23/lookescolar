import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

// GET /admin/events/{eventId}/photos?folderId={folderId}&page={page}&limit={limit}
export const GET = RateLimitMiddleware.withRateLimit(
  withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const requestId = crypto.randomUUID();
    let eventId: string | undefined;

    try {
      const resolvedParams = await params;
      eventId = resolvedParams.id;
      const url = new URL(req.url);
      const folderId = url.searchParams.get('folderId');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(
        parseInt(url.searchParams.get('limit') || '50'),
        100
      ); // Max 100 per page
      const includeSignedUrls =
        url.searchParams.get('includeSignedUrls') === 'true';
      const sortBy = url.searchParams.get('sortBy') || 'created_at';
      const sortOrder =
        url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

      logger.info('Fetching photos for event folder', {
        requestId,
        eventId,
        folderId: folderId || 'root',
        page,
        limit,
        includeSignedUrls,
        sortBy,
        sortOrder,
      });

      if (!eventId) {
        return NextResponse.json(
          { success: false, error: 'Event ID is required' },
          { status: 400 }
        );
      }

      const supabase = await createServerSupabaseServiceClient();

      // Validate that the event exists
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        // Graceful fallback: allow empty results to avoid breaking UI flows
        return NextResponse.json({
          success: true,
          photos: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasMore: false,
          },
          folder: folderId ? { id: folderId } : null,
        });
      }

      // Skip folder validation for now - folders system is not yet integrated with legacy photos
      if (folderId) {
        logger.info('Folder ID provided but folders system not integrated with legacy photos', {
          requestId,
          folderId,
          eventId
        });
      }

      // Build assets query - NUEVO SISTEMA via folders
      let targetFolderIds: string[] = [];
      
      if (folderId) {
        // Usar carpeta específica
        targetFolderIds = [folderId];
        logger.info('Using specific folder', { requestId, folderId });
      } else {
        // Obtener todas las carpetas del evento
        const { data: folders, error: foldersError } = await supabase
          .from('folders')
          .select('id')
          .eq('event_id', eventId);
        
        if (foldersError) {
          logger.error('Error fetching folders for event', {
            requestId,
            eventId,
            error: foldersError
          });
          return NextResponse.json(
            { success: false, error: 'Failed to fetch folders' },
            { status: 500 }
          );
        }
        
        targetFolderIds = folders?.map(f => f.id) || [];
        logger.info('Using all event folders', { requestId, folderCount: targetFolderIds.length });
      }

      if (targetFolderIds.length === 0) {
        logger.info('No folders found for event', { requestId, eventId });
        return NextResponse.json({
          success: true,
          data: {
            photos: [],
            pagination: {
              page: 1,
              limit,
              total: 0,
              totalPages: 0,
            },
          },
        });
      }

      // Build assets query
      let assetsQuery = supabase
        .from('assets')
        .select(
          `
          id,
          folder_id,
          filename,
          original_path,
          preview_path,
          checksum,
          file_size,
          mime_type,
          dimensions,
          status,
          metadata,
          created_at
        `
        )
        .in('folder_id', targetFolderIds);

      // Add sorting
      const validSortFields = [
        'created_at',
        'filename',
        'file_size',
      ];
      const sortField = validSortFields.includes(sortBy)
        ? sortBy
        : 'created_at';
      assetsQuery = assetsQuery.order(sortField, {
        ascending: sortOrder === 'asc',
      });

      // Get total count for pagination
      let countQuery = supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .in('folder_id', targetFolderIds);
      
      const { count: totalCount, error: countError } = await countQuery;

      if (countError) {
        logger.error('Failed to get assets count', {
          requestId,
          eventId,
          folderId,
          error: countError.message,
        });
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      assetsQuery = assetsQuery.range(offset, offset + limit - 1);

      // Execute query
      const { data: assets, error: assetsError } = await assetsQuery;

      if (assetsError) {
        logger.error('Failed to fetch assets', {
          requestId,
          eventId,
          folderId,
          error: assetsError.message,
        });

        return NextResponse.json(
          { success: false, error: 'Failed to fetch assets' },
          { status: 500 }
        );
      }

      // Map assets to legacy photo format for compatibility
      let processedPhotos = (assets || []).map((asset: any) => ({
        id: asset.id,
        event_id: eventId, // Derived from folder relationship
        subject_id: asset.metadata?.subject_id || null,
        storage_path: asset.original_path,
        width: asset.dimensions?.width || null,
        height: asset.dimensions?.height || null,
        approved: asset.status === 'ready',
        created_at: asset.created_at,
        // Additional asset fields
        folder_id: asset.folder_id,
        filename: asset.filename,
        preview_path: asset.preview_path,
        file_size: asset.file_size,
        mime_type: asset.mime_type,
        status: asset.status,
      }));

      // Generate signed URLs if requested
      if (includeSignedUrls && processedPhotos.length > 0) {
        const signedUrlPromises = processedPhotos.map(async (photo) => {
          try {
            // Use original_path from assets
            const path = photo.storage_path || photo.preview_path;
            if (!path) return photo;

            const { data: signedUrlData, error: urlError } =
              await supabase.storage.from('photos').createSignedUrl(path, 3600); // 1 hour expiry

            if (urlError) {
              logger.warn('Failed to generate signed URL for photo', {
                requestId,
                photoId: photo.id,
                path,
                error: urlError.message,
              });
              return photo;
            }

            return {
              ...photo,
              signed_url: signedUrlData.signedUrl,
              signed_url_expires_at: new Date(
                Date.now() + 3600 * 1000
              ).toISOString(),
            };
          } catch (error) {
            logger.warn('Error generating signed URL for photo', {
              requestId,
              photoId: photo.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            return photo;
          }
        });

        processedPhotos = await Promise.all(signedUrlPromises);
      }

      // Calculate pagination info
      const total = totalCount || 0;
      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      logger.info('Successfully fetched photos', {
        requestId,
        eventId,
        folderId: folderId || 'root',
        count: processedPhotos.length,
        total,
        page,
        totalPages,
      });

      return NextResponse.json({
        success: true,
        photos: processedPhotos,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore,
        },
        folder: folderId
          ? {
              id: folderId,
              // TODO: Add folder details if needed
            }
          : null,
      });
    } catch (error) {
      logger.error('Unexpected error in photos GET endpoint', {
        requestId,
        eventId: eventId || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
);
