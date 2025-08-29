#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.STORAGE_BUCKET;
  if (!bucket) {
    console.error('STORAGE_BUCKET not set');
    process.exit(1);
  }
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: rows, error } = await supabase
    .from('photos')
    .select('id, storage_path, preview_path, watermark_path')
    .limit(50);
  if (error) throw error;

  const keys = new Set<string>();
  for (const r of rows || []) {
    if (r.storage_path) keys.add(r.storage_path);
    if ((r as any).preview_path) keys.add((r as any).preview_path);
    if ((r as any).watermark_path) keys.add((r as any).watermark_path);
  }

  const missing: string[] = [];
  for (const key of keys) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, 60);
    if (error || !data?.signedUrl) {
      missing.push(key);
    }
  }

  const outDir = path.resolve(process.cwd(), 'test-reports');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, 'storage-missing.json'),
    JSON.stringify({ bucket, missing, totalChecked: keys.size }, null, 2),
    'utf-8'
  );
  console.log(`Wrote report with ${missing.length} missing of ${keys.size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
