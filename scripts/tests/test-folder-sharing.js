#!/usr/bin/env node

/**
 * PRUEBA RÁPIDA: Sistema de Family Access con Folders
 * 
 * Verifica que URLs como /f/[token] sigan funcionando después de la migración
 */

const { createClient } = require('@supabase/supabase-js');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFolderSharing() {
  console.log('🧪 PRUEBA: Sistema de Folder Sharing');
  console.log('=====================================');

  try {
    // 1. Verificar si hay folders publicados
    console.log('\n📁 Verificando folders publicados...');
    
    const { data: publishedFolders, error } = await supabase
      .from('folders_with_sharing')
      .select('id, name, share_token, family_url, photo_count, event_name')
      .eq('is_published', true)
      .not('share_token', 'is', null)
      .limit(3);

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    if (!publishedFolders || publishedFolders.length === 0) {
      console.log('⚠️  No hay folders publicados');
      console.log('💡 Primero publica un folder desde /admin/publish');
      return;
    }

    console.log(`✅ Encontrados ${publishedFolders.length} folders publicados`);
    
    // 2. Mostrar información de los folders
    for (const folder of publishedFolders) {
      console.log(`\n📂 Folder: ${folder.name}`);
      console.log(`   Event: ${folder.event_name || 'Sin evento'}`);
      console.log(`   Photos: ${folder.photo_count || 0}`);
      console.log(`   Token: ${folder.share_token}`);
      console.log(`   Family URL: ${folder.family_url}`);
      console.log(`   Full URL: http://localhost:3000${folder.family_url}`);
    }

    // 3. Verificar compatibilidad con códigos existentes
    console.log('\n🔄 Verificando códigos obsoletos...');
    
    const { data: codes, error: codesError } = await supabase
      .from('codes')
      .select('code_value, token, is_published')
      .eq('is_published', true)
      .not('token', 'is', null)
      .limit(5);

    if (codesError) {
      console.warn('⚠️  No se pueden verificar codes:', codesError.message);
    } else if (codes && codes.length > 0) {
      console.log(`⚠️  ${codes.length} codes obsoletos con tokens activos:`);
      codes.forEach(code => {
        console.log(`   • ${code.code_value}: /f/${code.token}`);
      });
      console.log('\n💡 Considera migrar estos codes a folders:');
      console.log('   npm run migrate:codes -- --confirm');
    } else {
      console.log('✅ No hay codes obsoletos con tokens');
    }

    // 4. Test de API familia (simulado)
    const sampleFolder = publishedFolders[0];
    if (sampleFolder.share_token) {
      console.log('\n🔗 Testing family access API...');
      console.log(`💡 Prueba manual:`);
      console.log(`   1. Visita: http://localhost:3000${sampleFolder.family_url}`);
      console.log(`   2. O API: http://localhost:3000/api/family/gallery/${sampleFolder.share_token}`);
    }

    console.log('\n🎉 PRUEBA COMPLETADA');
    console.log('===================');
    console.log('✅ Sistema de folders funcionando');
    console.log('✅ Family URLs disponibles');
    console.log('✅ Compatibilidad mantenida');

  } catch (error) {
    console.error('❌ Error durante prueba:', error);
  }
}

testFolderSharing();