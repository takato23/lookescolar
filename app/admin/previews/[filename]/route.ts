import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { signedUrlForKey } from '@/lib/storage/signedUrl';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

// GET /admin/previews/[filename] -> 302 redirect to signed URL in Storage
// Small in-memory caches to avoid repeated expensive lookups in dev
const NEGATIVE_CACHE = new Map<string, number>(); // filename -> expiry epoch ms
const POSITIVE_CACHE = new Map<string, string>(); // filename -> resolved key

function isPreviewLike(path: string) {
  return /(^|\/)previews\//i.test(path) || /watermark/i.test(path);
}

function baseNameWithoutExt(name: string) {
  return name.replace(/\.[^.]+$/, '');
}

function shouldDebug(req: NextRequest) {
  const url = new URL(req.url);
  return (
    url.searchParams.get('debug') === '1' ||
    process.env.PREVIEW_DEBUG === '1'
  );
}

export const GET = withAdminAuth(async (req: NextRequest, { params }: { params: { filename: string } }) => {
  try {
    const { filename } = params;
    if (!filename || !/\.(png|jpg|jpeg|webp|gif)$/i.test(filename)) {
      return new NextResponse('Invalid preview filename', { status: 400 });
    }
    const DEBUG = shouldDebug(req);

    // Fast-path cache hits
    const neg = NEGATIVE_CACHE.get(filename);
    if (neg && neg > Date.now()) {
      if (DEBUG) console.log(`[PREVIEWS] negative-cache hit for ${filename}`);
      return makePlaceholder(600);
    }
    const cachedKey = POSITIVE_CACHE.get(filename);
    if (cachedKey) {
      try {
        const signed = await signedUrlForKey(cachedKey, { expiresIn: 60 * 30, quietMissing: true });
        const imageResponse = await fetch(signed);
        if (imageResponse.ok) {
          const buf = await imageResponse.arrayBuffer();
          const ct = imageResponse.headers.get('content-type') || 'image/webp';
          return new NextResponse(buf, {
            status: 200,
            headers: withCommonHeaders({ 'Content-Type': ct, 'Cache-Control': 'public, max-age=3600, immutable' }, buf.byteLength, cachedKey),
          });
        }
      } catch {
        // fall-through to full resolve; drop cache if stale
        POSITIVE_CACHE.delete(filename);
      }
    }

    // Compute stable ETag based on desired preview key candidates
    const baseName = filename.replace(/\.[^.]+$/, '');
    const candidateKeysForEtag = [
      `previews/${baseName}.webp`,
      `previews/${baseName}_preview.webp`,
    ];
    const etag = `W/"${candidateKeysForEtag.join('|')}"`;
    const noneMatch = req.headers.get('if-none-match');
    if (noneMatch && noneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: withCommonHeaders({ 'Cache-Control': 'public, max-age=3600, immutable', ETag: etag, Vary: 'Accept-Encoding' }),
      });
    }

    // First, try to find the asset in database to get the correct path
    type AssetPreviewRow = Pick<
      Database['public']['Tables']['assets']['Row'],
      'preview_path' | 'original_path' | 'filename'
    >;

    const dbFoundPaths: string[] = [];
    try {
      const supabase = await createServerSupabaseServiceClient();
      const { data: assets, error: dbError } = await supabase
        .from('assets')
        .select('original_path, preview_path, filename')
        .or(`filename.eq.${filename},original_path.ilike.%${filename}%,preview_path.ilike.%${filename}%`)
        .limit(5);

      if (!dbError && assets && assets.length > 0) {
        const assetRows = assets as AssetPreviewRow[];
        for (const asset of assetRows) {
          if (asset.preview_path) dbFoundPaths.push(asset.preview_path);
          // Do NOT push original_path; we only serve previews in this endpoint
        }
        if (DEBUG) console.log(`[PREVIEWS] DB matches for ${filename}:`, assets.length);
      }
    } catch (dbError) {
      if (DEBUG) console.warn('[PREVIEWS] Database lookup failed:', dbError);
    }

    // Build minimal, high-probability candidate keys
    const base = baseNameWithoutExt(filename);
    const possibleKeys = Array.from(
      new Set(
        [
          // Any preview-like path obtained from DB
          ...dbFoundPaths.filter(isPreviewLike),
          // Standard preview naming conventions
          `previews/${base}.webp`,
          `previews/${base}_preview.webp`,
          // If the incoming name is already a .webp preview, allow it directly
          /\.webp$/i.test(filename) ? `previews/${filename}` : undefined,
        ].filter(Boolean) as string[]
      )
    );

    let signedUrl: string | null = null;
    let lastError = null;

    // Try each possible key until we find one that works
    for (const key of possibleKeys) {
      try {
        signedUrl = await signedUrlForKey(key, { expiresIn: 60 * 30, quietMissing: true }); // 30 min
        if (signedUrl) {
          if (DEBUG) console.log(`[PREVIEWS] Hit: ${key}`);
          
          // Fetch and serve the image directly instead of redirecting to avoid loops
          const imageResponse = await fetch(signedUrl);
          if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            const contentType = imageResponse.headers.get('content-type') || 'image/webp';
            
            POSITIVE_CACHE.set(filename, key);
            return new NextResponse(imageBuffer, {
              status: 200,
              headers: withCommonHeaders(
                { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600, immutable', ETag: etag, Vary: 'Accept-Encoding' },
                imageBuffer.byteLength,
                key
              ),
            });
          }
        }
      } catch (error) {
        lastError = error;
        if (DEBUG) console.log(`[PREVIEWS] Miss: ${key}`);
        continue;
      }
    }

    // If no preview found, return a proper placeholder image response and cache the negative result
    if (DEBUG) console.warn(`[PREVIEWS] No preview for ${filename}; returning placeholder`);
    NEGATIVE_CACHE.set(filename, Date.now() + 10 * 60 * 1000); // 10m
    return makePlaceholder(600);

  } catch (error) {
    // Silent fallback; avoid noisy logs in prod
    return makePlaceholder(300);
  }
});

function withCommonHeaders(base: Record<string, string>, length?: number, key?: string) {
  return {
    ...base,
    ...(length ? { 'Content-Length': String(length) } : {}),
    ...(key ? { ETag: `W/"${key}"` } : {}),
  };
}

function makePlaceholder(maxAgeSeconds: number) {
  const placeholderBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2P4z8DwHwAFYgJQb+q8VwAAAABJRU5ErkJggg==',
    'base64'
  );

  return new NextResponse(placeholderBuffer, {
    status: 200,
    headers: withCommonHeaders(
      { 'Content-Type': 'image/png', 'Cache-Control': `public, max-age=${maxAgeSeconds}` },
      placeholderBuffer.length,
      'placeholder'
    ),
  });
}
