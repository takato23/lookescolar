13:22:52.973 Running build in Washington, D.C., USA (East) – iad1
13:22:52.973 Build machine configuration: 2 cores, 8 GB
13:22:53.122 Cloning github.com/takato23/lookescolar (Branch: main, Commit: 40887f9)
13:22:54.387 Cloning completed: 1.265s
13:22:54.892 Found .vercelignore
13:22:55.014 Removed 684 ignored files defined in .vercelignore
13:22:55.015   /__tests__/accessibility/publish-a11y-comprehensive.test.ts
13:22:55.015   /__tests__/api-critical-endpoints.test.ts
13:22:55.015   /__tests__/api/admin/photos/route.test.ts
13:22:55.016   /__tests__/api/admin/photos/upload-enhanced.test.ts
13:22:55.016   /__tests__/api/admin/photos/upload-partial-index.test.ts
13:22:55.016   /__tests__/api/admin/photos/upload.test.ts
13:22:55.016   /__tests__/api/admin/publish/publish-endpoints.test.ts
13:22:55.017   /__tests__/api/admin/qr-tagging.test.ts
13:22:55.017   /__tests__/api/admin/settings.test.ts
13:22:55.017   /__tests__/api/admin/tagging.test.ts
13:22:55.130 Restored build cache from previous deployment (GFNkCuWgKPzQqswKZMAHphnSdJQe)
13:22:57.418 Running "vercel build"
13:22:57.843 Vercel CLI 48.8.0
13:22:58.298 Running "install" command: `npm install`...
13:23:06.871 
13:23:06.872 > lookescolar@0.0.0 postinstall
13:23:06.872 > node -e "if(!process.env.CI)try{require('child_process').execSync('husky',{stdio:'inherit'})}catch(e){}"
13:23:06.872 
13:23:06.908 
13:23:06.909 added 8 packages, removed 9 packages, changed 3 packages, and audited 876 packages in 8s
13:23:06.909 
13:23:06.909 176 packages are looking for funding
13:23:06.909   run `npm fund` for details
13:23:06.983 
13:23:06.984 6 vulnerabilities (2 low, 2 moderate, 2 high)
13:23:06.984 
13:23:06.984 To address all issues, run:
13:23:06.984   npm audit fix
13:23:06.984 
13:23:06.985 Run `npm audit` for details.
13:23:07.020 Detected Next.js version: 15.5.2
13:23:07.023 Running "SKIP_ENV_VALIDATION=1 next build"
13:23:07.825    ▲ Next.js 15.5.2
13:23:07.826 
13:23:07.958    Creating an optimized production build ...
13:23:09.135  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
13:23:59.036  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
13:24:00.889 <w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (128kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
13:24:02.048  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
13:24:20.261  ✓ Compiled successfully in 69s
13:24:20.269    Linting and checking validity of types ...
13:24:20.630 
13:24:20.632    We detected TypeScript in your project and created a tsconfig.json file for you.
13:25:49.615 Failed to compile.
13:25:49.615 
13:25:49.615 app/admin/photos-simple/page.tsx
13:25:49.616 Type error: Type '{ searchParams?: SearchParams | undefined; }' does not satisfy the constraint 'PageProps'.
13:25:49.616   Types of property 'searchParams' are incompatible.
13:25:49.616     Type 'SearchParams | undefined' is not assignable to type 'Promise<any> | undefined'.
13:25:49.616       Type 'SearchParams' is missing the following properties from type 'Promise<any>': then, catch, finally, [Symbol.toStringTag]
13:25:49.616 
13:25:49.752 Next.js build worker exited with code: 1 and signal: null
13:25:49.774 Error: Command "SKIP_ENV_VALIDATION=1 next build" exited with 1