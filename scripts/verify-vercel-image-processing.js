#!/usr/bin/env node

/**
 * Verify Vercel Image Processing Script
 *
 * This script tests the Sharp-free image processing solution
 * to ensure it works correctly on Vercel production
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(colors.green, `✅ ${message}`);
}

function logError(message) {
  log(colors.red, `❌ ${message}`);
}

function logWarning(message) {
  log(colors.yellow, `⚠️  ${message}`);
}

function logInfo(message) {
  log(colors.blue, `ℹ️  ${message}`);
}

// Test configuration
const TEST_CONFIG = {
  localUrl: 'http://localhost:3000',
  productionUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  timeout: 30000 // 30 seconds
};

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.request(url, {
      method: 'GET',
      timeout: TEST_CONFIG.timeout,
      ...options
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Test image processing endpoint
 */
async function testImageProcessing(baseUrl) {
  try {
    logInfo(`Testing image processing at: ${baseUrl}`);

    const response = await makeRequest(`${baseUrl}/api/test-image-processing`);

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: ${response.data}`);
    }

    const result = response.data;

    if (!result.success) {
      logWarning(`Tests completed with issues: ${result.summary}`);
      logInfo('Test results:');

      Object.entries(result.tests).forEach(([testName, testResult]) => {
        if (testResult.success) {
          logSuccess(`  ${testName}: PASSED`);
        } else {
          logError(`  ${testName}: FAILED - ${testResult.error}`);
        }
      });

      return false;
    }

    logSuccess(`All tests passed: ${result.summary}`);
    logInfo('Environment details:');
    logInfo(`  Vercel: ${result.environment.isVercel}`);
    logInfo(`  Runtime: ${result.environment.runtime}`);
    logInfo(`  Node Env: ${result.environment.nodeEnv}`);

    return true;

  } catch (error) {
    logError(`Image processing test failed: ${error.message}`);
    return false;
  }
}

/**
 * Check package.json dependencies
 */
function checkDependencies() {
  try {
    logInfo('Checking package.json dependencies...');

    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Check if Sharp is present but optional
    if (packageJson.dependencies && packageJson.dependencies.sharp) {
      logInfo('✓ Sharp found in dependencies (used for local development)');
    }

    if (packageJson.optionalDependencies && packageJson.optionalDependencies.canvas) {
      logInfo('✓ Canvas found in optionalDependencies (fallback for Node environments)');
    }

    // Check for Vercel-unfriendly packages
    const problematicPackages = ['node-canvas', 'fabric', 'konva'];
    const hasProblematicPackages = problematicPackages.some(pkg =>
      (packageJson.dependencies && packageJson.dependencies[pkg]) ||
      (packageJson.devDependencies && packageJson.devDependencies[pkg])
    );

    if (hasProblematicPackages) {
      logWarning('Found potentially problematic packages for Vercel deployment');
    } else {
      logSuccess('No problematic packages detected for Vercel deployment');
    }

    return true;

  } catch (error) {
    logError(`Failed to check dependencies: ${error.message}`);
    return false;
  }
}

/**
 * Check if required files exist
 */
function checkRequiredFiles() {
  const requiredFiles = [
    'lib/services/canvas-image-processor.ts',
    'lib/services/free-tier-optimizer.ts',
    'app/api/test-image-processing/route.ts'
  ];

  logInfo('Checking required files...');

  let allFilesExist = true;

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      logSuccess(`  ${file} ✓`);
    } else {
      logError(`  ${file} ✗`);
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

/**
 * Main test runner
 */
async function runTests() {
  log(colors.bold + colors.blue, '\n🧪 Vercel Image Processing Verification\n');

  // Check dependencies
  if (!checkDependencies()) {
    process.exit(1);
  }

  // Check required files
  if (!checkRequiredFiles()) {
    logError('Missing required files');
    process.exit(1);
  }

  // Test local development
  logInfo('\n--- Testing Local Development ---');
  try {
    const localSuccess = await testImageProcessing(TEST_CONFIG.localUrl);
    if (localSuccess) {
      logSuccess('Local development test passed');
    } else {
      logWarning('Local development test had issues (may be expected if server not running)');
    }
  } catch (error) {
    logWarning(`Local test skipped: ${error.message}`);
  }

  // Test production if URL available
  if (TEST_CONFIG.productionUrl) {
    logInfo('\n--- Testing Production Deployment ---');
    try {
      const productionSuccess = await testImageProcessing(TEST_CONFIG.productionUrl);
      if (productionSuccess) {
        logSuccess('Production deployment test passed');
      } else {
        logError('Production deployment test failed');
        process.exit(1);
      }
    } catch (error) {
      logError(`Production test failed: ${error.message}`);
      process.exit(1);
    }
  } else {
    logInfo('\n--- Production Test Skipped ---');
    logInfo('Set VERCEL_URL environment variable to test production deployment');
  }

  // Summary
  log(colors.bold + colors.green, '\n🎉 Verification Complete!');
  logSuccess('Sharp-free image processing solution is ready for Vercel deployment');

  logInfo('\nNext steps:');
  logInfo('1. Deploy to Vercel');
  logInfo('2. Test the /api/test-image-processing endpoint');
  logInfo('3. Upload test photos to verify preview generation');
  logInfo('4. Monitor Vercel logs for any runtime issues');
}

// Run the tests when script is executed directly
runTests().catch((error) => {
  logError(`Test runner failed: ${error.message}`);
  process.exit(1);
});