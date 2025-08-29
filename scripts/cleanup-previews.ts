#!/usr/bin/env tsx

/**
 * Cleanup script: removes watermarked previews older than 30 days
 * - Targets 'photos' bucket under previews/*
 * - Deletes database photo/asset rows where appropriate (configurable)
 * - Intended to be run monthly via cron/GitHub Action/Vercel Cron
 */

import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

async function main() {
  const supabase = await createServerSupabaseServiceClient();
  const DAYS = parseInt(process.env.CLEANUP_PREVIEW_DAYS || '30', 10);
  const cutoff = new Date(
    Date.now() - DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  console.log(
    `🧹 Cleaning previews older than ${DAYS} days (before ${cutoff})`
  );

  // Prefer new assets table if available; fallback to legacy photos table
  let removedFiles = 0;
  try {
    // 1) Fetch candidate previews from assets
    const { data: oldAssets, error: assetsErr } = await supabase
      .from('assets')
      .select('id, preview_path, created_at')
      .lt('created_at', cutoff)
      .not('preview_path', 'is', null)
      .limit(5000);

    if (!assetsErr && Array.isArray(oldAssets) && oldAssets.length > 0) {
      const paths = oldAssets
        .map((a) => a.preview_path as string)
        .filter(Boolean);
      if (paths.length) {
        const { error: remErr } = await supabase.storage
          .from('photos')
          .remove(paths);
        if (!remErr) {
          removedFiles += paths.length;
          console.log(`✅ Removed ${paths.length} preview files from assets`);
        } else {
          console.warn(
            '⚠️ Failed removing some asset previews:',
            remErr.message
          );
        }
      }
    }
  } catch (e: any) {
    console.warn('Assets cleanup skipped:', e?.message || e);
  }

  try {
    // 2) Fallback: legacy photos table
    const { data: oldPhotos, error: photosErr } = await supabase
      .from('photos')
      .select('id, watermark_path, preview_path, created_at')
      .lt('created_at', cutoff)
      .limit(5000);

    if (!photosErr && Array.isArray(oldPhotos) && oldPhotos.length > 0) {
      const paths = oldPhotos
        .map((p) => p.preview_path || p.watermark_path)
        .filter(Boolean) as string[];
      if (paths.length) {
        const { error: remErr } = await supabase.storage
          .from('photos')
          .remove(paths);
        if (!remErr) {
          removedFiles += paths.length;
          console.log(
            `✅ Removed ${paths.length} preview files from photos (legacy)`
          );
        } else {
          console.warn(
            '⚠️ Failed removing some legacy previews:',
            remErr.message
          );
        }
      }
    }
  } catch (e: any) {
    console.warn('Legacy photos cleanup skipped:', e?.message || e);
  }

  console.log(`🧾 Cleanup completed. Total previews removed: ${removedFiles}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Cleanup error:', e);
    process.exit(1);
  });
}
