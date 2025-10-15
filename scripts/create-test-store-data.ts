import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestStoreData() {
  try {
    console.log('🚀 Creando datos de prueba para tienda...');

    // 1. Crear evento de prueba
    const { data: event, error: eventError } = await supabase
      .from('events')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Evento de Prueba Escolar',
        school: 'Escuela Test',
        date: '2025-01-15',
        active: true
      })
      .select()
      .single();

    if (eventError) {
      console.error('Error creando evento:', eventError);
      return;
    }

    console.log('✅ Evento creado:', event.name);

    // 2. Crear carpeta raíz de prueba
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Fotos Escolares Test',
        event_id: event.id,
        depth: 0,
        sort_order: 0,
        share_token: 'test-token',
        is_published: true,
        store_settings: {
          allow_download: false,
          watermark_enabled: true,
          store_title: 'Tienda de Prueba',
          store_description: 'Tienda de fotos escolares de prueba',
          contact_info: 'contacto@escuela-test.com'
        },
        published_at: new Date().toISOString(),
        view_count: 0
      })
      .select()
      .single();

    if (folderError) {
      console.error('Error creando carpeta:', folderError);
      return;
    }

    console.log('✅ Carpeta creada:', folder.name);

    // 3. Crear algunas fotos de prueba
    const testPhotos = [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        folder_id: folder.id,
        filename: 'foto-estudiante-1.jpg',
        storage_path: '/test/foto-estudiante-1.jpg',
        preview_url: '/api/public/preview/test/foto-estudiante-1.jpg',
        watermark_url: '/api/public/preview/test/foto-estudiante-1-watermark.jpg',
        file_size: 1024000,
        status: 'ready',
        is_group_photo: false
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440011',
        folder_id: folder.id,
        filename: 'foto-grupal-1.jpg',
        storage_path: '/test/foto-grupal-1.jpg',
        preview_url: '/api/public/preview/test/foto-grupal-1.jpg',
        watermark_url: '/api/public/preview/test/foto-grupal-1-watermark.jpg',
        file_size: 2048000,
        status: 'ready',
        is_group_photo: true,
        metadata: {
          camera: {
            focal_length: 24,
            iso: 1200,
            shutter_speed: 0.125
          }
        }
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440012',
        folder_id: folder.id,
        filename: 'foto-estudiante-2.jpg',
        storage_path: '/test/foto-estudiante-2.jpg',
        preview_url: '/api/public/preview/test/foto-estudiante-2.jpg',
        watermark_url: '/api/public/preview/test/foto-estudiante-2-watermark.jpg',
        file_size: 1536000,
        status: 'ready',
        is_group_photo: false
      }
    ];

    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .upsert(testPhotos)
      .select();

    if (assetsError) {
      console.error('Error creando assets:', assetsError);
      return;
    }

    console.log(`✅ ${assets.length} fotos creadas`);

    // 4. Actualizar contador de fotos en la carpeta
    const { error: updateError } = await supabase
      .from('folders')
      .update({ photo_count: assets.length })
      .eq('id', folder.id);

    if (updateError) {
      console.error('Error actualizando contador:', updateError);
    }

    console.log('🎉 ¡Datos de prueba creados exitosamente!');
    console.log(`📁 Carpeta: ${folder.name}`);
    console.log(`🔗 Token: test-token`);
    console.log(`📸 Fotos: ${assets.length}`);
    console.log(`🌐 URL: http://localhost:3000/store/test-token`);

  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestStoreData()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en script:', error);
      process.exit(1);
    });
}

export { createTestStoreData };
