#!/bin/bash

echo "🔥 HOTFIX: Deploying critical method export fixes..."

git add app/api/admin/photos/simple-upload/route.ts app/api/process-preview/route.ts

git commit -m "hotfix(vercel): use traditional export const syntax for method handlers

- Switch from async function to export const arrow functions
- Add explicit error handling for auth wrapper
- Ensure Vercel recognizes POST/GET method exports correctly

Critical issue: Next.js 15 + Vercel not recognizing async function exports"

echo "🚀 Quick deploying to Vercel..."
vercel --prod

echo "✅ Hotfix deployed. Test in 1-2 minutes with: node test-vercel-fixes.js"