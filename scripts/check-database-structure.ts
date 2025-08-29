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

async function checkDatabaseStructure() {
  console.log('🔍 Checking database structure...\n');

  try {
    // 1. Check events table structure by trying different common columns
    console.log('1. 📅 Events table structure:');
    const eventColumns = ['id', 'name', 'date', 'created_at', 'location', 'description'];
    let eventQuery = 'id, name';
    
    for (const col of ['date', 'created_at', 'location', 'description', 'school']) {
      try {
        const testQuery = await supabase
          .from('events')
          .select(`id, ${col}`)
          .limit(1);
        
        if (!testQuery.error) {
          eventQuery += `, ${col}`;
        }
      } catch (e) {
        // Column doesn't exist
      }
    }

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(eventQuery)
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.log('❌ Error querying events:', eventsError.message);
    } else {
      console.log(`✅ Found ${events?.length || 0} events:`);
      events?.forEach((event, i) => {
        console.log(`   ${i + 1}. "${event.name}" (${event.id})`);
        Object.keys(event).forEach(key => {
          if (key !== 'id' && key !== 'name') {
            console.log(`      ${key}: ${event[key]}`);
          }
        });
      });
    }

    // 2. Check if there are event_folders instead of folders
    console.log('\n2. 📁 Checking for event_folders table:');
    try {
      const { data: eventFolders, error: eventFoldersError } = await supabase
        .from('event_folders')
        .select('id, name, event_id')
        .limit(10);

      if (eventFoldersError) {
        console.log('❌ event_folders table does not exist or error:', eventFoldersError.message);
      } else {
        console.log(`✅ Found ${eventFolders?.length || 0} event_folders:`);
        eventFolders?.forEach((folder, i) => {
          console.log(`   ${i + 1}. "${folder.name}" (Event: ${folder.event_id})`);
        });
      }
    } catch (e) {
      console.log('❌ event_folders table does not exist');
    }

    // 3. Check photos table (old system)
    console.log('\n3. 🖼️  Checking photos table:');
    try {
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('id, filename, event_id, folder_id')
        .limit(10);

      if (photosError) {
        console.log('❌ Error with photos table:', photosError.message);
      } else {
        console.log(`✅ Found ${photos?.length || 0} photos in photos table:`);
        photos?.slice(0, 5).forEach((photo, i) => {
          console.log(`   ${i + 1}. "${photo.filename}" (Event: ${photo.event_id}, Folder: ${photo.folder_id})`);
        });
      }
    } catch (e) {
      console.log('❌ photos table access error');
    }

    // 4. Check available tables
    console.log('\n4. 📋 Available tables:');
    const tableNames = ['events', 'folders', 'event_folders', 'photos', 'assets', 'subjects', 'students'];
    
    for (const tableName of tableNames) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`   ❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`   ✅ ${tableName}: exists (${data?.length || 0} sample records)`);
          if (data && data.length > 0) {
            const columns = Object.keys(data[0]).slice(0, 5);
            console.log(`      Columns: ${columns.join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`   ❌ ${tableName}: exception`);
      }
    }

  } catch (err) {
    console.error('❌ Check failed:', err);
  }
}

checkDatabaseStructure().catch(console.error);



