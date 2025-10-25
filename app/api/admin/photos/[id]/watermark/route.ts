import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { watermarkService } from '@/lib/services/watermark.service';
import { logger } from '@/lib/utils/logger';

// POST /admin/photos/[id]/watermark
export const POST = RateLimitMiddleware.withRateLimit(
  withAuth(async (req: NextRequest, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const requestId = crypto.randomUUID();
    const photoId = params.id;

    try {
      let body;
      try {
        body = await req.json();
      } catch {
        // Allow empty body for default options
        body = {};
      }

      const {
        forceRegenerate = false,
        watermarkText,
        position = 'center',
        opacity = 0.3,
        maxWidth = 800,
        maxHeight = 600,
        quality = 70,
        format = 'jpeg',
      } = body;

      logger.info('Processing watermark request', {
        requestId,
        photoId,
        forceRegenerate,
        watermarkOptions: {
          position,
          opacity,
          maxWidth,
          maxHeight,
          quality,
          format,
        },
      });

      if (!photoId || typeof photoId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Valid photo ID is required' },
          { status: 400 }
        );
      }

      // Validate optional parameters
      if (
        opacity &&
        (typeof opacity !== 'number' || opacity < 0 || opacity > 1)
      ) {
        return NextResponse.json(
          { success: false, error: 'Opacity must be a number between 0 and 1' },
          { status: 400 }
        );
      }

      if (
        quality &&
        (typeof quality !== 'number' || quality < 1 || quality > 100)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Quality must be a number between 1 and 100',
          },
          { status: 400 }
        );
      }

      if (
        maxWidth &&
        (typeof maxWidth !== 'number' || maxWidth < 100 || maxWidth > 2000)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Max width must be between 100 and 2000 pixels',
          },
          { status: 400 }
        );
      }

      if (
        maxHeight &&
        (typeof maxHeight !== 'number' || maxHeight < 100 || maxHeight > 2000)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Max height must be between 100 and 2000 pixels',
          },
          { status: 400 }
        );
      }

      const validFormats = ['jpeg', 'webp', 'png'];
      if (format && !validFormats.includes(format)) {
        return NextResponse.json(
          {
            success: false,
            error: `Format must be one of: ${validFormats.join(', ')}`,
          },
          { status: 400 }
        );
      }

      const validPositions = [
        'center',
        'bottom-right',
        'bottom-center',
        'top-right',
      ];
      if (position && !validPositions.includes(position)) {
        return NextResponse.json(
          {
            success: false,
            error: `Position must be one of: ${validPositions.join(', ')}`,
          },
          { status: 400 }
        );
      }

      const supabase = await createServerSupabaseServiceClient();

      // Get photo details
      const { data: photo, error: photoError } = await supabase
        .from('photos')
        .select('id, storage_path, watermark_path, metadata, processing_status')
        .eq('id', photoId)
        .single();

      if (photoError || !photo) {
        logger.error('Photo not found', {
          requestId,
          photoId,
          error: photoError?.message,
        });
        return NextResponse.json(
          { success: false, error: 'Photo not found' },
          { status: 404 }
        );
      }

      // Check if watermark already exists and force regenerate is not requested
      if (photo.watermark_path && !forceRegenerate) {
        // Generate signed URL for existing watermark
        const { data: urlData, error: urlError } = await supabase.storage
          .from('photos')
          .createSignedUrl(photo.watermark_path, 3600);

        if (urlData?.signedUrl && !urlError) {
          logger.info('Returning existing watermarked preview', {
            requestId,
            photoId,
            watermarkPath: photo.watermark_path,
          });

          return NextResponse.json({
            success: true,
            preview: {
              url: urlData.signedUrl,
              path: photo.watermark_path,
              cached: true,
              metadata: photo.metadata?.preview || null,
            },
            message: 'Existing watermarked preview returned',
          });
        }
      }

      // Update processing status
      await supabase
        .from('photos')
        .update({
          processing_status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', photoId);

      // Process watermarked preview
      const processingOptions = {
        maxWidth,
        maxHeight,
        quality,
        format: format as 'jpeg' | 'webp' | 'png',
        watermark: {
          text: watermarkText || 'MUESTRA - NO VÁLIDA PARA VENTA',
          position: position as
            | 'center'
            | 'bottom-right'
            | 'bottom-center'
            | 'top-right',
          opacity,
          fontSize: 48,
          color: 'rgba(255, 255, 255, 0.8)',
          fontWeight: 'bold' as const,
        },
      };

      const result = await watermarkService.processPhotoPreview(
        photoId,
        photo.storage_path,
        processingOptions
      );

      if (!result.success || !result.data) {
        // Update processing status to failed
        await supabase
          .from('photos')
          .update({
            processing_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', photoId);

        logger.error('Failed to process watermarked preview', {
          requestId,
          photoId,
          error: result.error,
        });

        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to process watermark',
          },
          { status: 500 }
        );
      }

      // Update processing status to completed
      await supabase
        .from('photos')
        .update({
          processing_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', photoId);

      // Clean up old previews (async)
      watermarkService.cleanupOldPreviews(photoId).catch((error) => {
        logger.warn('Failed to cleanup old previews', {
          photoId,
          error: error.message,
        });
      });

      logger.info('Successfully processed watermarked preview', {
        requestId,
        photoId,
        previewPath: result.data.previewPath,
        forceRegenerate,
      });

      return NextResponse.json(
        {
          success: true,
          preview: {
            url: result.data.previewUrl,
            path: result.data.previewPath,
            cached: false,
            processingOptions,
          },
          message: 'Watermarked preview generated successfully',
        },
        { status: 201 }
      );
    } catch (error) {
      // Update processing status to failed if we have a photo ID
      try {
        const supabase = await createServerSupabaseServiceClient();
        await supabase
          .from('photos')
          .update({
            processing_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', photoId);
      } catch (updateError) {
        logger.error('Failed to update processing status after error', {
          requestId,
          photoId,
          updateError:
            updateError instanceof Error
              ? updateError.message
              : 'Unknown error',
        });
      }

      logger.error('Unexpected error in watermark endpoint', {
        requestId,
        photoId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
);

// GET /admin/photos/[id]/watermark - Get existing watermark info
export const GET = withAuth(
  async (req: NextRequest, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const requestId = crypto.randomUUID();
    const photoId = params.id;

    try {
      if (!photoId || typeof photoId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Valid photo ID is required' },
          { status: 400 }
        );
      }

      const supabase = await createServerSupabaseServiceClient();

      // Get photo details
      const { data: photo, error: photoError } = await supabase
        .from('photos')
        .select('id, watermark_path, metadata, processing_status')
        .eq('id', photoId)
        .single();

      if (photoError || !photo) {
        return NextResponse.json(
          { success: false, error: 'Photo not found' },
          { status: 404 }
        );
      }

      if (!photo.watermark_path) {
        return NextResponse.json({
          success: true,
          preview: null,
          message: 'No watermarked preview exists for this photo',
        });
      }

      // Generate signed URL
      const { data: urlData, error: urlError } = await supabase.storage
        .from('photos')
        .createSignedUrl(photo.watermark_path, 3600);

      if (urlError || !urlData?.signedUrl) {
        logger.error('Failed to generate signed URL for watermark', {
          requestId,
          photoId,
          watermarkPath: photo.watermark_path,
          error: urlError?.message,
        });

        return NextResponse.json(
          { success: false, error: 'Failed to access watermarked preview' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        preview: {
          url: urlData.signedUrl,
          path: photo.watermark_path,
          metadata: photo.metadata?.preview || null,
          processingStatus: photo.processing_status,
        },
        message: 'Watermarked preview information retrieved',
      });
    } catch (error) {
      logger.error('Unexpected error in watermark GET endpoint', {
        requestId,
        photoId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
