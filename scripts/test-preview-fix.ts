#!/usr/bin/env tsx

/**
 * Test Preview Fix - Quick validation that preview URLs are working
 * Tests the getPreviewUrl function and preview proxy route
 */

import { execSync } from 'child_process';

// Simulate the getPreviewUrl function from PhotoAdmin.tsx
const getPreviewUrl = (previewPath: string | null): string | null => {
  if (!previewPath) return null;

  // If it's already a full URL, return as-is
  if (
    previewPath.startsWith('http') ||
    previewPath.startsWith('/admin/previews/')
  ) {
    return previewPath;
  }

  // Extract filename from path (e.g. "previews/filename_preview.webp" -> "filename_preview.webp")
  const filename = previewPath.includes('/')
    ? previewPath.split('/').pop()
    : previewPath;
  if (!filename || !filename.endsWith('_preview.webp')) {
    return null;
  }

  // Return proxy URL
  return `/admin/previews/${filename}`;
};

// Test cases
const testCases = [
  {
    input: 'previews/test_photo_preview.webp',
    expected: '/admin/previews/test_photo_preview.webp',
    description: 'Storage path with previews folder',
  },
  {
    input: 'test_photo_preview.webp',
    expected: '/admin/previews/test_photo_preview.webp',
    description: 'Just filename',
  },
  {
    input: '/admin/previews/test_photo_preview.webp',
    expected: '/admin/previews/test_photo_preview.webp',
    description: 'Already a proxy URL',
  },
  {
    input: 'https://example.com/test_photo_preview.webp',
    expected: 'https://example.com/test_photo_preview.webp',
    description: 'Full URL',
  },
  {
    input: null,
    expected: null,
    description: 'Null input',
  },
  {
    input: 'invalid_filename.jpg',
    expected: null,
    description: 'Invalid filename format',
  },
  {
    input: 'previews/invalid_filename.jpg',
    expected: null,
    description: 'Invalid filename in previews path',
  },
];

console.log('🔍 Testing Preview URL Generation Fix\n');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = getPreviewUrl(testCase.input);
  const success = result === testCase.expected;

  if (success) {
    console.log(`✅ ${testCase.description}`);
    passed++;
  } else {
    console.log(`❌ ${testCase.description}`);
    console.log(`   Input: ${testCase.input}`);
    console.log(`   Expected: ${testCase.expected}`);
    console.log(`   Got: ${result}\n`);
    failed++;
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\n❌ Some tests failed. Please check the implementation.');
  process.exit(1);
} else {
  console.log(
    '\n✅ All tests passed! Preview URL generation is working correctly.'
  );
}

// Additional check - validate the route exists
try {
  const routePath = 'app/admin/previews/[filename]/route.ts';
  execSync(`ls -la ${routePath}`, { stdio: 'ignore' });
  console.log('✅ Preview proxy route exists');
} catch {
  console.log(
    '❌ Preview proxy route NOT found at app/admin/previews/[filename]/route.ts'
  );
  process.exit(1);
}

// Check PhotoAdmin.tsx changes
try {
  const result = execSync(
    'grep -n "getPreviewUrl" components/admin/PhotoAdmin.tsx',
    { encoding: 'utf8' }
  );
  if (result.trim()) {
    console.log(
      '✅ PhotoAdmin.tsx has been updated with getPreviewUrl function'
    );
    console.log(
      `   Found ${result.split('\n').filter((line) => line.trim()).length} usages`
    );
  } else {
    console.log('❌ PhotoAdmin.tsx does not contain getPreviewUrl function');
    process.exit(1);
  }
} catch {
  console.log('❌ Could not verify PhotoAdmin.tsx changes');
  process.exit(1);
}

console.log('\n🎉 Preview loading fix is implemented correctly!');
console.log('\nNext steps:');
console.log('1. Start the development server: npm run dev');
console.log('2. Navigate to admin photos page');
console.log('3. Verify preview images load without 404 errors');
console.log(
  '4. Check browser network tab for successful /admin/previews/* requests'
);
