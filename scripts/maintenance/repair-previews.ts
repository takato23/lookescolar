#!/usr/bin/env ts-node
import 'dotenv/config';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] as string;
const SERVICE_ROLE = process.env['SUPABASE_SERVICE_ROLE_KEY'] as string;
const ORIGINAL_BUCKET = process.env['STORAGE_BUCKET_ORIGINAL'] || process.env['STORAGE_BUCKET'] || 'photo-private';
const PREVIEW_BUCKET = process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('[repair-previews] Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

async function repairEvent(eventId: string): Promise<void> {
  console.log(`[repair-previews] Procesando eventId=${eventId}`);
  const { data: photos, error } = await sb
    .from('photos')
    .select('id, storage_path, preview_path, watermark_path')
    .eq('event_id', eventId)
    .limit(5000);
  if (error) throw error;

  let repaired = 0;
  for (const p of photos || []) {
    try {
      const needPreview = !(p as any).preview_path;
      const needWatermark = !(p as any).watermark_path;
      if (!needPreview && !needWatermark) continue;

      const dl = await sb.storage.from(ORIGINAL_BUCKET).download((p as any).storage_path as string);
      if (dl.error) throw dl.error;
      const buf = Buffer.from(await dl.data!.arrayBuffer());

      const meta = await sharp(buf).metadata();
      const width = meta.width || 1600;
      const height = meta.height || 1200;
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      const newW = Math.round(width * scale);
      const newH = Math.round(height * scale);

      const base = String((p as any).storage_path)
        .replace(/^events\//, '')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9/_-]+/g, '_');
      const previewKey = `previews/${base}.webp`;
      const watermarkKey = `watermarks/${base}.webp`;

      // Preview comprimida (objetivo 120–250 KB aprox)
      const previewBuf = await sharp(buf)
        .resize({ width: newW, height: newH, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 72 })
        .toBuffer();

      // Watermark diagonal densa, manteniendo rostros visibles
      const pattern = 240; // densidad
      const fontSize = Math.max(36, Math.floor(Math.min(newW, newH) / 14));
      const textOffset = Math.floor(fontSize * 0.8);
      const svg = Buffer.from(`
        <svg width="${newW}" height="${newH}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="wm" x="0" y="0" width="${pattern}" height="${pattern}" patternUnits="userSpaceOnUse">
              <text x="${pattern/2}" y="${pattern/2}"
                font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700"
                fill="white" fill-opacity="0.4" text-anchor="middle"
                transform="rotate(-45 ${pattern/2} ${pattern/2})">LOOK ESCOLAR</text>
              <text x="${pattern/2}" y="${pattern/2 + textOffset}"
                font-family="Arial, sans-serif" font-size="${Math.floor(fontSize*0.7)}"
                fill="white" fill-opacity="0.32" text-anchor="middle"
                transform="rotate(-45 ${pattern/2} ${pattern/2 + textOffset})">VISTA PREVIA</text>
            </pattern>
          </defs>
          <rect width="${newW}" height="${newH}" fill="url(#wm)"/>
        </svg>
      `);
      const watermarkBuf = await sharp(buf)
        .resize({ width: newW, height: newH, fit: 'inside', withoutEnlargement: true })
        .composite([{ input: svg, blend: 'over' }])
        .webp({ quality: 72 })
        .toBuffer();

      if (needPreview) {
        const up1 = await sb.storage.from(PREVIEW_BUCKET).upload(previewKey, previewBuf, { contentType: 'image/webp', upsert: true });
        if (up1.error) throw up1.error;
      }
      if (needWatermark) {
        const up2 = await sb.storage.from(PREVIEW_BUCKET).upload(watermarkKey, watermarkBuf, { contentType: 'image/webp', upsert: true });
        if (up2.error) throw up2.error;
      }

      const upd = await sb
        .from('photos')
        .update({ preview_path: previewKey, watermark_path: watermarkKey })
        .eq('id', (p as any).id);
      if (upd.error) throw upd.error;
      repaired++;
    } catch (e: any) {
      console.error('[repair-previews] error', (p as any).id, e?.message || e);
    }
  }
  console.log(`[repair-previews] OK eventId=${eventId} repaired=${repaired}`);
}

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error('Uso: pnpm ts-node scripts/maintenance/repair-previews.ts <eventId> [eventId2 ...]');
    process.exit(1);
  }
  for (const id of ids) {
    await repairEvent(id);
  }
}

main().catch((e) => {
  console.error('[repair-previews] fatal', e);
  process.exit(1);
});


