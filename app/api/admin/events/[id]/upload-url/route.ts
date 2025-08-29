import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

// POST /admin/events/{eventId}/upload-url
export const POST = RateLimitMiddleware.withRateLimit(
  withAuth(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      const requestId = crypto.randomUUID();

      try {
        const eventId = (await params).id;

        if (!eventId) {
          return NextResponse.json(
            { success: false, error: 'Event ID is required' },
            { status: 400 }
          );
        }

        let body;
        try {
          body = await req.json();
        } catch {
          return NextResponse.json(
            { success: false, error: 'Invalid JSON in request body' },
            { status: 400 }
          );
        }

        const { filename, contentType, fileSize, folderId } = body;

        logger.info('Generating upload URL', {
          requestId,
          eventId,
          filename,
          contentType,
          fileSize,
          folderId: folderId || 'root',
        });

        // Validate required fields
        if (!filename || typeof filename !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Filename is required' },
            { status: 400 }
          );
        }

        if (!contentType || typeof contentType !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Content type is required' },
            { status: 400 }
          );
        }

        if (!fileSize || typeof fileSize !== 'number' || fileSize <= 0) {
          return NextResponse.json(
            { success: false, error: 'Valid file size is required' },
            { status: 400 }
          );
        }

        // Validate content type
        const allowedTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/heic',
          'image/heif',
        ];

        if (!allowedTypes.includes(contentType.toLowerCase())) {
          return NextResponse.json(
            {
              success: false,
              error: 'Unsupported file type. Only images are allowed.',
            },
            { status: 400 }
          );
        }

        // Validate file size (max 50MB)
        const maxFileSize = 50 * 1024 * 1024; // 50MB
        if (fileSize > maxFileSize) {
          return NextResponse.json(
            {
              success: false,
              error: 'File size exceeds maximum limit of 50MB',
            },
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

        // Generate unique filename to prevent conflicts
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const fileExtension = filename.split('.').pop() || '';
        const uniqueFilename = `${timestamp}-${randomString}.${fileExtension}`;

        // Construct storage path
        const storagePath = `events/${eventId}/uploads/${uniqueFilename}`;

        // Generate presigned URL for upload
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('photos')
          .createSignedUploadUrl(storagePath, {
            upsert: false, // Don't overwrite existing files
          });

        if (uploadError) {
          logger.error('Failed to generate upload URL', {
            requestId,
            eventId,
            filename,
            storagePath,
            error: uploadError.message,
          });

          return NextResponse.json(
            { success: false, error: 'Failed to generate upload URL' },
            { status: 500 }
          );
        }

        logger.info('Successfully generated upload URL', {
          requestId,
          eventId,
          filename: uniqueFilename,
          storagePath,
          folderId: folderId || 'root',
        });

        return NextResponse.json({
          success: true,
          uploadUrl: uploadData.signedUrl,
          uploadId: uploadData.token,
          storagePath,
          filename: uniqueFilename,
          originalFilename: filename,
          folderId: folderId || null,
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour
          metadata: {
            eventId,
            contentType,
            fileSize,
            timestamp,
          },
        });
      } catch (error) {
        logger.error('Unexpected error in upload URL endpoint', {
          requestId,
          eventId: eventId,
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
