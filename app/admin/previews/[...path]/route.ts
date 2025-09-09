import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { signedUrlForKey } from '@/lib/storage/signedUrl';

const NEGATIVE_CACHE = new Map<string, number>(); // rel -> expiry ms
const POSITIVE_CACHE = new Map<string, string>(); // rel -> key (previews/rel)

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

// GET /admin/previews/...path -> stream from Storage; no redirects
export const GET = withAdminAuth(async (req: NextRequest, { params }: { params: { path: string[] } }) => {
  try {
    const segments = Array.isArray(params.path) ? params.path : [];
    if (segments.length === 0) {
      return new NextResponse('Missing preview path', { status: 400 });
    }
    const rel = segments.join('/').replace(/^\/+/, '');
    if (!/\.(png|jpg|jpeg|webp|gif|avif)$/i.test(rel)) {
      return new NextResponse('Invalid preview filename', { status: 400 });
    }

    const neg = NEGATIVE_CACHE.get(rel);
    if (neg && neg > Date.now()) {
      return makePlaceholder(600);
    }

    const key = POSITIVE_CACHE.get(rel) || `previews/${rel}`;
    const etag = `W/"${key}"`;
    const noneMatch = req.headers.get('if-none-match');
    if (noneMatch && noneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: withCommonHeaders({ 'Cache-Control': 'public, max-age=3600, immutable', ETag: etag, Vary: 'Accept-Encoding' }),
      });
    }
    try {
      const url = await signedUrlForKey(key, { expiresIn: 60 * 30, quietMissing: true });
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const ct = res.headers.get('content-type') || 'image/webp';
        POSITIVE_CACHE.set(rel, key);
        return new NextResponse(buf, {
          status: 200,
          headers: withCommonHeaders({ 'Content-Type': ct, 'Cache-Control': 'public, max-age=3600, immutable', ETag: etag, Vary: 'Accept-Encoding' }, buf.byteLength, key),
        });
      }
    } catch {}

    NEGATIVE_CACHE.set(rel, Date.now() + 10 * 60 * 1000);
    return makePlaceholder(600);
  } catch {
    return makePlaceholder(300);
  }
});
