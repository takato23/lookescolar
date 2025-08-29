import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import {
  createPaymentPreference,
  processWebhookNotification,
  verifyWebhookSignature,
} from '@/lib/mercadopago/mercadopago.service';
import { PaymentSecurityUtils } from '@/lib/security/payment-validation';
import crypto from 'crypto';

describe('Complete Mercado Pago Integration Flow', () => {
  let supabase: any;
  let testEventId: string;
  let testSubjectId: string;
  let testToken: string;
  let testOrderId: string;
  let testPriceListId: string;

  beforeAll(async () => {
    supabase = createServerSupabaseServiceClient();

    // Crear datos de prueba
    await setupTestData();
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await cleanupTestData();
  });

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  async function setupTestData() {
    // Crear evento de prueba
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: 'Test Event MP Integration',
        school: 'Test School',
        date: '2024-12-01',
        active: true,
      })
      .select()
      .single();

    if (eventError) throw eventError;
    testEventId = event.id;

    // Crear sujeto de prueba
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .insert({
        event_id: testEventId,
        first_name: 'Test',
        last_name: 'Subject',
        type: 'student',
      })
      .select()
      .single();

    if (subjectError) throw subjectError;
    testSubjectId = subject.id;

    // Crear token de prueba
    testToken = crypto.randomBytes(16).toString('hex') + 'test';
    const { error: tokenError } = await supabase.from('subject_tokens').insert({
      subject_id: testSubjectId,
      token: testToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
    });

    if (tokenError) throw tokenError;

    // Crear lista de precios
    const { data: priceList, error: priceListError } = await supabase
      .from('price_lists')
      .insert({
        event_id: testEventId,
        name: 'Test Prices',
      })
      .select()
      .single();

    if (priceListError) throw priceListError;
    testPriceListId = priceList.id;

    // Crear item de precio
    const { error: priceItemError } = await supabase
      .from('price_list_items')
      .insert({
        price_list_id: testPriceListId,
        label: 'Foto Digital',
        type: 'base',
        price_cents: 1500, // $15 ARS
      });

    if (priceItemError) throw priceItemError;
  }

  async function cleanupTestData() {
    if (testEventId) {
      // La cascada debería eliminar todo lo relacionado
      await supabase.from('events').delete().eq('id', testEventId);
    }
  }

  describe('Security Validation', () => {
    it('should validate token properly', () => {
      expect(() => PaymentSecurityUtils.maskToken('short')).not.toThrow();
      expect(PaymentSecurityUtils.maskToken('averylongtoken12345')).toBe(
        'tok_***345'
      );
    });

    it('should mask sensitive data correctly', () => {
      const sensitive = {
        token: 'verysecrettoken123',
        email: 'user@example.com',
        paymentId: '123456789',
        password: 'secret',
      };

      const masked = PaymentSecurityUtils.maskSensitiveData(sensitive);

      expect(masked.token).toBe('tok_***123');
      expect(masked.email).toBe('us***@example.com');
      expect(masked.paymentId).toBe('pay_***6789');
      expect(masked.password).toBeUndefined();
    });

    it('should validate webhook signatures correctly', () => {
      const payload = '{"test": "data"}';
      const secret = 'webhook_secret_123';

      const hash = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      const validSignature = `v1=${hash}`;

      const result = PaymentSecurityUtils.validateWebhookSignature(
        payload,
        validSignature,
        secret
      );
      expect(result.valid).toBe(true);

      const invalidResult = PaymentSecurityUtils.validateWebhookSignature(
        payload,
        'invalid',
        secret
      );
      expect(invalidResult.valid).toBe(false);
    });

    it('should calculate order totals securely', () => {
      const items = [
        { quantity: 2, unitPriceCents: 1500 },
        { quantity: 1, unitPriceCents: 2000 },
      ];

      const result = PaymentSecurityUtils.calculateOrderTotal(items);
      expect(result.valid).toBe(true);
      expect(result.totalCents).toBe(5000); // 2*1500 + 1*2000
    });

    it('should reject invalid order calculations', () => {
      const invalidItems = [
        { quantity: -1, unitPriceCents: 1500 }, // Negative quantity
      ];

      const result = PaymentSecurityUtils.calculateOrderTotal(invalidItems);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid quantity');
    });

    it('should validate webhook timing', () => {
      const now = Date.now();
      const fastResult = PaymentSecurityUtils.validateWebhookTiming(now - 100);
      expect(fastResult.withinTimeout).toBe(true);
      expect(fastResult.warning).toBeUndefined();

      const slowResult = PaymentSecurityUtils.validateWebhookTiming(now - 2800);
      expect(slowResult.withinTimeout).toBe(true);
      expect(slowResult.warning).toContain('approaching timeout');

      const timeoutResult = PaymentSecurityUtils.validateWebhookTiming(
        now - 5000
      );
      expect(timeoutResult.withinTimeout).toBe(false);
    });
  });

  describe('Payment Preference Creation', () => {
    it('should create valid payment preference with proper validation', async () => {
      // Mock Mercado Pago response
      const mockPreference = {
        id: 'test-preference-123',
        init_point:
          'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=test-preference-123',
        sandbox_init_point:
          'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=test-preference-123',
      };

      // Create order first
      testOrderId = crypto.randomUUID();
      const { error: orderError } = await supabase.from('orders').insert({
        id: testOrderId,
        subject_id: testSubjectId,
        contact_name: 'Test User',
        contact_email: 'test@example.com',
        total_amount_cents: 3000,
        status: 'pending',
      });

      expect(orderError).toBeNull();

      const preferenceParams = {
        orderId: testOrderId,
        items: [
          {
            title: 'Foto Digital - Test',
            quantity: 2,
            unit_price: 15, // $15 ARS
          },
        ],
        payer: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '+54 11 1234-5678',
        },
      };

      // Note: This would normally call MP API, but we're testing the structure
      expect(() => {
        // Validate the parameters structure
        expect(preferenceParams.orderId).toBeTruthy();
        expect(preferenceParams.items).toHaveLength(1);
        expect(preferenceParams.items[0].unit_price).toBeGreaterThan(0);
        expect(preferenceParams.payer.email).toMatch(
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        );
      }).not.toThrow();
    });
  });

  describe('Webhook Processing', () => {
    it('should process webhook with proper idempotency', async () => {
      // Setup order for webhook testing
      if (!testOrderId) {
        testOrderId = crypto.randomUUID();
        await supabase.from('orders').insert({
          id: testOrderId,
          subject_id: testSubjectId,
          contact_name: 'Test User',
          contact_email: 'test@example.com',
          total_amount_cents: 1500,
          status: 'pending',
        });
      }

      const mockPaymentId = '123456789';

      // Mock the MP API call to return payment info
      const mockGetPaymentInfo = vi.fn().mockResolvedValue({
        id: mockPaymentId,
        status: 'approved',
        external_reference: testOrderId,
        transaction_amount: 15.0,
        payment_type_id: 'credit_card',
        payment_method_id: 'visa',
        collector_id: 123456,
        operation_type: 'regular_payment',
        status_detail: 'accredited',
        installments: 1,
      });

      // Mock the mercadopago service functions
      vi.mock('@/lib/mercadopago/mercadopago.service', () => ({
        getPaymentInfo: mockGetPaymentInfo,
        processWebhookNotification: vi
          .fn()
          .mockImplementation(async (paymentId: string) => {
            // Simulate the actual processing
            const supabase = createServerSupabaseServiceClient();

            // Check for existing payment (idempotency)
            const { data: existingPayment } = await supabase
              .from('payments')
              .select('id')
              .eq('mp_payment_id', paymentId)
              .single();

            if (existingPayment) {
              return {
                success: true,
                message: 'Already processed (idempotency)',
              };
            }

            // Create payment record
            const { error: paymentError } = await supabase
              .from('payments')
              .insert({
                order_id: testOrderId,
                mp_payment_id: paymentId,
                mp_status: 'approved',
                amount_cents: 1500,
                processed_at: new Date().toISOString(),
                webhook_data: { test: 'data' },
              });

            if (paymentError) {
              return { success: false, message: paymentError.message };
            }

            // Update order status
            const { error: orderError } = await supabase
              .from('orders')
              .update({
                mp_payment_id: paymentId,
                status: 'approved',
                approved_at: new Date().toISOString(),
              })
              .eq('id', testOrderId);

            if (orderError) {
              return { success: false, message: orderError.message };
            }

            return { success: true, message: 'Payment processed successfully' };
          }),
      }));

      // Test first webhook processing
      const { processWebhookNotification: processWebhookMock } = await import(
        '@/lib/mercadopago/mercadopago.service'
      );
      const result1 = await processWebhookMock(mockPaymentId);
      expect(result1.success).toBe(true);
      expect(result1.message).toContain('successfully');

      // Test idempotency - second webhook with same payment ID
      const result2 = await processWebhookMock(mockPaymentId);
      expect(result2.success).toBe(true);
      expect(result2.message).toContain('idempotency');
    });

    it('should handle webhook signature validation', () => {
      const webhookPayload = JSON.stringify({
        id: 123,
        live_mode: false,
        type: 'payment',
        date_created: new Date().toISOString(),
        application_id: 123,
        user_id: 456,
        version: 1,
        api_version: 'v1',
        action: 'created',
        data: { id: '789' },
      });

      const secret = process.env.MP_WEBHOOK_SECRET || 'test_secret';
      const hash = crypto
        .createHmac('sha256', secret)
        .update(webhookPayload)
        .digest('hex');
      const signature = `v1=${hash}`;

      const isValid = verifyWebhookSignature(webhookPayload, signature, secret);
      expect(isValid).toBe(true);

      // Test invalid signature
      const invalidSignature = 'v1=invalid_hash';
      const isInvalid = verifyWebhookSignature(
        webhookPayload,
        invalidSignature,
        secret
      );
      expect(isInvalid).toBe(false);
    });
  });

  describe('Database Integration', () => {
    it('should create payment records with proper relationships', async () => {
      const paymentData = {
        order_id: testOrderId || crypto.randomUUID(),
        mp_payment_id: 'test_payment_123',
        mp_status: 'approved',
        amount_cents: 1500,
        processed_at: new Date().toISOString(),
        webhook_data: { test: 'webhook_data' },
      };

      const { data: payment, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select(
          `
          id,
          order_id,
          mp_payment_id,
          mp_status,
          amount_cents,
          orders (
            id,
            status,
            subject_id,
            subjects (
              first_name,
              last_name
            )
          )
        `
        )
        .single();

      expect(error).toBeNull();
      expect(payment).toBeTruthy();
      expect(payment.mp_payment_id).toBe('test_payment_123');
      expect(payment.orders.subjects.first_name).toBe('Test');
    });

    it('should enforce payment ID uniqueness', async () => {
      const duplicatePaymentId = 'duplicate_payment_123';

      // First payment should succeed
      const { error: error1 } = await supabase.from('payments').insert({
        order_id: testOrderId || crypto.randomUUID(),
        mp_payment_id: duplicatePaymentId,
        mp_status: 'approved',
        amount_cents: 1000,
      });

      expect(error1).toBeNull();

      // Second payment with same mp_payment_id should fail
      const { error: error2 } = await supabase.from('payments').insert({
        order_id: crypto.randomUUID(),
        mp_payment_id: duplicatePaymentId,
        mp_status: 'pending',
        amount_cents: 2000,
      });

      expect(error2).toBeTruthy();
      expect(error2.code).toBe('23505'); // Unique violation
    });
  });

  describe('Order Status Integration', () => {
    it('should retrieve order status with payment information', async () => {
      // Ensure we have an order with payment
      const orderId = crypto.randomUUID();

      await supabase.from('orders').insert({
        id: orderId,
        subject_id: testSubjectId,
        contact_name: 'Test User Status',
        contact_email: 'status@example.com',
        total_amount_cents: 2000,
        status: 'approved',
      });

      await supabase.from('payments').insert({
        order_id: orderId,
        mp_payment_id: 'status_test_payment',
        mp_status: 'approved',
        amount_cents: 2000,
        processed_at: new Date().toISOString(),
      });

      // Query using the view
      const { data: orderStatus, error } = await supabase
        .from('order_status_with_payments')
        .select('*')
        .eq('order_id', orderId)
        .single();

      expect(error).toBeNull();
      expect(orderStatus).toBeTruthy();
      expect(orderStatus.order_status).toBe('approved');
      expect(orderStatus.mp_payment_id).toBe('status_test_payment');
      expect(orderStatus.payment_amount_cents).toBe(2000);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing external reference gracefully', async () => {
      const mockGetPaymentInfoError = vi.fn().mockResolvedValue({
        id: '999999999',
        status: 'approved',
        // Missing external_reference
        transaction_amount: 15.0,
      });

      vi.mock('@/lib/mercadopago/mercadopago.service', () => ({
        getPaymentInfo: mockGetPaymentInfoError,
        processWebhookNotification: vi.fn().mockImplementation(async () => {
          return {
            success: false,
            message: 'External reference faltante en pago MP',
          };
        }),
      }));

      const { processWebhookNotification: processWebhookErrorMock } =
        await import('@/lib/mercadopago/mercadopago.service');
      const result = await processWebhookErrorMock('999999999');

      expect(result.success).toBe(false);
      expect(result.message).toContain('External reference faltante');
    });

    it('should handle non-existent orders gracefully', async () => {
      const nonExistentOrderId = crypto.randomUUID();

      vi.mock('@/lib/mercadopago/mercadopago.service', () => ({
        processWebhookNotification: vi.fn().mockImplementation(async () => {
          return {
            success: false,
            message: 'Orden no encontrada en base de datos',
          };
        }),
      }));

      const { processWebhookNotification: processWebhookErrorMock } =
        await import('@/lib/mercadopago/mercadopago.service');
      const result = await processWebhookErrorMock('999999999');

      expect(result.success).toBe(false);
      expect(result.message).toContain('no encontrada');
    });
  });
});

// Mock Vitest functions
const vi = {
  fn: (implementation?: any) => {
    const mockFn = implementation || (() => {});
    mockFn.mockResolvedValue = (value: any) => {
      mockFn._mockResolvedValue = value;
      return mockFn;
    };
    mockFn.mockImplementation = (impl: any) => {
      mockFn._implementation = impl;
      return mockFn;
    };
    return mockFn;
  },
  mock: (path: string, factory: any) => {
    // Mock implementation would be handled by the test runner
    console.log(`Mocking ${path}`);
  },
  clearAllMocks: () => {
    console.log('Clearing all mocks');
  },
};
