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

async function checkEventsAndFolders() {
  console.log('🔍 Checking events and folders in database...\n');

  try {
    // 1. Check all events
    console.log('1. 📅 Events in database:');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, school, date')
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.log('❌ Error querying events:', eventsError.message);
    } else {
      console.log(`✅ Found ${events?.length || 0} events:`);
      events?.forEach((event, i) => {
        console.log(
          `   ${i + 1}. "${event.name}" - ${event.school} (${event.id})`
        );
      });
    }

    // 2. Check all folders
    console.log('\n2. 📁 Folders in database:');
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, event_id, parent_id')
      .order('created_at', { ascending: false });

    if (foldersError) {
      console.log('❌ Error querying folders:', foldersError.message);
    } else {
      console.log(`✅ Found ${folders?.length || 0} folders:`);
      folders?.forEach((folder, i) => {
        const isRoot = !folder.parent_id;
        const prefix = isRoot ? '📂' : '  └─ 📁';
        console.log(
          `   ${i + 1}. ${prefix} "${folder.name}" (Event: ${folder.event_id})`
        );
      });
    }

    // 3. Check assets per folder
    console.log('\n3. 🖼️  Assets per folder:');
    if (folders && folders.length > 0) {
      for (const folder of folders) {
        const { data: assets, error: assetsError } = await supabase
          .from('assets')
          .select('id, filename, status')
          .eq('folder_id', folder.id);

        if (assetsError) {
          console.log(
            `   ❌ Error checking assets for "${folder.name}": ${assetsError.message}`
          );
        } else {
          const assetCount = assets?.length || 0;
          console.log(`   📁 "${folder.name}": ${assetCount} assets`);
          if (assetCount > 0) {
            assets?.slice(0, 3).forEach((asset, i) => {
              console.log(
                `      ${i + 1}. ${asset.filename} (${asset.status})`
              );
            });
            if (assetCount > 3) {
              console.log(`      ... and ${assetCount - 3} more`);
            }
          }
        }
      }
    }

    // 4. Check folders with event names
    console.log('\n4. 🔗 Folders grouped by event:');
    if (events && events.length > 0) {
      for (const event of events) {
        const { data: eventFolders, error: eventFoldersError } = await supabase
          .from('folders')
          .select('id, name, parent_id')
          .eq('event_id', event.id)
          .order('name');

        if (eventFoldersError) {
          console.log(
            `   ❌ Error getting folders for "${event.name}": ${eventFoldersError.message}`
          );
        } else {
          const folderCount = eventFolders?.length || 0;
          console.log(`   📅 "${event.name}": ${folderCount} folders`);
          eventFolders?.forEach((folder, i) => {
            const isRoot = !folder.parent_id;
            const prefix = isRoot ? '   📂' : '     └─ 📁';
            console.log(`${prefix} "${folder.name}"`);
          });
        }
      }
    }
  } catch (err) {
    console.error('❌ Check failed:', err);
  }
}

checkEventsAndFolders().catch(console.error);
