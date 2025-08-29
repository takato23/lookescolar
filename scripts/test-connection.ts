#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('🔍 Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log(
  'Service key starts with:',
  supabaseServiceKey?.substring(0, 20) + '...'
);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('events')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection error:', error);
      return false;
    }

    console.log('✅ Connection successful');

    // Test if we can execute basic SQL
    const { data: schemaData, error: schemaError } =
      await supabase.rpc('get_schema_info');

    if (schemaError) {
      console.log(
        '⚠️ RPC functions not available, will use direct table operations'
      );
    } else {
      console.log('✅ RPC functions available');
    }

    return true;
  } catch (err: any) {
    console.error('❌ Test failed:', err.message);
    return false;
  }
}

testConnection().catch(console.error);
