import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// DELETE /api/admin/photos/bulk-delete
// Bulk delete photos and their associated files
export const DELETE = RateLimitMiddleware.withRateLimit(
  withAuth(async (req: NextRequest) => {
    const requestId = crypto.randomUUID();

    try {
      let body;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON in request body' },
          { status: 400 }
        );
      }

      const { photoIds, force = false } = body;

      logger.info('Bulk delete photos request', {
        requestId,
        photoCount: photoIds?.length || 0,
        force,
      });

      // Validate input
      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'photoIds array is required and must not be empty',
          },
          { status: 400 }
        );
      }

      // Limit batch size to prevent overwhelming the database
      if (photoIds.length > 50) {
        return NextResponse.json(
          { success: false, error: 'Maximum 50 photos per batch for deletion' },
          { status: 400 }
        );
      }

      // Get photo details before deletion for file cleanup
      const { data: photosToDelete, error: fetchError } = await supabase
        .from('photos')
        .select(
          'id, original_filename, storage_path, preview_path, watermark_path'
        )
        .in('id', photoIds);

      if (fetchError) {
        logger.error('Failed to fetch photos for deletion', {
          requestId,
          photoIds: photoIds.slice(0, 5),
          error: fetchError.message,
        });

        return NextResponse.json(
          { success: false, error: 'Failed to fetch photos' },
          { status: 500 }
        );
      }

      if (!photosToDelete || photosToDelete.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No photos found with provided IDs' },
          { status: 404 }
        );
      }

      // Track storage paths for cleanup
      const storagePaths: string[] = [];
      const deletionResults = {
        requested: photoIds.length,
        found: photosToDelete.length,
        databaseDeleted: 0,
        filesDeleted: 0,
        errors: [] as string[],
      };

      // Collect all storage paths for deletion
      photosToDelete.forEach((photo) => {
        if (photo.storage_path) storagePaths.push(photo.storage_path);
        if (photo.preview_path) storagePaths.push(photo.preview_path);
        if (photo.watermark_path) storagePaths.push(photo.watermark_path);
      });

      // Delete from database first
      const { error: deleteError } = await supabase
        .from('photos')
        .delete()
        .in('id', photoIds);

      if (deleteError) {
        logger.error('Failed to delete photos from database', {
          requestId,
          photoIds: photoIds.slice(0, 5),
          error: deleteError.message,
        });

        return NextResponse.json(
          { success: false, error: 'Failed to delete photos from database' },
          { status: 500 }
        );
      }

      deletionResults.databaseDeleted = photosToDelete.length;

      // Delete files from storage (best effort, don't fail if storage cleanup fails)
      if (storagePaths.length > 0) {
        try {
          // For FreeTierOptimizer, we only have preview/watermark paths, no originals
          // Group by bucket (assuming all are in 'photos' bucket)
          const { data: storageDeleteResult, error: storageError } =
            await supabase.storage.from('photos').remove(storagePaths);

          if (storageError) {
            logger.warn('Storage cleanup failed (non-critical)', {
              requestId,
              pathCount: storagePaths.length,
              error: storageError.message,
            });
            deletionResults.errors.push(
              `Storage cleanup failed: ${storageError.message}`
            );
          } else {
            deletionResults.filesDeleted = storageDeleteResult?.length || 0;
          }
        } catch (storageCleanupError) {
          logger.warn('Storage cleanup exception (non-critical)', {
            requestId,
            error:
              storageCleanupError instanceof Error
                ? storageCleanupError.message
                : 'Unknown error',
          });
          deletionResults.errors.push('Storage cleanup exception');
        }
      }

      logger.info('Successfully completed bulk photo deletion', {
        requestId,
        results: deletionResults,
      });

      return NextResponse.json({
        success: true,
        message: `${deletionResults.databaseDeleted} photos deleted successfully`,
        results: deletionResults,
      });
    } catch (error) {
      logger.error('Unexpected error in bulk delete endpoint', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
);
