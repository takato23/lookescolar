import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

// POST /admin/photos/finalize-upload
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

      const {
        uploadId,
        storagePath,
        filename,
        originalFilename,
        eventId,
        folderId,
        metadata = {},
      } = body;

      logger.info('Finalizing photo upload', {
        requestId,
        uploadId,
        storagePath,
        filename,
        eventId,
        folderId: folderId || 'root',
      });

      // Validate required fields
      if (!uploadId || typeof uploadId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Upload ID is required' },
          { status: 400 }
        );
      }

      if (!storagePath || typeof storagePath !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Storage path is required' },
          { status: 400 }
        );
      }

      if (!filename || typeof filename !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Filename is required' },
          { status: 400 }
        );
      }

      if (!originalFilename || typeof originalFilename !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Original filename is required' },
          { status: 400 }
        );
      }

      if (!eventId || typeof eventId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Event ID is required' },
          { status: 400 }
        );
      }

      const supabase = await createServerSupabaseServiceClient();

      // Validate that the event exists
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name')
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
          .select('id, event_id, name')
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

      // Verify the file was uploaded successfully by checking if it exists
      const { data: fileList, error: listError } = await supabase.storage
        .from('photos')
        .list(storagePath.split('/').slice(0, -1).join('/'), {
          search: filename,
        });

      if (listError) {
        logger.error('Failed to verify uploaded file', {
          requestId,
          storagePath,
          filename,
          error: listError.message,
        });

        return NextResponse.json(
          { success: false, error: 'Failed to verify uploaded file' },
          { status: 500 }
        );
      }

      const uploadedFile = fileList?.find((file) => file.name === filename);
      if (!uploadedFile) {
        return NextResponse.json(
          {
            success: false,
            error: 'Uploaded file not found. Upload may have failed.',
          },
          { status: 404 }
        );
      }

      // Extract image dimensions and other metadata if available
      let width = metadata.width || null;
      let height = metadata.height || null;
      const fileSize = uploadedFile.metadata?.size || metadata.fileSize || null;

      // If we don't have dimensions, try to get them from the file
      if (!width || !height) {
        try {
          // For now, we'll set default dimensions
          // In a real implementation, you might want to process the image to get actual dimensions
          width = width || 1920;
          height = height || 1080;
        } catch (error) {
          logger.warn('Could not extract image dimensions', {
            requestId,
            storagePath,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Create photo record in database
      const photoData = {
        event_id: eventId,
        folder_id: folderId || null,
        original_filename: originalFilename,
        storage_path: storagePath,
        file_size: fileSize,
        width: width,
        height: height,
        approved: false, // Photos start as unapproved
        processing_status: 'completed', // Mark as completed since upload is done
        metadata: {
          ...metadata,
          upload_id: uploadId,
          uploaded_at: new Date().toISOString(),
          content_type: metadata.contentType || 'image/jpeg',
        },
      };

      const { data: photo, error: photoError } = await supabase
        .from('photos')
        .insert(photoData)
        .select()
        .single();

      if (photoError) {
        logger.error('Failed to create photo record', {
          requestId,
          photoData,
          error: photoError.message,
        });

        // If database insertion fails, we should clean up the uploaded file
        try {
          await supabase.storage.from('photos').remove([storagePath]);
        } catch (cleanupError) {
          logger.error('Failed to cleanup uploaded file after database error', {
            requestId,
            storagePath,
            error:
              cleanupError instanceof Error
                ? cleanupError.message
                : 'Unknown error',
          });
        }

        return NextResponse.json(
          { success: false, error: 'Failed to create photo record' },
          { status: 500 }
        );
      }

      logger.info('Successfully finalized photo upload', {
        requestId,
        photoId: photo.id,
        filename: originalFilename,
        eventId,
        folderId: folderId || 'root',
        fileSize,
      });

      return NextResponse.json({
        success: true,
        photo: {
          id: photo.id,
          event_id: photo.event_id,
          folder_id: photo.folder_id,
          original_filename: photo.original_filename,
          storage_path: photo.storage_path,
          file_size: photo.file_size,
          width: photo.width,
          height: photo.height,
          approved: photo.approved,
          processing_status: photo.processing_status,
          created_at: photo.created_at,
          updated_at: photo.updated_at,
        },
        message: 'Photo uploaded successfully',
      });
    } catch (error) {
      logger.error('Unexpected error in finalize upload endpoint', {
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
