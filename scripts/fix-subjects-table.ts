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

async function fixSubjectsTable() {
  console.log('🔧 Fixing subjects table structure...\n');

  const eventId = 'd8dc56fb-4fd8-4a9b-9ced-3d1df867bb99';

  try {
    // The actual SQL needs to be run in Supabase Dashboard since we can't execute DDL through the client
    console.log('📝 SQL needed to run in Supabase Dashboard:');
    console.log(`
-- Add missing columns to subjects table
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS section TEXT,
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create useful indexes
CREATE INDEX IF NOT EXISTS idx_subjects_event_id ON subjects(event_id);
CREATE INDEX IF NOT EXISTS idx_subjects_access_token ON subjects(access_token);
CREATE INDEX IF NOT EXISTS idx_subjects_token_expires ON subjects(token_expires_at);
    `);

    // Test if we can access the current columns
    console.log('\n🔍 Testing current subjects table access...');

    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, event_id, name, email, phone, created_at')
        .eq('event_id', eventId)
        .limit(1);

      if (error) {
        console.log(`❌ Error accessing subjects: ${error.message}`);
      } else {
        console.log(`✅ Can access subjects table with basic columns`);
        console.log(`   Found ${data?.length || 0} subjects for this event`);
      }
    } catch (e) {
      console.log(`❌ Error testing subjects access: ${e}`);
    }

    // Test what happens if we try to add a test subject with minimal data
    console.log('\n📝 Testing if we can create a test subject...');

    try {
      const testSubject = {
        event_id: eventId,
        name: 'Test Student',
        email: 'test@example.com',
        phone: '123456789',
      };

      const { data, error } = await supabase
        .from('subjects')
        .insert(testSubject)
        .select()
        .single();

      if (error) {
        console.log(`❌ Cannot create test subject: ${error.message}`);
      } else {
        console.log(`✅ Created test subject: ${data.name} (ID: ${data.id})`);

        // Clean up - delete the test subject
        await supabase.from('subjects').delete().eq('id', data.id);
        console.log(`🧹 Deleted test subject`);
      }
    } catch (e) {
      console.log(`❌ Error creating test subject: ${e}`);
    }
  } catch (error) {
    console.error('Error fixing subjects table:', error);
  }
}

fixSubjectsTable();
