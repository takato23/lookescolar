import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { signedUrlForKey } from '@/lib/storage/signedUrl';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /admin/previews/[filename] -> 302 redirect to signed URL in Storage
export const GET = withAdminAuth(async (_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) => {
  try {
    const { filename } = await params;
    if (!filename || !/\.(png|jpg|jpeg|webp|gif)$/i.test(filename)) {
      return new NextResponse('Invalid preview filename', { status: 400 });
    }

    // First, try to find the asset in database to get the correct path
    const dbFoundPaths: string[] = [];
    try {
      const supabase = await createServerSupabaseServiceClient();
      const { data: assets, error: dbError } = await supabase
        .from('assets')
        .select('original_path, preview_path, filename')
        .or(`filename.eq.${filename},original_path.ilike.%${filename}%,preview_path.ilike.%${filename}%`)
        .limit(5);

      if (!dbError && assets && assets.length > 0) {
        for (const asset of assets) {
          if (asset.preview_path) dbFoundPaths.push(asset.preview_path);
          if (asset.original_path) dbFoundPaths.push(asset.original_path);
        }
        console.log(`Found ${assets.length} matching assets in DB for ${filename}`);
      }
    } catch (dbError) {
      console.warn('Database lookup failed:', dbError);
    }

    // Combine database paths with fallback paths
    const possibleKeys = [
      ...dbFoundPaths,
      `previews/${filename}`,
      `preview/${filename}`,
      `watermarks/${filename}`,
      `watermark/${filename}`,
      filename, // Direct filename
      `processed/${filename}`,
      `thumbnails/${filename}`,
    ];

    let signedUrl = null;
    let lastError = null;

    // Try each possible key until we find one that works
    for (const key of possibleKeys) {
      try {
        signedUrl = await signedUrlForKey(key, { expiresIn: 60 * 30 }); // 30 min
        if (signedUrl) {
          console.log(`Preview found at: ${key}`);
          
          // Fetch and serve the image directly instead of redirecting to avoid loops
          const imageResponse = await fetch(signedUrl);
          if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            const contentType = imageResponse.headers.get('content-type') || 'image/webp';
            
            return new NextResponse(imageBuffer, {
              status: 200,
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600, immutable',
                'Content-Length': imageBuffer.byteLength.toString(),
                'ETag': `"${key}-${Date.now()}"`,
              },
            });
          }
        }
      } catch (error) {
        lastError = error;
        console.log(`Preview not found at: ${key}`);
        continue;
      }
    }

    // If no preview found, return a proper placeholder image response instead of redirect
    console.warn(`No preview found for ${filename}, returning placeholder`);
    
    // Return a tiny transparent PNG directly (not as redirect)
    const placeholderBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2P4z8DwHwAFYgJQb+q8VwAAAABJRU5ErkJggg==',
      'base64'
    );
    
    return new NextResponse(placeholderBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': placeholderBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Preview endpoint error:', error);
    
    // Return placeholder image directly (not redirect)
    const placeholderBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2P4z8DwHwAFYgJQb+q8VwAAAABJRU5ErkJggg==',
      'base64'
    );
    
    return new NextResponse(placeholderBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300', // Short cache for errors
      },
    });
  }
});

