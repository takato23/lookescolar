#!/usr/bin/env tsx

/**
 * 📸 CREATE TEST PHOTOS - Para poblar el evento de prueba con fotos
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const tenantId = '00000000-0000-0000-0000-000000000001';
const eventId = '7de7f1e6-7d2f-47c4-ab86-5ca3ef037edd';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestPhotos() {
  console.log('📸 CREATING TEST PHOTOS');
  console.log('='.repeat(30));

  try {
    // Get the family folder
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name')
      .eq('event_id', eventId)
      .eq('name', 'Familia González');

    if (foldersError || !folders || folders.length === 0) {
      console.error('❌ Error finding family folder:', foldersError);
      return;
    }

    const familyFolderId = folders[0].id;
    console.log('✅ Found family folder:', familyFolderId);

    // Create test photos
    const testPhotos = [
      {
        folder_id: familyFolderId,
        storage_path: 'test-photos/photo1.jpg',
        preview_path: 'test-photos/preview1.jpg',
        watermark_path: 'test-photos/watermark1.jpg',
        width: 1200,
        height: 800,
        tenant_id: tenantId
      },
      {
        folder_id: familyFolderId,
        storage_path: 'test-photos/photo2.jpg',
        preview_path: 'test-photos/preview2.jpg',
        watermark_path: 'test-photos/watermark2.jpg',
        width: 1200,
        height: 800,
        tenant_id: tenantId
      },
      {
        folder_id: familyFolderId,
        storage_path: 'test-photos/photo3.jpg',
        preview_path: 'test-photos/preview3.jpg',
        watermark_path: 'test-photos/watermark3.jpg',
        width: 1200,
        height: 800,
        tenant_id: tenantId
      }
    ];

    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .insert(testPhotos)
      .select();

    if (photosError) {
      console.error('❌ Error creating photos:', photosError);
      return;
    }

    console.log(`✅ Created ${photos?.length || 0} test photos`);

    // Now create signed URLs for testing
    console.log('\n🔗 Creating signed URLs...');
    for (const photo of photos || []) {
      // Create a mock signed URL for testing
      const signedUrl = `https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop&auto=format`;

      await supabase
        .from('photos')
        .update({ signed_url: signedUrl })
        .eq('id', photo.id);
    }

    console.log('✅ Signed URLs created');
    console.log('\n🎉 Test photos created successfully!');
    console.log('📍 You can now test the gallery:');
    console.log(`   - Gallery URL: /gallery/${eventId}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestPhotos();






