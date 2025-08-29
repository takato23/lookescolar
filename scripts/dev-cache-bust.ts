#!/usr/bin/env tsx
/* eslint-disable no-console */
import { existsSync, rmSync, statSync } from 'fs';
import path from 'path';

function main() {
  const routeArg = process.argv[2] || 'admin/photos/page';
  const repoRoot = process.cwd();
  const nextDir = path.join(repoRoot, '.next');
  const staticChunksDir = path.join(nextDir, 'static', 'chunks');
  const appChunkPath = path.join(staticChunksDir, 'app', routeArg + '.js');

  console.log('🔧 Dev cache-bust check');
  console.log('• Route:', routeArg);
  console.log('• Chunk path:', appChunkPath);

  if (!existsSync(nextDir)) {
    console.log('ℹ️  No .next directory found. Nothing to clean.');
    return;
  }

  if (existsSync(appChunkPath)) {
    const size = statSync(appChunkPath).size;
    console.log(`✅ Chunk present (${size} bytes). No cache-bust needed.`);
    return;
  }

  // If the specific chunk is missing, clear static chunks to force rebuild
  if (existsSync(staticChunksDir)) {
    try {
      rmSync(staticChunksDir, { recursive: true, force: true });
      console.log('🧹 Cleared .next/static/chunks to force rebuild on next dev request.');
      console.log('➡️  Restart dev server if needed: npm run dev');
    } catch (e) {
      console.error('❌ Failed to remove static chunks:', (e as Error).message);
      process.exit(1);
    }
    return;
  }

  // Fallback: remove entire .next if chunks dir missing but chunk still 404s
  try {
    rmSync(nextDir, { recursive: true, force: true });
    console.log('🧹 Cleared entire .next directory.');
    console.log('➡️  Start dev server: npm run dev');
  } catch (e) {
    console.error('❌ Failed to remove .next directory:', (e as Error).message);
    process.exit(1);
  }
}

main();

