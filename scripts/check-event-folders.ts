#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEventFolders() {
  console.log('🔍 Checking event_folders table...');

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('event_folders')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Error accessing event_folders:', error.message);

      // Try to create the table directly
      console.log('🔧 Trying to create table directly...');

      const createSQL = `
        CREATE TABLE IF NOT EXISTS event_folders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          parent_id UUID REFERENCES event_folders(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          path TEXT NOT NULL DEFAULT '',
          depth INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER DEFAULT 0,
          description TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      const { error: createError } = await supabase.rpc('exec', {
        sql: createSQL,
      });

      if (createError) {
        console.log('❌ Failed to create table:', createError.message);
      } else {
        console.log('✅ Table created successfully');
      }
    } else {
      console.log('✅ event_folders table exists');
      console.log(`📊 Found ${data?.length || 0} folders`);
    }

    // Check if photos table has folder_id column
    console.log('🔍 Checking photos.folder_id column...');

    const { data: photosData, error: photosError } = await supabase
      .from('photos')
      .select('id, folder_id')
      .limit(1);

    if (photosError) {
      console.log('❌ Error checking photos.folder_id:', photosError.message);

      // Try to add the column
      const addColumnSQL = `
        ALTER TABLE photos ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES event_folders(id) ON DELETE SET NULL;
      `;

      const { error: addError } = await supabase.rpc('exec', {
        sql: addColumnSQL,
      });

      if (addError) {
        console.log('❌ Failed to add folder_id column:', addError.message);
      } else {
        console.log('✅ folder_id column added to photos');
      }
    } else {
      console.log('✅ photos.folder_id column exists');
    }

    // List all events for testing
    console.log('📋 Available events:');
    const { data: events } = await supabase
      .from('events')
      .select('id, name, date')
      .order('created_at', { ascending: false });

    if (events) {
      events.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.name} (${event.id})`);
      });
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkEventFolders();
