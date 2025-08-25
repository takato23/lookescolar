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

// POST /api/admin/photos/bulk-move
// Bulk move photos to a different folder
export const POST = RateLimitMiddleware.withRateLimit(
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

      const { photoIds, target_folder_id } = body;

      logger.info('Bulk move photos request', {
        requestId,
        photoCount: photoIds?.length || 0,
        targetFolderId: target_folder_id || 'root'
      });

      // Validate input
      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'photoIds array is required and must not be empty' },
          { status: 400 }
        );
      }

      // Limit batch size to prevent overwhelming the database
      if (photoIds.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Maximum 100 photos per batch' },
          { status: 400 }
        );
      }

      // If target_folder_id is provided, validate it exists
      if (target_folder_id) {
        const { data: folderExists, error: folderError } = await supabase
          .from('event_folders')
          .select('id, name, event_id')
          .eq('id', target_folder_id)
          .single();

        if (folderError || !folderExists) {
          logger.error('Target folder not found', {
            requestId,
            targetFolderId: target_folder_id,
            error: folderError?.message
          });

          return NextResponse.json(
            { success: false, error: 'Target folder not found' },
            { status: 404 }
          );
        }

        // Get the event_id from one of the photos to validate folder belongs to same event
        const { data: samplePhoto, error: photoError } = await supabase
          .from('photos')
          .select('event_id')
          .eq('id', photoIds[0])
          .single();

        if (photoError || !samplePhoto) {
          return NextResponse.json(
            { success: false, error: 'Photo not found' },
            { status: 404 }
          );
        }

        if (folderExists.event_id !== samplePhoto.event_id) {
          return NextResponse.json(
            { success: false, error: 'Target folder does not belong to the same event' },
            { status: 400 }
          );
        }
      }

      // Update photos folder_id
      const { data, error } = await supabase
        .from('photos')
        .update({
          folder_id: target_folder_id || null,
          updated_at: new Date().toISOString()
        })
        .in('id', photoIds)
        .select('id, original_filename, folder_id');

      if (error) {
        logger.error('Failed to bulk move photos', {
          requestId,
          photoIds: photoIds.slice(0, 5), // Log first 5 IDs for debugging
          targetFolderId: target_folder_id,
          error: error.message
        });

        return NextResponse.json(
          { success: false, error: 'Failed to move photos' },
          { status: 500 }
        );
      }

      const movedCount = data?.length || 0;

      logger.info('Successfully bulk moved photos', {
        requestId,
        requestedCount: photoIds.length,
        movedCount,
        targetFolderId: target_folder_id || 'root'
      });

      return NextResponse.json({
        success: true,
        message: `${movedCount} photos moved successfully`,
        movedCount,
        movedPhotos: data,
        targetFolderId: target_folder_id
      });

    } catch (error) {
      logger.error('Unexpected error in bulk move endpoint', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
);