import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

// POST /admin/photos/sign-urls
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

      const { photoIds, expiresIn = 3600 } = body;

      logger.info('Generating batch signed URLs', {
        requestId,
        photoCount: photoIds?.length || 0,
        expiresIn,
      });

      // Validate input
      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Photo IDs array is required and must not be empty' },
          { status: 400 }
        );
      }

      if (photoIds.length > 50) {
        return NextResponse.json(
          { success: false, error: 'Cannot generate URLs for more than 50 photos at once' },
          { status: 400 }
        );
      }

      // Validate expiration time
      if (typeof expiresIn !== 'number' || expiresIn < 60 || expiresIn > 86400) {
        return NextResponse.json(
          { success: false, error: 'Expires in must be between 60 and 86400 seconds' },
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

      // Get photos to validate they exist and get their storage paths
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('id, storage_path, preview_path, watermark_path')
        .in('id', photoIds);

      if (photosError) {
        logger.error('Failed to fetch photos for URL generation', {
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

      // Generate signed URLs for each photo
      const signedUrls: Record<string, string> = {};
      const errors: Record<string, string> = {};
      
      await Promise.all(
        photos.map(async (photo) => {
          try {
            // Use preview path if available, fallback to storage path
            const path = photo.preview_path || photo.storage_path;
            
            if (!path) {
              errors[photo.id] = 'No storage path available';
              return;
            }

            const { data: signedUrlData, error: urlError } = await supabase.storage
              .from('photos')
              .createSignedUrl(path, expiresIn);

            if (urlError) {
              logger.warn('Failed to generate signed URL for photo', {
                requestId,
                photoId: photo.id,
                path,
                error: urlError.message,
              });
              errors[photo.id] = urlError.message;
              return;
            }

            if (signedUrlData?.signedUrl) {
              signedUrls[photo.id] = signedUrlData.signedUrl;
            } else {
              errors[photo.id] = 'No signed URL returned';
            }
          } catch (error) {
            logger.error('Unexpected error generating signed URL', {
              requestId,
              photoId: photo.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            errors[photo.id] = error instanceof Error ? error.message : 'Unknown error';
          }
        })
      );

      const successCount = Object.keys(signedUrls).length;
      const errorCount = Object.keys(errors).length;

      logger.info('Batch signed URL generation completed', {
        requestId,
        photoCount: photoIds.length,
        successCount,
        errorCount,
        expiresIn,
      });

      // Calculate expiration timestamp
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      const response = {
        success: true,
        signedUrls,
        expiresAt,
        expiresIn,
        summary: {
          total: photoIds.length,
          successful: successCount,
          failed: errorCount,
        },
        ...(errorCount > 0 && { errors }),
      };

      return NextResponse.json(response);

    } catch (error) {
      logger.error('Unexpected error in batch signed URLs endpoint', {
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