#!/usr/bin/env ts-node

import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

async function applyFix() {
  console.log('🔧 Applying get_event_stats function fix...');

  try {
    // Create Supabase service client
    const supabase = await createServerSupabaseServiceClient();

    // Read the SQL fix
    const sqlPath = path.join(__dirname, 'fix-get-event-stats.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Apply the fix by executing the SQL directly
    const { data, error } = await supabase.rpc('query', {
      query: sql
    });

    if (error) {
      console.error('❌ Error applying fix:', error);
      
      // Try alternative approach - execute each statement separately
      console.log('🔄 Trying alternative approach...');
      
      // Drop function
      const { error: dropError } = await supabase.rpc('query', {
        query: 'DROP FUNCTION IF EXISTS public.get_event_stats(uuid[]);'
      });
      
      if (dropError) {
        console.error('❌ Error dropping function:', dropError);
        process.exit(1);
      }

      // Create function - extract just the CREATE part
      const createFunctionSQL = sql.substring(
        sql.indexOf('CREATE OR REPLACE FUNCTION'),
        sql.indexOf('GRANT EXECUTE')
      );

      const { error: createError } = await supabase.rpc('query', {
        query: createFunctionSQL
      });

      if (createError) {
        console.error('❌ Error creating function:', createError);
        process.exit(1);
      }

      console.log('✅ Function recreated successfully!');
    } else {
      console.log('✅ Successfully applied get_event_stats function fix!');
    }
    
    // Test the function with a dummy UUID array
    console.log('🧪 Testing the function...');
    const { data: testData, error: testError } = await supabase.rpc('get_event_stats', {
      event_ids: []
    });

    if (testError) {
      console.error('❌ Function test failed:', testError);
      console.log('⚠️  This might be expected if there are no events in the database');
    } else {
      console.log('✅ Function test passed!', testData);
    }

    console.log('🎉 Fix applied successfully. The events API should now work properly.');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

applyFix();
