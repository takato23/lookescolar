#!/bin/bash

echo "🚨 CRITICAL FIX: Deploying TypeScript compilation fixes..."

# Fix the main culprits quickly
git add app/api/admin/photos/simple-upload/route.ts app/api/process-preview/route.ts app/api/admin/events/\[id\]/route.ts

git commit -m "fix(critical): resolve TypeScript compilation errors breaking Vercel build

- Fix crypto import syntax (import * as crypto)
- Fix sharp dynamic import (remove .default)
- Fix Next.js 15 params Promise type issues in dynamic routes

These TS errors were causing routes to fail compilation in Vercel,
resulting in 405/500 errors due to missing handlers."

echo "🚀 Emergency deploy to Vercel..."
vercel --prod

echo "✅ Critical fix deployed. Test in 2 minutes with: node test-vercel-fixes.js"