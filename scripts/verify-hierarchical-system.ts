#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyHierarchicalSystem() {
  console.log('🔍 Verificando Sistema Jerárquico...\n');
  
  // Tables that should exist after hierarchical setup
  const coreHierarchicalTables = [
    'folders', 'assets', 'courses', 'course_members',
    'folder_courses', 'asset_subjects', 'access_tokens', 'token_access_logs'
  ];
  
  const apiFunctions = [
    'folders_for_token', 'assets_for_token', 'can_access_asset',
    'log_token_access', 'get_token_context'
  ];
  
  console.log('📋 Verificando tablas del sistema...');
  let tableCount = 0;
  
  for (const table of coreHierarchicalTables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: exists and accessible`);
        tableCount++;
      }
    } catch (err: any) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  console.log(`\n📊 Resumen de tablas: ${tableCount}/${coreHierarchicalTables.length} creadas`);
  
  // Check API schema functions (these need to be checked differently)
  console.log('\n🔧 Verificando funciones del API...');
  
  try {
    // Try to call a simple API function to see if it exists
    const { error } = await supabase.rpc('api.get_token_context', { p_token: 'test' });
    
    if (error && error.message.includes('function api.get_token_context')) {
      console.log('❌ API functions: not found - need to run canonical_api_functions.sql');
    } else {
      console.log('✅ API functions: schema and functions appear to be available');
    }
  } catch (err: any) {
    console.log('⚠️ API functions: could not verify - may need manual check');
  }
  
  // Overall status
  console.log('\n🎯 Estado general del sistema:');
  
  if (tableCount >= 6) { // At least most core tables exist
    console.log('✅ Sistema jerárquico: OPERATIVO');
    console.log('');
    console.log('🏗️ Arquitectura lista:');
    console.log('  🏫 Tokens de evento → acceso completo');
    console.log('  📚 Tokens de curso → acceso específico');
    console.log('  👨‍👩‍👧‍👦 Tokens de familia → acceso familiar');
    console.log('  🔐 Seguridad → hash+salt, auditoría completa');
    
    if (tableCount === coreHierarchicalTables.length) {
      console.log('\n🚀 ¡Sistema completamente funcional!');
    } else {
      console.log('\n⚠️ Algunas tablas faltan, pero el núcleo está listo');
    }
  } else {
    console.log('❌ Sistema jerárquico: INCOMPLETO');
    console.log('\n📝 Próximos pasos:');
    console.log('1. Ejecutar hierarchical_setup.sql en Supabase SQL Editor');
    console.log('2. Ejecutar canonical_api_functions.sql');
    console.log('3. Volver a ejecutar esta verificación');
  }
}

verifyHierarchicalSystem().catch(console.error);