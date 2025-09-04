import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!filename || !filename.endsWith('_preview.webp')) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    const supabase = await createServerSupabaseServiceClient();
    const bucket = process.env.STORAGE_BUCKET || 'photos';
    const path = `previews/${filename}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60); // 1h

    if (error || !data?.signedUrl) {
      // Fallback: try raw public path
      return new NextResponse('Not Found', { status: 404 });
    }

    // Redirect to the signed URL (avoids streaming in Node)
    const res = NextResponse.redirect(data.signedUrl, { status: 302 });
    // Cache hint for browsers (short)
    res.headers.set('Cache-Control', 'private, max-age=60');
    return res;
  } catch (e) {
    return new NextResponse('Internal Error', { status: 500 });
  }
}

