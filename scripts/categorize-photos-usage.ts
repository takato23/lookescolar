#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

function categorizePhotoUsage() {
  console.log('🎯 CATEGORIZACIÓN DE ARCHIVOS QUE USAN "photos"\n');

  // Archivos críticos de API que afectan funcionalidad
  const criticalAPI = [
    'app/api/gallery/',
    'app/api/admin/events/',
    'app/api/admin/photos/',
    'app/api/family/',
    'app/api/public/',
    'lib/services/'
  ];

  // Archivos de tests (menos prioritarios)
  const testFiles = [
    '__tests__/',
    'tests/',
    'scripts/test-'
  ];

  // Scripts de migración/mantenimiento (revisar pero no críticos)
  const scriptFiles = [
    'scripts/',
  ];

  try {
    // Buscar todos los archivos que usan .from('photos')
    const result = execSync(
      `grep -r -l "\\.from\\(['\\"]photos['\\"]\\)" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules`,
      { encoding: 'utf-8', cwd: '/Users/santiagobalosky/Documents/LookEscolar' }
    );

    const files = result.trim().split('\n').filter(f => f.length > 0);
    
    console.log(`📋 TOTAL: ${files.length} archivos encontrados\n`);

    // Categorizar archivos
    const critical = [];
    const tests = [];
    const scripts = [];
    const others = [];

    for (const file of files) {
      if (testFiles.some(pattern => file.includes(pattern))) {
        tests.push(file);
      } else if (criticalAPI.some(pattern => file.includes(pattern))) {
        critical.push(file);
      } else if (scriptFiles.some(pattern => file.includes(pattern))) {
        scripts.push(file);
      } else {
        others.push(file);
      }
    }

    console.log('🚨 CRÍTICOS (APIs públicas/admin):');
    critical.forEach(f => console.log(`   ${f}`));
    
    console.log(`\n📝 SCRIPTS (${scripts.length}):`);
    scripts.slice(0, 10).forEach(f => console.log(`   ${f}`));
    if (scripts.length > 10) console.log(`   ... y ${scripts.length - 10} más`);

    console.log(`\n🧪 TESTS (${tests.length}):`);
    tests.slice(0, 5).forEach(f => console.log(`   ${f}`));
    if (tests.length > 5) console.log(`   ... y ${tests.length - 5} más`);

    console.log(`\n❓ OTROS (${others.length}):`);
    others.forEach(f => console.log(`   ${f}`));

    console.log('\n🎯 PLAN DE ACCIÓN:');
    console.log('1. ✅ PRIMERO: Arreglar APIs críticas que están causando errores 500');
    console.log('2. ⚡ SEGUNDO: Servicios core (lib/services/)');
    console.log('3. 📊 TERCERO: Scripts de operaciones importantes');
    console.log('4. 🧪 ÚLTIMO: Tests (funcionarán cuando APIs estén arregladas)');

    return { critical, scripts, tests, others };

  } catch (error) {
    console.error('❌ Error ejecutando búsqueda:', error);
  }
}

categorizePhotoUsage();



