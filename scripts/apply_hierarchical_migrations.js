#!/usr/bin/env node

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration(filename, description) {
  console.log(`\n🔄 Aplicando ${description}...`);
  
  try {
    const sql = fs.readFileSync(`supabase/migrations/${filename}`, 'utf8');
    const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Error en ${filename}:`, error);
      return false;
    }
    
    console.log(`✅ ${description} aplicada exitosamente`);
    return true;
  } catch (err) {
    console.error(`❌ Error ejecutando ${filename}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando aplicación de migraciones del sistema jerárquico...');
  
  const migrations = [
    ['20250829_domain_model.sql', 'Modelo de dominios separados'],
    ['20250829_unified_tokens.sql', 'Sistema de tokens unificado'],
    ['20250829_canonical_functions.sql', 'Funciones SQL canónicas']
  ];
  
  for (const [filename, description] of migrations) {
    const success = await executeMigration(filename, description);
    if (!success) {
      console.error('💥 Migración fallida, deteniendo proceso');
      process.exit(1);
    }
  }
  
  console.log('\n🎉 Todas las migraciones del sistema jerárquico aplicadas exitosamente!');
  console.log('\nSistema de tokens jerárquico listo:');
  console.log('- 🏫 Tokens de evento: acceso completo al evento');
  console.log('- 📚 Tokens de curso: acceso específico por curso');
  console.log('- 👨‍👩‍👧‍👦 Tokens de familia: acceso familiar específico');
  console.log('- 🔐 Seguridad: hash+salt, auditoría completa');
  console.log('- 📊 API canónica: funciones SQL SECURITY DEFINER');
}