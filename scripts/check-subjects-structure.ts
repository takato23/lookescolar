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

async function checkSubjectsStructure() {
  console.log('🔍 Checking subjects table structure...\n');

  try {
    // Try to get the structure by querying with limit 1 and see what columns are available
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ Error querying subjects: ${error.message}`);
      
      // Try with specific columns to see which ones exist
      const commonColumns = ['id', 'name', 'event_id', 'created_at', 'updated_at', 'access_token', 'token_expires_at', 'qr_code', 'email', 'phone', 'metadata'];
      
      console.log('\nTesting individual columns:');
      for (const col of commonColumns) {
        try {
          const { error: colError } = await supabase
            .from('subjects')
            .select(col)
            .limit(1);
          
          if (colError) {
            console.log(`  ❌ ${col}: ${colError.message}`);
          } else {
            console.log(`  ✅ ${col}: exists`);
          }
        } catch (e) {
          console.log(`  ❌ ${col}: error testing`);
        }
      }
    } else {
      console.log(`✅ Subjects table exists`);
      if (data && data.length > 0) {
        console.log('Sample data:', JSON.stringify(data[0], null, 2));
        console.log('Available columns:', Object.keys(data[0]));
      } else {
        console.log('Table is empty, but accessible');
      }
    }
  } catch (error) {
    console.error('Error checking subjects structure:', error);
  }
}

checkSubjectsStructure();



