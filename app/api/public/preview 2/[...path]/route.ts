import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Simple cache to prevent excessive DB lookups
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const urlCache = new Map<string, { url: string; expires: number }>();

// GET /api/public/preview/...path -> serve watermarked preview images publicly
export async function GET(
  req: NextRequest, context: RouteContext<{ path: string[] }>) {
  const params = await context.params;
  try {
    const segments = Array.isArray(params.path) ? params.path : [];
    if (segments.length === 0) {
      return new NextResponse('Missing preview path', { status: 400 });
    }
    
    const relativePath = segments.join('/').replace(/^\/+/, '');
    
    // Basic validation - must be an image file
    if (!/\.(png|jpg|jpeg|webp|gif|avif)$/i.test(relativePath)) {
      return new NextResponse('Invalid image path', { status: 400 });
    }

    // Check cache first
    const cached = urlCache.get(relativePath);
    if (cached && cached.expires > Date.now()) {
      // Redirect to the cached signed URL
      return NextResponse.redirect(cached.url);
    }

    const supabase = await createServerSupabaseServiceClient();
    
    // Extract just the filename if the path includes folders
    const filename = relativePath.split('/').pop() || relativePath;
    
    // Try multiple paths where the preview might be stored
    const possiblePaths = [
      `previews/${relativePath}`,
      `previews/${filename}`,
      relativePath,
      `watermarked/${relativePath}`,
      `watermarked/${filename}`,
      filename,
    ];

    for (const path of possiblePaths) {
      try {
        // Try to generate a public URL for the watermarked preview
        // First try photos bucket (public bucket with watermarked images)
        const { data: publicUrl } = supabase.storage
          .from('photos')
          .getPublicUrl(path);
          
        if (publicUrl?.publicUrl) {
          // Verify the URL works by doing a HEAD request
          const checkResponse = await fetch(publicUrl.publicUrl, { method: 'HEAD' });
          if (checkResponse.ok) {
            // Cache the working URL
            urlCache.set(relativePath, {
              url: publicUrl.publicUrl,
              expires: Date.now() + CACHE_TTL
            });
            
            // Clean old cache entries
            if (urlCache.size > 1000) {
              const now = Date.now();
              for (const [key, value] of urlCache.entries()) {
                if (value.expires < now) {
                  urlCache.delete(key);
                }
              }
            }
            
            return NextResponse.redirect(publicUrl.publicUrl);
          }
        }
      } catch (error) {
        // Try next path
        continue;
      }
    }

    // If no preview found, return a placeholder image
    const placeholderBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2P4z8DwHwAFYgJQb+q8VwAAAABJRU5ErkJggg==',
      'base64'
    );

    return new NextResponse(placeholderBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300', // Cache placeholder for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error serving preview:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}