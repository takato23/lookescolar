#!/usr/bin/env node

/**
 * Script para encontrar tokens válidos en la base de datos
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

async function findValidTokens() {
  console.log('🔍 Finding valid tokens...\n');

  try {
    // 1. Buscar carpetas con share_token
    console.log('1. Checking folders with share tokens...');
    const { data: foldersWithTokens, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, share_token, is_published, event_id')
      .not('share_token', 'is', null);

    if (foldersWithTokens && foldersWithTokens.length > 0) {
      console.log(`✅ Found ${foldersWithTokens.length} folders with share tokens:`);
      foldersWithTokens.forEach(folder => {
        console.log(`  - ${folder.name} (${folder.id})`);
        console.log(`    Token: ${folder.share_token}`);
        console.log(`    Published: ${folder.is_published}`);
        console.log(`    Event ID: ${folder.event_id}`);
        console.log('');
      });
    } else {
      console.log('❌ No folders with share tokens found');
    }

    // 2. Buscar eventos con share_token
    console.log('2. Checking events with share tokens...');
    const { data: eventsWithTokens, error: eventsError } = await supabase
      .from('events')
      .select('id, name, school_name, share_token, is_published')
      .not('share_token', 'is', null);

    if (eventsWithTokens && eventsWithTokens.length > 0) {
      console.log(`✅ Found ${eventsWithTokens.length} events with share tokens:`);
      eventsWithTokens.forEach(event => {
        console.log(`  - ${event.name} (${event.id})`);
        console.log(`    Token: ${event.share_token}`);
        console.log(`    Published: ${event.is_published}`);
        console.log(`    School: ${event.school_name}`);
        console.log('');
      });
    } else {
      console.log('❌ No events with share tokens found');
    }

    // 3. Buscar access tokens
    console.log('3. Checking access tokens...');
    const { data: accessTokens, error: accessError } = await supabase
      .from('access_tokens')
      .select('id, token, scope, resource_id, access_level, expires_at, is_active')
      .eq('is_active', true)
      .limit(10);

    if (accessTokens && accessTokens.length > 0) {
      console.log(`✅ Found ${accessTokens.length} active access tokens:`);
      accessTokens.forEach(token => {
        console.log(`  - Token: ${token.token}`);
        console.log(`    Scope: ${token.scope}`);
        console.log(`    Resource ID: ${token.resource_id}`);
        console.log(`    Access Level: ${token.access_level}`);
        console.log(`    Expires: ${token.expires_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No active access tokens found');
    }

    // 4. Buscar subject tokens (legacy)
    console.log('4. Checking legacy subject tokens...');
    const { data: subjectTokens, error: subjectError } = await supabase
      .from('subject_tokens')
      .select('id, token, subject_id, expires_at, subjects(id, name, event_id)')
      .limit(10);

    if (subjectTokens && subjectTokens.length > 0) {
      console.log(`✅ Found ${subjectTokens.length} subject tokens:`);
      subjectTokens.forEach(token => {
        console.log(`  - Token: ${token.token}`);
        console.log(`    Subject ID: ${token.subject_id}`);
        console.log(`    Subject Name: ${token.subjects?.name}`);
        console.log(`    Event ID: ${token.subjects?.event_id}`);
        console.log(`    Expires: ${token.expires_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No subject tokens found');
    }

    // 5. Crear un token de prueba si no hay ninguno
    if ((!foldersWithTokens || foldersWithTokens.length === 0) && 
        (!eventsWithTokens || eventsWithTokens.length === 0) && 
        (!accessTokens || accessTokens.length === 0) && 
        (!subjectTokens || subjectTokens.length === 0)) {
      
      console.log('5. No valid tokens found. Creating a test token...');
      
      // Buscar la primera carpeta publicada
      const { data: publishedFolders, error: publishedError } = await supabase
        .from('folders')
        .select('id, name, event_id')
        .eq('is_published', true)
        .limit(1);

      if (publishedFolders && publishedFolders.length > 0) {
        const folder = publishedFolders[0];
        const testToken = 'ddda4ca6a1967c690c30a5e1143308a2'; // El token que estamos probando
        
        console.log(`Creating share token for folder: ${folder.name} (${folder.id})`);
        
        const { data: updatedFolder, error: updateError } = await supabase
          .from('folders')
          .update({ share_token: testToken })
          .eq('id', folder.id)
          .select('id, name, share_token, is_published')
          .single();

        if (updatedFolder && !updateError) {
          console.log('✅ Test token created successfully!');
          console.log(`  Folder: ${updatedFolder.name}`);
          console.log(`  Token: ${updatedFolder.share_token}`);
          console.log(`  Published: ${updatedFolder.is_published}`);
          console.log('');
          console.log(`🔗 You can now test the store with: http://localhost:3000/store-unified/${testToken}`);
        } else {
          console.log('❌ Failed to create test token:', updateError);
        }
      } else {
        console.log('❌ No published folders found to create test token');
      }
    }

  } catch (error) {
    console.error('❌ Error during token search:', error);
  }
}

findValidTokens().then(() => {
  console.log('✅ Token search complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Token search failed:', error);
  process.exit(1);
});


