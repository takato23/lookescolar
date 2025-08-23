import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

// GET /admin/events/{eventId}/photos?folderId={folderId}&page={page}&limit={limit}
export const GET = RateLimitMiddleware.withRateLimit(
  withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
    const requestId = crypto.randomUUID();
    
    try {
      const eventId = params.id;
      const url = new URL(req.url);
      const folderId = url.searchParams.get('folderId');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100); // Max 100 per page
      const includeSignedUrls = url.searchParams.get('includeSignedUrls') === 'true';
      const sortBy = url.searchParams.get('sortBy') || 'created_at';
      const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
      
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
        return NextResponse.json(
          { success: false, error: 'Event not found' },
          { status: 404 }
        );
      }

      // If folderId is provided, validate it exists and belongs to the event
      if (folderId) {
        const { data: folder, error: folderError } = await supabase
          .from('event_folders')
          .select('id, event_id')
          .eq('id', folderId)
          .single();

        if (folderError || !folder) {
          return NextResponse.json(
            { success: false, error: 'Folder not found' },
            { status: 404 }
          );
        }

        if (folder.event_id !== eventId) {
          return NextResponse.json(
            { success: false, error: 'Folder does not belong to this event' },
            { status: 400 }
          );
        }
      }

      // Build photos query
      let photosQuery = supabase
        .from('photos')
        .select(`
          id,
          event_id,
          folder_id,
          original_filename,
          storage_path,
          preview_path,
          watermark_path,
          file_size,
          width,
          height,
          approved,
          processing_status,
          metadata,
          created_at,
          updated_at
        `)
        .eq('event_id', eventId);

      // Filter by folder
      if (folderId) {
        photosQuery = photosQuery.eq('folder_id', folderId);
      } else {
        // If no folderId specified, get photos in root folder (null folder_id)
        photosQuery = photosQuery.is('folder_id', null);
      }

      // Add sorting
      const validSortFields = ['created_at', 'original_filename', 'file_size', 'updated_at'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      photosQuery = photosQuery.order(sortField, { ascending: sortOrder === 'asc' });

      // Get total count for pagination
      const { count: totalCount, error: countError } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('folder_id', folderId || null);

      if (countError) {
        logger.error('Failed to get photos count', {
          requestId,
          eventId,
          folderId,
          error: countError.message,
        });
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      photosQuery = photosQuery.range(offset, offset + limit - 1);

      // Execute query
      const { data: photos, error: photosError } = await photosQuery;

      if (photosError) {
        logger.error('Failed to fetch photos', {
          requestId,
          eventId,
          folderId,
          error: photosError.message,
        });
        
        return NextResponse.json(
          { success: false, error: 'Failed to fetch photos' },
          { status: 500 }
        );
      }

      // Generate signed URLs if requested
      let processedPhotos = photos || [];
      
      if (includeSignedUrls && processedPhotos.length > 0) {
        const signedUrlPromises = processedPhotos.map(async (photo) => {
          try {
            // Use preview path if available, fallback to storage path
            const path = photo.preview_path || photo.storage_path;
            if (!path) return photo;

            const { data: signedUrlData, error: urlError } = await supabase.storage
              .from('photos')
              .createSignedUrl(path, 3600); // 1 hour expiry

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
              signed_url_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
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
        folder: folderId ? {
          id: folderId,
          // TODO: Add folder details if needed
        } : null,
      });

    } catch (error) {
      logger.error('Unexpected error in photos GET endpoint', {
        requestId,
        eventId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
);