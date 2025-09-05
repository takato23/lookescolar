#!/usr/bin/env node

/**
 * Script para verificar el estado del evento
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read environment variables from .env.local
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEventStatus() {
  console.log('🔍 Checking event status...\n');

  const eventId = '97158b91-0926-4e68-a2f9-7516fbc5087c';

  try {
    // 1. Verificar el evento
    console.log(`1. Checking event ${eventId}...`);
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('❌ Error fetching event:', eventError);
      return;
    }

    if (!event) {
      console.log('❌ Event not found');
      return;
    }

    console.log('✅ Event found:', {
      id: event.id,
      name: event.name,
      school_name: event.school_name,
      active: event.active,
      share_token: event.share_token,
      is_published: event.is_published,
      published_at: event.published_at,
      created_at: event.created_at,
      updated_at: event.updated_at
    });

    // 2. Verificar carpetas del evento
    console.log('\n2. Checking folders for this event...');
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .eq('event_id', eventId);

    if (foldersError) {
      console.error('❌ Error fetching folders:', foldersError);
    } else {
      console.log(`Found ${folders?.length || 0} folders:`);
      folders?.forEach(folder => {
        console.log(`  - ${folder.name} (${folder.id})`);
        console.log(`    Published: ${folder.is_published}`);
        console.log(`    Share Token: ${folder.share_token || 'none'}`);
        console.log(`    Created: ${folder.created_at}`);
        console.log('');
      });
    }

    // 3. Verificar assets en las carpetas
    if (folders && folders.length > 0) {
      console.log('3. Checking assets in folders...');
      const folderIds = folders.map(f => f.id);
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .in('folder_id', folderIds);

      if (assetsError) {
        console.error('❌ Error fetching assets:', assetsError);
      } else {
        console.log(`Found ${assets?.length || 0} assets:`);
        assets?.forEach(asset => {
          console.log(`  - ${asset.filename} (${asset.id})`);
          console.log(`    Status: ${asset.status}`);
          console.log(`    Folder: ${asset.folder_id}`);
          console.log(`    Created: ${asset.created_at}`);
          console.log('');
        });
      }
    }

    // 4. Verificar si el evento necesita ser activado
    if (!event.active) {
      console.log('\n4. Event is not active. Activating it...');
      const { data: updatedEvent, error: updateError } = await supabase
        .from('events')
        .update({ 
          active: true,
          is_published: true,
          published_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .select('*')
        .single();

      if (updateError) {
        console.error('❌ Error updating event:', updateError);
      } else {
        console.log('✅ Event activated:', {
          id: updatedEvent.id,
          name: updatedEvent.name,
          active: updatedEvent.active,
          is_published: updatedEvent.is_published,
          published_at: updatedEvent.published_at
        });
      }
    }

    // 5. Verificar si las carpetas necesitan ser publicadas
    if (folders && folders.length > 0) {
      console.log('\n5. Checking if folders need to be published...');
      
      for (const folder of folders) {
        if (!folder.is_published) {
          console.log(`Publishing folder: ${folder.name} (${folder.id})`);
          
          const { data: updatedFolder, error: updateError } = await supabase
            .from('folders')
            .update({ 
              is_published: true,
              published_at: new Date().toISOString()
            })
            .eq('id', folder.id)
            .select('*')
            .single();

          if (updateError) {
            console.error(`❌ Error updating folder ${folder.name}:`, updateError);
          } else {
            console.log(`✅ Folder published: ${updatedFolder.name}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error during status check:', error);
  }
}

checkEventStatus().then(() => {
  console.log('\n✅ Status check complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Status check failed:', error);
  process.exit(1);
});


