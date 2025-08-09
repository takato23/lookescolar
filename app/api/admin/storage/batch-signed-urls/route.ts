import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth, SecurityLogger } from '@/lib/middleware/auth.middleware';
import {
  batchSignedUrlSchema,
  SecurityValidator,
} from '@/lib/security/validation';
import pLimit from 'p-limit';

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60;
const MAX_CONCURRENT_SIGNED_URLS = 5;

// In-memory rate limiting (consider using Redis/Upstash in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(key);

  if (!limit || limit.resetTime < now) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  limit.count++;
  return true;
}

async function handlePOST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const userId = request.headers.get('x-user-id') || 'unknown';
  const userEmail = request.headers.get('x-user-email') || 'unknown';

  // Rate limiting by user
  const rateLimitKey = `batch-signed-url:${userId}`;
  if (!checkRateLimit(rateLimitKey)) {
    SecurityLogger.logSecurityEvent(
      'rate_limit_exceeded',
      {
        requestId,
        userId,
        endpoint: 'batch-signed-urls',
      },
      'warning'
    );

    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please wait before making more requests.',
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // Validate input
    const validation = batchSignedUrlSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { photoIds } = validation.data;

    SecurityLogger.logSecurityEvent(
      'batch_signed_url_request',
      {
        requestId,
        userId,
        userEmail,
        photoCount: photoIds.length,
      },
      'info'
    );

    const supabase = await createServerSupabaseServiceClient();

    // Get photo paths in single query
    const { data: photos, error: fetchError } = await supabase
      .from('photos')
      .select('id, storage_path, preview_path, event_id')
      .in('id', photoIds);

    if (fetchError) {
      SecurityLogger.logSecurityEvent(
        'batch_signed_url_fetch_error',
        {
          requestId,
          userId,
          error: fetchError.message,
        },
        'error'
      );

      return NextResponse.json(
        { error: 'Error fetching photos' },
        { status: 500 }
      );
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({
        signedUrls: {},
        errors: ['No photos found for the provided IDs'],
      });
    }

    // TODO: Verify user has access to these photos
    // This is a placeholder - implement based on your authorization model
    // For example, check if all photos belong to events the user can access

    // Generate signed URLs with concurrency control
    const limit = pLimit(MAX_CONCURRENT_SIGNED_URLS);
    const signedUrls: Record<string, string> = {};
    const errors: string[] = [];

    const urlPromises = photos.map((photo) =>
      limit(async () => {
        try {
          const path = photo.preview_path || photo.storage_path;

          if (!path) {
            errors.push(`${photo.id}: No storage path available`);
            return;
          }

          // Validate storage path to prevent path traversal
          if (!SecurityValidator.isValidStoragePath(path)) {
            SecurityLogger.logSecurityEvent(
              'invalid_storage_path',
              {
                requestId,
                userId,
                photoId: photo.id,
                path: SecurityValidator.maskSensitiveData(path, 'url'),
              },
              'warning'
            );

            errors.push(`${photo.id}: Invalid storage path`);
            return;
          }

          const { data, error } = await supabase.storage
            .from('photos')
            .createSignedUrl(path, 3600); // 1 hour expiration

          if (error) {
            errors.push(`${photo.id}: ${error.message}`);
            return;
          }

          if (data?.signedUrl) {
            signedUrls[photo.id] = data.signedUrl;
          }
        } catch (err) {
          errors.push(
            `${photo.id}: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }
      })
    );

    await Promise.all(urlPromises);

    const successCount = Object.keys(signedUrls).length;
    const errorCount = errors.length;

    SecurityLogger.logSecurityEvent(
      'batch_signed_url_complete',
      {
        requestId,
        userId,
        requested: photoIds.length,
        successful: successCount,
        failed: errorCount,
      },
      'info'
    );

    // Clean up old rate limit entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to clean up
      const now = Date.now();
      for (const [key, limit] of rateLimitMap.entries()) {
        if (limit.resetTime < now) {
          rateLimitMap.delete(key);
        }
      }
    }

    return NextResponse.json(
      {
        signedUrls,
        errors: errors.length > 0 ? errors : undefined,
        meta: {
          requested: photoIds.length,
          successful: successCount,
          failed: errorCount,
          expiresIn: 3600, // seconds
        },
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
          'X-Request-Id': requestId,
        },
      }
    );
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'batch_signed_url_error',
      {
        requestId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export wrapped with authentication
export const POST = withAuth(handlePOST);
