#!/usr/bin/env tsx

/**
 * Script para unificar gestores de fotos
 * Elimina redundancias y consolida en un sistema único
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();

interface PhotoManagerRoute {
  path: string;
  shouldRedirect: boolean;
  newRedirectTarget: string;
}

const ROUTES_TO_UNIFY: PhotoManagerRoute[] = [
  {
    path: 'app/admin/events/[id]/library/page.tsx',
    shouldRedirect: true,
    newRedirectTarget: '/admin/photos?event_id=${eventId}'
  },
  {
    path: 'app/admin/events/[id]/unified/page.tsx', 
    shouldRedirect: true,
    newRedirectTarget: '/admin/photos?event_id=${eventId}'
  },
  {
    path: 'app/admin/photos-unified/page.tsx',
    shouldRedirect: true,
    newRedirectTarget: '/admin/photos'
  }
];

const COMPONENTS_TO_DEPRECATE = [
  'components/admin/EventPhotoManager.tsx',
  'components/admin/UnifiedPhotoManagement.tsx',
  'components/admin/GroupPhotoManager.tsx',
  'components/admin/BulkPhotoManager.tsx'
];

async function createUnifiedRedirects() {
  console.log('🔄 Creando redirects unificados...');

  for (const route of ROUTES_TO_UNIFY) {
    const fullPath = join(PROJECT_ROOT, route.path);
    
    if (existsSync(fullPath)) {
      console.log(`📝 Creando redirect en ${route.path}`);
      
      const redirectContent = `import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * REDIRECT UNIFICADO - Sistema Consolidado
 * 
 * Este componente redirige al sistema unificado de fotos.
 * Reemplaza: EventPhotoManager, UnifiedPhotoManagement, etc.
 * 
 * Migración completada: ${new Date().toISOString()}
 */
export default async function UnifiedPhotoRedirect({ params }: PageProps) {
  const { id: eventId } = await params;
  
  // Redirigir al sistema unificado con contexto de evento
  redirect(\`${route.newRedirectTarget}\`);
}

export const metadata = {
  title: 'Redirigiendo...',
  description: 'Sistema unificado de gestión de fotos'
};
`;

      writeFileSync(fullPath, redirectContent, 'utf8');
      console.log(`✅ Redirect creado: ${route.path}`);
    } else {
      console.log(`⚠️  Archivo no encontrado: ${route.path}`);
    }
  }
}

async function deprecateComponents() {
  console.log('🗑️ Marcando componentes como deprecated...');

  for (const componentPath of COMPONENTS_TO_DEPRECATE) {
    const fullPath = join(PROJECT_ROOT, componentPath);
    
    if (existsSync(fullPath)) {
      try {
        const content = readFileSync(fullPath, 'utf8');
        
        // Agregar warning de deprecación al inicio del archivo
        const deprecationWarning = `/**
 * ⚠️ DEPRECATED COMPONENT ⚠️
 * 
 * Este componente ha sido marcado como DEPRECATED.
 * Usar el sistema unificado en /admin/photos
 * 
 * Fecha de deprecación: ${new Date().toISOString()}
 * 
 * Migración:
 * - Reemplazar con redirect a /admin/photos?event_id={eventId}
 * - Eliminar imports y referencias a este componente
 * - Usar PhotoAdmin component del sistema unificado
 */

`;

        // Si no tiene ya el warning, agregarlo
        if (!content.includes('DEPRECATED COMPONENT')) {
          const newContent = deprecationWarning + content;
          writeFileSync(fullPath, newContent, 'utf8');
          console.log(`✅ Marcado como deprecated: ${componentPath}`);
        } else {
          console.log(`⏭️ Ya marcado como deprecated: ${componentPath}`);
        }
      } catch (error) {
        console.error(`❌ Error procesando ${componentPath}:`, error);
      }
    } else {
      console.log(`⚠️  Componente no encontrado: ${componentPath}`);
    }
  }
}

async function updateImportsAndReferences() {
  console.log('🔄 Actualizando imports y referencias...');

  const filesToUpdate = [
    'app/admin/events/[id]/page.tsx',
    'components/admin/AdminDashboard.tsx',
    'components/admin/EventDashboard.tsx'
  ];

  for (const filePath of filesToUpdate) {
    const fullPath = join(PROJECT_ROOT, filePath);
    
    if (existsSync(fullPath)) {
      try {
        let content = readFileSync(fullPath, 'utf8');
        let updated = false;

        // Reemplazar imports deprecated
        const oldImports = [
          /import.*EventPhotoManager.*from.*EventPhotoManager.*/g,
          /import.*UnifiedPhotoManagement.*from.*UnifiedPhotoManagement.*/g,
          /import.*GroupPhotoManager.*from.*GroupPhotoManager.*/g,
          /import.*BulkPhotoManager.*from.*BulkPhotoManager.*/g
        ];

        oldImports.forEach(regex => {
          if (regex.test(content)) {
            content = content.replace(regex, '// DEPRECATED: Usar sistema unificado /admin/photos');
            updated = true;
          }
        });

        // Reemplazar usos de componentes deprecated
        const componentReplacements = [
          {
            old: /<EventPhotoManager[^>]*>/g,
            new: `{/* MIGRADO: Usar Link a /admin/photos?event_id=\${eventId} */}`
          },
          {
            old: /<UnifiedPhotoManagement[^>]*>/g,
            new: `{/* MIGRADO: Usar Link a /admin/photos */}`
          }
        ];

        componentReplacements.forEach(({ old, new: replacement }) => {
          if (old.test(content)) {
            content = content.replace(old, replacement);
            updated = true;
          }
        });

        if (updated) {
          writeFileSync(fullPath, content, 'utf8');
          console.log(`✅ Actualizado: ${filePath}`);
        } else {
          console.log(`⏭️ Sin cambios necesarios: ${filePath}`);
        }
      } catch (error) {
        console.error(`❌ Error actualizando ${filePath}:`, error);
      }
    } else {
      console.log(`⚠️  Archivo no encontrado: ${filePath}`);
    }
  }
}

