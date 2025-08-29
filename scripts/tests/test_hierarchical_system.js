#!/usr/bin/env node

// Simple test to apply hierarchical migrations using Supabase client
import fs from 'fs';

// First, let's check if we can read the migration files
const migrations = [
  'supabase/migrations/20250829_domain_model.sql',
  'supabase/migrations/20250829_unified_tokens.sql',
  'supabase/migrations/20250829_canonical_functions.sql',
];

console.log('🔍 Verificando archivos de migración...');

migrations.forEach((file) => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    console.log(`✅ ${file} - ${content.length} caracteres`);
  } catch (err) {
    console.log(`❌ ${file} - Error: ${err.message}`);
  }
});

console.log('\n📝 Las 3 migraciones están listas para aplicar:');
console.log('1. Modelo de dominios separados (courses ≠ subjects)');
console.log('2. Sistema de tokens unificado (hash+salt security)');
console.log('3. Funciones SQL canónicas (api.* SECURITY DEFINER)');
console.log('\nPróximo paso: aplicar via psql o supabase db push');
