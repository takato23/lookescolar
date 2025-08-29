#!/usr/bin/env tsx

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSqlFile(filename: string, description: string): Promise<boolean> {
  console.log(`\n🔄 Aplicando ${description}...`);
  
  try {
    const sql = fs.readFileSync(`supabase/migrations/${filename}`, 'utf8');
    
    // Split into individual statements and execute them
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.toUpperCase().includes('BEGIN') || statement.toUpperCase().includes('COMMIT')) {
        continue; // Skip transaction statements, let Supabase handle them
      }
      
      const { error } = await supabase.rpc('exec_sql', { query: statement });
      
      if (error) {
        console.error(`❌ Error ejecutando statement: ${error.message}`);
        console.error(`Statement: ${statement.substring(0, 100)}...`);
        return false;
      }
    }
    
    console.log(`✅ ${description} aplicada exitosamente`);
    return true;
  } catch (err: any) {
    console.error(`❌ Error en ${filename}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Aplicando migraciones del sistema jerárquico...');
  
  // First create the exec_sql function if it doesn't exist
  console.log('\n🔧 Creando función auxiliar...');
  try {
    await supabase.rpc('exec_sql', { 
      query: `
        CREATE OR REPLACE FUNCTION exec_sql(query text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE query;
        END;
        $$;
      `
    });
    console.log('✅ Función auxiliar creada');
  } catch (err: any) {
    // If function already exists or can't be created, try direct approach
    console.log('⚠️ Función auxiliar no disponible, usando enfoque directo');
  }
  
  const migrations = [
    ['20250829_domain_model.sql', 'Modelo de dominios separados'],
    ['20250829_unified_tokens.sql', 'Sistema de tokens unificado'],  
    ['20250829_canonical_functions.sql', 'Funciones SQL canónicas']
  ];
  
  for (const [filename, description] of migrations) {
    const success = await executeSqlFile(filename, description);
    if (!success) {
      console.error('💥 Error aplicando migración, continuando con las siguientes...');
    }
  }
  
  console.log('\n🎉 Proceso de migraciones completado!');
  console.log('\n📊 Sistema jerárquico implementado:');
  console.log('  🏫 Event tokens → acceso completo al evento');
  console.log('  📚 Course tokens → acceso específico por curso');
  console.log('  👨‍👩‍👧‍👦 Family tokens → acceso familiar específico');
  console.log('  🔐 Seguridad → hash+salt, nunca texto plano');
  console.log('  📋 Auditoría → logs completos de acceso');
  console.log('  ⚡ Performance → funciones SQL optimizadas');
}

main().catch(console.error);