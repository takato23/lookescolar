12:49:30.829 Running build in Washington, D.C., USA (East) – iad1
12:49:30.830 Build machine configuration: 2 cores, 8 GB
12:49:30.989 Cloning github.com/takato23/lookescolar (Branch: main, Commit: ee70680)
12:49:33.127 Cloning completed: 2.137s
12:49:33.438 Found .vercelignore
12:49:33.536 Removed 684 ignored files defined in .vercelignore
12:49:33.536   /__tests__/accessibility/publish-a11y-comprehensive.test.ts
12:49:33.536   /__tests__/api-critical-endpoints.test.ts
12:49:33.536   /__tests__/api/admin/photos/route.test.ts
12:49:33.537   /__tests__/api/admin/photos/upload-enhanced.test.ts
12:49:33.537   /__tests__/api/admin/photos/upload-partial-index.test.ts
12:49:33.537   /__tests__/api/admin/photos/upload.test.ts
12:49:33.537   /__tests__/api/admin/publish/publish-endpoints.test.ts
12:49:33.537   /__tests__/api/admin/qr-tagging.test.ts
12:49:33.537   /__tests__/api/admin/settings.test.ts
12:49:33.537   /__tests__/api/admin/tagging.test.ts
12:49:33.582 Restored build cache from previous deployment (GFNkCuWgKPzQqswKZMAHphnSdJQe)
12:49:35.765 Running "vercel build"
12:49:36.170 Vercel CLI 48.8.0
12:49:36.636 Running "install" command: `npm install`...
12:49:43.933 
12:49:43.934 > lookescolar@0.0.0 postinstall
12:49:43.934 > node -e "if(!process.env.CI)try{require('child_process').execSync('husky',{stdio:'inherit'})}catch(e){}"
12:49:43.934 
12:49:43.984 
12:49:43.985 added 8 packages, removed 9 packages, changed 3 packages, and audited 876 packages in 7s
12:49:43.985 
12:49:43.986 176 packages are looking for funding
12:49:43.986   run `npm fund` for details
12:49:44.059 
12:49:44.059 6 vulnerabilities (2 low, 2 moderate, 2 high)
12:49:44.060 
12:49:44.060 To address all issues, run:
12:49:44.060   npm audit fix
12:49:44.060 
12:49:44.061 Run `npm audit` for details.
12:49:44.097 Detected Next.js version: 15.5.2
12:49:44.097 Running "SKIP_ENV_VALIDATION=1 next build"
12:49:44.826    ▲ Next.js 15.5.2
12:49:44.827 
12:49:44.957    Creating an optimized production build ...
12:49:45.900  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
12:50:32.663  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
12:50:34.522 <w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (128kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
12:50:35.634  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
12:50:52.957  ✓ Compiled successfully in 65s
12:50:52.962    Linting and checking validity of types ...
12:50:53.304 
12:50:53.304    We detected TypeScript in your project and created a tsconfig.json file for you.
12:52:11.140 Failed to compile.
12:52:11.140 
12:52:11.142 app/admin/events/[id]/photos/page.tsx
12:52:11.142 Type error: Type 'PageProps' does not satisfy the constraint 'import("/vercel/path0/.next/types/app/admin/events/[id]/photos/page").PageProps'.
12:52:11.143   Types of property 'params' are incompatible.
12:52:11.143     Type '{ id: string; }' is missing the following properties from type 'Promise<any>': then, catch, finally, [Symbol.toStringTag]
12:52:11.143 
12:52:11.245 Next.js build worker exited with code: 1 and signal: null
12:52:11.262 Error: Command "SKIP_ENV_VALIDATION=1 next build" exited with 1