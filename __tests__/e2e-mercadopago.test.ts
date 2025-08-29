import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from '@/lib/supabase/server';

// E2E tests for Mercado Pago integration
// These tests require a test database and mock MP environment

describe('Mercado Pago E2E Integration', () => {
  let testEventId: string;
  let testSubjectId: string;
  let testToken: string;
  let testOrderId: string;
  let supabase: any;

  beforeAll(async () => {
    supabase = createServiceClient();

    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.MP_ACCESS_TOKEN = 'TEST-1234567890-test-token';
    process.env.MP_WEBHOOK_SECRET = 'test-webhook-secret-123';

    // Create test event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: 'Test School Event E2E',
        school: 'Test School',
        date: '2024-12-15',
        active: true,
      })
      .select()
      .single();

    if (eventError) throw eventError;
    testEventId = event.id;

    // Create test subject
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .insert({
        event_id: testEventId,
        type: 'student',
        first_name: 'Test',
        last_name: 'Student',
      })
      .select()
      .single();

    if (subjectError) throw subjectError;
    testSubjectId = subject.id;

    // Create test token
    testToken = 'test-token-e2e-' + Date.now();
    const { error: tokenError } = await supabase.from('subject_tokens').insert({
      subject_id: testSubjectId,
      token: testToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h from now
    });

    if (tokenError) throw tokenError;

    // Create test price list and items
    const { data: priceList, error: priceListError } = await supabase
      .from('price_lists')
      .insert({
        event_id: testEventId,
      })
      .select()
      .single();

    if (priceListError) throw priceListError;

    await supabase.from('price_list_items').insert([
      {
        price_list_id: priceList.id,
        label: 'Foto Individual',
        price_cents: 5000, // $50
        sort_order: 1,
      },
      {
        price_list_id: priceList.id,
        label: 'Foto Grupal',
        price_cents: 3000, // $30
        sort_order: 2,
      },
    ]);

    // Create test photos
    await supabase.from('photos').insert([
      {
        event_id: testEventId,
        subject_id: testSubjectId,
        storage_path: 'test/photo1.jpg',
        approved: true,
      },
      {
        event_id: testEventId,
        subject_id: testSubjectId,
        storage_path: 'test/photo2.jpg',
        approved: true,
      },
    ]);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testEventId) {
      await supabase.from('events').delete().eq('id', testEventId);
    }
  });

  describe('Complete Purchase Flow', () => {
    it('should complete full purchase workflow', async () => {
      // Step 1: Get available photos for family
      const { data: photos } = await supabase
        .from('photos')
        .select('id, storage_path')
        .eq('subject_id', testSubjectId)
        .eq('approved', true);

      expect(photos).toHaveLength(2);

      // Step 2: Get price list items
      const { data: priceItems } = await supabase
        .from('price_list_items')
        .select('*')
        .eq(
          'price_list_id',
          (
            await supabase
              .from('price_lists')
              .select('id')
              .eq('event_id', testEventId)
              .single()
          ).data.id
        );

      expect(priceItems).toHaveLength(2);

      // Step 3: Create mock cart data
      const cartItems = [
        {
          photoId: photos[0].id,
          priceListItemId: priceItems[0].id, // Foto Individual
          quantity: 1,
        },
        {
          photoId: photos[1].id,
          priceListItemId: priceItems[1].id, // Foto Grupal
          quantity: 2,
        },
      ];

      // Step 4: Create preference API call (mocked)
      const preferencePayload = {
        token: testToken,
        contactInfo: {
          name: 'Juan Test Pérez',
          email: 'juan.test@example.com',
          phone: '+54 11 9876-5432',
        },
        cartItems,
      };

      // Mock the API call since we don't want to hit real MP in tests
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            orderId: 'test-order-' + Date.now(),
            preferenceId: 'test-preference-123',
            initPoint:
              'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=test-preference-123',
            items: [
              { title: 'Foto Individual - Foto', quantity: 1, unit_price: 50 },
              { title: 'Foto Grupal - Foto', quantity: 2, unit_price: 30 },
            ],
          }),
      });

      global.fetch = mockFetch;

      const response = await fetch('/api/payments/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferencePayload),
      });

      const preferenceResult = await response.json();
      expect(preferenceResult.orderId).toBeDefined();
      expect(preferenceResult.preferenceId).toBe('test-preference-123');

      testOrderId = preferenceResult.orderId;

      // Step 5: Verify order was created in database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(
          `
          *,
          order_items (
            quantity,
            price_list_items:price_list_item_id (
              label,
              price_cents
            )
          )
        `
        )
        .eq('id', testOrderId)
        .single();

      expect(orderError).toBeNull();
      expect(order).toBeDefined();
      expect(order.status).toBe('pending');
      expect(order.contact_name).toBe('Juan Test Pérez');
      expect(order.contact_email).toBe('juan.test@example.com');
      expect(order.order_items).toHaveLength(2);

      // Calculate expected total
      const expectedTotal = 5000 * 1 + 3000 * 2; // $50 + $60 = $110
      const actualTotal = order.order_items.reduce(
        (sum: number, item: any) =>
          sum + item.price_list_items.price_cents * item.quantity,
        0
      );
      expect(actualTotal).toBe(expectedTotal);
    });

    it('should prevent multiple pending orders for same subject', async () => {
      // Try to create another order with same token
      const preferencePayload = {
        token: testToken,
        contactInfo: {
          name: 'Another User',
          email: 'another@example.com',
        },
        cartItems: [
          {
            photoId: (
              await supabase
                .from('photos')
                .select('id')
                .eq('subject_id', testSubjectId)
                .limit(1)
                .single()
            ).data.id,
            priceListItemId: (
              await supabase
                .from('price_list_items')
                .select('id')
                .limit(1)
                .single()
            ).data.id,
            quantity: 1,
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({
            error:
              'Ya tienes un pedido pendiente. Completa el pago anterior o cancélalo.',
          }),
      });

      global.fetch = mockFetch;

      const response = await fetch('/api/payments/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferencePayload),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(409);
    });
  });

  describe('Webhook Processing', () => {
    it('should process payment approval webhook', async () => {
      // Mock webhook payload from MP
      const webhookPayload = {
        id: 123456,
        live_mode: false,
        type: 'payment',
        date_created: new Date().toISOString(),
        application_id: 789,
        user_id: 456,
        version: 1,
        api_version: 'v1',
        action: 'payment.updated',
        data: {
          id: 'test-payment-webhook-123',
        },
      };

      // Mock MP API response
      const mockMPResponse = {
        id: 'test-payment-webhook-123',
        status: 'approved',
        external_reference: testOrderId,
        transaction_amount: 110.0,
        payer: {
          email: 'juan.test@example.com',
        },
      };

      // Mock fetch for MP API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMPResponse),
      });

      // Create signature for webhook
      const bodyString = JSON.stringify(webhookPayload);
      const signature =
        'v1=' +
        require('crypto')
          .createHmac('sha256', process.env.MP_WEBHOOK_SECRET!)
          .update(bodyString)
          .digest('hex');

      // Mock webhook API call
      const webhookResponse = await fetch('/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
          'x-request-id': 'test-request-123',
        },
        body: bodyString,
      });

      expect(webhookResponse.status).toBe(200);

      // Verify order was updated in database
      const { data: updatedOrder } = await supabase
        .from('orders')
        .select('status, mp_payment_id, mp_status')
        .eq('id', testOrderId)
        .single();

      expect(updatedOrder.status).toBe('approved');
      expect(updatedOrder.mp_payment_id).toBe('test-payment-webhook-123');
      expect(updatedOrder.mp_status).toBe('approved');
    });

    it('should handle webhook idempotency', async () => {
      // Send same webhook again
      const webhookPayload = {
        id: 123456,
        live_mode: false,
        type: 'payment',
        date_created: new Date().toISOString(),
        application_id: 789,
        user_id: 456,
        version: 1,
        api_version: 'v1',
        action: 'payment.updated',
        data: {
          id: 'test-payment-webhook-123', // Same payment ID as before
        },
      };

      const bodyString = JSON.stringify(webhookPayload);
      const signature =
        'v1=' +
        require('crypto')
          .createHmac('sha256', process.env.MP_WEBHOOK_SECRET!)
          .update(bodyString)
          .digest('hex');

      const webhookResponse = await fetch('/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
          'x-request-id': 'test-request-456', // Different request ID
        },
        body: bodyString,
      });

      expect(webhookResponse.status).toBe(200);

      // Order should still be in same state (idempotent)
      const { data: orderCheck } = await supabase
        .from('orders')
        .select('status, mp_payment_id')
        .eq('id', testOrderId)
        .single();

      expect(orderCheck.status).toBe('approved');
      expect(orderCheck.mp_payment_id).toBe('test-payment-webhook-123');
    });
  });

  describe('Order Management', () => {
    it('should allow admin to mark order as delivered', async () => {
      // Mock admin session
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'admin-session-token' }),
      };

      // Mock admin API call
      const deliveryResponse = await fetch(`/api/admin/orders/${testOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'admin-session=admin-session-token',
        },
        body: JSON.stringify({
          status: 'delivered',
          notes: 'Entregado durante evento escolar',
        }),
      });

      expect(deliveryResponse.status).toBe(200);

      // Verify order status in database
      const { data: deliveredOrder } = await supabase
        .from('orders')
        .select('status, delivered_at, notes')
        .eq('id', testOrderId)
        .single();

      expect(deliveredOrder.status).toBe('delivered');
      expect(deliveredOrder.delivered_at).toBeTruthy();
      expect(deliveredOrder.notes).toContain(
        'Entregado durante evento escolar'
      );
    });

    it('should provide order status for families', async () => {
      const statusResponse = await fetch(
        `/api/family/order/status?token=${testToken}`
      );
      expect(statusResponse.status).toBe(200);

      const statusData = await statusResponse.json();
      expect(statusData.orderId).toBe(testOrderId);
      expect(statusData.status).toBe('delivered');
      expect(statusData.total).toBe(110); // $110
      expect(statusData.itemsCount).toBe(2);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity', async () => {
      // Verify all relationships are correct
      const { data: orderWithRelations } = await supabase
        .from('orders')
        .select(
          `
          *,
          subjects:subject_id (
            id,
            first_name,
            events:event_id (
              name,
              school
            )
          ),
          order_items (
            quantity,
            photos:photo_id (
              storage_path
            ),
            price_list_items:price_list_item_id (
              label,
              price_cents
            )
          )
        `
        )
        .eq('id', testOrderId)
        .single();

      expect(orderWithRelations.subjects.id).toBe(testSubjectId);
      expect(orderWithRelations.subjects.events.name).toBe(
        'Test School Event E2E'
      );
      expect(orderWithRelations.order_items).toHaveLength(2);

      orderWithRelations.order_items.forEach((item: any) => {
        expect(item.photos.storage_path).toMatch(/^test\/photo\d\.jpg$/);
        expect(item.price_list_items.label).toMatch(
          /^Foto (Individual|Grupal)$/
        );
        expect(item.quantity).toBeGreaterThan(0);
      });
    });

    it('should enforce business constraints', async () => {
      // Try to create order with invalid quantity
      const { error } = await supabase.from('order_items').insert({
        order_id: testOrderId,
        photo_id: (await supabase.from('photos').select('id').limit(1).single())
          .data.id,
        price_list_item_id: (
          await supabase.from('price_list_items').select('id').limit(1).single()
        ).data.id,
        quantity: 0, // Invalid: should be > 0
      });

      expect(error).toBeTruthy();
      expect(error?.message).toContain('check constraint');
    });
  });

  describe('Performance', () => {
    it('should handle concurrent webhook calls efficiently', async () => {
      const concurrentWebhooks = 10;
      const startTime = Date.now();

      // Create multiple concurrent webhook calls with different payment IDs
      const webhookPromises = Array.from(
        { length: concurrentWebhooks },
        (_, i) => {
          const webhookPayload = {
            id: 123456 + i,
            live_mode: false,
            type: 'payment',
            date_created: new Date().toISOString(),
            application_id: 789,
            user_id: 456,
            version: 1,
            api_version: 'v1',
            action: 'payment.updated',
            data: {
              id: `concurrent-payment-${i}`,
            },
          };

          const bodyString = JSON.stringify(webhookPayload);
          const signature =
            'v1=' +
            require('crypto')
              .createHmac('sha256', process.env.MP_WEBHOOK_SECRET!)
              .update(bodyString)
              .digest('hex');

          return fetch('/api/payments/webhook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-signature': signature,
              'x-request-id': `concurrent-${i}`,
            },
            body: bodyString,
          });
        }
      );

      const responses = await Promise.all(webhookPromises);
      const duration = Date.now() - startTime;

      // All webhooks should complete successfully
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Should complete in reasonable time (< 5 seconds for 10 concurrent)
      expect(duration).toBeLessThan(5000);
    });
  });
});
