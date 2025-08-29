#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

async function fixFolderCounts() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔧 Fixing folder photo counts...\n');

  // Get all folders
  const { data: folders, error: foldersError } = await supabase
    .from('folders')
    .select('id, name');

  if (foldersError) {
    console.error('❌ Error fetching folders:', foldersError);
    return;
  }

  console.log(`📁 Found ${folders.length} folders to update\n`);

  for (const folder of folders) {
    // Count assets in this folder
    const { count, error: countError } = await supabase
      .from('assets')
      .select('id', { count: 'exact' })
      .eq('folder_id', folder.id);

    if (countError) {
      console.error(`❌ Error counting assets for folder ${folder.name}:`, countError);
      continue;
    }

    // Update the folder photo_count
    const { error: updateError } = await supabase
      .from('folders')
      .update({ photo_count: count || 0 })
      .eq('id', folder.id);

    if (updateError) {
      console.error(`❌ Error updating count for folder ${folder.name}:`, updateError);
      continue;
    }

    console.log(`✅ ${folder.name}: ${count || 0} photos`);
  }

  console.log('\n🎉 Folder counts updated successfully!');
}

fixFolderCounts().catch(console.error);