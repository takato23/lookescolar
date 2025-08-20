#!/usr/bin/env node

/**
 * Authentication Fix Verification Script
 * 
 * This script tests the fixed authentication system to ensure:
 * 1. Login works correctly
 * 2. Session persistence works
 * 3. Admin endpoints return JSON (not HTML error pages)
 * 4. Protected routes work correctly
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@lookescolar.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

console.log('🔐 Authentication Fix Verification');
console.log('==================================');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Test Email: ${TEST_EMAIL}`);
console.log('');

/**
 * Make HTTP request with cookies
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url, BASE_URL);
    const isHttps = requestUrl.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const requestOptions = {
      hostname: requestUrl.hostname,
      port: requestUrl.port || (isHttps ? 443 : 3000),
      path: requestUrl.pathname + requestUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'auth-test-script/1.0',
        ...options.headers
      }
    };

    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = lib.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          cookies: res.headers['set-cookie'] || []
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Extract cookies from set-cookie headers
 */
function extractCookies(cookieHeaders) {
  const cookies = {};
  
  cookieHeaders.forEach(cookieHeader => {
    const parts = cookieHeader.split(';')[0].split('=');
    if (parts.length === 2) {
      cookies[parts[0].trim()] = parts[1].trim();
    }
  });
  
  return cookies;
}

/**
 * Format cookies for request headers
 */
function formatCookies(cookies) {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

/**
 * Test login endpoint
 */
async function testLogin() {
  console.log('1. Testing login endpoint...');
  
  try {
    const response = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      }
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type'] || 'not set'}`);
    
    if (response.body.startsWith('<!DOCTYPE')) {
      console.log('   ❌ Response is HTML, expected JSON');
      return { success: false, cookies: {} };
    }

    try {
      const data = JSON.parse(response.body);
      
      if (response.status === 200 && data.success) {
        console.log('   ✅ Login successful');
        console.log(`   User: ${data.user?.email || 'unknown'}`);
        
        const cookies = extractCookies(response.cookies);
        console.log(`   Cookies set: ${Object.keys(cookies).length}`);
        console.log(`   Cookie names: ${Object.keys(cookies).join(', ')}`);
        
        return { success: true, cookies, user: data.user };
      } else {
        console.log(`   ❌ Login failed: ${data.error || 'Unknown error'}`);
        return { success: false, cookies: {} };
      }
    } catch (parseError) {
      console.log('   ❌ Invalid JSON response');
      console.log(`   Response: ${response.body.substring(0, 200)}...`);
      return { success: false, cookies: {} };
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return { success: false, cookies: {} };
  }
}

/**
 * Test admin endpoint with cookies
 */
async function testAdminEndpoint(cookies, endpoint = '/api/admin/stats') {
  console.log(`\n2. Testing admin endpoint: ${endpoint}`);
  
  try {
    const response = await makeRequest(endpoint, {
      method: 'GET',
      headers: {
        'Cookie': formatCookies(cookies)
      }
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type'] || 'not set'}`);
    
    if (response.body.startsWith('<!DOCTYPE')) {
      console.log('   ❌ Response is HTML, expected JSON');
      console.log(`   Response: ${response.body.substring(0, 200)}...`);
      return false;
    }

    if (response.status === 200) {
      try {
        const data = JSON.parse(response.body);
        console.log('   ✅ Admin endpoint returned JSON');
        console.log(`   Response type: ${data.success ? 'Success' : 'Error'}`);
        return true;
      } catch (parseError) {
        console.log('   ❌ Invalid JSON response');
        return false;
      }
    } else if (response.status === 401 || response.status === 403) {
      console.log('   ❌ Authentication failed - session not persisted');
      try {
        const data = JSON.parse(response.body);
        console.log(`   Error: ${data.error || 'Authentication required'}`);
      } catch (parseError) {
        console.log(`   Raw response: ${response.body.substring(0, 200)}...`);
      }
      return false;
    } else {
      console.log(`   ❌ Unexpected status code: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return false;
  }
}

/**
 * Test multiple admin endpoints
 */
async function testMultipleEndpoints(cookies) {
  console.log('\n3. Testing multiple admin endpoints...');
  
  const endpoints = [
    '/api/admin/stats',
    '/api/admin/events-robust',
    '/api/admin/performance'
  ];

  let successCount = 0;

  for (const endpoint of endpoints) {
    console.log(`\n   Testing ${endpoint}:`);
    const success = await testAdminEndpoint(cookies, endpoint);
    if (success) {
      successCount++;
      console.log(`   ✅ ${endpoint} works`);
    } else {
      console.log(`   ❌ ${endpoint} failed`);
    }
  }

  console.log(`\n   Results: ${successCount}/${endpoints.length} endpoints working`);
  return successCount === endpoints.length;
}

/**
 * Main test function
 */
async function runTests() {
  console.log('Starting authentication tests...\n');

  // Test 1: Login
  const loginResult = await testLogin();
  
  if (!loginResult.success) {
    console.log('\n❌ Authentication fix verification FAILED');
    console.log('   Login endpoint is not working correctly');
    process.exit(1);
  }

  // Test 2: Single admin endpoint
  const singleEndpointSuccess = await testAdminEndpoint(loginResult.cookies);
  
  if (!singleEndpointSuccess) {
    console.log('\n❌ Authentication fix verification FAILED');
    console.log('   Session persistence is not working correctly');
    process.exit(1);
  }

  // Test 3: Multiple admin endpoints
  const multipleEndpointsSuccess = await testMultipleEndpoints(loginResult.cookies);

  // Final result
  console.log('\n========================================');
  if (loginResult.success && singleEndpointSuccess && multipleEndpointsSuccess) {
    console.log('✅ Authentication fix verification PASSED');
    console.log('   ✓ Login works correctly');
    console.log('   ✓ Session persistence works');
    console.log('   ✓ Admin endpoints return JSON');
    console.log('   ✓ Multiple endpoints work correctly');
    console.log('\n🎉 The authentication system is working correctly!');
  } else {
    console.log('❌ Authentication fix verification FAILED');
    console.log(`   Login: ${loginResult.success ? '✓' : '❌'}`);
    console.log(`   Session persistence: ${singleEndpointSuccess ? '✓' : '❌'}`);
    console.log(`   Multiple endpoints: ${multipleEndpointsSuccess ? '✓' : '❌'}`);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testLogin, testAdminEndpoint };