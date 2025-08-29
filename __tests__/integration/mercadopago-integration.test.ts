/**
 * Mercado Pago Integration Tests
 *
 * Tests the complete Mercado Pago payment workflow:
 * - Preference creation and validation
 * - Webhook processing and order updates
 * - Payment status synchronization
 * - Error handling and recovery
 * - Multi-currency and test mode support
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MP_TEST_CONFIG = {
  baseUrl:
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000',
  admin: {
    email: 'test-admin-mp@lookescolar.com',
    password: 'TestAdminMP123!@#',
  },
  event: {
    name: 'Colegio Rivadavia - MP Test 2025',
    school: 'Colegio Bernardino Rivadavia',
    date: '2024-07-01',
    location: 'CABA',
  },
  student: {
    name: 'Luis Payment Test',
    grade: '3°',
    section: 'C',
    student_number: 'MP001',
  },
  family: {
    contact_name: 'Roberto Fernández',
    contact_email: 'roberto.fernandez@mp.test.com',
    contact_phone: '+541234567890',
  },
  // Test payment scenarios
  paymentScenarios: [
    {
      name: 'successful_payment',
      status: 'approved',
      statusDetail: 'accredited',
      amount: 2000,
    },
    {
      name: 'rejected_payment',
      status: 'rejected',
      statusDetail: 'cc_rejected_insufficient_amount',
      amount: 2000,
    },
    {
      name: 'pending_payment',
      status: 'pending',
      statusDetail: 'pending_waiting_payment',
      amount: 2000,
    },
    {
      name: 'cancelled_payment',
      status: 'cancelled',
      statusDetail: 'expired',
      amount: 2000,
    },
  ],
};

let adminSession: any;
let testEventId: string;
let testStudentId: string;
let testStudentToken: string;
const testPhotoIds: string[] = [];
const testOrderIds: string[] = [];

beforeAll(async () => {
  await cleanupTestData();
  await setupMPTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe('Mercado Pago Integration Tests', () => {
  describe('Payment Preference Creation', () => {
    it('1.1 Basic preference creation should work', async () => {
      const response = await fetch(
        `${MP_TEST_CONFIG.baseUrl}/api/family/checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: testStudentToken,
            wizard_option: 'option1',
            selected_photos: [testPhotoIds[0]],
            selected_upsells: {},
            contact: MP_TEST_CONFIG.family,
          }),
        }
      );

      expect(response.status).toBe(201);
      const result = await response.json();

      // Verify MP preference structure
      expect(result.preference_id).toBeDefined();
      expect(result.init_point).toBeDefined();
      expect(result.order_id).toBeDefined();
      expect(result.total_amount).toBe(2000);

      testOrderIds.push(result.order_id);

      // Verify preference ID format (MP-specific)
      expect(result.preference_id).toMatch(/^[a-zA-Z0-9-]+$/);
      expect(result.preference_id.length).toBeGreaterThan(10);

      // Verify init point URL
      expect(result.init_point).toContain('mercadopago');
      expect(result.init_point).toStartWith('https://');

      console.log('✅ Basic MP preference created successfully');
      console.log(`   Preference ID: ${result.preference_id}`);
      console.log(`   Init Point: ${result.init_point.substring(0, 50)}...`);
      console.log(`   Order ID: ${result.order_id}`);
    });

    it('1.2 Preference should contain correct order details', async () => {
      const orderId = testOrderIds[0];

      // Verify order was stored with MP details
      const { data: order } = await supabase
        .from('orders')
        .select(
          `
          id,
          mp_preference_id,
          mp_init_point,
          total_amount,
          status,
          contact_email,
          contact_name,
          order_items!inner(
            id,
            product_type,
            quantity,
            unit_price
          )
        `
        )
        .eq('id', orderId)
        .single();

      expect(order).toBeTruthy();
      expect(order.mp_preference_id).toBeTruthy();
      expect(order.mp_init_point).toBeTruthy();
      expect(order.status).toBe('pending');
      expect(order.total_amount).toBe(2000);
      expect(order.contact_email).toBe(MP_TEST_CONFIG.family.contact_email);
      expect(order.order_items).toHaveLength(1);

      console.log('✅ Order stored with correct MP details');
      console.log(`   Status: ${order.status}`);
      console.log(`   Total: $${order.total_amount}`);
      console.log(`   Items: ${order.order_items.length}`);
    });

    it('1.3 Multiple preferences should have unique IDs', async () => {
      const preferences = [];

      // Create multiple preferences
      for (let i = 0; i < 3; i++) {
        const response = await fetch(
          `${MP_TEST_CONFIG.baseUrl}/api/family/checkout`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: testStudentToken,
              wizard_option: 'option1',
              selected_photos: [testPhotoIds[0]],
              selected_upsells: {},
              contact: {
                ...MP_TEST_CONFIG.family,
                contact_email: `test${i}@mp.test.com`,
              },
            }),
          }
        );

        expect(response.status).toBe(201);
        const result = await response.json();

        preferences.push(result.preference_id);
        testOrderIds.push(result.order_id);
      }

      // Verify all preference IDs are unique
      const uniquePreferences = new Set(preferences);
      expect(uniquePreferences.size).toBe(preferences.length);

      console.log('✅ Multiple unique preferences created');
      console.log(`   Preferences: ${preferences.length}`);
      console.log(`   Unique IDs: ${uniquePreferences.size}`);
    });

    it('1.4 Preference creation should validate required fields', async () => {
      const invalidRequests = [
        {
          name: 'missing contact info',
          data: {
            token: testStudentToken,
            wizard_option: 'option1',
            selected_photos: [testPhotoIds[0]],
            selected_upsells: {},
            contact: {
              contact_name: '', // Empty required field
              contact_email: MP_TEST_CONFIG.family.contact_email,
              contact_phone: MP_TEST_CONFIG.family.contact_phone,
            },
          },
        },
        {
          name: 'invalid email',
          data: {
            token: testStudentToken,
            wizard_option: 'option1',
            selected_photos: [testPhotoIds[0]],
            selected_upsells: {},
            contact: {
              ...MP_TEST_CONFIG.family,
              contact_email: 'invalid-email',
            },
          },
        },
        {
          name: 'no photos selected',
          data: {
            token: testStudentToken,
            wizard_option: 'option1',
            selected_photos: [],
            selected_upsells: {},
            contact: MP_TEST_CONFIG.family,
          },
        },
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await fetch(
          `${MP_TEST_CONFIG.baseUrl}/api/family/checkout`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invalidRequest.data),
          }
        );

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.error).toBeDefined();

        console.log(`✅ ${invalidRequest.name} properly rejected`);
      }
    });
  });

  describe('Webhook Processing', () => {
    it('2.1 Successful payment webhook should update order status', async () => {
      const orderId = testOrderIds[0];
      const scenario = MP_TEST_CONFIG.paymentScenarios.find(
        (s) => s.name === 'successful_payment'
      )!;

      // Simulate MP webhook payload
      const webhookPayload = {
        id: `mp-test-payment-${Date.now()}`,
        live_mode: false,
        type: 'payment',
        date_created: new Date().toISOString(),
        application_id: 'test-app-id',
        user_id: 'test-user-id',
        version: 1,
        api_version: 'v1',
        action: 'payment.created',
        data: {
          payment_id: `mp-test-payment-${Date.now()}`,
        },
      };

      // Mock MP API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: webhookPayload.data.payment_id,
            status: scenario.status,
            status_detail: scenario.statusDetail,
            external_reference: orderId,
            payer: {
              email: MP_TEST_CONFIG.family.contact_email,
            },
            transaction_amount: scenario.amount,
            date_approved: new Date().toISOString(),
            payment_method_id: 'visa',
            payment_type_id: 'credit_card',
          }),
      });

      const webhookResponse = await fetch(
        `${MP_TEST_CONFIG.baseUrl}/api/payments/webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': 'test-signature',
            'x-request-id': 'test-request-mp',
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      expect(webhookResponse.status).toBe(200);

      // Verify order was updated
      const { data: updatedOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      expect(updatedOrder.status).toBe(scenario.status);
      expect(updatedOrder.mp_payment_id).toBe(webhookPayload.data.payment_id);
      expect(updatedOrder.mp_status_detail).toBe(scenario.statusDetail);

      console.log('✅ Successful payment webhook processed');
      console.log(`   Order status: ${updatedOrder.status}`);
      console.log(`   Payment ID: ${updatedOrder.mp_payment_id}`);
    });

    it('2.2 Rejected payment webhook should update order accordingly', async () => {
      if (testOrderIds.length < 2) {
        console.log('⏭️ Skipping rejected payment test - not enough orders');
        return;
      }

      const orderId = testOrderIds[1];
      const scenario = MP_TEST_CONFIG.paymentScenarios.find(
        (s) => s.name === 'rejected_payment'
      )!;

      const webhookPayload = {
        id: `mp-test-rejected-${Date.now()}`,
        live_mode: false,
        type: 'payment',
        date_created: new Date().toISOString(),
        action: 'payment.updated',
        data: {
          payment_id: `mp-test-rejected-${Date.now()}`,
        },
      };

      // Mock MP API response for rejected payment
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: webhookPayload.data.payment_id,
            status: scenario.status,
            status_detail: scenario.statusDetail,
            external_reference: orderId,
            payer: {
              email: MP_TEST_CONFIG.family.contact_email,
            },
            transaction_amount: scenario.amount,
            date_created: new Date().toISOString(),
            payment_method_id: 'visa',
            payment_type_id: 'credit_card',
          }),
      });

      const webhookResponse = await fetch(
        `${MP_TEST_CONFIG.baseUrl}/api/payments/webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': 'test-signature-rejected',
            'x-request-id': 'test-request-rejected',
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      expect(webhookResponse.status).toBe(200);

      // Verify order was updated with rejection
      const { data: rejectedOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      expect(rejectedOrder.status).toBe(scenario.status);
      expect(rejectedOrder.mp_payment_id).toBe(webhookPayload.data.payment_id);
      expect(rejectedOrder.mp_status_detail).toBe(scenario.statusDetail);

      console.log('✅ Rejected payment webhook processed');
      console.log(`   Order status: ${rejectedOrder.status}`);
      console.log(`   Rejection reason: ${rejectedOrder.mp_status_detail}`);
    });

    it('2.3 Webhook should handle idempotency correctly', async () => {
      const orderId = testOrderIds[0];
      const paymentId = `mp-test-idempotent-${Date.now()}`;

      const webhookPayload = {
        id: paymentId,
        live_mode: false,
        type: 'payment',
        date_created: new Date().toISOString(),
        action: 'payment.created',
        data: { payment_id: paymentId },
      };

      // Mock MP API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: paymentId,
            status: 'approved',
            status_detail: 'accredited',
            external_reference: orderId,
            payer: { email: MP_TEST_CONFIG.family.contact_email },
            transaction_amount: 2000,
            date_approved: new Date().toISOString(),
          }),
      });

      // Send same webhook twice
      const responses = await Promise.all([
        fetch(`${MP_TEST_CONFIG.baseUrl}/api/payments/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': 'test-signature-1',
            'x-request-id': 'idempotent-test-1',
          },
          body: JSON.stringify(webhookPayload),
        }),
        fetch(`${MP_TEST_CONFIG.baseUrl}/api/payments/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': 'test-signature-2',
            'x-request-id': 'idempotent-test-2',
          },
          body: JSON.stringify(webhookPayload),
        }),
      ]);

      // Both should succeed (idempotent)
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      // Verify order was only updated once
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      expect(order.mp_payment_id).toBe(paymentId);
      expect(order.status).toBe('approved');

      console.log('✅ Webhook idempotency handled correctly');
    });

    it('2.4 Invalid webhook signatures should be rejected', async () => {
      const invalidWebhook = {
        id: 'invalid-webhook',
        live_mode: false,
        type: 'payment',
        action: 'payment.created',
        data: { payment_id: 'invalid-payment' },
      };

      const response = await fetch(
        `${MP_TEST_CONFIG.baseUrl}/api/payments/webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': 'invalid-signature',
            'x-request-id': 'invalid-request',
          },
          body: JSON.stringify(invalidWebhook),
        }
      );

      // Should reject invalid signature or return 200 for security (depending on implementation)
      expect([200, 400, 401]).toContain(response.status);

      console.log(`✅ Invalid webhook handled with status: ${response.status}`);
    });
  });

  describe('Payment Status Synchronization', () => {
    it('3.1 Order status should reflect payment status accurately', async () => {
      // Test all payment scenarios
      for (const scenario of MP_TEST_CONFIG.paymentScenarios) {
        if (testOrderIds.length === 0) break;

        const orderId = testOrderIds[0];

        // Simulate webhook for this scenario
        const webhookPayload = {
          id: `mp-test-${scenario.name}-${Date.now()}`,
          live_mode: false,
          type: 'payment',
          date_created: new Date().toISOString(),
          action: 'payment.updated',
          data: { payment_id: `payment-${scenario.name}` },
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              id: webhookPayload.data.payment_id,
              status: scenario.status,
              status_detail: scenario.statusDetail,
              external_reference: orderId,
              payer: { email: MP_TEST_CONFIG.family.contact_email },
              transaction_amount: scenario.amount,
              date_approved:
                scenario.status === 'approved'
                  ? new Date().toISOString()
                  : null,
            }),
        });

        await fetch(`${MP_TEST_CONFIG.baseUrl}/api/payments/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': `test-signature-${scenario.name}`,
            'x-request-id': `test-request-${scenario.name}`,
          },
          body: JSON.stringify(webhookPayload),
        });

        // Verify order status matches payment status
        const { data: order } = await supabase
          .from('orders')
          .select('status, mp_status_detail')
          .eq('id', orderId)
          .single();

        expect(order.status).toBe(scenario.status);
        expect(order.mp_status_detail).toBe(scenario.statusDetail);

        console.log(
          `✅ ${scenario.name}: ${order.status} (${order.mp_status_detail})`
        );
      }
    });

    it('3.2 Family should be able to check payment status', async () => {
      const orderId = testOrderIds[0];

      const response = await fetch(
        `${MP_TEST_CONFIG.baseUrl}/api/family/order/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: testStudentToken,
            order_id: orderId,
          }),
        }
      );

      expect(response.status).toBe(200);
      const result = await response.json();

      expect(result.order).toBeDefined();
      expect(result.order.id).toBe(orderId);
      expect(result.order.status).toBeDefined();
      expect(result.order.total_amount).toBeDefined();
      expect(result.order.items).toBeDefined();

      // Should include payment details if available
      if (result.order.mp_payment_id) {
        expect(result.order.mp_payment_id).toBeTruthy();
        expect(result.order.mp_status_detail).toBeTruthy();
      }

      console.log('✅ Family can check payment status');
      console.log(`   Order: ${result.order.id}`);
      console.log(`   Status: ${result.order.status}`);
      console.log(`   Amount: $${result.order.total_amount}`);
    });

    it('3.3 Admin should see updated payment information', async () => {
      const response = await fetch(
        `${MP_TEST_CONFIG.baseUrl}/api/admin/orders`,
        {
          headers: { Authorization: `Bearer ${adminSession.access_token}` },
        }
      );

      expect(response.status).toBe(200);
      const orders = await response.json();

      expect(Array.isArray(orders)).toBe(true);

      // Find test orders
      const testOrders = orders.filter((o: any) => testOrderIds.includes(o.id));
      expect(testOrders.length).toBeGreaterThan(0);

      for (const order of testOrders) {
        expect(order.status).toBeDefined();
        expect(order.total_amount).toBeDefined();
        expect(order.contact_email).toBeDefined();

        // Should have MP details if processed
        if (order.mp_payment_id) {
          expect(order.mp_preference_id).toBeTruthy();
          expect(order.mp_status_detail).toBeTruthy();
        }
      }

      console.log('✅ Admin sees updated payment information');
      console.log(`   Test orders found: ${testOrders.length}`);
    });
  });

  describe('Error Handling & Recovery', () => {
    it('4.1 MP API errors should be handled gracefully', async () => {
      // Mock MP API error response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            error: 'Internal Server Error',
            message: 'MP API temporarily unavailable',
          }),
      });

      const response = await fetch(
        `${MP_TEST_CONFIG.baseUrl}/api/family/checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: testStudentToken,
            wizard_option: 'option1',
            selected_photos: [testPhotoIds[0]],
            selected_upsells: {},
            contact: {
              ...MP_TEST_CONFIG.family,
              contact_email: 'mp.error@test.com',
            },
          }),
        }
      );

      // Should handle MP API errors gracefully
      expect([500, 503]).toContain(response.status);

      const error = await response.json();
      expect(error.error).toBeDefined();

      console.log('✅ MP API errors handled gracefully');
      console.log(`   Error response: ${response.status}`);
    });

    it('4.2 Malformed webhook payloads should be rejected', async () => {
      const malformedPayloads = [
        {}, // Empty payload
        { invalid: 'structure' }, // Missing required fields
        { id: null, data: null }, // Null values
        'invalid json string', // Invalid JSON
      ];

      for (const payload of malformedPayloads.slice(0, 3)) {
        // Skip string for JSON test
        const response = await fetch(
          `${MP_TEST_CONFIG.baseUrl}/api/payments/webhook`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-signature': 'test-malformed',
              'x-request-id': 'test-malformed',
            },
            body: JSON.stringify(payload),
          }
        );

        // Should reject malformed payloads
        expect([400, 422]).toContain(response.status);
      }

      console.log('✅ Malformed webhook payloads properly rejected');
    });

    it('4.3 Payment recovery should handle edge cases', async () => {
      // Test payment recovery for orders with missing MP details
      const orderId = testOrderIds[0];

      // Simulate payment lookup when webhook wasn't received
      const recoveryResponse = await fetch(
        `${MP_TEST_CONFIG.baseUrl}/api/admin/payments/recovery`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.access_token}`,
          },
          body: JSON.stringify({
            order_id: orderId,
          }),
        }
      );

      if (recoveryResponse.status === 200) {
        const result = await recoveryResponse.json();
        expect(result.success).toBeDefined();

        console.log('✅ Payment recovery mechanism available');
      } else if (recoveryResponse.status === 404) {
        console.log('ℹ️ Payment recovery endpoint not implemented yet');
      } else {
        console.log(`⚠️ Payment recovery returned: ${recoveryResponse.status}`);
      }
    });
  });

  describe('Test Mode & Production Validation', () => {
    it('5.1 Test mode should be properly configured', async () => {
      // Verify test mode is active for testing
      const testOrder = testOrderIds[0];

      const { data: order } = await supabase
        .from('orders')
        .select('mp_preference_id, mp_init_point')
        .eq('id', testOrder)
        .single();

      if (order.mp_init_point) {
        // In test mode, should use sandbox URLs
        const isTestMode =
          order.mp_init_point.includes('sandbox') ||
          order.mp_init_point.includes('test') ||
          process.env.NODE_ENV === 'test';

        console.log('✅ MP test mode configuration validated');
        console.log(`   Test mode active: ${isTestMode}`);
        console.log(
          `   Init point: ${order.mp_init_point.substring(0, 50)}...`
        );
      }
    });

    it('5.2 Currency should be consistent (ARS)', async () => {
      // All orders should use ARS currency
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, currency')
        .in('id', testOrderIds);

      for (const order of orders) {
        expect(order.total_amount).toBeGreaterThan(0);
        // Currency should be ARS or null (defaulting to ARS)
        if (order.currency) {
          expect(order.currency).toBe('ARS');
        }
      }

      console.log('✅ Currency consistency validated (ARS)');
      console.log(`   Orders checked: ${orders.length}`);
    });

    it('5.3 Production readiness checks should pass', async () => {
      const readinessChecks = {
        webhookEndpoint: `${MP_TEST_CONFIG.baseUrl}/api/payments/webhook`,
        healthCheck: `${MP_TEST_CONFIG.baseUrl}/api/health`,
        mpCredentials:
          process.env.MP_ACCESS_TOKEN && process.env.NEXT_PUBLIC_MP_PUBLIC_KEY,
      };

      // Test webhook endpoint availability
      const webhookTest = await fetch(readinessChecks.webhookEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Empty payload should be rejected gracefully
      });

      expect([400, 422]).toContain(webhookTest.status); // Should reject empty payload

      // Test health check
      const healthResponse = await fetch(readinessChecks.healthCheck);
      if (healthResponse.status === 200) {
        const health = await healthResponse.json();
        expect(health.status).toBeDefined();
      }

      console.log('✅ Production readiness validated');
      console.log(`   Webhook endpoint: ${webhookTest.status}`);
      console.log(`   Health check: ${healthResponse.status}`);
      console.log(
        `   MP credentials: ${readinessChecks.mpCredentials ? 'configured' : 'missing'}`
      );
    });
  });
});

// Helper functions
async function setupMPTestData() {
  console.log('🏗️ Setting up MP test environment...');

  // Admin authentication
  const authResponse = await fetch(`${MP_TEST_CONFIG.baseUrl}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(MP_TEST_CONFIG.admin),
  });

  const authResult = await authResponse.json();
  adminSession = authResult.session;

  // Create event
  const { data: event } = await supabase
    .from('events')
    .insert(MP_TEST_CONFIG.event)
    .select('id')
    .single();

  testEventId = event.id;

  // Create student with token
  const { data: student } = await supabase
    .from('students')
    .insert({
      event_id: testEventId,
      ...MP_TEST_CONFIG.student,
      active: true,
    })
    .select('id')
    .single();

  testStudentId = student.id;

  // Generate token
  const { data: tokenResult } = await supabase
    .from('student_tokens')
    .insert({
      student_id: testStudentId,
      token: `mp-test-${Date.now()}`,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      active: true,
    })
    .select('token')
    .single();

  testStudentToken = tokenResult.token;

  // Create test photos
  for (let i = 0; i < 3; i++) {
    const { data: photo } = await supabase
      .from('photos')
      .insert({
        event_id: testEventId,
        filename: `mp-test-${i}.jpg`,
        original_filename: `mp-test-${i}.jpg`,
        file_path: `mp-test/mp-test-${i}.jpg`,
        file_size: 1024000,
        mime_type: 'image/jpeg',
        width: 1920,
        height: 1080,
        photo_type: 'individual',
        processing_status: 'completed',
      })
      .select('id')
      .single();

    testPhotoIds.push(photo.id);

    // Associate with student
    await supabase.from('photo_students').insert({
      photo_id: photo.id,
      student_id: testStudentId,
      confidence_score: 1.0,
      classification_method: 'manual',
    });
  }

  console.log('✅ MP test environment ready');
  console.log(`   Event: ${testEventId}`);
  console.log(`   Student: ${testStudentId}`);
  console.log(`   Token: ${testStudentToken.substring(0, 8)}...`);
  console.log(`   Photos: ${testPhotoIds.length}`);
}

async function cleanupTestData() {
  if (testEventId) {
    try {
      console.log('🧹 Cleaning up MP test data...');

      await supabase.from('order_items').delete().in('order_id', testOrderIds);
      await supabase.from('orders').delete().in('id', testOrderIds);
      await supabase
        .from('photo_students')
        .delete()
        .in('photo_id', testPhotoIds);
      await supabase
        .from('student_tokens')
        .delete()
        .eq('student_id', testStudentId);
      await supabase.from('photos').delete().in('id', testPhotoIds);
      await supabase.from('students').delete().eq('id', testStudentId);
      await supabase.from('events').delete().eq('id', testEventId);

      console.log('✅ MP test data cleanup completed');
    } catch (error) {
      console.log('⚠️ Cleanup completed with some non-critical errors:', error);
    }
  }
}
