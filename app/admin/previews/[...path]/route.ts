import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { signedUrlForKey } from '@/lib/storage/signedUrl';

// GET /admin/previews/...path -> 302 redirect to signed URL in Storage at previews/<...path>
export const GET = withAdminAuth(async (_req: NextRequest, { params }: { params: { path: string[] } }) => {
  try {
    const segments = Array.isArray(params.path) ? params.path : [];
    if (segments.length === 0) {
      return new NextResponse('Missing preview path', { status: 400 });
    }
    const rel = segments.join('/');
    if (!/\.(png|jpg|jpeg|webp|gif|avif)$/i.test(rel)) {
      return new NextResponse('Invalid preview filename', { status: 400 });
    }
    const key = `previews/${rel}`;
    const url = await signedUrlForKey(key, { expiresIn: 60 * 30 }); // 30 minutes
    return NextResponse.redirect(url, 302);
  } catch (error) {
    // Transparent 1x1 PNG placeholder
    const placeholder =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2P4z8DwHwAFYgJQb+q8VwAAAABJRU5ErkJggg=='
    return NextResponse.redirect(placeholder, 302);
  }
});

