/**
 * SECURE DOWNLOAD ENDPOINT - /api/s/[token]/download/[assetId]
 *
 * Token-gated download endpoint with permission validation
 * Features: can_download verification, audit logging, signed URLs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hierarchicalGalleryService } from '../../../../../../lib/services/hierarchical-gallery.service';
import { headers } from 'next/headers';

interface RouteParams {
  params: {
    token: string;
    assetId: string;
  };
}

// Rate limiting for downloads
const downloadAttempts = new Map<
  string,
  { count: number; resetTime: number }
>();
const DOWNLOAD_RATE_LIMIT = 10; // downloads per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const attempt = downloadAttempts.get(key);

  if (!attempt || now > attempt.resetTime) {
    downloadAttempts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (attempt.count >= DOWNLOAD_RATE_LIMIT) {
    return false;
  }

  attempt.count++;
  return true;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token, assetId } = params;
  const startTime = Date.now();

  // Get client info for logging
  const headersList = headers();
  const ip =
    headersList.get('x-forwarded-for') ||
    headersList.get('x-real-ip') ||
    'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';
  const referer = headersList.get('referer');

  try {
    // Step 1: Validate token and get download permissions
    const validation = await hierarchicalGalleryService.validateAccess(token);

    if (!validation.isValid) {
      await hierarchicalGalleryService.logAccess(token, 'download', {
        ip,
        userAgent,
        path: request.url,
        responseTimeMs: Date.now() - startTime,
        success: false,
        notes: `Download denied: ${validation.reason}`,
      });

      return NextResponse.json(
        { error: 'Access denied', reason: validation.reason },
        { status: 403 }
      );
    }

    const context = validation.context!;

    // Step 2: Check if token allows downloads
    if (!context.canDownload) {
      await hierarchicalGalleryService.logAccess(token, 'download', {
        ip,
        userAgent,
        path: request.url,
        responseTimeMs: Date.now() - startTime,
        success: false,
        notes: `Download denied: token does not allow downloads`,
      });

      return NextResponse.json(
        {
          error: 'Download not permitted',
          message: 'This token does not allow downloads',
        },
        { status: 403 }
      );
    }

    // Step 3: Check rate limiting
    const rateLimitKey = `${ip}:${token}`;
    if (!checkRateLimit(rateLimitKey)) {
      await hierarchicalGalleryService.logAccess(token, 'download', {
        ip,
        userAgent,
        path: request.url,
        responseTimeMs: Date.now() - startTime,
        success: false,
        notes: 'Rate limit exceeded',
      });

      return NextResponse.json(
        { error: 'Rate limit exceeded', message: 'Too many download requests' },
        { status: 429 }
      );
    }

    // Step 4: Verify asset access
    const canAccessAsset = await hierarchicalGalleryService.canAccessAsset(
      token,
      assetId
    );

    if (!canAccessAsset) {
      await hierarchicalGalleryService.logAccess(token, 'download', {
        ip,
        userAgent,
        path: request.url,
        responseTimeMs: Date.now() - startTime,
        success: false,
        notes: `Asset access denied: ${assetId}`,
      });

      return NextResponse.json(
        {
          error: 'Asset not accessible',
          message: 'This asset is not available for your access level',
        },
        { status: 404 }
      );
    }

    // Step 5: Generate secure download URL
    const downloadUrl = await hierarchicalGalleryService.getDownloadUrl(
      token,
      assetId
    );

    if (!downloadUrl) {
      await hierarchicalGalleryService.logAccess(token, 'download', {
        ip,
        userAgent,
        path: request.url,
        responseTimeMs: Date.now() - startTime,
        success: false,
        notes: 'Failed to generate download URL',
      });

      return NextResponse.json(
        {
          error: 'Download unavailable',
          message: 'Unable to generate download URL',
        },
        { status: 500 }
      );
    }

    // Step 6: Get asset info for proper filename
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: asset } = await supabase
      .from('assets')
      .select('filename, file_size')
      .eq('id', assetId)
      .single();

    // Step 7: Fetch the file and stream it back
    const fileResponse = await fetch(downloadUrl);

    if (!fileResponse.ok) {
      await hierarchicalGalleryService.logAccess(token, 'download', {
        ip,
        userAgent,
        path: request.url,
        responseTimeMs: Date.now() - startTime,
        success: false,
        notes: 'File fetch failed from storage',
      });

      return NextResponse.json(
        {
          error: 'File not found',
          message: 'Unable to retrieve file from storage',
        },
        { status: 404 }
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();

    // Step 8: Log successful download
    await hierarchicalGalleryService.logAccess(token, 'download', {
      ip,
      userAgent,
      path: request.url,
      responseTimeMs: Date.now() - startTime,
      success: true,
      notes: `Downloaded ${asset?.filename || 'unknown'} (${fileBuffer.byteLength} bytes)`,
    });

    // Step 9: Return file with proper headers
    const response = new NextResponse(fileBuffer);

    // Set download headers
    response.headers.set('Content-Type', 'application/octet-stream');
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="${asset?.filename || `photo-${assetId}.jpg`}"`
    );
    response.headers.set('Content-Length', fileBuffer.byteLength.toString());

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Download-Options', 'noopen');
    response.headers.set('X-Frame-Options', 'DENY');

    // Cache control (allow caching for downloads)
    response.headers.set('Cache-Control', 'private, max-age=3600');

    return response;
  } catch (error: any) {
    console.error('Download endpoint error:', error);

    // Log the error
    await hierarchicalGalleryService
      .logAccess(token, 'download', {
        ip,
        userAgent,
        path: request.url,
        responseTimeMs: Date.now() - startTime,
        success: false,
        notes: `Server error: ${error.message}`,
      })
      .catch(() => {}); // Don't fail if logging fails

    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Only GET method allowed
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
