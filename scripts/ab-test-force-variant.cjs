// Script para forzar una variante específica en A/B testing
// Uso: node scripts/ab-test-force-variant.js A|B

const fs = require('fs');
const path = require('path');

const variant = process.argv[2];

if (!variant || !['A', 'B'].includes(variant)) {
  console.error('❌ Uso: node scripts/ab-test-force-variant.js A|B');
  process.exit(1);
}

const envFile = path.join(__dirname, '..', '.env.local');

let envContent = '';
if (fs.existsSync(envFile)) {
  envContent = fs.readFileSync(envFile, 'utf8');
}

// Remove existing variant line
envContent = envContent.replace(/^NEXT_PUBLIC_FORCE_AB_VARIANT=.*$/m, '');

// Add new variant line
const newLine = `NEXT_PUBLIC_FORCE_AB_VARIANT=${variant}`;
envContent = envContent.trim() + '\n' + newLine + '\n';

fs.writeFileSync(envFile, envContent);

console.log(`✅ Variante ${variant} forzada en .env.local`);
console.log('🔄 Reinicia el servidor de desarrollo para aplicar los cambios');
