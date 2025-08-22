import { NextRequest, NextResponse } from 'next/server';
import { withAuth, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { FreeTierOptimizer } from '@/lib/services/free-tier-optimizer';

export const runtime = 'nodejs';

const Body = z.object({ eventId: z.string().uuid() });

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
      .select('id, storage_path, preview_path, watermark_path, original_filename, event_id')
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
        // Download original (if it exists)
        let imageBuffer: Buffer | null = null;
        if ((p as any).storage_path) {
          try {
            const { data: file, error: dlErr } = await supabase.storage.from(ORIGINAL_BUCKET).download((p as any).storage_path);
            if (!dlErr && file) {
              imageBuffer = Buffer.from(await file.arrayBuffer());
            }
          } catch (e) {
            console.log('Could not download original, will regenerate from existing preview');
          }
        }

        // If we can't get original, try to download existing preview to regenerate
        if (!imageBuffer && (p as any).preview_path) {
          try {
            const { data: file, error: dlErr } = await supabase.storage.from(PREVIEW_BUCKET).download((p as any).preview_path);
            if (!dlErr && file) {
              imageBuffer = Buffer.from(await file.arrayBuffer());
            }
          } catch (e) {
            console.log('Could not download existing preview');
          }
        }

        // If we still don't have an image buffer, skip this photo
        if (!imageBuffer) {
          results.push({ id: p.id, repaired: false, error: 'No source image available' });
          continue;
        }

        // Get event name for watermark
        let wmLabel = 'Look Escolar';
        try {
          const { data: evInfo } = await supabase
            .from('events')
            .select('name, school_name')
            .eq('id', p.event_id)
            .single();
          if (evInfo?.name || evInfo?.school_name) {
            wmLabel = `${evInfo.school_name || ''}${evInfo.school_name && evInfo.name ? ' · ' : ''}${evInfo.name || ''}`.trim() || wmLabel;
          }
        } catch {}

        // Process image with FreeTierOptimizer (no original storage)
        const optimizedResult = await FreeTierOptimizer.processForFreeTier(
          imageBuffer,
          {
            targetSizeKB: 35, // Aggressive compression for free tier
            maxDimension: 500, // Reduced dimensions for better compression
            watermarkText: wmLabel,
            enableOriginalStorage: false // NEVER store originals
          }
        );

        const previewBuffer = optimizedResult.processedBuffer;

        // Generate paths
        const base = ((p as any).storage_path || (p as any).preview_path || `photo-${p.id}`)
          .replace(/^events\//, '')
          .replace(/\.[^.]+$/, '')
          .replace(/[^a-zA-Z0-9/_-]+/g, '_');
        const previewKey = `previews/${base}.webp`;

        // Upload new preview
        const up1 = await supabase.storage.from(PREVIEW_BUCKET).upload(previewKey, previewBuffer, { contentType: 'image/webp', upsert: true });
        if (up1.error) throw up1.error;

        // For backward compatibility, use same path for watermark
        const watermarkKey = previewKey;

        const upd = await supabase
          .from('photos')
          .update({ 
            preview_path: previewKey, 
            watermark_path: watermarkKey,
            file_size: optimizedResult.actualSizeKB * 1024,
            width: optimizedResult.finalDimensions.width,
            height: optimizedResult.finalDimensions.height,
            metadata: {
              ...(p as any).metadata || {},
              freetier_optimized: true,
              compression_level: optimizedResult.compressionLevel,
              optimization_ratio: Math.round(((p as any).file_size - optimizedResult.actualSizeKB * 1024) / (p as any).file_size * 100)
            }
          })
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