#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

async function checkMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check folders
  const { data: folders, error: foldersError } = await supabase
    .from('folders')
    .select('id, name, event_id, photo_count')
    .limit(10);

  console.log('=== FOLDERS ===');
  console.log('Error:', foldersError);
  console.log('Count:', folders?.length || 0);
  folders?.forEach((f) =>
    console.log(
      `- ${f.name} (id: ${f.id}, photos: ${f.photo_count}, event: ${f.event_id})`
    )
  );

  // Check assets
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('id, filename, folder_id, created_at')
    .limit(10);

  console.log('\n=== ASSETS ===');
  console.log('Error:', assetsError);
  console.log('Count:', assets?.length || 0);
  assets?.forEach((a) =>
    console.log(`- ${a.filename} (folder: ${a.folder_id})`)
  );

  // Check event 83070ba2-738e-4038-ab5e-0c42fe4a2880 specifically
  const { data: targetFolder } = await supabase
    .from('folders')
    .select('id, name')
    .eq('event_id', '83070ba2-738e-4038-ab5e-0c42fe4a2880')
    .single();

  if (targetFolder) {
    console.log(`\n=== EVENT 83070ba2 FOLDER ===`);
    console.log(`Folder: ${targetFolder.name} (${targetFolder.id})`);

    const { data: folderAssets } = await supabase
      .from('assets')
      .select('id, filename')
      .eq('folder_id', targetFolder.id)
      .limit(5);

    console.log(`Assets in folder: ${folderAssets?.length || 0}`);
    folderAssets?.forEach((a) => console.log(`  - ${a.filename}`));
  }

  // Check Maristas folder specifically
  const { data: maristasAssets } = await supabase
    .from('assets')
    .select('id, filename')
    .eq('folder_id', '4e289044-09f0-4e51-90c2-9a7b9dfece4f');

  console.log(`\n=== MARISTAS FOLDER ASSETS ===`);
  console.log(`Count: ${maristasAssets?.length || 0}`);
  maristasAssets?.forEach((a) => console.log(`  - ${a.filename}`));

  // Check actual storage paths for a few assets
  const { data: sampleAssets } = await supabase
    .from('assets')
    .select('filename, preview_path, storage_path')
    .limit(3);

  console.log(`\n=== SAMPLE ASSET STORAGE PATHS ===`);
  sampleAssets?.forEach((a) => {
    console.log(`File: ${a.filename}`);
    console.log(`  Preview: ${a.preview_path}`);
    console.log(`  Storage: ${a.storage_path}`);
    console.log('');
  });
}

checkMigration().catch(console.error);
