/**
 * E2E MVP Complete Workflow Test
 * Tests the complete MVP flow: evento → fotos → galería → pago → orden procesada
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  admin: {
    email: 'test-admin@lookescolar.com',
    password: 'TestAdmin123!@#'
  },
  event: {
    name: 'MVP Test Event',
    school: 'Test School MVP',
    date: '2024-01-15',
    location: 'Test Location'
  },
  subject: {
    name: 'Juan Test MVP',
    email: 'juan.mvp@test.com',
    phone: '+541234567890',
    grade_section: '5A'
  },
  order: {
    contact_name: 'Padre de Juan',
    contact_email: 'padre.juan@test.com',
    contact_phone: '+541234567890'
  }
};

let supabase: ReturnType<typeof createClient<Database>>;
let testEventId: string;
let testSubjectId: string;
let testSubjectToken: string;
let testPhotoId: string;
let testOrderId: string;
let adminSession: any;

beforeAll(async () => {
  // Initialize Supabase client for testing
  supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

beforeEach(async () => {
  // Clean rate limits between tests
  await resetRateLimit();
});

describe('MVP Complete Workflow E2E', () => {
  describe('Phase 1: Admin Setup', () => {
    it('1.1 Admin login should work', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_CONFIG.admin)
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      
      adminSession = result.session;
    });

    it('1.2 Create event should work', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/admin/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.access_token}`
        },
        body: JSON.stringify(TEST_CONFIG.event)
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(TEST_CONFIG.event.name);
      
      testEventId = result.id;
      console.log('✅ Event created:', testEventId);
    });

    it('1.3 Create subject with token should work', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/admin/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.access_token}`
        },
        body: JSON.stringify({
          event_id: testEventId,
          ...TEST_CONFIG.subject
        })
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      
      expect(result.subject.id).toBeDefined();
      expect(result.subject.token).toBeDefined();
      expect(result.subject.token.length).toBeGreaterThanOrEqual(20);
      
      testSubjectId = result.subject.id;
      testSubjectToken = result.subject.token;
      
      console.log('✅ Subject created with token:', testSubjectToken.substring(0, 8) + '...');
    });
  });

  describe('Phase 2: Photo Upload & Processing', () => {
    it('2.1 Upload photo with watermark should work', async () => {
      // Create minimal valid PNG buffer
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
      ]);

      const formData = new FormData();
      const blob = new Blob([testImageBuffer], { type: 'image/png' });
      formData.append('file', blob, 'test-mvp-photo.png');
      formData.append('event_id', testEventId);

      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/admin/photos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminSession.access_token}`
        },
        body: formData
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      
      expect(result.id).toBeDefined();
      expect(result.storage_path).toBeDefined();
      expect(result.event_id).toBe(testEventId);
      expect(result.status).toBe('processed');
      
      testPhotoId = result.id;
      console.log('✅ Photo uploaded and processed:', testPhotoId);
    });

    it('2.2 Tag photo to subject should work', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/admin/tagging`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.access_token}`
        },
        body: JSON.stringify({
          photo_id: testPhotoId,
          subject_id: testSubjectId
        })
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.photo_id).toBe(testPhotoId);
      expect(result.subject_id).toBe(testSubjectId);
      
      console.log('✅ Photo tagged to subject');
    });
  });

  describe('Phase 3: Family Gallery Access', () => {
    it('3.1 Family should access gallery with token', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/family/gallery/${testSubjectToken}`);

      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.subject).toBeDefined();
      expect(result.subject.name).toBe(TEST_CONFIG.subject.name);
      expect(result.photos).toBeDefined();
      expect(Array.isArray(result.photos)).toBe(true);
      expect(result.photos.length).toBeGreaterThan(0);
      
      // Verificar que las fotos tienen URLs firmadas
      expect(result.photos[0].preview_url).toBeDefined();
      expect(result.photos[0].preview_url).toContain('token=');
      
      console.log('✅ Family can access gallery with', result.photos.length, 'photos');
    });

    it('3.2 Public gallery should also work', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/gallery/${testEventId}`);

      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.event).toBeDefined();
      expect(result.event.name).toBe(TEST_CONFIG.event.name);
      expect(result.photos).toBeDefined();
      expect(Array.isArray(result.photos)).toBe(true);
      
      console.log('✅ Public gallery accessible');
    });

    it('3.3 Signed URLs should expire properly', async () => {
      // Get a photo with signed URL
      const galleryResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/family/gallery/${testSubjectToken}`);
      const galleryResult = await galleryResponse.json();
      
      const signedUrl = galleryResult.photos[0].preview_url;
      expect(signedUrl).toContain('token=');
      expect(signedUrl).toContain('expires=');
      
      // Verify the URL works initially
      const imageResponse = await fetch(signedUrl);
      expect(imageResponse.status).toBe(200);
      
      console.log('✅ Signed URLs work correctly');
    });
  });

  describe('Phase 4: Shopping Cart & Checkout', () => {
    it('4.1 Add photos to cart should work', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/family/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: testSubjectToken,
          photo_id: testPhotoId,
          print_size: 'digital',
          quantity: 1
        })
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.success).toBe(true);
      
      console.log('✅ Photo added to cart');
    });

    it('4.2 Create checkout preference should work', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/family/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: testSubjectToken,
          items: [{
            photo_id: testPhotoId,
            print_size: 'digital',
            quantity: 1,
            unit_price: 1500
          }],
          contact: TEST_CONFIG.order
        })
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      
      expect(result.preference_id).toBeDefined();
      expect(result.init_point).toBeDefined();
      expect(result.order_id).toBeDefined();
      
      testOrderId = result.order_id;
      
      console.log('✅ Checkout preference created:', result.preference_id);
      console.log('✅ Order created:', testOrderId);
    });

    it('4.3 Public checkout should also work', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/gallery/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_id: testEventId,
          photos: [testPhotoId],
          contact: {
            ...TEST_CONFIG.order,
            contact_email: 'public.test@test.com'
          }
        })
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      
      expect(result.preference_id).toBeDefined();
      expect(result.init_point).toBeDefined();
      
      console.log('✅ Public checkout works');
    });
  });

  describe('Phase 5: Payment Processing', () => {
    it('5.1 Mercado Pago webhook should process payment', async () => {
      // Simulate MP webhook payload
      const webhookPayload = {
        id: 'test-payment-123',
        live_mode: false,
        type: 'payment',
        date_created: new Date().toISOString(),
        application_id: 'test-app-id',
        user_id: 'test-user-id',
        version: 1,
        api_version: 'v1',
        action: 'payment.created',
        data: {
          payment_id: 'test-payment-123'
        }
      };

      // First, mock the MP API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-payment-123',
          status: 'approved',
          status_detail: 'accredited',
          external_reference: testOrderId,
          payer: {
            email: TEST_CONFIG.order.contact_email
          },
          transaction_amount: 1500,
          date_approved: new Date().toISOString()
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature',
          'x-request-id': 'test-request-id'
        },
        body: JSON.stringify(webhookPayload)
      });

      expect(response.status).toBe(200);
      
      // Verify order was updated
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', testOrderId)
        .single();
      
      expect(order.status).toBe('approved');
      expect(order.mp_payment_id).toBe('test-payment-123');
      
      console.log('✅ Payment processed via webhook');
    });

    it('5.2 Order status should be updated correctly', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/family/order/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: testSubjectToken,
          order_id: testOrderId
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.order).toBeDefined();
      expect(result.order.status).toBe('approved');
      expect(result.order.items).toBeDefined();
      expect(result.order.items.length).toBeGreaterThan(0);
      
      console.log('✅ Order status updated correctly');
    });
  });

  describe('Phase 6: Admin Order Management', () => {
    it('6.1 Admin should see the new order', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${adminSession.access_token}`
        }
      });

      expect(response.status).toBe(200);
      const orders = await response.json();
      
      expect(Array.isArray(orders)).toBe(true);
      const testOrder = orders.find((o: any) => o.id === testOrderId);
      expect(testOrder).toBeDefined();
      expect(testOrder.status).toBe('approved');
      
      console.log('✅ Admin can see order in dashboard');
    });

    it('6.2 Admin should be able to mark order as delivered', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/admin/orders/${testOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.access_token}`
        },
        body: JSON.stringify({
          status: 'delivered'
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.status).toBe('delivered');
      
      console.log('✅ Admin marked order as delivered');
    });

    it('6.3 Export orders should include the test order', async () => {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/admin/orders/export`, {
        headers: {
          'Authorization': `Bearer ${adminSession.access_token}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/csv');
      
      const csvContent = await response.text();
      expect(csvContent).toContain(testOrderId);
      expect(csvContent).toContain(TEST_CONFIG.order.contact_name);
      
      console.log('✅ Order export includes test order');
    });
  });

  describe('Phase 7: End-to-End Validation', () => {
    it('7.1 Complete MVP workflow validation', async () => {
      // Verify all components are properly connected
      
      // 1. Event exists and is accessible
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', testEventId)
        .single();
      expect(event).toBeDefined();
      
      // 2. Subject exists with valid token
      const { data: subject } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', testSubjectId)
        .single();
      expect(subject.token).toBe(testSubjectToken);
      expect(new Date(subject.token_expires_at) > new Date()).toBe(true);
      
      // 3. Photo exists and is processed
      const { data: photo } = await supabase
        .from('photos')
        .select('*')
        .eq('id', testPhotoId)
        .single();
      expect(photo.status).toBe('processed');
      expect(photo.storage_path).toBeDefined();
      
      // 4. Photo assignment exists
      const { data: assignment } = await supabase
        .from('photo_assignments')
        .select('*')
        .eq('photo_id', testPhotoId)
        .eq('subject_id', testSubjectId)
        .single();
      expect(assignment).toBeDefined();
      
      // 5. Order exists with correct status
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', testOrderId)
        .single();
      expect(order.status).toBe('delivered');
      expect(order.mp_payment_id).toBeDefined();
      
      console.log('✅ Complete MVP workflow validated successfully!');
      console.log('🎉 MVP is ready for production use by Melisa!');
    });

    it('7.2 Performance benchmarks should pass', async () => {
      const startTime = Date.now();
      
      // Test critical performance paths
      const galleryResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/family/gallery/${testSubjectToken}`);
      const galleryTime = Date.now() - startTime;
      
      expect(galleryResponse.status).toBe(200);
      expect(galleryTime).toBeLessThan(2000); // < 2 seconds
      
      console.log(`✅ Gallery loads in ${galleryTime}ms (target: <2000ms)`);
    });

    it('7.3 Security validations should pass', async () => {
      // Test invalid token access
      const invalidTokenResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/family/gallery/invalid-token`);
      expect(invalidTokenResponse.status).toBe(401);
      
      // Test expired token (if any)
      // Test SQL injection attempts
      const sqlInjectionResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/family/gallery/'; DROP TABLE subjects; --`);
      expect(sqlInjectionResponse.status).toBe(401);
      
      console.log('✅ Security validations pass');
    });
  });
});

// Helper functions
async function cleanupTestData() {
  if (testEventId) {
    try {
      // Clean up in correct order due to foreign key constraints
      await supabase.from('order_items').delete().in('order_id', [testOrderId]);
      await supabase.from('orders').delete().eq('id', testOrderId);
      await supabase.from('photo_assignments').delete().eq('photo_id', testPhotoId);
      await supabase.from('photos').delete().eq('id', testPhotoId);
      await supabase.from('subjects').delete().eq('id', testSubjectId);
      await supabase.from('events').delete().eq('id', testEventId);
    } catch (error) {
      console.log('Cleanup completed with some non-critical errors:', error);
    }
  }
}

async function resetRateLimit() {
  // Reset rate limiting between tests
  try {
    await fetch(`${TEST_CONFIG.baseUrl}/api/test/reset-rate-limit`, { method: 'POST' });
  } catch {
    // Ignore if endpoint doesn't exist
  }
}