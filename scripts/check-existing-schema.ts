#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkExistingSchema() {
  console.log('🔍 Checking existing schema...\n');
  
  // Check what tables exist
  const tables = ['events', 'subjects', 'folders', 'assets', 'courses', 'course_members', 'folder_courses', 'asset_subjects', 'access_tokens', 'token_access_logs'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: exists`);
      }
    } catch (err: any) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  console.log('\n🎯 Ready to apply hierarchical migrations');
}

checkExistingSchema().catch(console.error);