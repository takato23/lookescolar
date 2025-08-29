#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function executeSQL(description: string, tableName: string, createFn: () => Promise<any>) {
  console.log(`🔄 ${description}...`);
  
  try {
    // First check if table already exists
    const { error: checkError } = await supabase.from(tableName).select('count').limit(1);
    
    if (!checkError) {
      console.log(`✅ ${tableName} already exists, skipping`);
      return true;
    }
    
    // Table doesn't exist, create it
    await createFn();
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error: any) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

async function setupHierarchicalSystem() {
  console.log('🚀 Setting up Hierarchical Token System manually...\n');
  
  // We'll create tables using Supabase SQL queries through the management API
  // Since we can't use RPC, we'll use a different approach
  
  console.log('📋 Creating core tables for hierarchical system:');
  
  // 1. Create folders table first (if it doesn't exist from previous migration)
  console.log('\n1️⃣ Folders Table (from previous migration)');
  const { error: foldersError } = await supabase.from('folders').select('count').limit(1);
  if (foldersError) {
    console.log('❌ Folders table missing - this should exist from 20250825_unified_photo_system_optimized.sql');
    console.log('⚠️ Please ensure the unified photo system migration was applied first');
  } else {
    console.log('✅ Folders table exists');
  }
  
  // 2. Create assets table (if it doesn't exist from previous migration)
  console.log('\n2️⃣ Assets Table (from previous migration)');
  const { error: assetsError } = await supabase.from('assets').select('count').limit(1);
  if (assetsError) {
    console.log('❌ Assets table missing - this should exist from 20250825_unified_photo_system_optimized.sql');
    console.log('⚠️ Please ensure the unified photo system migration was applied first');
  } else {
    console.log('✅ Assets table exists');
  }
  
  console.log('\n🎯 Core hierarchical tables status checked.');
  console.log('\nNext steps needed:');
  console.log('1. Ensure folders and assets tables exist from previous migrations');
  console.log('2. Create courses, course_members, folder_courses, asset_subjects tables');
  console.log('3. Create access_tokens and token_access_logs tables');
  console.log('4. Create API schema and canonical functions');
  console.log('\n💡 Recommend using Supabase dashboard SQL editor for manual table creation.');
}

setupHierarchicalSystem().catch(console.error);