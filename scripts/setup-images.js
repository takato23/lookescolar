#!/usr/bin/env node

/**
 * Script para configurar la estructura de imágenes
 * Uso: node scripts/setup-images.js
 */

const fs = require('fs');
const path = require('path');

const imageDirs = [
  'public/images/icons',
  'public/images/logos',
  'public/images/decorative',
  'public/images/mockups',
];

const placeholderFiles = [
  'public/images/icons/dashboard.png',
  'public/images/icons/events.png',
  'public/images/icons/folders.png',
  'public/images/icons/orders.png',
  'public/images/icons/publish.png',
  'public/images/icons/settings.png',
  'public/images/logos/lookescolar-main.png',
  'public/images/logos/lookescolar-mini.png',
];

console.log('🎨 Configurando estructura de imágenes...\n');

// Crear directorios
imageDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Creado: ${dir}`);
  } else {
    console.log(`📁 Ya existe: ${dir}`);
  }
});

// Crear archivo README con instrucciones
const readmeContent = `# Imágenes LookEscolar

## Estructura
- \`icons/\` - Iconos de navegación (24x24, 32x32, 48x48px)
- \`logos/\` - Logos del proyecto (múltiples tamaños)
- \`decorative/\` - Elementos decorativos (estrellas, efectos)
- \`mockups/\` - Imágenes para mockups y demos

## Nomenclatura
- Usar kebab-case: \`dashboard-icon.png\`
- Incluir tamaño si es relevante: \`logo-128.png\`
- Formato preferido: PNG con transparencia

## Tamaños Recomendados
- Iconos pequeños: 24x24, 32x32px
- Iconos medianos: 48x48, 64x64px  
- Logos: 128x128, 256x256px
- Decorativos: según necesidad

## Optimización
- Peso máximo: 10KB por icono
- Usar TinyPNG.com para comprimir
- Mantener transparencia cuando sea necesario
`;

fs.writeFileSync('public/images/README.md', readmeContent);
console.log('✅ Creado: public/images/README.md');

console.log('\n🎯 Próximos pasos:');
console.log('1. Genera tus iconos con IA usando los prompts');
console.log('2. Optimiza las imágenes con TinyPNG');
console.log('3. Colócalas en las carpetas correspondientes');
console.log('4. Usa los componentes IconComponents.tsx para integrarlas');
console.log('\n🚀 ¡Listo para usar iconos personalizados!');
