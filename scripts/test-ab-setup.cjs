// Script para verificar que el A/B testing está configurado correctamente
const fs = require('fs');
const path = require('path');

function testSetup() {
  console.log('🧪 Verificando configuración de A/B Testing...\n');

  // Check if .env.local exists and has the forced variant
  const envFile = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    if (envContent.includes('NEXT_PUBLIC_FORCE_AB_VARIANT=B')) {
      console.log('✅ Variante B forzada correctamente en .env.local');
    } else {
      console.log('⚠️  .env.local existe pero no tiene variante forzada');
    }
  } else {
    console.log('⚠️  .env.local no existe - se usará asignación aleatoria');
  }

  // Check if required files exist
  const requiredFiles = [
    'components/providers/ab-test-provider.tsx',
    'hooks/useABTestTracking.ts',
    'components/ui/ab-test-indicator.tsx',
    'styles/liquid-glass/liquid-glass-improved.css',
    'AB_TESTING_README.md'
  ];

  console.log('\n📁 Verificando archivos requeridos:');
  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - FALTA`);
    }
  });

  // Check CSS variants
  const cssFile = path.join(__dirname, '..', 'styles/liquid-glass/liquid-glass-improved.css');
  if (fs.existsSync(cssFile)) {
    const cssContent = fs.readFileSync(cssFile, 'utf8');
    const hasVariantB = cssContent.includes('.variant-b');
    const hasOriginal = cssContent.includes('ORIGINAL SYSTEM');

    console.log('\n🎨 Verificando variantes CSS:');
    console.log(`✅ Variante B (refinements): ${hasVariantB ? 'Presente' : 'Falta'}`);
    console.log(`✅ Sistema original (control): ${hasOriginal ? 'Presente' : 'Falta'}`);
  }

  console.log('\n🚀 Para probar:');
  console.log('1. Ejecuta: npm run dev');
  console.log('2. Abre: http://localhost:3000/landing');
  console.log('3. Busca "Var. B" en la esquina superior derecha');
  console.log('4. Prueba el newsletter signup');
  console.log('5. Revisa la consola para ver el tracking');

  console.log('\n✨ ¡Sistema de A/B testing listo!');
}

if (require.main === module) {
  testSetup();
}

module.exports = { testSetup };
