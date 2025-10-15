// Script para configurar Supabase
// Uso: node scripts/setup-supabase.cjs

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function setupSupabase() {
  console.log('🔧 Configuración de Supabase');
  console.log('==============================\n');

  console.log('📝 Necesitas obtener estas credenciales de tu proyecto Supabase:');
  console.log('   1. Ve a https://supabase.com/dashboard');
  console.log('   2. Selecciona tu proyecto');
  console.log('   3. Ve a Settings > API');
  console.log('   4. Copia la URL y la anon key\n');

  const supabaseUrl = await askQuestion('NEXT_PUBLIC_SUPABASE_URL (ej: https://xyz.supabase.co): ');
  const supabaseAnonKey = await askQuestion('NEXT_PUBLIC_SUPABASE_ANON_KEY: ');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Ambas variables son requeridas');
    return;
  }

  // Update .env.local
  const envFile = path.join(__dirname, '..', '.env.local');
  let envContent = '';

  if (fs.existsSync(envFile)) {
    envContent = fs.readFileSync(envFile, 'utf8');
  }

  // Replace or add Supabase variables
  envContent = envContent.replace(/NEXT_PUBLIC_SUPABASE_URL=.*/g, `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`);
  envContent = envContent.replace(/NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/g, `NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}`);

  fs.writeFileSync(envFile, envContent);

  console.log('\n✅ Supabase configurado correctamente!');
  console.log('🔄 Reinicia el servidor de desarrollo: npm run dev');

  // Optional: Ask about local development
  const useLocal = await askQuestion('\n¿Quieres configurar también para desarrollo local con Supabase? (y/n): ');

  if (useLocal.toLowerCase() === 'y') {
    console.log('\n🔧 Configuración para desarrollo local:');
    const localUrl = await askQuestion('SUPABASE_URL (ej: http://localhost:54321): ');
    const localAnonKey = await askQuestion('SUPABASE_ANON_KEY (local): ');
    const serviceRoleKey = await askQuestion('SUPABASE_SERVICE_ROLE_KEY (local): ');

    if (localUrl && localAnonKey && serviceRoleKey) {
      envContent += `\n# Supabase Local Development\n`;
      envContent += `SUPABASE_URL=${localUrl}\n`;
      envContent += `SUPABASE_ANON_KEY=${localAnonKey}\n`;
      envContent += `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}\n`;

      fs.writeFileSync(envFile, envContent);
      console.log('✅ Configuración local también agregada!');
    }
  }

  console.log('\n🎯 Variables de entorno configuradas:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=' + supabaseUrl);
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=' + supabaseAnonKey.substring(0, 20) + '...');
}

if (require.main === module) {
  setupSupabase().catch(console.error);
}

module.exports = { setupSupabase };
