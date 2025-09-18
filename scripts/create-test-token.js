#!/usr/bin/env node

/**
 * Script para crear un token de prueba válido
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

async function createTestToken() {
  console.log('🔧 Creating test token...\n');

  const testToken = 'ddda4ca6a1967c690c30a5e1143308a2';
  const eventId = '97158b91-0926-4e68-a2f9-7516fbc5087c'; // El evento donde subiste las fotos

  try {
    // 1. Buscar carpetas del evento
    console.log(`1. Looking for folders in event ${eventId}...`);
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, is_published, share_token')
      .eq('event_id', eventId);

    if (foldersError) {
      console.error('❌ Error fetching folders:', foldersError);
      return;
    }

    console.log(`Found ${folders?.length || 0} folders:`);
    folders?.forEach(folder => {
      console.log(`  - ${folder.name} (${folder.id}) - Published: ${folder.is_published} - Token: ${folder.share_token || 'none'}`);
    });

    // 2. Buscar una carpeta sin token o crear una nueva
    let targetFolder = folders?.find(f => !f.share_token);
    
    if (!targetFolder) {
      console.log('\n2. No folder without token found. Creating a new folder...');
      
      const { data: newFolder, error: createError } = await supabase
        .from('folders')
        .insert({
          event_id: eventId,
          name: 'Fotos del Evento',
          is_published: true,
          share_token: testToken,
          published_at: new Date().toISOString()
        })
        .select('id, name, share_token, is_published')
        .single();

      if (createError) {
        console.error('❌ Error creating folder:', createError);
        return;
      }

      targetFolder = newFolder;
      console.log('✅ New folder created:', {
        id: targetFolder.id,
        name: targetFolder.name,
        token: targetFolder.share_token,
        published: targetFolder.is_published
      });
    } else {
      console.log(`\n2. Using existing folder: ${targetFolder.name} (${targetFolder.id})`);
      
      // Asignar el token a la carpeta existente
      const { data: updatedFolder, error: updateError } = await supabase
        .from('folders')
        .update({ 
          share_token: testToken,
          is_published: true,
          published_at: new Date().toISOString()
        })
        .eq('id', targetFolder.id)
        .select('id, name, share_token, is_published')
        .single();

      if (updateError) {
        console.error('❌ Error updating folder:', updateError);
        return;
      }

      targetFolder = updatedFolder;
      console.log('✅ Folder updated with test token:', {
        id: targetFolder.id,
        name: targetFolder.name,
        token: targetFolder.share_token,
        published: targetFolder.is_published
      });
    }

    // 3. Verificar assets en la carpeta
    console.log(`\n3. Checking assets in folder ${targetFolder.id}...`);
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, filename, status, created_at')
      .eq('folder_id', targetFolder.id);

    if (assetsError) {
      console.error('❌ Error fetching assets:', assetsError);
    } else {
      console.log(`Found ${assets?.length || 0} assets:`);
      assets?.forEach(asset => {
        console.log(`  - ${asset.filename} (${asset.id}) - Status: ${asset.status} - Created: ${asset.created_at}`);
      });
    }

    // 4. Si no hay assets, mover algunos de otras carpetas
    if (!assets || assets.length === 0) {
      console.log('\n4. No assets found. Looking for assets in other folders...');
      
      const { data: allAssets, error: allAssetsError } = await supabase
        .from('assets')
        .select('id, filename, folder_id, status')
        .limit(10);

      if (allAssets && allAssets.length > 0) {
        console.log(`Found ${allAssets.length} assets in other folders. Moving some to test folder...`);
        
        // Mover los primeros 3 assets a la carpeta de prueba
        const assetsToMove = allAssets.slice(0, 3);
        
        for (const asset of assetsToMove) {
          const { error: moveError } = await supabase
            .from('assets')
            .update({ folder_id: targetFolder.id })
            .eq('id', asset.id);

          if (moveError) {
            console.error(`❌ Error moving asset ${asset.filename}:`, moveError);
          } else {
            console.log(`✅ Moved asset: ${asset.filename}`);
          }
        }
      }
    }

    console.log('\n🎉 Test token setup complete!');
    console.log(`🔗 You can now test the store with: http://localhost:3000/store-unified/${testToken}`);
    console.log(`📁 Folder: ${targetFolder.name} (${targetFolder.id})`);
    console.log(`📸 Assets: ${assets?.length || 0} photos available`);

  } catch (error) {
    console.error('❌ Error during token creation:', error);
  }
}

createTestToken().then(() => {
  console.log('\n✅ Token creation complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Token creation failed:', error);
  process.exit(1);
});