async function createMigrationGuide() {
  console.log('📋 Creando guía de migración...');

  const migrationGuide = `# Guía de Migración - Sistema Unificado de Fotos

## ✅ Cambios Implementados

### 1. Redirects Automáticos
Los siguientes routes ahora redirigen al sistema unificado:

${ROUTES_TO_UNIFY.map(route => `- \`${route.path}\` → \`${route.newRedirectTarget}\``).join('\n')}

### 2. Componentes Deprecated
Los siguientes componentes han sido marcados como DEPRECATED:

${COMPONENTS_TO_DEPRECATE.map(comp => `- \`${comp}\``).join('\n')}

### 3. Sistema Unificado
- **Punto de entrada único**: \`/admin/photos\`
- **Contexto de evento**: \`/admin/photos?event_id={eventId}\`
- **Componente principal**: \`PhotoAdmin\` en \`components/admin/PhotoAdmin.tsx\`

## 🚀 Cómo Usar el Sistema Unificado

### Para Vista General
\`\`\`tsx
import Link from 'next/link';

// Enlace a vista general de fotos
<Link href="/admin/photos">
  <Button>Gestionar Fotos</Button>
</Link>
\`\`\`

### Para Evento Específico
\`\`\`tsx
import Link from 'next/link';

// Enlace a fotos de evento específico
<Link href={\`/admin/photos?event_id=\${eventId}\`}>
  <Button>Fotos del Evento</Button>
</Link>
\`\`\`

### Uso Directo del Componente
\`\`\`tsx
import { PhotoAdmin } from '@/components/admin/PhotoAdmin';

export default function MyPhotoPage() {
  return (
    <PhotoAdmin
      className="h-screen"
      enableUpload={true}
      enableBulkOperations={true}
    />
  );
}
\`\`\`

## 🗑️ Limpieza Pendiente

### Después de Validar (1-2 semanas):
1. Eliminar componentes deprecated completamente
2. Remover routes que ahora son redirects
3. Limpiar imports y referencias obsoletas

### Comandos para Limpieza Final:
\`\`\`bash
# Eliminar componentes deprecated
rm components/admin/EventPhotoManager.tsx
rm components/admin/UnifiedPhotoManagement.tsx
rm components/admin/GroupPhotoManager.tsx
rm components/admin/BulkPhotoManager.tsx

# Eliminar routes obsoletos (después de validar redirects)
rm -rf app/admin/events/[id]/library/
rm -rf app/admin/events/[id]/unified/
rm -rf app/admin/photos-unified/
\`\`\`

## 📊 Beneficios del Sistema Unificado

1. **Simplicidad**: Un solo punto de entrada para gestión de fotos
2. **Consistencia**: Una sola UI/UX en toda la aplicación  
3. **Mantenibilidad**: Menos código duplicado
4. **Performance**: Componente optimizado con virtualización
5. **Escalabilidad**: Soporte para jerarquía de 4 niveles

## 🔧 Solución de Problemas

### Si un enlace no funciona:
1. Verificar que el redirect esté en su lugar
2. Comprobar que \`/admin/photos\` esté funcionando
3. Revisar query parameters para contexto de evento

### Si faltan funcionalidades:
1. El sistema unificado incluye todas las funcionalidades anteriores
2. Verificar que \`enableUpload\` y \`enableBulkOperations\` estén habilitados
3. Revisar permisos de usuario

---

Migración completada: ${new Date().toISOString()}
Sistema objetivo: /admin/photos (PhotoAdmin component)
`;

  writeFileSync(join(PROJECT_ROOT, 'docs/PHOTO_SYSTEM_MIGRATION.md'), migrationGuide, 'utf8');
  console.log('✅ Guía de migración creada: docs/PHOTO_SYSTEM_MIGRATION.md');
}

async function main() {
  try {
    console.log('🚀 Iniciando unificación del sistema de fotos...\n');

    await createUnifiedRedirects();
    console.log();
    
    await deprecateComponents();
    console.log();
    
    await updateImportsAndReferences();
    console.log();
    
    await createMigrationGuide();
    console.log();

    console.log('✅ Unificación completada exitosamente!');
    console.log('📋 Revisar: docs/PHOTO_SYSTEM_MIGRATION.md');
    console.log('🎯 Sistema unificado: /admin/photos');

  } catch (error) {
    console.error('❌ Error durante la unificación:', error);
    process.exit(1);
  }
}

// Auto-ejecutar cuando se llama directamente
main().catch(console.error);

export { main as unifyPhotoManagers };
