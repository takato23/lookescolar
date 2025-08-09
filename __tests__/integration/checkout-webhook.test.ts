import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { POST as FamilyCheckout } from '@/app/api/family/checkout/route';
import { POST as PublicCheckout } from '@/app/api/gallery/checkout/route';
import { POST as WebhookHandler } from '@/app/api/payments/webhook/route';
import { 
  createTestClient, 
  setupTestData, 
  setupPublicTestData, 
  cleanupTestData,
  setupMocks 
} from '../test-utils';
import crypto from 'crypto';

describe('Checkout → Webhook Integration', () => {
  let testData: any;
  let publicData: any;
  let mocks: any;

  beforeEach(async () => {
    mocks = setupMocks();
    testData = await setupTestData();
    publicData = await setupPublicTestData(testData.eventId);
  });

  afterEach(async () => {
    await cleanupTestData({ ...testData, ...publicData });
  });

  describe('Family Checkout → Webhook Flow', () => {
    it('should create family order and process webhook successfully', async () => {
      const supabase = createTestClient();
      
      // Step 1: Create family checkout
      const checkoutReq = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          token: testData.validToken,
          contactInfo: {
            name: 'Test Parent',
            email: 'parent@test.com',
            phone: '1234567890'
          },
          items: [
            {
              photoId: testData.photoIds[0],
              quantity: 2,
              priceType: 'base'
            }
          ]
        }
      });

      const checkoutResponse = await FamilyCheckout(checkoutReq.req);
      const checkoutData = await checkoutResponse.json();

      expect(checkoutResponse.status).toBe(200);
      expect(checkoutData.success).toBe(true);

      const orderId = checkoutData.orderId;
      const preferenceId = checkoutData.preferenceId;

      // Verify order was created
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      expect(order).toBeTruthy();
      expect(order.subject_id).toBe(testData.subjectId);
      expect(order.status).toBe('pending');
      expect(order.mp_preference_id).toBe(preferenceId);
      expect(order.is_public_order).toBe(false);
      expect(order.created_by).toBe('family_checkout');

      // Step 2: Simulate Mercado Pago webhook
      const mockPaymentId = 'mock-payment-123456';
      const webhookBody = {
        id: 1,
        live_mode: false,
        type: 'payment',
        date_created: new Date().toISOString(),
        application_id: 12345,
        user_id: 67890,
        version: 1,
        api_version: 'v1',
        action: 'payment.updated',
        data: {
          id: mockPaymentId
        }
      };

      const webhookBodyStr = JSON.stringify(webhookBody);
      const signature = createWebhookSignature(webhookBodyStr, 'test-webhook-secret');

      const webhookReq = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-signature': signature,
          'x-request-id': crypto.randomUUID()
        },
        body: webhookBodyStr
      });

      // Mock the payment info response
      mocks.mockMP.getPaymentInfo = vi.fn().mockResolvedValue({
        id: mockPaymentId,
        status: 'approved',
        external_reference: orderId,
        transaction_amount: 30.00,
        payment_method: { id: 'visa', type: 'credit_card' }
      });

      const webhookResponse = await WebhookHandler(webhookReq.req);
      
      expect(webhookResponse.status).toBe(200);

      // Verify order was updated
      const { data: updatedOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      expect(updatedOrder.mp_payment_id).toBe(mockPaymentId);
      expect(updatedOrder.status).toBe('approved');
      expect(updatedOrder.mp_status).toBe('approved');
    });
  });

  describe('Public Checkout → Webhook Flow', () => {
    it('should create public order and process webhook successfully', async () => {
      const supabase = createTestClient();
      
      // Step 1: Create public checkout
      const checkoutReq = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          eventId: publicData.eventId,
          contactInfo: {
            name: 'Public Customer',
            email: 'customer@public.com',
            phone: '1234567890'
          },
          items: [
            {
              photoId: publicData.publicPhotoIds[0],
              quantity: 1,
              priceType: 'base'
            }
          ]
        }
      });

      const checkoutResponse = await PublicCheckout(checkoutReq.req);
      const checkoutData = await checkoutResponse.json();

      expect(checkoutResponse.status).toBe(200);
      expect(checkoutData.success).toBe(true);

      const orderId = checkoutData.orderId;
      const preferenceId = checkoutData.preferenceId;

      // Verify public order was created correctly
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      expect(order).toBeTruthy();
      expect(order.subject_id).toBeNull();
      expect(order.event_id).toBe(publicData.eventId);
      expect(order.status).toBe('pending');
      expect(order.mp_preference_id).toBe(preferenceId);
      expect(order.is_public_order).toBe(true);
      expect(order.created_by).toBe('public_checkout');

      // Step 2: Simulate Mercado Pago webhook for public order
      const mockPaymentId = 'mock-public-payment-789';
      const webhookBody = {
        id: 2,
        live_mode: false,
        type: 'payment',
        date_created: new Date().toISOString(),
        application_id: 12345,
        user_id: 67890,
        version: 1,
        api_version: 'v1',
        action: 'payment.updated',
        data: {
          id: mockPaymentId
        }
      };

      const webhookBodyStr = JSON.stringify(webhookBody);
      const signature = createWebhookSignature(webhookBodyStr, 'test-webhook-secret');

      const webhookReq = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-signature': signature,
          'x-request-id': crypto.randomUUID()
        },
        body: webhookBodyStr
      });

      // Mock the payment info response
      mocks.mockMP.getPaymentInfo = vi.fn().mockResolvedValue({
        id: mockPaymentId,
        status: 'approved',
        external_reference: orderId,
        transaction_amount: 15.00,
        payment_method: { id: 'account_money', type: 'account_money' }
      });

      const webhookResponse = await WebhookHandler(webhookReq.req);
      
      expect(webhookResponse.status).toBe(200);

      // Verify public order was updated
      const { data: updatedOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      expect(updatedOrder.mp_payment_id).toBe(mockPaymentId);
      expect(updatedOrder.status).toBe('approved');
      expect(updatedOrder.mp_status).toBe('approved');
    });
  });

  describe('Webhook Idempotency', () => {
    it('should handle duplicate webhooks idempotently', async () => {
      const supabase = createTestClient();
      
      // Create an order first
      const orderId = crypto.randomUUID();
      await supabase.from('orders').insert({
        id: orderId,
        subject_id: testData.subjectId,
        contact_name: 'Test Customer',
        contact_email: 'test@example.com',
        status: 'pending',
        is_public_order: false,
        created_by: 'family_checkout',
        total_amount_cents: 1500
      });

      const mockPaymentId = 'duplicate-payment-123';
      const webhookBody = {
        id: 3,
        live_mode: false,
        type: 'payment',
        date_created: new Date().toISOString(),
        application_id: 12345,
        user_id: 67890,
        version: 1,
        api_version: 'v1',
        action: 'payment.updated',
        data: {
          id: mockPaymentId
        }
      };

      const webhookBodyStr = JSON.stringify(webhookBody);
      const signature = createWebhookSignature(webhookBodyStr, 'test-webhook-secret');

      // Mock payment info
      mocks.mockMP.getPaymentInfo = vi.fn().mockResolvedValue({
        id: mockPaymentId,
        status: 'approved',
        external_reference: orderId,
        transaction_amount: 15.00
      });

      // First webhook call
      const webhookReq1 = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-signature': signature,
          'x-request-id': crypto.randomUUID()
        },
        body: webhookBodyStr
      });

      const webhookResponse1 = await WebhookHandler(webhookReq1.req);
      expect(webhookResponse1.status).toBe(200);

      // Second webhook call (duplicate)
      const webhookReq2 = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-signature': signature,
          'x-request-id': crypto.randomUUID()
        },
        body: webhookBodyStr
      });

      const webhookResponse2 = await WebhookHandler(webhookReq2.req);
      expect(webhookResponse2.status).toBe(200);

      // Verify order is still correct (not duplicated)
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('mp_payment_id', mockPaymentId);

      expect(orders).toHaveLength(1);
      expect(orders[0].status).toBe('approved');

      // Verify payment info was only called once (cached/idempotent)
      expect(mocks.mockMP.getPaymentInfo).toHaveBeenCalledTimes(2); // Once per webhook call
    });
  });

  describe('Webhook Security', () => {
    it('should reject webhooks with invalid signature', async () => {
      const webhookBody = {
        id: 4,
        live_mode: false,
        type: 'payment',
        date_created: new Date().toISOString(),
        application_id: 12345,
        user_id: 67890,
        version: 1,
        api_version: 'v1',
        action: 'payment.updated',
        data: {
          id: 'payment-123'
        }
      };

      const webhookBodyStr = JSON.stringify(webhookBody);
      const invalidSignature = 'v1=invalid_signature_hash';

      const webhookReq = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-signature': invalidSignature,
          'x-request-id': crypto.randomUUID()
        },
        body: webhookBodyStr
      });

      const webhookResponse = await WebhookHandler(webhookReq.req);
      
      expect(webhookResponse.status).toBe(401);
    });

    it('should reject webhooks without signature', async () => {
      const webhookBody = {
        id: 5,
        live_mode: false,
        type: 'payment',
        data: { id: 'payment-456' }
      };

      const webhookReq = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-request-id': crypto.randomUUID()
        },
        body: JSON.stringify(webhookBody)
      });

      const webhookResponse = await WebhookHandler(webhookReq.req);
      
      expect(webhookResponse.status).toBe(400);
    });
  });
});

/**
 * Create a valid webhook signature for testing
 */
function createWebhookSignature(body: string, secret: string): string {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return `v1=${hash}`;
}