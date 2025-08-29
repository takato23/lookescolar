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

async function createAssetsTableDirect() {
  console.log('🔄 Creating assets table directly in Supabase...\n');

  try {
    // Create the complete SQL for the table
    const createTableSQL = `
CREATE TABLE IF NOT EXISTS public.assets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
    filename text NOT NULL,
    original_path text NOT NULL,
    preview_path text,
    checksum text NOT NULL,
    file_size bigint NOT NULL,
    mime_type text NOT NULL,
    dimensions jsonb,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid,
    
    CONSTRAINT assets_filename_not_empty CHECK (length(filename) > 0),
    CONSTRAINT assets_checksum_not_empty CHECK (length(checksum) > 0),
    CONSTRAINT assets_file_size_positive CHECK (file_size > 0)
);

CREATE INDEX IF NOT EXISTS assets_folder_id_idx ON public.assets(folder_id);
CREATE INDEX IF NOT EXISTS assets_checksum_idx ON public.assets(checksum);
CREATE INDEX IF NOT EXISTS assets_status_idx ON public.assets(status) WHERE status != 'ready';
CREATE INDEX IF NOT EXISTS assets_created_at_idx ON public.assets(created_at DESC);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
`;

    console.log('⚙️  Creating assets table and indexes...');

    // Use PostgreSQL functions that exist in Supabase
    const { data, error } = await supabase.rpc('sql', {
      query: createTableSQL,
    });

    if (error) {
      console.log('❌ Error creating table:', error.message);

      // Fallback: Try using fetch to hit Supabase's REST endpoint directly
      console.log('🔄 Trying alternative approach...');

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
          apikey: supabaseServiceKey,
        },
        body: JSON.stringify({ query: createTableSQL }),
      });

      if (!response.ok) {
        console.log(
          '❌ Alternative approach failed too. Manual intervention needed.'
        );
        console.log(
          '📋 Please execute this SQL manually in Supabase Dashboard > SQL Editor:'
        );
        console.log('---');
        console.log(createTableSQL);
        console.log('---');
        return;
      }
    } else {
      console.log('✅ Table creation SQL executed successfully');
    }

    // Insert test data
    console.log('\n⚙️  Inserting test data...');
    const { data: insertData, error: insertError } = await supabase
      .from('assets')
      .insert([
        {
          folder_id: '1d4fe778-f4fa-4d11-8b8e-647f63a485d2',
          filename: 'test-photo-1.jpg',
          original_path: '/storage/originals/test-photo-1.jpg',
          preview_path: '/storage/previews/test-photo-1.jpg',
          checksum:
            'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef12',
          file_size: 1024000,
          mime_type: 'image/jpeg',
          status: 'ready',
        },
        {
          folder_id: '1d4fe778-f4fa-4d11-8b8e-647f63a485d2',
          filename: 'test-photo-2.jpg',
          original_path: '/storage/originals/test-photo-2.jpg',
          preview_path: '/storage/previews/test-photo-2.jpg',
          checksum:
            'def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef123456ab',
          file_size: 2048000,
          mime_type: 'image/jpeg',
          status: 'ready',
        },
      ]);

    if (insertError) {
      console.log('❌ Error inserting test data:', insertError.message);
    } else {
      console.log('✅ Test data inserted successfully');
    }

    // Verify the table was created
    console.log('\n🔍 Verifying assets table...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('assets')
      .select('id, filename, folder_id, status')
      .limit(5);

    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
    } else {
      console.log(
        `✅ Assets table verified! Found ${verifyData?.length || 0} records`
      );
      if (verifyData && verifyData.length > 0) {
        verifyData.forEach((asset, i) => {
          console.log(`   ${i + 1}. ${asset.filename} (${asset.status})`);
        });
      }
    }

    // Test the exact API query
    console.log('\n🧪 Testing the exact API query...');
    const targetFolderId = '1d4fe778-f4fa-4d11-8b8e-647f63a485d2';

    const {
      data: apiTestData,
      error: apiTestError,
      count,
    } = await supabase
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

    if (apiTestError) {
      console.log('❌ API test query failed:', apiTestError.message);
    } else {
      console.log(
        `✅ API test query success! Found ${apiTestData?.length || 0} assets (total: ${count})`
      );
    }

    console.log(
      '\n🎉 Assets table setup completed! You can now test the PhotoAdmin component.'
    );
  } catch (err) {
    console.error('❌ Setup failed:', err);
    console.log('\n📋 Manual SQL to execute in Supabase Dashboard:');
    console.log('---');
    console.log(`
CREATE TABLE IF NOT EXISTS public.assets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
    filename text NOT NULL,
    original_path text NOT NULL,
    preview_path text,
    checksum text NOT NULL,
    file_size bigint NOT NULL,
    mime_type text NOT NULL,
    dimensions jsonb,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid,
    
    CONSTRAINT assets_filename_not_empty CHECK (length(filename) > 0),
    CONSTRAINT assets_checksum_not_empty CHECK (length(checksum) > 0),
    CONSTRAINT assets_file_size_positive CHECK (file_size > 0)
);

CREATE INDEX IF NOT EXISTS assets_folder_id_idx ON public.assets(folder_id);
CREATE INDEX IF NOT EXISTS assets_checksum_idx ON public.assets(checksum);
CREATE INDEX IF NOT EXISTS assets_status_idx ON public.assets(status) WHERE status != 'ready';
CREATE INDEX IF NOT EXISTS assets_created_at_idx ON public.assets(created_at DESC);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
`);
    console.log('---');
  }
}

createAssetsTableDirect().catch(console.error);
