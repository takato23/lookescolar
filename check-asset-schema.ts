#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

async function checkSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Asset columns:', Object.keys(data || {}));
  console.log('Sample asset:', JSON.stringify(data, null, 2));
}

checkSchema().catch(console.error);
