import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import sharp from 'sharp';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

const schema = z.object({
  photoIds: z.array(z.string().uuid()).optional(),
  eventId: z.string().uuid().optional(),
});

const WATERMARK_TEXT = process.env.WATERMARK_TEXT || 'LOOK ESCOLAR';

function watermarkSvg(width: number, height: number, text = WATERMARK_TEXT) {
  const maxSide = Math.max(width, height);
  const fontSize = Math.max(28, Math.floor(Math.min(width, height) / 12));
  const patternSize = Math.max(180, Math.min(280, Math.floor(maxSide / 6)));
  const opacity = 0.4; // dentro del rango 0.35–0.45

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

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json();
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });

    const supabase = await createServerSupabaseServiceClient();
    const ORIGINAL_BUCKET = process.env['STORAGE_BUCKET_ORIGINAL'] || process.env['STORAGE_BUCKET'] || 'photo-private';
    const PREVIEW_BUCKET = process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';

    // Selección de fotos
    let photos: any[] = [];
    if (eventId) {
      const { data } = await supabase
        .from('photos')
        .select('id, storage_path, preview_path, watermark_path')
        .eq('event_id', eventId)
        .limit(1000);
      photos = data || [];
    } else {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];
    let count = 0;
    let skipped = 0;

    for (const p of photos) {
      try {
        // descargar original
        const path = p.storage_path as string;
        const { data: file, error: dlErr } = await supabase.storage.from(ORIGINAL_BUCKET).download(path);
        if (dlErr) throw dlErr;
        const buf = Buffer.from(await file.arrayBuffer());

        // crear watermark preview
        const meta = await sharp(buf).metadata();
        const width = meta.width || 1200;
        const height = meta.height || 800;

        const MAX_SIDE = 1600;
        let processingBuf = buf;
        const maxSide = Math.max(width, height);
        const scale = maxSide > MAX_SIDE ? MAX_SIDE / maxSide : 1;
        const newW = Math.round(width * scale);
        const newH = Math.round(height * scale);
        if (scale < 1) {
          processingBuf = await sharp(buf)
            .resize({ width: newW, height: newH, fit: 'inside' })
            .toBuffer();
        }

        const base = path
          .replace(/^events\//, '')
          .replace(/\.[^.]+$/, '')
          .replace(/[^a-zA-Z0-9/_-]+/g, '_');
        const previewKey = `previews/${base}.webp`;
        const watermarkKey = `watermarks/${base}.webp`;

        // Generate separate preview without watermark:
        const previewBuf = await sharp(processingBuf)
          .webp({ quality: 72 })
          .toBuffer();

        // Watermark version:
        const wm = Buffer.from(watermarkSvg(newW, newH));
        const watermarkBuf = await sharp(processingBuf)
          .composite([{ input: wm, gravity: 'center' }])
          .webp({ quality: 72 })
          .toBuffer();

        const up1 = await supabase.storage.from(PREVIEW_BUCKET).upload(previewKey, previewBuf, { contentType: 'image/webp', upsert: true });
        if (up1.error) throw up1.error;
        const up2 = await supabase.storage.from(PREVIEW_BUCKET).upload(watermarkKey, watermarkBuf, { contentType: 'image/webp', upsert: true });
        if (up2.error) throw up2.error;

        await supabase
          .from('photos')
          .update({ 
            preview_path: previewKey, 
            watermark_path: watermarkKey 
          })
          .eq('id', p.id);

        results.push({ id: p.id, ok: true });
        count++;
      } catch (e: any) {
        results.push({ id: p.id, ok: false, error: e?.message ?? String(e) });
        skipped++;
      }
    }

    return NextResponse.json({ processed: count, skipped: skipped });
  } catch (error) {
    console.error('[Service] Watermark error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}


