import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role for public access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest, context: RouteContext<{ path: string[] }>) {
  const params = await context.params;
  try {
    const path = params.path.join('/');

    // Security: Only allow preview/watermark/originals paths
    const allowedPrefixes = ['previews/', 'watermarks/', 'watermarked/', 'originals/'];
    const nestedPrefixes = /^(events\/[^/]+|shared)\/(previews|watermarks|watermarked|originals)\//;
    if (
      !allowedPrefixes.some((prefix) => path.startsWith(prefix)) &&
      !nestedPrefixes.test(path)
    ) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Download from Supabase storage
    const { data, error } = await supabase.storage
      .from('photos')
      .download(path);

    if (error) {
      console.error('Error downloading preview:', error);

      // Try fallback between preview and watermark paths
      const fallbackPath = path.startsWith('previews/')
        ? path.replace('previews/', 'watermarks/')
        : path.replace(/^watermarks\//, 'previews/').replace(/^watermarked\//, 'previews/');
      const watermarkPath = fallbackPath;
      const { data: watermarkData, error: watermarkError } = await supabase.storage
        .from('photos')
        .download(watermarkPath);

      if (!watermarkError && watermarkData) {
        return new NextResponse(watermarkData, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }

      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }

    // Return image with proper headers
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving preview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
