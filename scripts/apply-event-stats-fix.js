#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function applyFix() {
  // Read environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing environment variables:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!serviceKey);
    process.exit(1);
  }

  console.log('🔧 Applying get_event_stats function fix...');

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, serviceKey);

  // Read the SQL fix
  const sqlPath = path.join(__dirname, 'fix-get-event-stats.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    // Apply the fix
    const { data, error } = await supabase.rpc('query', { query: sql });

    if (error) {
      console.error('❌ Error applying fix:', error);
      process.exit(1);
    }

    console.log('✅ Successfully applied get_event_stats function fix!');
    
    // Test the function with a dummy UUID array
    console.log('🧪 Testing the function...');
    const { data: testData, error: testError } = await supabase.rpc('get_event_stats', {
      event_ids: []
    });

    if (testError) {
      console.error('❌ Function test failed:', testError);
      process.exit(1);
    }

    console.log('✅ Function test passed!');
    console.log('🎉 Fix applied successfully. The events API should now work properly.');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

applyFix();
