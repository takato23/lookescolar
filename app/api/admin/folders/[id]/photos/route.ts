import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

// GET /admin/folders/{folderId}/photos?limit={limit}&page={page}
export const GET = RateLimitMiddleware.withRateLimit(
  withAuth(
    async (req: NextRequest, context: RouteContext<{ id: string }>) => {
      const params = await context.params;
      const requestId = crypto.randomUUID();

      try {
        const folderId = params.id;
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(
          parseInt(url.searchParams.get('limit') || '50'),
          100
        );
        const includeSignedUrls =
          url.searchParams.get('includeSignedUrls') !== 'false';

        logger.info('Fetching photos for folder', {
          requestId,
          folderId,
          page,
          limit,
          includeSignedUrls,
        });

        if (!folderId) {
          return NextResponse.json(
            { success: false, error: 'Folder ID is required' },
            { status: 400 }
          );
        }

        const supabase = await createServerSupabaseServiceClient();

        // Validate that the folder exists
        const { data: folder, error: folderError } = await supabase
          .from('folders')
          .select('id, name, event_id')
          .eq('id', folderId)
          .single();

        if (folderError || !folder) {
          logger.warn('Folder not found', {
            requestId,
            folderId,
            error: folderError?.message,
          });
          // Return empty result instead of 404 to avoid breaking UI
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
          });
        }

        // Get photos/assets from this folder
        const offset = (page - 1) * limit;

        // Get count first
        const { count: totalCount, error: countError } = await supabase
          .from('assets')
          .select('*', { count: 'exact', head: true })
          .eq('folder_id', folderId);

        if (countError) {
          logger.error('Failed to get assets count', {
            requestId,
            folderId,
            error: countError.message,
          });
        }

        // Get assets
        const { data: assets, error: assetsError } = await supabase
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
          .eq('folder_id', folderId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (assetsError) {
          logger.error('Failed to fetch assets', {
            requestId,
            folderId,
            error: assetsError.message,
          });

          return NextResponse.json(
            { success: false, error: 'Failed to fetch photos' },
            { status: 500 }
          );
        }

        // Map assets to photo format with signed URLs
        let photos = (assets || []).map((asset: any) => ({
          id: asset.id,
          folder_id: asset.folder_id,
          event_id: folder.event_id,
          filename: asset.filename,
          original_filename: asset.filename || asset.metadata?.original_filename || 'foto',
          storage_path: asset.original_path,
          preview_path: asset.preview_path,
          file_size: asset.file_size,
          mime_type: asset.mime_type,
          width: asset.dimensions?.width || null,
          height: asset.dimensions?.height || null,
          status: asset.status,
          created_at: asset.created_at,
          metadata: asset.metadata,
        }));

        // Generate signed URLs for thumbnails
        if (includeSignedUrls && photos.length > 0) {
          const signedUrlPromises = photos.map(async (photo: any) => {
            try {
              const path = photo.preview_path || photo.storage_path;
              if (!path) return photo;

              const { data: signedUrlData, error: urlError } =
                await supabase.storage
                  .from('photos')
                  .createSignedUrl(path, 3600);

              if (urlError) {
                logger.warn('Failed to generate signed URL', {
                  requestId,
                  photoId: photo.id,
                  path,
                  error: urlError.message,
                });
                return photo;
              }

              return {
                ...photo,
                thumbnail_url: signedUrlData.signedUrl,
                preview_url: signedUrlData.signedUrl,
                watermark_url: signedUrlData.signedUrl,
                signed_url: signedUrlData.signedUrl,
              };
            } catch (error) {
              logger.warn('Error generating signed URL', {
                requestId,
                photoId: photo.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              return photo;
            }
          });

          photos = await Promise.all(signedUrlPromises);
        }

        const total = totalCount || 0;
        const totalPages = Math.ceil(total / limit);
        const hasMore = page < totalPages;

        logger.info('Successfully fetched folder photos', {
          requestId,
          folderId,
          count: photos.length,
          total,
          page,
        });

        return NextResponse.json({
          success: true,
          photos,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore,
          },
          folder: {
            id: folder.id,
            name: folder.name,
            event_id: folder.event_id,
          },
        });
      } catch (error) {
        logger.error('Unexpected error in folder photos endpoint', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        );
      }
    }
  )
);
