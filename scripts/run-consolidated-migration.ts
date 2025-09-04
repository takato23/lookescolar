#!/usr/bin/env tsx

/**
 * Script para aplicar las migraciones consolidadas del sistema
 * Ejecuta de manera segura las migraciones SQL creadas
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();

interface Migration {
  name: string;
  path: string;
  description: string;
  required: boolean;
}

const MIGRATIONS_TO_APPLY: Migration[] = [
  {
    name: 'verify-current-schema',
    path: 'scripts/verify-current-schema.sql',
    description: 'Verificar el esquema actual de la base de datos',
    required: true
  },
  {
    name: 'consolidated-system-fix',
    path: 'supabase/migrations/20250103_consolidated_system_fix.sql',
    description: 'Sistema unificado con jerarquía de 4 niveles',
    required: true
  },
  {
    name: 'watermark-deletion-system',
    path: 'supabase/migrations/20250103_watermark_deletion_system.sql',
    description: 'Sistema de marcas de agua y eliminación automática',
    required: true
  }
];

async function displayMigrationInfo() {
  console.log('📋 Migraciones a aplicar:\n');
  
  MIGRATIONS_TO_APPLY.forEach((migration, index) => {
    console.log(`${index + 1}. ${migration.name}`);
    console.log(`   📄 ${migration.path}`);
    console.log(`   📝 ${migration.description}`);
    console.log(`   ${migration.required ? '🔴 REQUERIDA' : '🟡 OPCIONAL'}\n`);
  });
}

async function displaySQLContent(migrationPath: string) {
  const fullPath = join(PROJECT_ROOT, migrationPath);
  
  try {
    const content = readFileSync(fullPath, 'utf8');
    console.log(`\n--- CONTENIDO DE ${migrationPath} ---\n`);
    console.log(content);
    console.log(`\n--- FIN DE ${migrationPath} ---\n`);
  } catch (error) {
    console.error(`❌ Error leyendo ${migrationPath}:`, error);
  }
}

async function main() {
  try {
    console.log('🚀 Preparando aplicación de migraciones consolidadas...\n');

    await displayMigrationInfo();

    console.log('⚠️  IMPORTANTE: Estas migraciones deben aplicarse en Supabase SQL Editor');
    console.log('💡 Copiar y pegar cada SQL en el editor, uno por uno\n');

    console.log('📋 PASOS A SEGUIR:');
    console.log('1. Abrir Supabase Dashboard → SQL Editor');
    console.log('2. Aplicar cada migración en orden');
    console.log('3. Verificar que no hay errores');
    console.log('4. Confirmar que el sistema funciona correctamente\n');

    // Mostrar contenido de cada migración
    for (const migration of MIGRATIONS_TO_APPLY) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 MIGRACIÓN: ${migration.name.toUpperCase()}`);
      console.log(`📝 ${migration.description}`);
      console.log(`${'='.repeat(60)}`);
      
      await displaySQLContent(migration.path);
      
      if (migration !== MIGRATIONS_TO_APPLY[MIGRATIONS_TO_APPLY.length - 1]) {
        console.log('\n⏳ Aplicar esta migración antes de continuar...\n');
      }
    }

    console.log('\n✅ Todas las migraciones mostradas');
    console.log('🎯 Aplicar en Supabase SQL Editor en el orden mostrado');
    console.log('📋 Revisar docs/SYSTEM_CONSOLIDATION_SUMMARY.md para detalles');

  } catch (error) {
    console.error('❌ Error preparando migraciones:', error);
    process.exit(1);
  }
}

// Auto-ejecutar cuando se llama directamente
main().catch(console.error);

export { main as runConsolidatedMigration };
