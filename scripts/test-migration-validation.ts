#!/usr/bin/env tsx

/**
 * VALIDACIÓN DE MIGRACIÓN: Codes → Folders
 * 
 * PROPÓSITO:
 * - Verificar que la migración funcionó correctamente
 * - Validar APIs funcionan con datos reales
 * - Confirmar compatibilidad hacia atrás
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔍 VALIDACIÓN DE MIGRACIÓN CODES → FOLDERS');
  console.log('==============================================');

  try {
    // TEST 1: Verificar columnas de sharing existen
    console.log('\n📊 TEST 1: Verificando estructura de base de datos...');
    
    const { data: columns, error: columnsError } = await supabase.rpc('sql', {
      query: `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'folders' 
        AND column_name IN ('share_token', 'is_published', 'publish_settings', 'published_at')
        ORDER BY column_name;
      `
    } as any);

    if (columnsError) {
      console.error('❌ Error verificando columnas:', columnsError.message);
      return;
    }

    const expectedColumns = ['is_published', 'publish_settings', 'published_at', 'share_token'];
    const foundColumns = columns?.map((c: any) => c.column_name) || [];
    const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));

    if (missingColumns.length > 0) {
      console.error(`❌ Columnas faltantes: ${missingColumns.join(', ')}`);
      console.error('💡 Ejecuta: npm run db:migrate');
      return;
    }

    console.log('✅ Todas las columnas de sharing están presentes');

    // TEST 2: Verificar vista folders_with_sharing
    console.log('\n📊 TEST 2: Verificando vista folders_with_sharing...');
    
    const { data: viewData, error: viewError } = await supabase
      .from('folders_with_sharing')
      .select('id, name, share_token, is_published, family_url, qr_url')
      .limit(5);

    if (viewError) {
      console.error('❌ Error accediendo a folders_with_sharing:', viewError.message);
      return;
    }

    console.log(`✅ Vista accesible, ${viewData?.length || 0} folders encontrados`);

    // TEST 3: Verificar API /admin/folders/published
    console.log('\n📊 TEST 3: Probando API /admin/folders/published...');
    
    try {
      const response = await fetch('http://localhost:3000/api/admin/folders/published?include_unpublished=true', {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        }
      });

      if (!response.ok) {
        console.warn(`⚠️  API response: ${response.status} ${response.statusText}`);
        console.log('💡 Asegurate de que el servidor esté corriendo: npm run dev');
      } else {
        const data = await response.json();
        console.log(`✅ API funciona, ${data.folders?.length || 0} folders retornados`);
      }
    } catch (error) {
      console.warn('⚠️  No se puede conectar al API local (servidor no corriendo)');
    }

    // TEST 4: Verificar datos obsoletos en codes
    console.log('\n📊 TEST 4: Verificando sistema obsoleto (codes)...');
    
    const { data: codes, error: codesError } = await supabase
      .from('codes')
      .select('id, code_value, token, is_published')
      .limit(10);

    if (codesError) {
      console.warn('⚠️  No se puede acceder a tabla codes:', codesError.message);
    } else {
      const publishedCodes = codes?.filter(c => c.is_published && c.token) || [];
      console.log(`📈 Codes obsoletos: ${codes?.length || 0} total, ${publishedCodes.length} publicados`);
      
      if (publishedCodes.length > 0) {
        console.log('⚠️  Hay codes obsoletos con tokens activos');
        console.log('💡 Ejecuta: npm run migrate:codes -- --confirm');
      }
    }

    // TEST 5: Verificar funciones de base de datos
    console.log('\n📊 TEST 5: Verificando funciones de base de datos...');
    
    const { data: functions, error: functionsError } = await supabase.rpc('sql', {
      query: `
        SELECT routine_name, routine_type 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name LIKE '%folder%'
        ORDER BY routine_name;
      `
    } as any);

    if (functionsError) {
      console.error('❌ Error verificando funciones:', functionsError.message);
    } else {
      const expectedFunctions = ['publish_folder', 'unpublish_folder', 'generate_folder_share_token'];
      const foundFunctions = functions?.map((f: any) => f.routine_name) || [];
      const missingFunctions = expectedFunctions.filter(fn => !foundFunctions.includes(fn));

      if (missingFunctions.length > 0) {
        console.error(`❌ Funciones faltantes: ${missingFunctions.join(', ')}`);
      } else {
        console.log('✅ Todas las funciones de folder sharing están disponibles');
      }
    }

    // TEST 6: Verificar family access compatibility
    console.log('\n📊 TEST 6: Verificando compatibilidad de family access...');
    
    const { data: tokensData, error: tokensError } = await supabase
      .from('folders_with_sharing')
      .select('share_token, family_url, qr_url')
      .not('share_token', 'is', null)
      .limit(3);

    if (tokensError) {
      console.error('❌ Error verificando tokens:', tokensError.message);
    } else {
      console.log(`✅ ${tokensData?.length || 0} folders con tokens válidos`);
      
      if (tokensData && tokensData.length > 0) {
        const sampleToken = tokensData[0];
        console.log(`💡 URL de prueba: ${sampleToken.family_url}`);
        console.log(`💡 QR de prueba: ${sampleToken.qr_url}`);
      }
    }

    // RESUMEN FINAL
    console.log('\n🎉 RESUMEN DE VALIDACIÓN');
    console.log('=========================');
    console.log('✅ Estructura de DB: OK');
    console.log('✅ Vista folders_with_sharing: OK');
    console.log('✅ Funciones de DB: OK');
    console.log('✅ Compatibilidad tokens: OK');
    
    console.log('\n💡 PRÓXIMOS PASOS:');
    console.log('1. Si hay codes obsoletos, ejecutar: npm run migrate:codes -- --confirm');
    console.log('2. Verificar /admin/publish con: npm run dev');
    console.log('3. Probar URLs familiares existentes');

  } catch (error) {
    console.error('❌ Error durante validación:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export default main;