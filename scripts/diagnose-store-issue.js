#!/usr/bin/env node

/**
 * Script para diagnosticar el problema de la tienda unificada
 * Verifica el estado de la base de datos y los tokens
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

async function diagnoseStoreIssue() {
  console.log('🔍 Diagnosing store issue...\n');

  const token = 'ddda4ca6a1967c690c30a5e1143308a2';
  console.log(`Token: ${token}`);

  try {
    // 1. Verificar si es un token de evento
    console.log('\n1. Checking event share tokens...');
    const { data: eventShare, error: eventError } = await supabase
      .from('events')
      .select('id, name, school_name, share_token, is_published')
      .eq('share_token', token)
      .single();

    if (eventShare && !eventError) {
      console.log('✅ Found event share token:', {
        eventId: eventShare.id,
        eventName: eventShare.name,
        schoolName: eventShare.school_name,
        isPublished: eventShare.is_published
      });

      // Verificar carpetas del evento
      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('id, name, is_published, share_token')
        .eq('event_id', eventShare.id);

      console.log('📁 Event folders:', folders?.length || 0);
      if (folders && folders.length > 0) {
        folders.forEach(folder => {
          console.log(`  - ${folder.name} (${folder.id}) - Published: ${folder.is_published}`);
        });
      }

      // Verificar assets en las carpetas
      if (folders && folders.length > 0) {
        const folderIds = folders.map(f => f.id);
        const { data: assets, error: assetsError } = await supabase
          .from('assets')
          .select('id, filename, folder_id, status')
          .in('folder_id', folderIds);

        console.log('📸 Assets in folders:', assets?.length || 0);
        if (assets && assets.length > 0) {
          assets.forEach(asset => {
            console.log(`  - ${asset.filename} (${asset.id}) - Status: ${asset.status}`);
          });
        }
      }

      return;
    } else {
      console.log('❌ Event share token not found');
    }

    // 2. Verificar si es un token de carpeta
    console.log('\n2. Checking folder share tokens...');
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, event_id, is_published, share_token, events(id, name, school_name)')
      .eq('share_token', token)
      .single();

    if (folder && !folderError) {
      console.log('✅ Found folder share token:', {
        folderId: folder.id,
        folderName: folder.name,
        eventId: folder.event_id,
        isPublished: folder.is_published,
        eventName: folder.events?.name
      });

      // Verificar assets en la carpeta
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('id, filename, status, created_at')
        .eq('folder_id', folder.id);

      console.log('📸 Assets in folder:', assets?.length || 0);
      if (assets && assets.length > 0) {
        assets.forEach(asset => {
          console.log(`  - ${asset.filename} (${asset.id}) - Status: ${asset.status} - Created: ${asset.created_at}`);
        });
      }

      return;
    } else {
      console.log('❌ Folder share token not found');
    }

    // 3. Verificar si es un token de acceso
    console.log('\n3. Checking access tokens...');
    const { data: accessToken, error: accessError } = await supabase
      .from('access_tokens')
      .select('id, scope, resource_id, access_level, expires_at, is_active')
      .eq('token', token)
      .single();

    if (accessToken && !accessError) {
      console.log('✅ Found access token:', {
        tokenId: accessToken.id,
        scope: accessToken.scope,
        resourceId: accessToken.resource_id,
        accessLevel: accessToken.access_level,
        isActive: accessToken.is_active,
        expiresAt: accessToken.expires_at
      });
      return;
    } else {
      console.log('❌ Access token not found');
    }

    // 4. Verificar si es un token de sujeto (legacy)
    console.log('\n4. Checking legacy subject tokens...');
    const { data: subjectToken, error: subjectError } = await supabase
      .from('subject_tokens')
      .select('id, subject_id, expires_at, subjects(id, name, event_id, events(id, name))')
      .eq('token', token)
      .single();

    if (subjectToken && !subjectError) {
      console.log('✅ Found legacy subject token:', {
        tokenId: subjectToken.id,
        subjectId: subjectToken.subject_id,
        subjectName: subjectToken.subjects?.name,
        eventId: subjectToken.subjects?.event_id,
        eventName: subjectToken.subjects?.events?.name,
        expiresAt: subjectToken.expires_at
      });
      return;
    } else {
      console.log('❌ Legacy subject token not found');
    }

    // 5. Verificar funciones RPC
    console.log('\n5. Testing RPC functions...');
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('validate_access_token', { p_token_plain: token });

      if (rpcError) {
        console.log('❌ RPC validate_access_token error:', rpcError.message);
      } else {
        console.log('✅ RPC validate_access_token result:', rpcData);
      }
    } catch (rpcErr) {
      console.log('❌ RPC function not available:', rpcErr.message);
    }

    // 6. Verificar estado general de la base de datos
    console.log('\n6. Database status...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, school_name')
      .limit(5);

    console.log('📅 Recent events:', events?.length || 0);
    if (events && events.length > 0) {
      events.forEach(event => {
        console.log(`  - ${event.name} (${event.id}) - School: ${event.school_name}`);
      });
    }

    const { data: allFolders, error: allFoldersError } = await supabase
      .from('folders')
      .select('id, name, event_id, is_published')
      .limit(10);

    console.log('📁 Recent folders:', allFolders?.length || 0);
    if (allFolders && allFolders.length > 0) {
      allFolders.forEach(folder => {
        console.log(`  - ${folder.name} (${folder.id}) - Published: ${folder.is_published}`);
      });
    }

    const { data: allAssets, error: allAssetsError } = await supabase
      .from('assets')
      .select('id, filename, folder_id, status')
      .limit(10);

    console.log('📸 Recent assets:', allAssets?.length || 0);
    if (allAssets && allAssets.length > 0) {
      allAssets.forEach(asset => {
        console.log(`  - ${asset.filename} (${asset.id}) - Status: ${asset.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
}

diagnoseStoreIssue().then(() => {
  console.log('\n✅ Diagnosis complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Diagnosis failed:', error);
  process.exit(1);
});
