#!/usr/bin/env node

/**
 * Script para probar las APIs de checkout
 * Usage: node scripts/test-checkout.js [family|public]
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Mock data for testing
const MOCK_DATA = {
  family: {
    token: 'test_token_1234567890123456789012345',
    contactInfo: {
      name: 'Test Parent',
      email: 'parent@test.com',
      phone: '1234567890',
    },
    items: [
      {
        photoId: '550e8400-e29b-41d4-a716-446655440001',
        quantity: 1,
        priceType: 'base',
      },
      {
        photoId: '550e8400-e29b-41d4-a716-446655440002',
        quantity: 2,
        priceType: 'base',
      },
    ],
  },
  public: {
    eventId: '550e8400-e29b-41d4-a716-446655440000',
    contactInfo: {
      name: 'Public Customer',
      email: 'customer@public.com',
      phone: '0987654321',
    },
    items: [
      {
        photoId: '550e8400-e29b-41d4-a716-446655440003',
        quantity: 1,
        priceType: 'base',
      },
    ],
  },
};

/**
 * Test family checkout endpoint
 */
async function testFamilyCheckout() {
  console.log('🔸 Testing Family Checkout API...\n');

  try {
    const response = await fetch(`${BASE_URL}/api/family/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(MOCK_DATA.family),
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('\n✅ Family checkout test PASSED');
      console.log(`Order ID: ${data.orderId}`);
      console.log(`Preference ID: ${data.preferenceId}`);
      console.log(`Total: $${data.total} ${data.currency}`);
      console.log(`Redirect: ${data.redirectUrl}`);
    } else {
      console.log('\n❌ Family checkout test FAILED');
      console.log(`Error: ${data.error}`);
      if (data.details) {
        console.log('Details:', data.details);
      }
    }
  } catch (error) {
    console.log('\n💥 Family checkout test ERROR');
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Test public checkout endpoint
 */
async function testPublicCheckout() {
  console.log('🔸 Testing Public Checkout API...\n');

  try {
    const response = await fetch(`${BASE_URL}/api/gallery/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(MOCK_DATA.public),
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('\n✅ Public checkout test PASSED');
      console.log(`Order ID: ${data.orderId}`);
      console.log(`Preference ID: ${data.preferenceId}`);
      console.log(`Total: $${data.total} ${data.currency}`);
      console.log(`Event: ${data.event.name} - ${data.event.school}`);
      console.log(`Redirect: ${data.redirectUrl}`);
    } else {
      console.log('\n❌ Public checkout test FAILED');
      console.log(`Error: ${data.error}`);
      if (data.details) {
        console.log('Details:', data.details);
      }
    }
  } catch (error) {
    console.log('\n💥 Public checkout test ERROR');
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Test validation errors
 */
async function testValidationErrors() {
  console.log('🔸 Testing Validation Errors...\n');

  // Test 1: Invalid token (too short)
  console.log('Test 1: Invalid token');
  try {
    const response = await fetch(`${BASE_URL}/api/family/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...MOCK_DATA.family,
        token: 'short',
      }),
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(
      `Expected 400, got ${response.status}: ${response.status === 400 ? '✅' : '❌'}`
    );
    console.log(`Error: ${data.error}\n`);
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 2: Empty cart
  console.log('Test 2: Empty cart');
  try {
    const response = await fetch(`${BASE_URL}/api/family/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...MOCK_DATA.family,
        items: [],
      }),
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(
      `Expected 400, got ${response.status}: ${response.status === 400 ? '✅' : '❌'}`
    );
    console.log(`Error: ${data.error}\n`);
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 3: Invalid email
  console.log('Test 3: Invalid email');
  try {
    const response = await fetch(`${BASE_URL}/api/gallery/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...MOCK_DATA.public,
        contactInfo: {
          ...MOCK_DATA.public.contactInfo,
          email: 'invalid-email',
        },
      }),
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(
      `Expected 400, got ${response.status}: ${response.status === 400 ? '✅' : '❌'}`
    );
    console.log(`Error: ${data.error}\n`);
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * Test rate limiting
 */
async function testRateLimit() {
  console.log('🔸 Testing Rate Limiting...\n');

  console.log('Making 6 requests quickly (limit is 5/min)...');

  const requests = [];
  for (let i = 0; i < 6; i++) {
    requests.push(
      fetch(`${BASE_URL}/api/family/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '127.0.0.1', // Simulate same IP
        },
        body: JSON.stringify({
          ...MOCK_DATA.family,
          contactInfo: {
            ...MOCK_DATA.family.contactInfo,
            email: `test${i}@example.com`, // Different emails
          },
        }),
      })
    );
  }

  try {
    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status);

    console.log('Response statuses:', statuses);

    const rateLimited = statuses.filter((status) => status === 429);
    console.log(`Rate limited requests: ${rateLimited.length}`);
    console.log(
      `Expected at least 1 rate limited: ${rateLimited.length > 0 ? '✅' : '❌'}`
    );

    // Check last response
    const lastResponse = responses[responses.length - 1];
    const lastData = await lastResponse.json();

    if (lastResponse.status === 429) {
      console.log('Rate limit headers:');
      console.log(
        `X-RateLimit-Limit: ${lastResponse.headers.get('X-RateLimit-Limit')}`
      );
      console.log(
        `X-RateLimit-Remaining: ${lastResponse.headers.get('X-RateLimit-Remaining')}`
      );
      console.log(
        `X-RateLimit-Reset: ${lastResponse.headers.get('X-RateLimit-Reset')}`
      );
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Health check for webhook endpoint
 */
async function testWebhookHealth() {
  console.log('🔸 Testing Webhook Health...\n');

  try {
    const response = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: 'GET',
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.status === 'ok') {
      console.log('\n✅ Webhook health check PASSED');
    } else {
      console.log('\n❌ Webhook health check FAILED');
    }
  } catch (error) {
    console.log('\n💥 Webhook health check ERROR');
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Main function
 */
async function main() {
  const testType = process.argv[2];

  console.log('🚀 Checkout API Test Suite');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('='.repeat(60) + '\n');

  switch (testType) {
    case 'family':
      await testFamilyCheckout();
      break;

    case 'public':
      await testPublicCheckout();
      break;

    case 'validation':
      await testValidationErrors();
      break;

    case 'ratelimit':
      await testRateLimit();
      break;

    case 'webhook':
      await testWebhookHealth();
      break;

    case 'all':
    default:
      await testFamilyCheckout();
      await testPublicCheckout();
      await testValidationErrors();
      await testRateLimit();
      await testWebhookHealth();
      break;
  }

  console.log('🏁 Test suite completed');
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled promise rejection:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testFamilyCheckout,
  testPublicCheckout,
  testValidationErrors,
  testRateLimit,
  testWebhookHealth,
};
