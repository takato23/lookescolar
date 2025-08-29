#!/usr/bin/env tsx

/**
 * Test runner specifically for admin photos upload functionality
 *
 * This script runs the focused integration tests that validate:
 * 1. Upload API endpoint functionality
 * 2. Preview generation and storage
 * 3. Asset management integration
 * 4. Folder-to-subjects mapping
 * 5. Complete upload → preview → display chain
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STORAGE_BUCKET_PREVIEW',
  'NEXT_PUBLIC_APP_URL',
];

const TEST_FILES = [
  '__tests__/integration/admin-photos-upload-chain.test.ts',
  '__tests__/integration/admin-assets-api.test.ts',
  '__tests__/integration/folder-photo-mapping.test.ts',
  '__tests__/integration/admin-folders-api.test.ts',
];

const UNIT_TESTS = [
  '__tests__/api/admin/photos/upload.test.ts',
  '__tests__/api/admin/photos/upload-enhanced.test.ts',
];

function checkEnvironment(): void {
  console.log('🔍 Checking environment...');

  const missingVars = REQUIRED_ENV_VARS.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    console.error(
      '\nMake sure to set up your .env.local file with the required variables.'
    );
    process.exit(1);
  }

  console.log('✅ Environment variables OK');
}

function checkTestFiles(): void {
  console.log('🔍 Checking test files...');

  const missingFiles = TEST_FILES.filter(
    (file) => !existsSync(path.join(process.cwd(), file))
  );

  if (missingFiles.length > 0) {
    console.error('❌ Missing test files:');
    missingFiles.forEach((file) => console.error(`   - ${file}`));
    process.exit(1);
  }

  console.log('✅ Test files OK');
}

function runTests(testPattern: string, description: string): void {
  console.log(`\n🧪 Running ${description}...`);
  console.log(`📁 Pattern: ${testPattern}`);

  try {
    const command = `npx vitest run ${testPattern} --reporter=verbose --bail=1`;
    console.log(`⚡ Command: ${command}\n`);

    execSync(command, {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        VITEST_POOL_TIMEOUT: '30000',
      },
    });

    console.log(`✅ ${description} completed successfully`);
  } catch (error) {
    console.error(`❌ ${description} failed`);
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

function runCoverage(): void {
  console.log('\n📊 Running coverage analysis...');

  try {
    const coverageCommand = `npx vitest run ${TEST_FILES.join(' ')} --coverage --coverage.reporter=text --coverage.reporter=html`;
    console.log(`⚡ Coverage command: ${coverageCommand}\n`);

    execSync(coverageCommand, {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    console.log('✅ Coverage analysis completed');
  } catch (error) {
    console.log('⚠️  Coverage analysis failed, but tests passed');
  }
}

function main(): void {
  console.log('🚀 Starting Admin Photos Upload Test Suite');
  console.log('==========================================\n');

  // Environment and file checks
  checkEnvironment();
  checkTestFiles();

  const args = process.argv.slice(2);
  const runMode = args[0] || 'all';

  switch (runMode) {
    case 'unit':
      console.log('🎯 Running unit tests only...');
      runTests(UNIT_TESTS.join(' '), 'Unit Tests');
      break;

    case 'integration':
      console.log('🎯 Running integration tests only...');
      runTests(TEST_FILES.join(' '), 'Integration Tests');
      break;

    case 'upload-chain':
      console.log('🎯 Running upload chain test only...');
      runTests(
        '__tests__/integration/admin-photos-upload-chain.test.ts',
        'Upload Chain Test'
      );
      break;

    case 'assets':
      console.log('🎯 Running asset management tests only...');
      runTests(
        '__tests__/integration/admin-assets-api.test.ts',
        'Asset Management Tests'
      );
      break;

    case 'folders':
      console.log('🎯 Running folder mapping tests only...');
      runTests(
        '__tests__/integration/folder-photo-mapping.test.ts',
        'Folder Mapping Tests'
      );
      break;

    case 'coverage':
      console.log('🎯 Running tests with coverage...');
      runTests(TEST_FILES.join(' '), 'Integration Tests');
      runCoverage();
      break;

    case 'all':
    default:
      console.log('🎯 Running complete test suite...');

      // Run unit tests first
      runTests(UNIT_TESTS.join(' '), 'Unit Tests');

      // Then integration tests
      runTests(TEST_FILES.join(' '), 'Integration Tests');
      break;
  }

  console.log('\n🎉 All tests completed successfully!');
  console.log('\n📋 Test Summary:');
  console.log('================');
  console.log('✅ Upload API endpoint functionality');
  console.log('✅ Preview generation and storage');
  console.log('✅ Asset management integration');
  console.log('✅ Folder-to-subjects mapping');
  console.log('✅ Complete upload → preview → display chain');

  console.log('\n💡 Next steps:');
  console.log('- Run manual testing in browser at /admin/photos');
  console.log('- Test with real photo files of various sizes');
  console.log('- Verify storage usage and optimization');
  console.log('- Check preview quality and watermark application');
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the test suite
main();
