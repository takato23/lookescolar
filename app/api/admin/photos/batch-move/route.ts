import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

// PATCH /admin/photos/batch-move
export const PATCH = RateLimitMiddleware.withRateLimit(
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

      const { photoIds, folderId } = body;

      logger.info('Batch moving photos', {
        requestId,
        photoCount: photoIds?.length || 0,
        targetFolderId: folderId || 'root',
      });

      // Validate input
      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Photo IDs array is required and must not be empty' },
          { status: 400 }
        );
      }

      if (photoIds.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Cannot move more than 100 photos at once' },
          { status: 400 }
        );
      }

      // Validate all photoIds are valid UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!photoIds.every(id => typeof id === 'string' && uuidRegex.test(id))) {
        return NextResponse.json(
          { success: false, error: 'All photo IDs must be valid UUIDs' },
          { status: 400 }
        );
      }

      const supabase = await createServerSupabaseServiceClient();

      // If folderId is provided, validate it exists
      let targetFolder = null;
      if (folderId) {
        const { data: folder, error: folderError } = await supabase
          .from('event_folders')
          .select('id, event_id, name')
          .eq('id', folderId)
          .single();

        if (folderError || !folder) {
          return NextResponse.json(
            { success: false, error: 'Target folder not found' },
            { status: 404 }
          );
        }

        targetFolder = folder;
      }

      // Get photos to validate they exist and get their current event
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('id, event_id, folder_id, original_filename')
        .in('id', photoIds);

      if (photosError) {
        logger.error('Failed to fetch photos for validation', {
          requestId,
          photoIds,
          error: photosError.message,
        });
        
        return NextResponse.json(
          { success: false, error: 'Failed to validate photos' },
          { status: 500 }
        );
      }

      if (!photos || photos.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No photos found with the provided IDs' },
          { status: 404 }
        );
      }

      if (photos.length !== photoIds.length) {
        const foundIds = photos.map(p => p.id);
        const missingIds = photoIds.filter(id => !foundIds.includes(id));
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Some photos were not found',
            details: { missing: missingIds }
          },
          { status: 404 }
        );
      }

      // Validate all photos belong to the same event
      const eventIds = [...new Set(photos.map(p => p.event_id))];
      if (eventIds.length > 1) {
        return NextResponse.json(
          { success: false, error: 'All photos must belong to the same event' },
          { status: 400 }
        );
      }

      const eventId = eventIds[0];

      // If target folder is specified, validate it belongs to the same event
      if (targetFolder && targetFolder.event_id !== eventId) {
        return NextResponse.json(
          { success: false, error: 'Target folder must belong to the same event as the photos' },
          { status: 400 }
        );
      }

      // Check if any photos are already in the target folder
      const alreadyInTarget = photos.filter(p => p.folder_id === folderId);
      if (alreadyInTarget.length > 0) {
        logger.info('Some photos already in target folder', {
          requestId,
          alreadyInTargetCount: alreadyInTarget.length,
          targetFolderId: folderId,
        });
      }

      // Perform the batch update
      const { data: updatedPhotos, error: updateError } = await supabase
        .from('photos')
        .update({ 
          folder_id: folderId || null,
          updated_at: new Date().toISOString(),
        })
        .in('id', photoIds)
        .select('id, folder_id, original_filename');

      if (updateError) {
        logger.error('Failed to update photos', {
          requestId,
          photoIds,
          targetFolderId: folderId,
          error: updateError.message,
        });
        
        return NextResponse.json(
          { success: false, error: 'Failed to move photos' },
          { status: 500 }
        );
      }

      // Count successfully moved photos (excluding those already in target)
      const actuallyMoved = photos.filter(p => p.folder_id !== folderId).length;

      logger.info('Successfully moved photos', {
        requestId,
        photoCount: photoIds.length,
        actuallyMoved,
        alreadyInTarget: alreadyInTarget.length,
        targetFolderId: folderId || 'root',
        targetFolderName: targetFolder?.name || 'Root',
      });

      return NextResponse.json({
        success: true,
        message: `Moved ${actuallyMoved} photos to ${targetFolder?.name || 'root folder'}`,
        moved: actuallyMoved,
        alreadyInTarget: alreadyInTarget.length,
        total: photoIds.length,
        targetFolder: targetFolder ? {
          id: targetFolder.id,
          name: targetFolder.name,
        } : null,
      });

    } catch (error) {
      logger.error('Unexpected error in batch move endpoint', {
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