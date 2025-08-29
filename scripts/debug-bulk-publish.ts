#!/usr/bin/env tsx

/**
 * DIAGNÓSTICO COMPLETO - Sistema de Publicación Bulk
 *
 * Este script diagnostica por qué falla bulk_publish_folders
 */

import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

async function runDiagnostics() {
  console.log('🔍 DIAGNÓSTICO DEL SISTEMA DE PUBLICACIÓN\n');

  try {
    const supabase = await createServerSupabaseServiceClient();

    // 1. Verificar que existan folders
    console.log('📁 1. Verificando carpetas existentes...');
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .limit(5);

    if (foldersError) {
      console.error('❌ Error accediendo a folders:', foldersError);
      return;
    }

    console.log(`✅ Encontradas ${folders?.length || 0} carpetas:`);
    folders?.forEach((f) => {
      console.log(`   - ${f.name} (${f.id}) - Published: ${f.is_published}`);
    });

    if (!folders || folders.length === 0) {
      console.log('⚠️  No hay carpetas para publicar');
      return;
    }

    // 2. Verificar función bulk_publish_folders
    console.log('\n🔧 2. Verificando función bulk_publish_folders...');
    const testFolderId = folders[0].id;

    const { data: funcResult, error: funcError } = await supabase.rpc(
      'bulk_publish_folders',
      {
        folder_ids: [testFolderId],
      }
    );

    if (funcError) {
      console.error('❌ Error en función bulk_publish_folders:', funcError);
      console.log('📋 Detalles del error:', {
        code: funcError.code,
        message: funcError.message,
        details: funcError.details,
        hint: funcError.hint,
      });
    } else {
      console.log('✅ Función ejecutada exitosamente:', funcResult);
    }

    // 3. Verificar endpoint de API
    console.log('\n🌐 3. Verificando endpoint de API...');
    const response = await fetch(
      'http://localhost:3002/api/admin/folders/bulk-publish',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer dev-admin-token', // Para desarrollo
        },
        body: JSON.stringify({
          folderIds: [testFolderId],
        }),
      }
    );

    const apiResult = await response.json();
    console.log(`📡 API Response (${response.status}):`, apiResult);

    // 4. Verificar RLS policies
    console.log('\n🔒 4. Verificando políticas RLS...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'folders');

    if (!policiesError && policies) {
      console.log(
        `✅ Encontradas ${policies.length} políticas RLS para folders:`
      );
      policies.forEach((p) => {
        console.log(`   - ${p.policyname}: ${p.cmd} (${p.roles})`);
      });
    }

    // 5. Test directo de UPDATE
    console.log('\n✏️ 5. Probando UPDATE directo...');
    const { data: updateResult, error: updateError } = await supabase
      .from('folders')
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
        share_token: 'test_token_' + Date.now(),
      })
      .eq('id', testFolderId)
      .select();

    if (updateError) {
      console.error('❌ Error en UPDATE directo:', updateError);
    } else {
      console.log('✅ UPDATE directo exitoso:', updateResult);
    }

    console.log('\n🏁 DIAGNÓSTICO COMPLETADO');
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

// Ejecutar diagnóstico
runDiagnostics()
  .then(() => {
    console.log('\nPara más detalles, revisa los logs del servidor.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error ejecutando diagnóstico:', error);
    process.exit(1);
  });
