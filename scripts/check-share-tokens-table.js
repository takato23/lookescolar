#!/usr/bin/env node

/**
 * Script para verificar la tabla share_tokens
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

async function checkShareTokensTable() {
  console.log('🔍 Checking share_tokens table...\n');

  const token = 'ddda4ca6a1967c690c30a5e1143308a2';

  try {
    // 1. Verificar si existe la tabla share_tokens
    console.log('1. Checking if share_tokens table exists...');
    const { data: shareTokens, error: shareTokensError } = await supabase
      .from('share_tokens')
      .select('*')
      .limit(1);

    if (shareTokensError) {
      console.log('❌ share_tokens table does not exist or is not accessible:', shareTokensError.message);
    } else {
      console.log('✅ share_tokens table exists');
      console.log(`Found ${shareTokens?.length || 0} records`);
    }

    // 2. Verificar si el token existe en folders (que es donde realmente está)
    console.log('\n2. Checking if token exists in folders table...');
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('*')
      .eq('share_token', token)
      .single();

    if (folderError) {
      console.log('❌ Token not found in folders table:', folderError.message);
    } else {
      console.log('✅ Token found in folders table:', {
        id: folder.id,
        name: folder.name,
        event_id: folder.event_id,
        share_token: folder.share_token,
        is_published: folder.is_published,
        published_at: folder.published_at
      });
    }

    // 3. Verificar si el token existe en events (por si acaso)
    console.log('\n3. Checking if token exists in events table...');
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('share_token', token)
      .single();

    if (eventError) {
      console.log('❌ Token not found in events table:', eventError.message);
    } else {
      console.log('✅ Token found in events table:', {
        id: event.id,
        name: event.name,
        share_token: event.share_token
      });
    }

    // 4. Verificar la estructura de la tabla events
    console.log('\n4. Checking events table structure...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(1);

    if (eventsError) {
      console.log('❌ Error accessing events table:', eventsError.message);
    } else if (events && events.length > 0) {
      console.log('✅ Events table structure:');
      const event = events[0];
      Object.keys(event).forEach(key => {
        console.log(`  - ${key}: ${typeof event[key]} (${event[key]})`);
      });
    }

    // 5. Verificar la estructura de la tabla folders
    console.log('\n5. Checking folders table structure...');
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .limit(1);

    if (foldersError) {
      console.log('❌ Error accessing folders table:', foldersError.message);
    } else if (folders && folders.length > 0) {
      console.log('✅ Folders table structure:');
      const folder = folders[0];
      Object.keys(folder).forEach(key => {
        console.log(`  - ${key}: ${typeof folder[key]} (${folder[key]})`);
      });
    }

  } catch (error) {
    console.error('❌ Error during table check:', error);
  }
}

checkShareTokensTable().then(() => {
  console.log('\n✅ Table check complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Table check failed:', error);
  process.exit(1);
});









