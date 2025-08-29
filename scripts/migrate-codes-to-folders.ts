#!/usr/bin/env tsx

/**
 * MIGRACIÓN CRÍTICA: Codes → Folders
 * 
 * PROPÓSITO:
 * - Migrar tokens válidos del sistema obsoleto 'codes' al sistema moderno 'folders'
 * - Mantener compatibilidad hacia atrás para URLs familiares existentes
 * - Limpiar datos obsoletos sin breaking changes
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

interface CodeRow {
  id: string;
  code_value: string;
  token: string | null;
  is_published: boolean | null;
  event_id: string;
  photos_count: number;
}

interface FolderRow {
  id: string;
  name: string;
  event_id: string | null;
  photo_count: number | null;
}

async function main() {
  console.log('🚀 MIGRACIÓN CODES → FOLDERS');
  console.log('==========================================');

  try {
    // PASO 1: Analizar datos obsoletos en codes
    console.log('\n📊 PASO 1: Analizando sistema obsoleto (codes)...');
    
    const { data: codes, error: codesError } = await supabase
      .from('codes')
      .select('id, code_value, token, is_published, event_id');

    if (codesError) {
      console.error('❌ Error reading codes table:', codesError.message);
      return;
    }

    // Contar fotos por code_id
    const { data: photoRows, error: photoError } = await supabase
      .from('photos')
      .select('code_id')
      .not('code_id', 'is', null);

    if (photoError) {
      console.warn('⚠️  No se puede acceder a photos.code_id:', photoError.message);
    }

    // Construir mapa de conteos
    const photoCountMap = new Map<string, number>();
    if (photoRows) {
      for (const row of photoRows) {
        if (row.code_id) {
          const count = photoCountMap.get(row.code_id) || 0;
          photoCountMap.set(row.code_id, count + 1);
        }
      }
    }

    const codesWithPhotos: CodeRow[] = (codes || []).map(c => ({
      id: c.id,
      code_value: c.code_value,
      token: c.token,
      is_published: c.is_published,
      event_id: c.event_id,
      photos_count: photoCountMap.get(c.id) || 0
    }));

    console.log(`\n📈 ANÁLISIS DE CODES:`);
    console.log(`   Total codes: ${codesWithPhotos.length}`);
    console.log(`   Con fotos: ${codesWithPhotos.filter(c => c.photos_count > 0).length}`);
    console.log(`   Publicados: ${codesWithPhotos.filter(c => c.is_published && c.token).length}`);
    console.log(`   Con tokens válidos: ${codesWithPhotos.filter(c => c.token && c.photos_count > 0).length}`);

    // PASO 2: Analizar sistema moderno (folders)
    console.log('\n📊 PASO 2: Analizando sistema moderno (folders)...');
    
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, event_id, photo_count');

    if (foldersError) {
      console.error('❌ Error reading folders table:', foldersError.message);
      return;
    }

    console.log(`\n📈 ANÁLISIS DE FOLDERS:`);
    console.log(`   Total folders: ${folders?.length || 0}`);
    console.log(`   Con fotos: ${folders?.filter(f => (f.photo_count || 0) > 0).length || 0}`);

    // PASO 3: Identificar migración necesaria
    console.log('\n🔄 PASO 3: Identificando datos a migrar...');
    
    const validCodes = codesWithPhotos.filter(c => 
      c.token && c.photos_count > 0 && c.is_published
    );

    if (validCodes.length === 0) {
      console.log('✅ No hay codes válidos para migrar');
      return;
    }

    console.log(`\n🎯 CODES VÁLIDOS PARA MIGRAR:`);
    for (const code of validCodes) {
      console.log(`   • ${code.code_value}: ${code.photos_count} fotos, token: ${code.token?.substring(0, 8)}...`);
    }

    console.log(`\n⚠️  PRECAUCIÓN: Se van a migrar ${validCodes.length} codes con tokens válidos`);
    console.log('❓ ¿Continuar con la migración? (y/N)');

    // En un entorno real, esto sería interactivo
    const shouldContinue = process.argv.includes('--confirm');
    if (!shouldContinue) {
      console.log('💡 Ejecuta con --confirm para continuar: npm run migrate-codes -- --confirm');
      return;
    }

    // PASO 4: Verificar migración de base de datos necesaria
    console.log('\n🗄️  PASO 4: Verificando migración de base de datos...');
    
    const { data: sampleFolder } = await supabase
      .from('folders')
      .select('is_published, share_token, published_at')
      .limit(1)
      .single();

    const hasSharing = sampleFolder && 'is_published' in sampleFolder;
    
    if (!hasSharing) {
      console.log('❌ MIGRACIÓN DB REQUERIDA: Columnas de sharing no existen');
      console.log('💡 Ejecuta primero: npm run db:migrate');
      console.log('📄 Archivo: supabase/migrations/20250826_folder_sharing_system.sql');
      return;
    }

    console.log('✅ Base de datos tiene columnas de sharing');

    // PASO 5: Crear folders para codes válidos
    console.log('\n📁 PASO 5: Creando folders para codes válidos...');
    
    const migratedCodes = [];
    
    for (const code of validCodes) {
      try {
        // Crear folder con el nombre del code
        const folderData = {
          name: `${code.code_value} (migrado)`,
          event_id: code.event_id,
          is_published: true,
          share_token: code.token,
          published_at: new Date().toISOString(),
          publish_settings: {
            migrated_from_code: code.id,
            original_code_value: code.code_value,
            migration_date: new Date().toISOString()
          }
        };

        const { data: newFolder, error: createError } = await supabase
          .from('folders')
          .insert(folderData)
          .select('id, name, share_token')
          .single();

        if (createError) {
          console.error(`❌ Error creando folder para ${code.code_value}:`, createError.message);
          continue;
        }

        console.log(`✅ Migrado: ${code.code_value} → folder ${newFolder.id}`);
        migratedCodes.push({
          code,
          folder: newFolder
        });

      } catch (error) {
        console.error(`❌ Error inesperado migrando ${code.code_value}:`, error);
      }
    }

    // PASO 6: Actualizar fotos para apuntar a folders
    console.log('\n📸 PASO 6: Actualizando referencias de fotos...');
    
    for (const { code, folder } of migratedCodes) {
      try {
        // Actualizar fotos que tenían code_id para usar folder_id
        const { error: updateError } = await supabase
          .from('photos')
          .update({ folder_id: folder.id })
          .eq('code_id', code.id);

        if (updateError) {
          console.error(`❌ Error actualizando fotos para ${code.code_value}:`, updateError.message);
        } else {
          console.log(`✅ Fotos actualizadas: ${code.code_value} (${code.photos_count} fotos)`);
        }
      } catch (error) {
        console.error(`❌ Error inesperado actualizando fotos para ${code.code_value}:`, error);
      }
    }

    // PASO 7: Marcar codes como deprecated
    console.log('\n🗂️  PASO 7: Marcando codes como deprecated...');
    
    for (const { code } of migratedCodes) {
      try {
        // En lugar de eliminar, marcar como migrado
        const { error: updateError } = await supabase
          .from('codes')
          .update({ 
            is_published: false,
            token: null // Remover token para evitar conflictos
          })
          .eq('id', code.id);

        if (updateError) {
          console.error(`❌ Error marcando code como deprecated:`, updateError.message);
        }
      } catch (error) {
        console.error(`❌ Error inesperado marcando code:`, error);
      }
    }

    // PASO 8: Validación final
    console.log('\n✅ PASO 8: Validación final...');
    
    const { data: migratedFolders } = await supabase
      .from('folders')
      .select('id, name, share_token, photo_count')
      .not('share_token', 'is', null);

    console.log('\n🎉 MIGRACIÓN COMPLETADA');
    console.log('==========================================');
    console.log(`✅ Folders creados: ${migratedCodes.length}`);
    console.log(`✅ Folders con tokens: ${migratedFolders?.length || 0}`);
    console.log('\n🔗 URLs familiares mantienen compatibilidad:');
    
    for (const { code, folder } of migratedCodes.slice(0, 3)) {
      console.log(`   • /f/${folder.share_token} (era código: ${code.code_value})`);
    }

    console.log('\n💡 PRÓXIMOS PASOS:');
    console.log('1. Verificar que /admin/publish muestra datos reales');
    console.log('2. Probar URLs familiares existentes');
    console.log('3. Monitorear logs por errores de compatibilidad');
    console.log('4. Después de 7 días, ejecutar cleanup de codes obsoletos');

  } catch (error) {
    console.error('❌ Error durante migración:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export default main;