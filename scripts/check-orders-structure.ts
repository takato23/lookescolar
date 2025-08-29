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

async function checkOrdersStructure() {
  console.log('🔍 Checking orders table structure...\n');

  try {
    // Try to get one record to see structure
    const { data, error } = await supabase.from('orders').select('*').limit(1);

    if (error) {
      console.log(`❌ Error querying orders: ${error.message}`);
    } else if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`✅ Orders table columns: ${columns.join(', ')}`);
      console.log(`📊 Sample record:`, data[0]);
    } else {
      console.log('✅ Orders table exists but is empty');
      // Try to get structure another way
      const { data: emptyData, error: structError } = await supabase
        .from('orders')
        .select('id, status, created_at')
        .limit(1);

      if (structError) {
        console.log(`❌ Structure error: ${structError.message}`);
      } else {
        console.log('✅ Basic columns (id, status, created_at) exist');
      }
    }
  } catch (err) {
    console.log('❌ Error checking orders table:', err);
  }
}

checkOrdersStructure().catch(console.error);
