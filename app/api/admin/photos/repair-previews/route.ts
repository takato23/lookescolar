import { NextRequest, NextResponse } from 'next/server';
import { withAuth, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import sharp from 'sharp';

export const runtime = 'nodejs';

const Body = z.object({ eventId: z.string().uuid() });

async function handlePOST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  try {
    const body = await request.json();
    const { eventId } = Body.parse(body);

    const supabase = await createServerSupabaseServiceClient();
    const bucket = process.env.STORAGE_BUCKET;
    if (!bucket) return NextResponse.json({ error: 'STORAGE_BUCKET not set' }, { status: 500 });

    const { data: photos, error } = await supabase
      .from('photos')
      .select('id, storage_path, preview_path, watermark_path')
      .eq('event_id', eventId)
      .limit(2000);
    if (error) throw error;

    const results: Array<{ id: string; repaired: boolean; error?: string }> = [];

    for (const p of photos || []) {
      let needs = !(p as any).preview_path || !(p as any).watermark_path;
      if (!needs) {
        // verify objects exist
        const toCheck = [(p as any).preview_path, (p as any).watermark_path].filter(Boolean) as string[];
        for (const key of toCheck) {
          const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 60);
          if (error || !data?.signedUrl) {
            needs = true;
            break;
          }
        }
      }

      if (!needs) {
        results.push({ id: p.id, repaired: false });
        continue;
      }

      try {
        // download original
        const { data: file, error: dlErr } = await supabase.storage.from(bucket).download(p.storage_path as string);
        if (dlErr) throw dlErr;
        const buf = Buffer.from(await file.arrayBuffer());

        // generate webp preview and watermark
        const meta = await sharp(buf).metadata();
        const maxSide = 2048;
        const width = meta.width || 1200;
        const height = meta.height || 800;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        const newW = Math.round(width * scale);
        const newH = Math.round(height * scale);

        const base = (p.storage_path as string)
          .replace(/^events\//, '')
          .replace(/\.[^.]+$/, '')
          .replace(/[^a-zA-Z0-9/_-]+/g, '_');
        const previewKey = `previews/${base}.webp`;
        const watermarkKey = `watermarks/${base}.webp`;

        const previewBuf = await sharp(buf)
          .resize({ width: newW, height: newH, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 75 })
          .toBuffer();

        const watermarkSvg = `<svg width="${newW}" height="${newH}" xmlns="http://www.w3.org/2000/svg"><g opacity="0.25"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="${Math.round(Math.min(newW, newH) / 10)}" fill="white" stroke="black" stroke-width="2">MUESTRA</text></g></svg>`;
        const watermarkBuf = await sharp(buf)
          .resize({ width: newW, height: newH, fit: 'inside', withoutEnlargement: true })
          .composite([{ input: Buffer.from(watermarkSvg), gravity: 'center' }])
          .webp({ quality: 80 })
          .toBuffer();

        const up1 = await supabase.storage.from(bucket).upload(previewKey, previewBuf, { contentType: 'image/webp', upsert: true });
        if (up1.error) throw up1.error;
        const up2 = await supabase.storage.from(bucket).upload(watermarkKey, watermarkBuf, { contentType: 'image/webp', upsert: true });
        if (up2.error) throw up2.error;

        const upd = await supabase
          .from('photos')
          .update({ preview_path: previewKey, watermark_path: watermarkKey })
          .eq('id', p.id);
        if (upd.error) throw upd.error;

        results.push({ id: p.id, repaired: true });
      } catch (e: any) {
        results.push({ id: p.id, repaired: false, error: e?.message || 'unknown' });
      }
    }

    SecurityLogger.logSecurityEvent('photos_repair_previews_done', { requestId, eventId, repaired: results.filter(r => r.repaired).length }, 'info');
    return NextResponse.json({ ok: true, results });
  } catch (error: any) {
    SecurityLogger.logSecurityEvent('photos_repair_previews_error', { error: error?.message || 'unknown' }, 'error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAuth(handlePOST);


