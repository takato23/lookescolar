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

async function fixImagePaths() {
  try {
    console.log('🔧 Corrigiendo paths de imágenes...');

    // Buscar assets con paths problemáticos
    const { data: assets, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .or('storage_path.like.%events/%,preview_path.like.%events/%,watermark_path.like.%events/%');

    if (fetchError) {
      console.error('Error fetching assets:', fetchError);
      return;
    }

    if (!assets || assets.length === 0) {
      console.log('✅ No se encontraron assets con paths problemáticos');
      return;
    }

    console.log(`📸 Encontrados ${assets.length} assets con paths problemáticos`);

    // Corregir cada asset
    for (const asset of assets) {
      console.log(`🔄 Procesando asset ${asset.id}...`);

      const updates: any = {};

      // Corregir storage_path
      if (asset.storage_path && asset.storage_path.includes('events/')) {
        const parts = asset.storage_path.split('/');
        const filename = parts[parts.length - 1];
        updates.storage_path = `previews/${filename}`;
      }

      // Corregir preview_path
      if (asset.preview_path && asset.preview_path.includes('events/')) {
        const parts = asset.preview_path.split('/');
        const filename = parts[parts.length - 1];
        updates.preview_path = `previews/${filename}`;
      }

      // Corregir watermark_path
      if (asset.watermark_path && asset.watermark_path.includes('events/')) {
        const parts = asset.watermark_path.split('/');
        const filename = parts[parts.length - 1];
        updates.watermark_path = `watermarks/${filename}`;
      }

      // Actualizar el asset si hay cambios
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('assets')
          .update(updates)
          .eq('id', asset.id);

        if (updateError) {
          console.error(`❌ Error updating asset ${asset.id}:`, updateError);
        } else {
          console.log(`✅ Asset ${asset.id} corregido`);
        }
      }
    }

    console.log('🎉 ¡Corrección de paths completada!');

  } catch (error) {
    console.error('❌ Error en el script de corrección:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixImagePaths()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en script:', error);
      process.exit(1);
    });
}

export { fixImagePaths };
