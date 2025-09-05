import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { urlBatchingService } from '@/lib/services/url-batching.service';
import { logger } from '@/lib/utils/logger';

// POST /admin/photos/batch-urls
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
        photoIds,
        usePreview = false,
        expiryMinutes = 60,
        concurrencyLimit = 10,
      } = body;

      logger.info('Batch URL generation request', {
        requestId,
        photoCount: photoIds?.length || 0,
        usePreview,
        expiryMinutes,
        concurrencyLimit,
      });

      // Validate required fields
      if (!photoIds || !Array.isArray(photoIds)) {
        return NextResponse.json(
          { success: false, error: 'Photo IDs array is required' },
          { status: 400 }
        );
      }

      if (photoIds.length === 0) {
        return NextResponse.json({ success: true, urls: {}, errors: [] });
      }

      if (photoIds.length > 1000) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot process more than 1000 photos at once',
          },
          { status: 400 }
        );
      }

      // Validate expiry and concurrency parameters
      if (
        typeof expiryMinutes !== 'number' ||
        expiryMinutes < 1 ||
        expiryMinutes > 1440
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Expiry minutes must be between 1 and 1440',
          },
          { status: 400 }
        );
      }

      if (
        typeof concurrencyLimit !== 'number' ||
        concurrencyLimit < 1 ||
        concurrencyLimit > 50
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Concurrency limit must be between 1 and 50',
          },
          { status: 400 }
        );
      }

      const supabase = await createServerSupabaseServiceClient();

      // Get asset storage paths (unified assets table)
      const { data: photos, error: photosError } = await supabase
        .from('assets')
        .select('id, original_path, preview_path')
        .in('id', photoIds);

      if (photosError) {
        logger.error('Failed to fetch photos for batch URL generation', {
          requestId,
          photoIds,
          error: photosError.message,
        });
        return NextResponse.json(
          { success: false, error: 'Failed to fetch photos' },
          { status: 500 }
        );
      }

      if (!photos || photos.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No photos found' },
          { status: 404 }
        );
      }

      // Check for missing photos
      const foundPhotoIds = new Set(photos.map((p) => p.id));
      const missingPhotoIds = photoIds.filter((id) => !foundPhotoIds.has(id));

      if (missingPhotoIds.length > 0) {
        logger.warn('Some photos not found in batch URL request', {
          requestId,
          missingCount: missingPhotoIds.length,
          foundCount: photos.length,
        });
      }

      // Prepare batch requests
      const urlRequests = photos.map((photo: any) => ({
        photoId: photo.id,
        storagePath: photo.original_path,
        previewPath: photo.preview_path,
        usePreview,
        expiryMinutes,
      }));

      // Generate URLs using batching service
      const result = await urlBatchingService.batchGenerateUrls({
        requests: urlRequests,
        concurrencyLimit,
        expiryMinutes,
      });

      // Convert results to map for easier frontend consumption
      const urlMap: Record<string, string> = {};
      const expiryMap: Record<string, string> = {};

      result.urls.forEach((url) => {
        urlMap[url.photoId] = url.signedUrl;
        expiryMap[url.photoId] = url.expiresAt;
      });

      // Add missing photo IDs as errors
      const allErrors = [
        ...result.errors,
        ...missingPhotoIds.map((id) => `Photo not found: ${id}`),
      ];

      logger.info('Batch URL generation completed', {
        requestId,
        requestedCount: photoIds.length,
        successCount: result.urls.length,
        errorCount: allErrors.length,
        usePreview,
      });

      return NextResponse.json({
        success: result.success && missingPhotoIds.length === 0,
        urls: urlMap,
        expiresAt: expiryMap,
        errors: allErrors.length > 0 ? allErrors : undefined,
        stats: {
          requested: photoIds.length,
          successful: result.urls.length,
          failed: allErrors.length,
          missing: missingPhotoIds.length,
        },
      });
    } catch (error) {
      logger.error('Unexpected error in batch URL generation', {
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
