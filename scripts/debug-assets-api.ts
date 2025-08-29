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

async function debugAssetsAPI() {
  console.log('🔍 Debugging Assets API...\n');

  const targetFolderId = '1d4fe778-f4fa-4d11-8b8e-647f63a485d2';

  // 1. Check if folders table exists and has the specific folder
  console.log('1. Checking folders table...');
  try {
    const { data: folderData, error: folderError } = await supabase
      .from('folders')
      .select('id, name, event_id, parent_id')
      .eq('id', targetFolderId)
      .single();

    if (folderError) {
      console.log('❌ Error querying folders:', folderError.message);
    } else if (folderData) {
      console.log('✅ Folder found:', folderData);
    } else {
      console.log('⚠️ Folder not found');
    }
  } catch (err) {
    console.log('❌ Exception querying folders:', err);
  }

  // 2. Check if assets table exists and structure
  console.log('\n2. Checking assets table structure...');
  try {
    const { data: assetsData, error: assetsError } = await supabase
      .from('assets')
      .select('id, filename, folder_id, status, created_at')
      .limit(1);

    if (assetsError) {
      console.log('❌ Error querying assets:', assetsError.message);
    } else {
      console.log(
        '✅ Assets table accessible, sample:',
        assetsData?.[0] || 'No assets found'
      );
    }
  } catch (err) {
    console.log('❌ Exception querying assets:', err);
  }

  // 3. Try the exact query from the API
  console.log('\n3. Testing exact API query...');
  try {
    const { data, error, count } = await supabase
      .from('assets')
      .select(
        'id, filename, preview_path, file_size, created_at, folder_id, status',
        {
          count: 'exact',
        }
      )
      .eq('folder_id', targetFolderId)
      .order('created_at', { ascending: false })
      .range(0, 49);

    if (error) {
      console.log('❌ Exact API query error:', error);
    } else {
      console.log(
        `✅ Exact API query success: ${data?.length} assets, total count: ${count}`
      );
    }
  } catch (err) {
    console.log('❌ Exception in exact API query:', err);
  }

  // 4. Check available tables
  console.log('\n4. Checking available tables...');
  try {
    // Try a few common table names to see what exists
    const tableNames = ['folders', 'assets', 'event_folders', 'photos'];

    for (const tableName of tableNames) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(
            `✅ ${tableName}: exists (${data?.length || 0} sample records)`
          );
        }
      } catch (err) {
        console.log(`❌ ${tableName}: exception`);
      }
    }
  } catch (err) {
    console.log('❌ Exception checking tables:', err);
  }

  // 5. List all folders to see if any exist
  console.log('\n5. Listing existing folders...');
  try {
    const { data: allFolders, error: allFoldersError } = await supabase
      .from('folders')
      .select('id, name, event_id')
      .limit(10);

    if (allFoldersError) {
      console.log('❌ Error listing folders:', allFoldersError.message);
    } else {
      console.log(`✅ Found ${allFolders?.length || 0} folders:`);
      allFolders?.forEach((folder, i) => {
        console.log(`  ${i + 1}. ${folder.name} (${folder.id})`);
      });
    }
  } catch (err) {
    console.log('❌ Exception listing folders:', err);
  }
}

debugAssetsAPI().catch(console.error);
