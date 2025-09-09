import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Lazy load sharp to reduce cold start
let sharpMod: any;
async function getSharp() {
  if (!sharpMod) sharpMod = (await import('sharp')).default;
  return sharpMod;
}

const Payload = z.object({
  eventId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  dryRun: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { eventId, folderId, limit, dryRun } = Payload.parse(body);

    if (!eventId && !folderId) {
      return NextResponse.json(
        { ok: false, error: 'Provide eventId or folderId' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();
    const ORIGINAL_BUCKET =
      process.env['STORAGE_BUCKET_ORIGINAL'] ||
      process.env['STORAGE_BUCKET'] ||
      'photo-private';
    const PREVIEW_BUCKET = process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';

    // Collect candidates from new 'assets' first
    let assetsQuery = supabase
      .from('assets')
      .select(
        'id, filename, original_path, preview_path, file_size, folder_id, created_at, folders!inner(event_id)'
      )
      .is('preview_path', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (folderId) assetsQuery = assetsQuery.eq('folder_id', folderId);
    if (eventId) assetsQuery = assetsQuery.eq('folders.event_id', eventId);
    const { data: missingAssets, error: assetsErr } = await assetsQuery;

    if (assetsErr) {
      return NextResponse.json(
        { ok: false, error: 'DB error (assets)', details: assetsErr.message },
        { status: 500 }
      );
    }

    // Also try legacy 'photos' that miss preview_path
    let photosQuery = supabase
      .from('photos')
      .select('id, original_filename, storage_path, preview_path, folder_id, subject_id, created_at')
      .is('preview_path', null)
      .order('created_at', { ascending: false })
      .limit(Math.max(0, limit - (missingAssets?.length || 0)));
    if (folderId) photosQuery = photosQuery.or(`folder_id.eq.${folderId},subject_id.eq.${folderId}`);
    // If eventId provided, rely on folder filter in UI; otherwise skip event join for simplicity
    const { data: missingPhotos } = await photosQuery;

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        candidates: {
          assets: (missingAssets || []).map((a: any) => a.id),
          photos: (missingPhotos || []).map((p: any) => p.id),
        },
      });
    }

    const sharp = await getSharp();

    async function processBuffer(buf: Buffer, baseName: string) {
      const previewKey = `previews/${baseName.replace(/[^a-zA-Z0-9_-]/g, '_')}.webp`;
      // Produce a small, watermarked webp suitable for grid browsing
      const pattern = 220;
      const img = sharp(buf).resize(1600, 1600, { fit: 'inside', withoutEnlargement: true });
      const meta = await img.metadata();
      const w = meta.width || 1200;
      const h = meta.height || 900;
      const fs = Math.max(28, Math.floor(Math.min(w, h) / 16));
      const svg = Buffer.from(`
        <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="wm" width="${pattern}" height="${pattern}" patternUnits="userSpaceOnUse">
              <text x="${pattern/2}" y="${pattern/2}" text-anchor="middle" font-family="Arial" font-size="${fs}" font-weight="700" fill="white" fill-opacity="0.38" transform="rotate(-35 ${pattern/2} ${pattern/2})">LOOK ESCOLAR</text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wm)"/>
        </svg>
      `);
      const out = await img.composite([{ input: svg, blend: 'over' }]).webp({ quality: 72, effort: 6 }).toBuffer();
      const up = await supabase.storage
        .from(PREVIEW_BUCKET)
        .upload(previewKey, out, { contentType: 'image/webp', upsert: true });
      if (up.error) throw up.error;
      return previewKey;
    }

    let processed = 0;
    // Process assets
    for (const a of missingAssets || []) {
      try {
        const dl = await supabase.storage.from(ORIGINAL_BUCKET).download(a.original_path);
        if (dl.error || !dl.data) continue;
        const buf = Buffer.from(await dl.data.arrayBuffer());
        const base = (String(a.original_path).split('/').pop() || 'preview')
          .replace(/\.[^.]+$/, '') + '_preview';
        const key = await processBuffer(buf, base);
        await supabase.from('assets').update({ preview_path: key, status: 'ready' }).eq('id', a.id);
        processed++;
      } catch {}
    }

    // Process legacy photos
    for (const p of missingPhotos || []) {
      try {
        const dl = await supabase.storage.from(ORIGINAL_BUCKET).download((p as any).storage_path);
        if (dl.error || !dl.data) continue;
        const buf = Buffer.from(await dl.data.arrayBuffer());
        const base = (String((p as any).storage_path).split('/').pop() || 'preview')
          .replace(/\.[^.]+$/, '') + '_preview';
        const key = await processBuffer(buf, base);
        await supabase.from('photos').update({ preview_path: key }).eq('id', (p as any).id);
        processed++;
      } catch {}
    }

    return NextResponse.json({ ok: true, processed });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: true, message: 'POST { eventId|folderId, limit?, dryRun? }' },
    { status: 200 }
  );
}
