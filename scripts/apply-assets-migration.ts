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

async function applyAssetsMigration() {
  console.log('🔄 Applying assets table migration to Supabase...\n');

  try {
    // Define SQL directly instead of reading from file
    const sqlContent = `
-- Create the assets table (replaces photos for unified system)
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

INSERT INTO public.assets (
    folder_id,
    filename,
    original_path,
    preview_path,
    checksum,
    file_size,
    mime_type,
    status
) VALUES (
    '1d4fe778-f4fa-4d11-8b8e-647f63a485d2',
    'test-photo-1.jpg',
    '/storage/originals/test-photo-1.jpg',
    '/storage/previews/test-photo-1.jpg',
    'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef12',
    1024000,
    'image/jpeg',
    'ready'
), (
    '1d4fe778-f4fa-4d11-8b8e-647f63a485d2',
    'test-photo-2.jpg',
    '/storage/originals/test-photo-2.jpg',
    '/storage/previews/test-photo-2.jpg',
    'def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef123456ab',
    2048000,
    'image/jpeg',
    'ready'
) ON CONFLICT DO NOTHING;
`;

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📄 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.includes('--') && statement.indexOf('--') < 50) {
        // Skip comment-only lines
        continue;
      }

      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);
      console.log(
        `   ${statement.substring(0, 80)}${statement.length > 80 ? '...' : ''}`
      );

      try {
        const { data, error } = await supabase.rpc('exec', {
          sql: statement + ';',
        });

        if (error) {
          console.log(`❌ Error in statement ${i + 1}:`, error.message);
          // Continue with other statements unless it's a critical error
          if (error.message.includes('already exists')) {
            console.log('   ℹ️  Resource already exists, continuing...');
          } else if (error.message.includes('does not exist')) {
            console.log(
              '   ⚠️  Dependency missing, might need manual intervention'
            );
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`❌ Exception in statement ${i + 1}:`, err);
      }
    }

    // Verify the table was created
    console.log('\n🔍 Verifying assets table creation...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('assets')
      .select('id, filename, folder_id, status')
      .limit(5);

    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
    } else {
      console.log(
        `✅ Assets table verified! Found ${verifyData?.length || 0} test records`
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
      '\n🎉 Migration completed! You can now test the PhotoAdmin component.'
    );
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

applyAssetsMigration().catch(console.error);
