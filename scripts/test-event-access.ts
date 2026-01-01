#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testEventAccess() {
  console.log('🔍 Testing event access...');

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', '7de7f1e6-7d2f-47c4-ab86-5ca3ef037edd');

  console.log('Data:', data);
  console.log('Error:', error);
}

testEventAccess();








