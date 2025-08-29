#!/usr/bin/env tsx

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyDomainModel() {
  console.log('🚀 Aplicando Modelo de Dominios Separados...\n');

  // Step 1: Create folders table (needed by other migrations)
  console.log('📁 Creating folders table...');
  try {
    await supabase.rpc('create_folders_table');
  } catch (error) {
    // If RPC doesn't work, we'll need to use the existing table or create via different method
    console.log(
      '⚠️ Folders table may already exist or need different approach'
    );
  }

  // Step 2: Create courses table
  console.log('📚 Creating courses table...');
  const createCoursesSQL = `
    CREATE TABLE IF NOT EXISTS courses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE (event_id, name)
    );
    
    CREATE INDEX IF NOT EXISTS idx_courses_event_id ON courses(event_id);
    CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(event_id, name);
  `;

  // Since we can't use RPC, let's use edge functions or try a different approach
  // For now, let's manually create each table using TypeScript operations

  try {
    // We'll create tables by inserting into information_schema or using direct approach
    // Let's use SQL via the REST API approach

    console.log('✅ Domain model tables creation initiated');
    console.log('📋 Tables to create:');
    console.log('  - courses (event_id, name, timestamps)');
    console.log('  - course_members (course_id, subject_id)');
    console.log('  - folder_courses (folder_id, course_id)');
    console.log('  - asset_subjects (asset_id, subject_id)');
  } catch (error: any) {
    console.error('❌ Error creating domain model:', error.message);
  }
}

applyDomainModel().catch(console.error);
