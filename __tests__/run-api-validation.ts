#!/usr/bin/env tsx

/**
 * Simple test runner for API validation
 * Tests admin upload functionality without complex database setup
 */

import { execSync } from 'child_process';

const API_TEST_FILE = '__tests__/integration/upload-api-validation.test.ts';

function runAPIValidation(): void {
  console.log('🚀 Running Upload API Validation Tests');
  console.log('=====================================\n');

  // Check if dev server is running
  console.log('🔍 Checking if development server is running...');
  try {
    const response = execSync('curl -s http://localhost:3000/api/health', {
      encoding: 'utf8',
    });
    const health = JSON.parse(response);
    if (health.status === 'ok') {
      console.log('✅ Development server is running');
    } else {
      throw new Error('Health check failed');
    }
  } catch (error) {
    console.error('❌ Development server is not running on port 3000');
    console.error('Please start the server with: npm run dev');
    process.exit(1);
  }

  console.log('\n🧪 Running API validation tests...');
  console.log(`📁 Test file: ${API_TEST_FILE}\n`);

  try {
    const command = `npx vitest run ${API_TEST_FILE} --reporter=verbose`;
    console.log(`⚡ Command: ${command}\n`);

    execSync(command, {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      },
    });

    console.log('\n✅ API validation tests completed successfully!');
    console.log('\n📋 Validation Summary:');
    console.log('=====================');
    console.log('✅ Upload API endpoint parameter validation');
    console.log('✅ Asset management API error handling');
    console.log('✅ Folder API request validation');
    console.log('✅ Response format consistency');
    console.log('✅ Health endpoint functionality');
  } catch (error) {
    console.error('\n❌ API validation tests failed');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

function main(): void {
  runAPIValidation();
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

main();
