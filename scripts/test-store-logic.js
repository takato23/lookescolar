#!/usr/bin/env node

/**
 * Script para probar la lógica de la tienda unificada
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

async function testStoreLogic() {
  console.log('🔍 Testing store logic...\n');

  const token = 'ddda4ca6a1967c690c30a5e1143308a2';
  const page = 1;
  const limit = 50;

  try {
    // 1. Verificar si es un share token (32 hex)
    const isShareToken = /^[a-f0-9]{32}$/i.test(token);
    console.log(`1. Is share token (32 hex): ${isShareToken}`);

    if (isShareToken) {
      console.log('✅ Token is a share token, proceeding with share token logic...');

      // 2. Buscar en share_tokens table
      console.log('\n2. Looking for token in share_tokens table...');
      const { data: shareTokenData, error: shareTokenError } = await supabase
        .from('share_tokens')
        .select('id, token, event_id, metadata, is_active, expires_at')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (shareTokenError) {
        console.log('❌ Error fetching share token:', shareTokenError.message);
      } else if (!shareTokenData) {
        console.log('❌ Share token not found or inactive');
      } else {
        console.log('✅ Share token found:', {
          id: shareTokenData.id,
          eventId: shareTokenData.event_id,
          isActive: shareTokenData.is_active,
          expiresAt: shareTokenData.expires_at
        });

        // 3. Verificar expiración
        const isExpired = shareTokenData.expires_at && new Date(shareTokenData.expires_at) <= new Date();
        console.log(`\n3. Token expiration check: ${isExpired ? 'EXPIRED' : 'VALID'}`);

        if (!isExpired) {
          console.log('✅ Token is not expired, proceeding...');

          // 4. Obtener información del evento
          console.log('\n4. Fetching event information...');
          const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('id, name, school, date')
            .eq('id', shareTokenData.event_id)
            .single();

          if (eventError) {
            console.log('❌ Error fetching event:', eventError.message);
          } else if (!eventData) {
            console.log('❌ Event not found');
          } else {
            console.log('✅ Event found:', {
              id: eventData.id,
              name: eventData.name,
              school: eventData.school,
              date: eventData.date
            });

            // 5. Obtener carpetas del evento
            console.log('\n5. Fetching event folders...');
            const { data: eventFolders, error: foldersError } = await supabase
              .from('folders')
              .select('id')
              .eq('event_id', shareTokenData.event_id);

            if (foldersError) {
              console.log('❌ Error fetching folders:', foldersError.message);
            } else {
              console.log(`✅ Found ${eventFolders?.length || 0} folders`);
              
              if (eventFolders && eventFolders.length > 0) {
                const folderIds = eventFolders.map(f => f.id);
                console.log('Folder IDs:', folderIds);

                // 6. Obtener assets de las carpetas
                console.log('\n6. Fetching assets from folders...');
                const offset = (page - 1) * limit;
                const { data: assets, error: assetsError } = await supabase
                  .from('assets')
                  .select('id, folder_id, filename, original_path, preview_path, watermark_path, file_size, mime_type, created_at, status')
                  .eq('status', 'ready')
                  .in('folder_id', folderIds)
                  .order('created_at', { ascending: false })
                  .range(offset, offset + limit - 1);

                if (assetsError) {
                  console.log('❌ Error fetching assets:', assetsError.message);
                } else {
                  console.log(`✅ Found ${assets?.length || 0} assets`);
                  
                  if (assets && assets.length > 0) {
                    console.log('Assets:');
                    assets.forEach((asset, index) => {
                      console.log(`  ${index + 1}. ${asset.filename} (${asset.id})`);
                      console.log(`     Status: ${asset.status}`);
                      console.log(`     Folder: ${asset.folder_id}`);
                      console.log(`     Size: ${asset.file_size} bytes`);
                      console.log('');
                    });

                    // 7. Construir URLs públicas
                    console.log('7. Building public URLs...');
                    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                    const publicBuckets = ['assets', 'photos', 'photo-public'];

                    const buildPublicUrl = (path) => {
                      if (!path || !baseUrl) return null;
                      for (const bucket of publicBuckets) {
                        return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
                      }
                      return null;
                    };

                    const photos = assets.map((asset) => {
                      const wm = asset.watermark_path || asset.watermark_url || null;
                      const pre = asset.preview_path || asset.preview_url || null;
                      const orig = asset.original_path || asset.storage_path || null;
                      const direct = typeof pre === 'string' && pre.startsWith('http') ? pre : null;
                      const url = direct || buildPublicUrl(wm) || buildPublicUrl(pre) || buildPublicUrl(orig) || '';
                      
                      return {
                        id: asset.id,
                        filename: asset.filename || asset.original_filename || 'foto',
                        preview_url: url,
                        size: asset.file_size || 0,
                        width: 800,
                        height: 600,
                      };
                    });

                    console.log('✅ Photos processed:', photos.length);
                    photos.forEach((photo, index) => {
                      console.log(`  ${index + 1}. ${photo.filename}`);
                      console.log(`     URL: ${photo.preview_url}`);
                      console.log('');
                    });

                    // 8. Crear subject object
                    const subject = {
                      id: eventData.id,
                      name: eventData.name || eventData.school || 'Evento',
                      grade_section: 'Evento',
                      event: {
                        name: eventData.name || eventData.school || 'Evento',
                        school_name: eventData.school || 'Escuela',
                        theme: 'default',
                      },
                    };

                    console.log('✅ Subject created:', subject);

                    console.log('\n🎉 Store logic test completed successfully!');
                    console.log(`📸 ${photos.length} photos available`);
                    console.log(`🏫 Event: ${subject.name}`);
                    console.log(`🔗 Token: ${token}`);

                  } else {
                    console.log('❌ No assets found in folders');
                  }
                }
              } else {
                console.log('❌ No folders found for event');
              }
            }
          }
        } else {
          console.log('❌ Token is expired');
        }
      }
    } else {
      console.log('❌ Token is not a share token (64 hex)');
    }

  } catch (error) {
    console.error('❌ Error during store logic test:', error);
  }
}

testStoreLogic().then(() => {
  console.log('\n✅ Store logic test complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Store logic test failed:', error);
  process.exit(1);
});
