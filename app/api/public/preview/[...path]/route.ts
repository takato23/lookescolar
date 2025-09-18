import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role for public access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');

    // Security: Allow preview paths with event structure
    // Accept: previews/*, events/*/previews/*, events/*/watermarks/*
    const isValidPath = path.startsWith('previews/') ||
                       path.includes('/previews/') ||
                       path.includes('/watermarks/');

    if (!isValidPath) {
      console.error('Invalid preview path:', path);
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Download from Supabase storage
    const { data, error } = await supabase.storage
      .from('photos')
      .download(path);

    if (error) {
      console.error('Error downloading preview:', {
        path,
        error: error.message,
        environment: process.env.VERCEL ? 'vercel' : 'local'
      });

      // Try fallback strategies for missing previews
      // 1. Try watermark path if preview fails
      const watermarkPath = path.replace('previews/', 'watermarks/');
      const { data: watermarkData, error: watermarkError } = await supabase.storage
        .from('photos')
        .download(watermarkPath);

      if (!watermarkError && watermarkData) {
        console.log('Preview fallback: Using watermark path', watermarkPath);
        return new NextResponse(watermarkData, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }

      // 2. Try original path as last resort (for debugging)
      const originalPath = path.replace('previews/', '');
      const { data: originalData, error: originalError } = await supabase.storage
        .from('photos')
        .download(originalPath);

      if (!originalError && originalData) {
        console.log('Preview fallback: Using original path', originalPath);
        return new NextResponse(originalData, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }

      // 3. Return proper error with debugging info
      console.error('All preview fallback strategies failed:', {
        originalPath: path,
        watermarkPath,
        originalFallbackPath: originalPath,
        originalError: error.message,
        watermarkError: watermarkError?.message,
        originalFallbackError: originalError?.message
      });

      return NextResponse.json({
        error: 'Preview not found',
        debug: process.env.NODE_ENV === 'development' ? {
          path,
          watermarkPath,
          originalFallbackPath: originalPath,
          environment: process.env.VERCEL ? 'vercel' : 'local'
        } : undefined
      }, { status: 404 });
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