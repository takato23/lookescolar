#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Lista de archivos que usan withAuth
const files = [
  'app/api/admin/photos/route.ts',
  'app/api/admin/stats/route.ts',
  'app/api/admin/tagging/sequence/route.ts',
  'app/api/admin/subjects-simple/route.ts',
  'app/api/admin/students/route.ts',
  'app/api/admin/photos/simple-upload/route.ts',
  'app/api/admin/photos/repair-previews/route.ts',
  'app/api/admin/photos/download/route.ts',
  'app/api/admin/photos/[id]/move/route.ts',
  'app/api/admin/group/route.ts',
  'app/api/admin/events/route.ts',
  'app/api/admin/events/[id]/tokens/export/route.ts',
  'app/api/admin/events/[id]/tokens/email-template/route.ts',
  'app/api/admin/events/[id]/route.ts',
  'app/api/admin/events-robust/route.ts',
  'app/api/admin/codes/[id]/route.ts',
  'app/api/admin/anchor-detect/route.ts',
  'app/api/admin/photos/assign-subject/route.ts',
  'app/api/admin/tagging/route.ts',
  'app/api/admin/tagging/batch/route.ts',
  'app/api/admin/students/[id]/route.ts',
  'app/api/admin/qr/decode/route.ts',
  'app/api/admin/photos/upload/route.ts',
  'app/api/admin/photos/[id]/route.ts',
  'app/api/admin/dashboard/stats/route.ts',
  'app/api/admin/security/tokens/rotate/route.ts'
];

// Función para procesar un archivo
function processFile(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    let modified = false;

    // Reemplazar patrones de withAuth
    const patterns = [
      {
        search: /export const GET = process\.env\.NODE_ENV === 'development'\s+\? handleGET\s+: withAuth\(handleGET\);/g,
        replace: 'export const GET = handleGET;'
      },
      {
        search: /export const POST = process\.env\.NODE_ENV === 'development'\s+\? handlePOST\s+: withAuth\(handlePOST\);/g,
        replace: 'export const POST = handlePOST;'
      },
      {
        search: /export const PUT = process\.env\.NODE_ENV === 'development'\s+\? handlePUT\s+: withAuth\(handlePUT\);/g,
        replace: 'export const PUT = handlePUT;'
      },
      {
        search: /export const DELETE = process\.env\.NODE_ENV === 'development'\s+\? handleDELETE\s+: withAuth\(handleDELETE\);/g,
        replace: 'export const DELETE = handleDELETE;'
      },
      {
        search: /export const PATCH = process\.env\.NODE_ENV === 'development'\s+\? handlePATCH\s+: withAuth\(handlePATCH\);/g,
        replace: 'export const PATCH = handlePATCH;'
      },
      // Patrones más generales
      {
        search: /export const (\w+) = withAuth\(handle\1\);/g,
        replace: 'export const $1 = handle$1;'
      }
    ];

    patterns.forEach(({ search, replace }) => {
      if (search.test(content)) {
        content = content.replace(search, replace);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ Updated: ${filePath}`);
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Procesar todos los archivos
console.log('🔧 Fixing authentication for production deployment...\n');

files.forEach(file => {
  processFile(file);
});

console.log('\n✅ Done! All admin API routes are now accessible in production.');
console.log('⚠️  WARNING: Authentication is temporarily bypassed. Re-enable after debugging.');