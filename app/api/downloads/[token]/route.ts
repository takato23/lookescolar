import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { downloadService } from '@/lib/services/download.service';

// =============================================================================
// GET - Validate download token and get info (without incrementing counter)
// =============================================================================

export const GET = RateLimitMiddleware.withRateLimit(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
  ) => {
    try {
      const { token } = await params;
      const supabase = await createServerSupabaseServiceClient();

      // Validate without recording
      const result = await downloadService.validateDownload({
        supabase,
        token,
      });

      if (!result.valid) {
        return NextResponse.json(
          { valid: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        valid: true,
        photoId: result.photo?.id,
        remainingDownloads: result.remainingDownloads,
        expiresAt: result.download?.expires_at,
        downloadCount: result.download?.download_count,
        maxDownloads: result.download?.max_downloads,
      });
    } catch (error) {
      console.error('[Downloads API] GET error:', error);
      return NextResponse.json(
        { error: 'Error al validar descarga' },
        { status: 500 }
      );
    }
  }
);

// =============================================================================
// POST - Record download and get signed URL
// =============================================================================

export const POST = RateLimitMiddleware.withRateLimit(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
  ) => {
    try {
      const { token } = await params;
      const supabase = await createServerSupabaseServiceClient();

      // Get client info for tracking
      const ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';
      const userAgent = request.headers.get('user-agent') || undefined;

      // Record download and get URL
      const result = await downloadService.recordDownload({
        supabase,
        token,
        ipAddress,
        userAgent,
      });

      if (!result.valid) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        downloadUrl: result.signedUrl,
        remainingDownloads: result.remainingDownloads,
        filename: result.photo?.storage_path.split('/').pop() || 'photo.jpg',
      });
    } catch (error) {
      console.error('[Downloads API] POST error:', error);
      return NextResponse.json(
        { error: 'Error al procesar descarga' },
        { status: 500 }
      );
    }
  }
);
