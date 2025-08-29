/**
 * Preview Image Proxy - Serves WebP previews from Supabase Storage
 * GET /admin/previews/[filename] - Proxy to Supabase storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

// Simple in-memory cache for signed URLs to avoid repeated database queries
const urlCache = new Map<string, { url: string; expires: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Validate filename format
    if (!filename || !filename.endsWith('_preview.webp')) {
      return NextResponse.json(
        { error: 'Invalid preview filename' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const cacheKey = `preview_${filename}`;
    
    // Check cache first
    const cached = urlCache.get(cacheKey);
    if (cached && cached.expires > now) {
      // Redirect to cached signed URL instead of proxying
      return NextResponse.redirect(cached.url, 302);
    }

    const supabase = await createServerSupabaseServiceClient();
    
    // Optimized: Use assets table instead of photos for better performance
    const baseFilename = filename.replace('_preview.webp', '');
    
    // Buscar por preview_path que es donde realmente están las rutas
    const { data: asset } = await supabase
      .from('assets')
      .select('preview_path, watermark_url, storage_path')
      .eq('preview_path', `previews/${filename}`)
      .eq('status', 'ready')
      .limit(1)
      .single();

    let signedUrl = null;

    // Helper function to check if URL would cause circular redirect
    const isCircularUrl = (url: string): boolean => {
      if (!url) return false;
      // Check if URL points back to our preview endpoint
      return url.includes('/admin/previews/') || url.includes('/api/admin/previews/');
    };

    console.log(`[PREVIEW] Processing ${filename}, asset:`, {
      hasPreviewUrl: !!asset?.preview_url,
      hasWatermarkUrl: !!asset?.watermark_url,
      hasStoragePath: !!asset?.storage_path,
      previewUrl: asset?.preview_url,
    });

    // Try direct preview_path first (but avoid circular redirects)
    if (asset?.preview_path && !isCircularUrl(asset.preview_path)) {
      // Generar URL firmada para preview_path
      const { data, error } = await supabase.storage
        .from('photos')
        .createSignedUrl(asset.preview_path, 3600);
      
      if (!error && data?.signedUrl) {
        signedUrl = data.signedUrl;
        console.log(`[PREVIEW] Generated signed URL from preview_path for ${filename}`);
      }
    } else if (asset?.watermark_url && !isCircularUrl(asset.watermark_url)) {
      signedUrl = asset.watermark_url;
      console.log(`[PREVIEW] Using watermark_url for ${filename}`);
    } else if (asset?.storage_path) {
      console.log(`[PREVIEW] Generating signed URL for ${filename} from storage_path: ${asset.storage_path}`);
      // Generate signed URL with transformation
      const { data, error } = await supabase.storage
        .from('photos')
        .createSignedUrl(asset.storage_path, 3600, {
          transform: {
            width: 800,
            height: 800,
            resize: 'contain'
          }
        });
      
      if (!error && data?.signedUrl) {
        signedUrl = data.signedUrl;
        console.log(`[PREVIEW] Generated signed URL for ${filename}`);
      } else {
        console.warn(`[PREVIEW] Failed to generate signed URL for ${filename}:`, error);
      }
    }

    // Final fallback: try direct storage lookup
    if (!signedUrl) {
      console.log(`[PREVIEW] Trying direct storage fallback for ${filename}`);
      const { data, error } = await supabase.storage
        .from('photos')
        .createSignedUrl(`previews/${filename}`, 3600);

      if (!error && data?.signedUrl) {
        signedUrl = data.signedUrl;
        console.log(`[PREVIEW] Using direct storage for ${filename}`);
      } else {
        console.warn(`[PREVIEW] Direct storage failed for ${filename}:`, error);
      }
    }

    if (!signedUrl) {
      console.warn(`[PREVIEW] No signed URL found for ${filename}, returning transparent pixel`);
      // Return a 1x1 transparent pixel instead of error to prevent infinite loading
      const transparentPixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64'
      );
      
      return new NextResponse(transparentPixel, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      });
    }

    console.log(`[PREVIEW] Redirecting ${filename} to: ${signedUrl.substring(0, 100)}...`);

    // Cache the URL
    urlCache.set(cacheKey, {
      url: signedUrl,
      expires: now + CACHE_DURATION,
    });

    // Clean up expired cache entries periodically
    if (urlCache.size > 1000) {
      for (const [key, value] of urlCache.entries()) {
        if (value.expires <= now) {
          urlCache.delete(key);
        }
      }
    }

    // Redirect instead of proxying to reduce server load
    return NextResponse.redirect(signedUrl, 302);

  } catch (error) {
    console.error('Preview proxy error:', error);
    
    // Return transparent pixel on error to prevent infinite loading
    const transparentPixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );
    
    return new NextResponse(transparentPixel, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60', // Cache errors for 1 minute
      },
    });
  }
}

export const GET = RateLimitMiddleware.withRateLimit(withAuth(handleGET));