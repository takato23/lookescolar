import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import sharp from 'sharp';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { AuthMiddleware, SecurityLogger } from '@/lib/middleware/auth.middleware';

const schema = z.object({
  photoIds: z.array(z.string().uuid()).optional(),
  eventId: z.string().uuid().optional(),
});

function watermarkSvg(width: number, height: number, text = 'MUESTRA', opacity = 0.25) {
  const fontSize = Math.round(Math.min(width, height) / 10);
  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <g opacity="${opacity}">
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="${fontSize}" fill="white" stroke="black" stroke-width="2">${text}</text>
    </g>
  </svg>`;
}

async function handlePOST(request: NextRequest) {
  const requestId = `wm_${Date.now()}`;
  try {
    const body = await request.json();
    const { photoIds, eventId } = schema.parse(body);

    const supabase = await createServerSupabaseServiceClient();
    const bucket = process.env.STORAGE_BUCKET || 'photos-bucket';

    // Validar opacidad desde env (0..1)
    const envOpacity = parseFloat(process.env.WATERMARK_OPACITY || '0.25');
    const opacity = Number.isFinite(envOpacity)
      ? Math.min(1, Math.max(0, envOpacity))
      : 0.25;

    // Selección de fotos
    let photos: any[] = [];
    if (photoIds?.length) {
      const { data } = await supabase
        .from('photos')
        .select('id, storage_path, preview_path, watermark_path')
        .in('id', photoIds);
      photos = data || [];
    } else if (eventId) {
      const { data } = await supabase
        .from('photos')
        .select('id, storage_path, preview_path, watermark_path')
        .eq('event_id', eventId)
        .limit(1000);
      photos = data || [];
    } else {
      return NextResponse.json({ error: 'photoIds o eventId requeridos' }, { status: 400 });
    }

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const p of photos) {
      try {
        // descargar original
        const path = p.storage_path as string;
        const { data: file, error: dlErr } = await supabase.storage.from(bucket).download(path);
        if (dlErr) throw dlErr;
        const buf = Buffer.from(await file.arrayBuffer());

        // crear watermark preview respetando máximo 2048 px
        const meta = await sharp(buf).metadata();
        const maxSide = 2048;
        const width = meta.width || 1200;
        const height = meta.height || 800;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        const newW = Math.round(width * scale);
        const newH = Math.round(height * scale);

        const wm = Buffer.from(watermarkSvg(newW, newH, 'MUESTRA', opacity));
        const out = await sharp(buf)
          .resize({ width: newW, height: newH, fit: 'inside', withoutEnlargement: true })
          .composite([{ input: wm, gravity: 'center' }])
          .jpeg({ quality: 80 })
          .toBuffer();

        const targetKey = `previews/${path.replace(/^events\//, '')}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(targetKey, out, { contentType: 'image/jpeg', upsert: true });
        if (upErr) throw upErr;

        await supabase
          .from('photos')
          .update({ watermark_path: targetKey, preview_path: targetKey })
          .eq('id', p.id);

        SecurityLogger.logSecurityEvent('watermark_generated', { requestId, photoId: p.id, targetKey }, 'info');
        results.push({ id: p.id, ok: true });
      } catch (e: any) {
        results.push({ id: p.id, ok: false, error: e?.message ?? String(e) });
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (error) {
    console.error('[Service] Watermark error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(handlePOST, 'admin')
);


