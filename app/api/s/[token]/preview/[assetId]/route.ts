/**
 * SECURE PREVIEW ENDPOINT - /api/s/[token]/preview/[assetId]
 *
 * Token-gated preview endpoint for photo viewing
 * Features: Access validation, audit logging, optimized previews
 */

import { NextRequest, NextResponse } from 'next/server';
import { hierarchicalGalleryService } from '../../../../../../lib/services/hierarchical-gallery.service';
import { headers } from 'next/headers';

interface RouteParams {
  params: {
    token: string;
    assetId: string;
  };
}

// Preview cache for performance
const previewCache = new Map<string, { url: string; expiresAt: number }>();
const PREVIEW_CACHE_TTL = 60 * 60 * 1000; // 1 hour

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

  try {
    // Step 1: Validate token
    const validation = await hierarchicalGalleryService.validateAccess(token);

    if (!validation.isValid) {
      await hierarchicalGalleryService.logAccess(token, 'view', {
        ip,
        userAgent,
        path: request.url,
        responseTimeMs: Date.now() - startTime,
        success: false,
        notes: `Preview denied: ${validation.reason}`,
      });

      return NextResponse.json(
        { error: 'Access denied', reason: validation.reason },
        { status: 403 }
      );
    }

    // Step 2: Verify asset access
    const canAccessAsset = await hierarchicalGalleryService.canAccessAsset(
      token,
      assetId
    );

    if (!canAccessAsset) {
      await hierarchicalGalleryService.logAccess(token, 'view', {
        ip,
        userAgent,
        path: request.url,
        responseTimeMs: Date.now() - startTime,
        success: false,
        notes: `Preview asset access denied: ${assetId}`,
      });

      return NextResponse.json(
        { error: 'Asset not accessible' },
        { status: 404 }
      );
    }

    // Step 3: Check cache first
    const cacheKey = `${token}:${assetId}`;
    const cached = previewCache.get(cacheKey);
    const now = Date.now();

    let previewUrl: string | null;

    if (cached && now < cached.expiresAt) {
      previewUrl = cached.url;
    } else {
      // Step 4: Generate fresh preview URL
      previewUrl = await hierarchicalGalleryService.getPreviewUrl(
        token,
        assetId
      );

      if (!previewUrl) {
        await hierarchicalGalleryService.logAccess(token, 'view', {
          ip,
          userAgent,
          path: request.url,
          responseTimeMs: Date.now() - startTime,
          success: false,
          notes: 'Failed to generate preview URL',
        });

        return NextResponse.json(
          { error: 'Preview unavailable' },
          { status: 404 }
        );
      }

      // Cache the URL
      previewCache.set(cacheKey, {
        url: previewUrl,
        expiresAt: now + PREVIEW_CACHE_TTL,
      });
    }

    // Step 5: Fetch and stream the preview
    const previewResponse = await fetch(previewUrl);

    if (!previewResponse.ok) {
      await hierarchicalGalleryService.logAccess(token, 'view', {
        ip,
        userAgent,
        path: request.url,
        responseTimeMs: Date.now() - startTime,
        success: false,
        notes: 'Preview fetch failed from storage',
      });

      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }

    const contentType =
      previewResponse.headers.get('content-type') || 'image/jpeg';
    const contentLength = previewResponse.headers.get('content-length');
    const imageBuffer = await previewResponse.arrayBuffer();

    // Step 6: Log successful preview access
    await hierarchicalGalleryService.logAccess(token, 'view', {
      ip,
      userAgent,
      path: request.url,
      responseTimeMs: Date.now() - startTime,
      success: true,
      notes: `Preview accessed (${imageBuffer.byteLength} bytes)`,
    });

    // Step 7: Return image with proper headers
    const response = new NextResponse(imageBuffer);

    response.headers.set('Content-Type', contentType);
    if (contentLength) {
      response.headers.set('Content-Length', contentLength);
    }

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');

    // Cache control for previews
    response.headers.set(
      'Cache-Control',
      'public, max-age=3600, s-maxage=7200'
    );
    response.headers.set('ETag', `"${assetId}"`);

    return response;
  } catch (error: any) {
    console.error('Preview endpoint error:', error);

    // Log the error
    await hierarchicalGalleryService
      .logAccess(token, 'view', {
        ip,
        userAgent,
        path: request.url,
        responseTimeMs: Date.now() - startTime,
        success: false,
        notes: `Server error: ${error.message}`,
      })
      .catch(() => {}); // Don't fail if logging fails

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
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
