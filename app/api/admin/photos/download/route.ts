import { NextRequest, NextResponse } from 'next/server';
import { withAuth, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { signedUrlForKey } from '@/lib/storage/signedUrl';

import { PassThrough } from 'stream';

export const runtime = 'nodejs';

const DownloadSchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1),
  as: z.enum(['zip', 'single']).optional().default('single'),
});

async function logErrorToFile(name: string, content: string) {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const dir = path.resolve(process.cwd(), 'test-reports/photo-flow');
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${name}.log`);
    await fs.writeFile(file, content + '\n', { flag: 'a' });
  } catch (_) {
    // ignore logging errors
  }
}

async function handlePOST(request: NextRequest) {
  const supabase = await createServerSupabaseServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // En desarrollo, permitir sin autenticación
  if (!user && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const requestId = request.headers.get('x-request-id') || 'unknown';
  try {
    const body = await request.json();
    const parsed = DownloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400, headers: { 'X-Request-Id': requestId } }
      );
    }
    const { photoIds, as } = parsed.data;

    const { data: photos, error } = await (supabase as any)
      .from('photos')
      .select('id, original_filename, storage_path, preview_path, watermark_path')
      .in('id', photoIds);

    if (error) {
      throw new Error(`DB error fetching photos: ${error.message}`);
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: 'No photos found' }, { status: 404 });
    }

    if (as === 'single') {
      const firstPhoto = photos[0];
      if (!firstPhoto) {
        return NextResponse.json({ error: 'No photo found' }, { status: 404 });
      }
      const key = firstPhoto.watermark_path || firstPhoto.preview_path;
      if (!key) {
        return NextResponse.json({ error: 'No valid path for photo' }, { status: 404 });
      }
      try {
        const url = await signedUrlForKey(key, 300);
        return NextResponse.json({ urls: [url] });
      } catch (e) {
        return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 400 });
      }
    }

    // as === 'zip' → stream a ZIP
    // Lazy import archiver to reduce cold-start
    const archiver: any = (await import('archiver')).default;
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = new PassThrough();

    // Pipe archiver to PassThrough
    archive.on('error', (err: any) => {
      stream.destroy(err);
    });
    archive.pipe(stream);

    // Append files by downloading from Supabase storage
    const ORIGINAL_BUCKET = process.env['STORAGE_BUCKET_ORIGINAL'] || process.env['STORAGE_BUCKET'] || 'photo-private';
    const PREVIEW_BUCKET = process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';
    for (const p of photos) {
      const preferredKey = (p as any).watermark_path || (p as any).preview_path;
      if (!preferredKey) continue;
      const filename = p.original_filename || `${p.id}.jpg`;

      // Decide bucket per key. Previews/watermarks -> PREVIEW bucket; originals -> ORIGINAL bucket
      let bucketForKey = /(^|\/)previews\//.test(preferredKey) || /watermark/i.test(preferredKey)
        ? PREVIEW_BUCKET
        : ORIGINAL_BUCKET;

      let downloadRes = await (supabase as any).storage.from(bucketForKey).download(preferredKey);
      // Fallback to the other bucket on 404 in case of misplaced asset
      if (downloadRes.error && ((downloadRes.error as any).status === 404)) {
        const altBucket = bucketForKey === ORIGINAL_BUCKET ? PREVIEW_BUCKET : ORIGINAL_BUCKET;
        const alt = await (supabase as any).storage.from(altBucket).download(preferredKey);
        if (!alt.error && alt.data) {
          SecurityLogger.logSecurityEvent('download_fallback_bucket', { requestId, from: bucketForKey, to: altBucket, key: preferredKey }, 'warning');
          bucketForKey = altBucket;
          downloadRes = alt;
        }
      }

      if (downloadRes.error || !downloadRes.data) {
        // skip failed file but keep going
        SecurityLogger.logSecurityEvent(
          'download_zip_file_error',
          { requestId, photoId: p.id, error: downloadRes.error?.message || 'missing' },
          'warning'
        );
        continue;
      }
      const buf = Buffer.from(await downloadRes.data.arrayBuffer());
      archive.append(buf, { name: filename });
    }

    await archive.finalize();

    if (process.env.NODE_ENV === 'development') {
       
      console.debug('download_zip', { requestId, files: photos.length });
    }

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="fotos.zip"',
        'X-Request-Id': requestId,
      },
    });
  } catch (err: any) {
    const message = err?.message || 'Unknown error';
    SecurityLogger.logSecurityEvent(
      'admin_download_error',
      { requestId, error: message },
      'error'
    );
    // Nunca 500: devolver 400 con detalle
    return NextResponse.json(
      { error: message || 'Bad request' },
      { status: 400, headers: { 'X-Request-Id': requestId } }
    );
  }
}

export const POST = handlePOST;


