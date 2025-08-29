import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzePhotosDiscrepancy() {
  console.log('🔍 Analizando discrepancia entre sistemas de fotos...\n');

  const eventId = '83070ba2-738e-4038-ab5e-0c42fe4a2880';

  try {
    // 1. Verificar si el evento existe
    console.log('📋 1. Verificando evento...');
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.log('❌ Evento no encontrado o error:', eventError?.message);
      return;
    }

    console.log(`✅ Evento encontrado: "${event.name}" - ${event.location}`);
    console.log(`   Fecha: ${event.date}, Estado: ${event.status}\n`);

    // 2. Contar fotos en sistema ANTIGUO (photos tabla directa)
    console.log('📸 2. Sistema ANTIGUO (tabla photos):');
    const {
      data: oldPhotos,
      error: oldError,
      count: oldCount,
    } = await supabase
      .from('photos')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId);

    if (oldError) {
      console.log('❌ Error consultando fotos antiguas:', oldError.message);
    } else {
      console.log(`   Total fotos: ${oldCount}`);
      if (oldPhotos && oldPhotos.length > 0) {
        console.log(`   Ejemplo foto: ${oldPhotos[0].original_filename}`);
        console.log(`   Storage path: ${oldPhotos[0].storage_path}`);
        console.log(`   Preview path: ${oldPhotos[0].preview_path}`);
        console.log(`   Watermark path: ${oldPhotos[0].watermark_path}`);
      }
    }

    // 3. Contar fotos en sistema NUEVO (assets vía folders)
    console.log('\n🗂️ 3. Sistema NUEVO (tabla assets vía folders):');

    // Primero obtener folders del evento
    const {
      data: folders,
      error: foldersError,
      count: foldersCount,
    } = await supabase
      .from('folders')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId);

    if (foldersError) {
      console.log('❌ Error consultando folders:', foldersError.message);
    } else {
      console.log(`   Total folders: ${foldersCount}`);

      if (folders && folders.length > 0) {
        let totalAssets = 0;

        for (const folder of folders) {
          const {
            data: assets,
            error: assetsError,
            count: assetsCount,
          } = await supabase
            .from('assets')
            .select('*', { count: 'exact' })
            .eq('folder_id', folder.id);

          if (!assetsError && assetsCount) {
            totalAssets += assetsCount;
            console.log(`   Folder "${folder.name}": ${assetsCount} assets`);
          }
        }

        console.log(`   Total assets: ${totalAssets}`);

        // Obtener un ejemplo de asset
        if (totalAssets > 0) {
          const { data: sampleAssets } = await supabase
            .from('assets')
            .select('*')
            .eq('folder_id', folders[0].id)
            .limit(1);

          if (sampleAssets && sampleAssets.length > 0) {
            const sample = sampleAssets[0];
            console.log(`   Ejemplo asset: ${sample.filename}`);
            console.log(`   Original path: ${sample.original_path}`);
            console.log(`   Preview path: ${sample.preview_path}`);
          }
        }
      }
    }

    // 4. Analizar diferencias
    console.log('\n📊 4. Análisis de diferencias:');
    const oldSystemCount = oldCount || 0;
    const newSystemCount =
      folders?.reduce((total, folder) => {
        // Esta es una aproximación, necesitaríamos hacer las queries reales
        return total + (folder.photo_count || 0);
      }, 0) || 0;

    console.log(`   Sistema antiguo (photos): ${oldSystemCount} fotos`);
    console.log(`   Sistema nuevo (assets): ${newSystemCount} assets`);
    console.log(`   Diferencia: ${Math.abs(oldSystemCount - newSystemCount)}`);

    if (oldSystemCount !== newSystemCount) {
      console.log(`\n⚠️  INCONSISTENCIA DETECTADA!`);
      console.log(`   Los dos sistemas muestran números diferentes`);

      if (oldSystemCount > newSystemCount) {
        console.log(
          `   ➡️  El sistema antiguo tiene MÁS fotos (${oldSystemCount - newSystemCount} más)`
        );
      } else {
        console.log(
          `   ➡️  El sistema nuevo tiene MÁS assets (${newSystemCount - oldSystemCount} más)`
        );
      }
    } else {
      console.log(`\n✅ Los dos sistemas coinciden en número`);
    }

    // 5. Verificar APIs que usan cada sistema
    console.log('\n🔌 5. APIs que usan cada sistema:');
    console.log(`   Sistema ANTIGUO usado por:`);
    console.log(`   - Dashboard evento: /api/admin/events/${eventId}`);
    console.log(`   - Galería pública: /api/public/gallery/[token]`);
    console.log(`   - Stats evento: /api/admin/events/${eventId}/stats`);

    console.log(`\n   Sistema NUEVO usado por:`);
    console.log(`   - Admin photos: /api/admin/assets`);
    console.log(`   - Admin publish: /api/admin/folders/published`);
    console.log(`   - Folder gallery: /api/admin/folders/[id]`);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

analyzePhotosDiscrepancy();
