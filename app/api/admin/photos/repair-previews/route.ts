import { NextRequest, NextResponse } from 'next/server';
import { withAuth, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import sharp from 'sharp';

export const runtime = 'nodejs';

const Body = z.object({ eventId: z.string().uuid() });

// Texto configurable del watermark; por defecto el requerido denso y diagonal
const WATERMARK_TEXT = process.env.WATERMARK_TEXT || 'LOOK ESCOLAR – VISTA PREVIA';

// SVG de watermark denso en patrón diagonal
function watermarkSvg(width: number, height: number, text: string = WATERMARK_TEXT) {
  const maxSide = Math.max(width, height);
  const fontSize = Math.max(28, Math.floor(Math.min(width, height) / 12));
  const patternSize = Math.max(180, Math.min(280, Math.floor(maxSide / 6)));
  const opacity = 0.4; // denso

  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="wm" x="0" y="0" width="${patternSize}" height="${patternSize}" patternUnits="userSpaceOnUse">
        <text x="${patternSize / 2}" y="${patternSize / 2}"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          font-weight="bold"
          fill="white"
          fill-opacity="${opacity}"
          text-anchor="middle"
          transform="rotate(-45 ${patternSize / 2} ${patternSize / 2})">
          ${text}
        </text>
        <text x="${patternSize / 2}" y="${patternSize / 2 + Math.max(28, fontSize * 0.4)}"
          font-family="Arial, sans-serif"
          font-size="${fontSize * 0.8}"
          font-weight="bold"
          fill="white"
          fill-opacity="${opacity}"
          text-anchor="middle"
          transform="rotate(-45 ${patternSize / 2} ${patternSize / 2})">
          ${text}
        </text>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#wm)"/>
  </svg>`;
}

async function handlePOST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  try {
    const body = await request.json();
    const { eventId } = Body.parse(body);

    const supabase = await createServerSupabaseServiceClient();
    const ORIGINAL_BUCKET = process.env['STORAGE_BUCKET_ORIGINAL'] || process.env['STORAGE_BUCKET'] || 'photo-private';
    const PREVIEW_BUCKET = process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';

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
          const bucketToCheck = /(^|\/)previews\//.test(key) || /watermark/i.test(key) ? PREVIEW_BUCKET : ORIGINAL_BUCKET;
          const { data, error } = await supabase.storage.from(bucketToCheck).createSignedUrl(key, 60);
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
        const { data: file, error: dlErr } = await supabase.storage.from(ORIGINAL_BUCKET).download(p.storage_path as string);
        if (dlErr) throw dlErr;
        const buf = Buffer.from(await file.arrayBuffer());

        // generate webp preview and watermark
        const meta = await sharp(buf).metadata();
        const maxSide = 1600;
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
          .webp({ quality: 72 })
          .toBuffer();

        const wmSvg = watermarkSvg(newW, newH, WATERMARK_TEXT);
        const watermarkBuf = await sharp(buf)
          .resize({ width: newW, height: newH, fit: 'inside', withoutEnlargement: true })
          .composite([{ input: Buffer.from(wmSvg), gravity: 'center' }])
          .webp({ quality: 72 })
          .toBuffer();

        const up1 = await supabase.storage.from(PREVIEW_BUCKET).upload(previewKey, previewBuf, { contentType: 'image/webp', upsert: true });
        if (up1.error) throw up1.error;
        const up2 = await supabase.storage.from(PREVIEW_BUCKET).upload(watermarkKey, watermarkBuf, { contentType: 'image/webp', upsert: true });
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

export const POST = handlePOST;


