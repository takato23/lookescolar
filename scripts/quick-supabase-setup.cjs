// Script para configuración rápida de Supabase (para desarrollo)
// Uso: node scripts/quick-supabase-setup.cjs

const fs = require('fs');
const path = require('path');

function quickSetup() {
  console.log('🚀 Configuración Rápida de Supabase (Desarrollo)');
  console.log('=================================================\n');

  console.log('⚠️  Para producción, usa: node scripts/setup-supabase.cjs');
  console.log('📝 Este setup usa valores de ejemplo para desarrollo local\n');

  // Para desarrollo, usar valores que no causen errores
  const supabaseUrl = 'https://placeholder.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODM4NzM2MDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder';

  const envFile = path.join(__dirname, '..', '.env.local');
  let envContent = '';

  if (fs.existsSync(envFile)) {
    envContent = fs.readFileSync(envFile, 'utf8');
  }

  // Replace or add Supabase variables
  envContent = envContent.replace(/NEXT_PUBLIC_SUPABASE_URL=.*/g, `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`);
  envContent = envContent.replace(/NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/g, `NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}`);

  // Remove any existing Supabase local config to avoid conflicts
  envContent = envContent.replace(/# Supabase Local Development[\s\S]*$/m, '');

  fs.writeFileSync(envFile, envContent);

  console.log('✅ Supabase configurado con valores de desarrollo');
  console.log('🔄 Reinicia el servidor: npm run dev');
  console.log('\n⚠️  NOTA: Estos valores son solo para desarrollo.');
  console.log('   Para producción, configura tus credenciales reales de Supabase');
  console.log('   ejecutando: node scripts/setup-supabase.cjs');

  console.log('\n🎯 Variables configuradas:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=' + supabaseUrl);
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=' + supabaseAnonKey.substring(0, 30) + '...');
}

if (require.main === module) {
  quickSetup();
}

module.exports = { quickSetup };
