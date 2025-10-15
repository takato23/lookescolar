// Script para aplicar la migración de campos faltantes en events
const fs = require('fs');
const path = require('path');

async function applyEventsMigration() {
  console.log('🔧 Aplicando migración para campos faltantes en tabla events...\n');

  const migrationFile = path.join(__dirname, '..', 'supabase', 'migrations', '20250103_consolidated_system_fix.sql');

  if (!fs.existsSync(migrationFile)) {
    console.log('❌ No se encontró el archivo de migración');
    return;
  }

  console.log('✅ Migración encontrada. Aplicando...');

  // Aquí normalmente aplicarías la migración a la base de datos
  // Por ahora, solo mostramos que la migración existe
  console.log('📄 Contenido de la migración:');
  console.log('--------------------------------');

  const content = fs.readFileSync(migrationFile, 'utf8');
  console.log(content.substring(0, 500) + '...\n');

  console.log('💡 Para aplicar esta migración a tu base de datos Supabase:');
  console.log('   1. Ve a tu dashboard de Supabase');
  console.log('   2. Ve a SQL Editor');
  console.log('   3. Copia y pega el contenido del archivo');
  console.log('   4. Ejecuta la migración');
  console.log('');
  console.log('🔗 O usa el Supabase CLI si lo tienes instalado:');
  console.log('   supabase db push');
}

if (require.main === module) {
  applyEventsMigration();
}

module.exports = { applyEventsMigration };
