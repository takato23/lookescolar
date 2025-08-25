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

// POST /api/admin/photos/bulk-approve
// Bulk approve or reject photos
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

      const { photoIds, approved } = body;

      logger.info('Bulk approve/reject photos request', {
        requestId,
        photoCount: photoIds?.length || 0,
        approved
      });

      // Validate input
      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'photoIds array is required and must not be empty' },
          { status: 400 }
        );
      }

      if (typeof approved !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'approved must be a boolean' },
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

      // Update photos approval status
      const { data, error } = await supabase
        .from('photos')
        .update({
          approved,
          updated_at: new Date().toISOString()
        })
        .in('id', photoIds)
        .select('id, original_filename, approved');

      if (error) {
        logger.error('Failed to bulk update photo approval', {
          requestId,
          photoIds: photoIds.slice(0, 5), // Log first 5 IDs for debugging
          approved,
          error: error.message
        });

        return NextResponse.json(
          { success: false, error: 'Failed to update photos' },
          { status: 500 }
        );
      }

      const updatedCount = data?.length || 0;

      logger.info('Successfully bulk updated photo approval', {
        requestId,
        requestedCount: photoIds.length,
        updatedCount,
        approved
      });

      return NextResponse.json({
        success: true,
        message: `${updatedCount} photos ${approved ? 'approved' : 'rejected'} successfully`,
        updatedCount,
        updatedPhotos: data
      });

    } catch (error) {
      logger.error('Unexpected error in bulk approve endpoint', {
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