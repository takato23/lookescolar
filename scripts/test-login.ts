#!/usr/bin/env tsx

/**
 * Test login script to verify authentication and dashboard access
 */

async function testLogin() {
  const baseUrl = 'http://localhost:3000';

  console.log('🔐 Testing login and dashboard access...\n');

  // Test 1: Check if login page is accessible
  console.log('1. Testing login page...');
  try {
    const loginResponse = await fetch(`${baseUrl}/login`);
    if (loginResponse.ok) {
      console.log('   ✅ Login page accessible');
    } else {
      console.log(`   ❌ Login page error: ${loginResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Failed to access login page: ${error}`);
  }

  // Test 2: Check admin redirect without auth
  console.log('\n2. Testing admin redirect without auth...');
  try {
    const adminResponse = await fetch(`${baseUrl}/admin`, {
      redirect: 'manual',
    });
    if (adminResponse.status === 307) {
      console.log('   ✅ Correctly redirects to login when not authenticated');
    } else {
      console.log(`   ⚠️ Unexpected status: ${adminResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Failed to check admin redirect: ${error}`);
  }

  // Test 3: Check API endpoints
  console.log('\n3. Testing API endpoints...');
  const endpoints = [
    '/api/admin/stats',
    '/api/admin/events',
    '/api/admin/orders',
    '/api/admin/activity',
    '/api/admin/performance',
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`);
      if (response.ok) {
        const data = await response.json();
        console.log(
          `   ✅ ${endpoint} - OK (${JSON.stringify(data).length} bytes)`
        );
      } else {
        console.log(`   ⚠️ ${endpoint} - Status ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint} - Error: ${error}`);
    }
  }

  console.log('\n✨ Test complete!\n');
  console.log('To access the admin panel:');
  console.log('1. Go to http://localhost:3000/login');
  console.log('2. Login with your admin credentials');
  console.log('3. You will be redirected to the dashboard');
}

testLogin().catch(console.error);
