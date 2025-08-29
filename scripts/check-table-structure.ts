#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableStructure() {
  console.log('🔍 Checking database table structure...\n');

  const eventId = 'd8dc56fb-4fd8-4a9b-9ced-3d1df867bb99';

  try {
    // 1. Check if photos table exists and has data for this event
    console.log('1. 📸 Checking photos table:');
    try {
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('id, filename, event_id, created_at')
        .eq('event_id', eventId)
        .limit(5);

      if (photosError) {
        console.log(`   ❌ Photos table error: ${photosError.message}`);
      } else {
        console.log(
          `   ✅ Photos table exists with ${photos?.length || 0} photos for this event`
        );
        photos?.forEach((p) =>
          console.log(`      - ${p.filename} (${p.created_at})`)
        );
      }
    } catch (e) {
      console.log(`   ❌ Photos table does not exist`);
    }

    // 2. Check if assets table exists and has data
    console.log('\n2. 📁 Checking assets table:');
    try {
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('id, filename, folder_id, created_at')
        .limit(5);

      if (assetsError) {
        console.log(`   ❌ Assets table error: ${assetsError.message}`);
      } else {
        console.log(
          `   ✅ Assets table exists with ${assets?.length || 0} total assets`
        );
        assets?.forEach((a) =>
          console.log(`      - ${a.filename} (folder: ${a.folder_id})`)
        );
      }
    } catch (e) {
      console.log(`   ❌ Assets table does not exist`);
    }

    // 3. Check folders table and relationship with event
    console.log('\n3. 📂 Checking folders table:');
    try {
      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('id, name, event_id, parent_id')
        .eq('event_id', eventId);

      if (foldersError) {
        console.log(`   ❌ Folders table error: ${foldersError.message}`);
      } else {
        console.log(
          `   ✅ Folders table exists with ${folders?.length || 0} folders for this event`
        );
        folders?.forEach((f) =>
          console.log(`      - ${f.name} (id: ${f.id}, parent: ${f.parent_id})`)
        );

        // Check assets in each folder
        if (folders && folders.length > 0) {
          console.log('\n4. 📊 Checking assets in each folder:');
          for (const folder of folders) {
            const { data: folderAssets, error: folderAssetsError } =
              await supabase
                .from('assets')
                .select('id, filename, status')
                .eq('folder_id', folder.id)
                .limit(3);

            if (!folderAssetsError && folderAssets) {
              console.log(
                `      Folder "${folder.name}": ${folderAssets.length} assets`
              );
              folderAssets.forEach((a) =>
                console.log(`        - ${a.filename} (${a.status})`)
              );
            }
          }
        }
      }
    } catch (e) {
      console.log(`   ❌ Folders table does not exist`);
    }

    // 4. Check subjects/students table
    console.log('\n5. 👥 Checking subjects table:');
    try {
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, event_id')
        .eq('event_id', eventId)
        .limit(3);

      if (subjectsError) {
        console.log(`   ❌ Subjects table error: ${subjectsError.message}`);
      } else {
        console.log(
          `   ✅ Subjects table exists with ${subjects?.length || 0} subjects for this event`
        );
        subjects?.forEach((s) => console.log(`      - ${s.name}`));
      }
    } catch (e) {
      console.log(`   ❌ Subjects table does not exist`);
    }
  } catch (error) {
    console.error('Error checking table structure:', error);
  }
}

checkTableStructure();
