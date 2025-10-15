// Script simplificado para configurar Supabase
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

async function configureSupabase() {
  console.log('🔧 Configuración de Supabase\n');
  console.log('📝 Ingresa tus credenciales reales de Supabase:');
  console.log('   (Puedes encontrarlas en: https://supabase.com/dashboard > Tu Proyecto > Settings > API)\n');

  const supabaseUrl = await askQuestion('NEXT_PUBLIC_SUPABASE_URL: ');
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

  // Replace Supabase variables
  envContent = envContent.replace(/NEXT_PUBLIC_SUPABASE_URL=.*/g, `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`);
  envContent = envContent.replace(/NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/g, `NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}`);

  fs.writeFileSync(envFile, envContent);

  console.log('\n✅ Supabase configurado correctamente!');
  console.log('🔄 Reinicia el servidor: npm run dev');
  console.log('\n🎯 Credenciales configuradas:');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key: ${supabaseAnonKey.substring(0, 20)}...`);
}

if (require.main === module) {
  configureSupabase().catch(console.error);
}

module.exports = { configureSupabase };
