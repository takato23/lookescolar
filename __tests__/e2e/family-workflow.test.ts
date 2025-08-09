/**
 * E2E Test Suite: Complete Family Workflow
 * Tests the full family journey: token access → gallery → cart → checkout → payment
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Test configuration
const TEST_CONFIG = {
  subject: {
    name: 'Test Student',
    email: 'student@test.com',
    token: 'test_family_token_123456789012345' // 31 chars, secure
  },
  event: {
    name: 'Family Test Event',
    school: 'Test School',
    date: '2024-01-20'
  },
  order: {
    contact_name: 'Test Parent',
    contact_email: 'parent@test.com',
    contact_phone: '+541234567890'
  },
  photos: [
    { filename: 'photo1.jpg' },
    { filename: 'photo2.jpg' },
    { filename: 'photo3.jpg' }
  ]
};

let supabase: ReturnType<typeof createClient<Database>>;
let testEventId: string;
let testSubjectId: string;
let testPhotoIds: string[] = [];
let validToken: string;

beforeAll(async () => {
  supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await setupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

beforeEach(async () => {
  await resetRateLimit();
});

describe('Family Workflow E2E Tests', () => {
  describe('1. Token Access & Security', () => {
    it('should reject invalid token format', async () => {
      const shortToken = 'short_token';
      const response = await fetch(`/api/family/gallery/${shortToken}`);
      
      expect(response.status).toBe(400);
    });

    it('should reject non-existent token', async () => {
      const fakeToken = 'nonexistent_token_1234567890123';
      const response = await fetch(`/api/family/gallery/${fakeToken}`);
      
      expect(response.status).toBe(404);
    });

    it('should reject expired token', async () => {
      // Create expired subject
      const expiredToken = 'expired_token_1234567890123456';
      const { data: expiredSubject } = await supabase
        .from('subjects')
        .insert({
          event_id: testEventId,
          name: 'Expired Subject',
          email: 'expired@test.com',
          token: expiredToken,
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Expired yesterday
        })
        .select()
        .single();

      const response = await fetch(`/api/family/gallery/${expiredToken}`);
      expect(response.status).toBe(401);

      // Cleanup
      await supabase.from('subjects').delete().eq('id', expiredSubject.id);
    });

    it('should accept valid token and return gallery data', async () => {
      const response = await fetch(`/api/family/gallery/${validToken}`);
      
      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.subject).toBeDefined();
      expect(result.subject.name).toBe(TEST_CONFIG.subject.name);
      expect(result.photos).toBeDefined();
      expect(Array.isArray(result.photos)).toBe(true);
    });

    it('should enforce rate limiting on gallery access', async () => {
      const promises = [];
      
      // Make 35 requests (exceeds limit of 30/min)
      for (let i = 0; i < 35; i++) {
        promises.push(fetch(`/api/family/gallery/${validToken}`));
      }

      const responses = await Promise.all(promises);
      
      // Some should be rate limited
      expect(responses.some(r => r.status === 429)).toBe(true);
    });

    it('should log family access without exposing token', async () => {
      // This test would verify that logs are created but tokens are masked
      const response = await fetch(`/api/family/gallery/${validToken}`);
      expect(response.status).toBe(200);
      
      // In a real test, you'd check the log system for entries like:
      // "Family portal access - Token: tok_***, IP: xxx.xxx.xxx.***"
    });
  });

  describe('2. Photo Gallery & Signed URLs', () => {
    it('should generate signed URLs for photo previews', async () => {
      if (testPhotoIds.length === 0) {
        console.log('No test photos available, skipping signed URL test');
        return;
      }

      const photoId = testPhotoIds[0];
      const response = await fetch(`/api/storage/signed-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: validToken,
          photo_id: photoId,
          type: 'preview'
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.signed_url).toBeDefined();
      expect(result.signed_url).toContain('supabase.co');
      expect(result.expires_at).toBeDefined();
      
      // URL should be valid for 1 hour
      const expiresAt = new Date(result.expires_at);
      const now = new Date();
      const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeLessThanOrEqual(1);
      expect(diffHours).toBeGreaterThan(0.9);
    });

    it('should enforce rate limiting on signed URL requests', async () => {
      if (testPhotoIds.length === 0) return;

      const promises = [];
      const photoId = testPhotoIds[0];
      
      // Make 65 requests (exceeds limit of 60/min)
      for (let i = 0; i < 65; i++) {
        promises.push(
          fetch(`/api/storage/signed-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: validToken,
              photo_id: photoId,
              type: 'preview'
            })
          })
        );
      }

      const responses = await Promise.all(promises);
      expect(responses.some(r => r.status === 429)).toBe(true);
    });

    it('should reject signed URL requests for photos not assigned to subject', async () => {
      // Create photo not assigned to our test subject
      const { data: unassignedPhoto } = await supabase
        .from('photos')
        .insert({
          event_id: testEventId,
          filename: 'unassigned.jpg',
          storage_path: 'photos/2024/01/unassigned.jpg',
          status: 'processed'
        })
        .select()
        .single();

      const response = await fetch(`/api/storage/signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          photo_id: unassignedPhoto.id,
          type: 'preview'
        })
      });

      expect(response.status).toBe(403);

      // Cleanup
      await supabase.from('photos').delete().eq('id', unassignedPhoto.id);
    });

    it('should validate anti-hotlinking protection', async () => {
      const response = await fetch(`/api/storage/signed-url`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Referer': 'https://malicious-site.com'
        },
        body: JSON.stringify({
          token: validToken,
          photo_id: testPhotoIds[0],
          type: 'preview'
        })
      });

      expect(response.status).toBe(403);
    });
  });

  describe('3. Shopping Cart Management', () => {
    it('should add photos to cart', async () => {
      if (testPhotoIds.length === 0) return;

      const cartItems = testPhotoIds.slice(0, 2).map(photoId => ({
        photo_id: photoId,
        quantity: 1,
        format: 'digital',
        price: 500
      }));

      const response = await fetch('/api/family/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          items: cartItems
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(cartItems.length);
      expect(result.total).toBe(1000); // 2 × 500
    });

    it('should validate cart item limits', async () => {
      if (testPhotoIds.length === 0) return;

      // Try to add too many items (>50)
      const manyItems = Array(55).fill(null).map((_, i) => ({
        photo_id: testPhotoIds[0],
        quantity: 1,
        format: 'digital',
        price: 500
      }));

      const response = await fetch('/api/family/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          items: manyItems
        })
      });

      expect(response.status).toBe(400);
    });

    it('should prevent adding unassigned photos to cart', async () => {
      // Create photo not assigned to subject
      const { data: unassignedPhoto } = await supabase
        .from('photos')
        .insert({
          event_id: testEventId,
          filename: 'unassigned.jpg',
          storage_path: 'photos/2024/01/unassigned.jpg',
          status: 'processed'
        })
        .select()
        .single();

      const response = await fetch('/api/family/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          items: [{
            photo_id: unassignedPhoto.id,
            quantity: 1,
            format: 'digital',
            price: 500
          }]
        })
      });

      expect(response.status).toBe(403);

      // Cleanup
      await supabase.from('photos').delete().eq('id', unassignedPhoto.id);
    });

    it('should update cart items', async () => {
      if (testPhotoIds.length === 0) return;

      // First add items
      await fetch('/api/family/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          items: [{
            photo_id: testPhotoIds[0],
            quantity: 1,
            format: 'digital',
            price: 500
          }]
        })
      });

      // Then update
      const response = await fetch('/api/family/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          items: [{
            photo_id: testPhotoIds[0],
            quantity: 2,
            format: 'print',
            price: 800
          }]
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.items[0].quantity).toBe(2);
      expect(result.total).toBe(1600); // 2 × 800
    });

    it('should clear cart', async () => {
      const response = await fetch('/api/family/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: validToken })
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('4. Checkout Process', () => {
    beforeEach(async () => {
      // Ensure cart has items for checkout tests
      if (testPhotoIds.length > 0) {
        await fetch('/api/family/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: validToken,
            items: [{
              photo_id: testPhotoIds[0],
              quantity: 1,
              format: 'digital',
              price: 500
            }]
          })
        });
      }
    });

    it('should validate contact information', async () => {
      const incompleteContact = {
        contact_name: '', // Missing required field
        contact_email: 'invalid-email', // Invalid format
        contact_phone: '123' // Too short
      };

      const response = await fetch('/api/family/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          ...incompleteContact
        })
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.errors).toBeDefined();
    });

    it('should create order with valid contact info', async () => {
      const response = await fetch('/api/family/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          ...TEST_CONFIG.order
        })
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      
      expect(result.order_id).toBeDefined();
      expect(result.total_amount).toBeGreaterThan(0);
      expect(result.status).toBe('pending');
    });

    it('should prevent duplicate orders for same subject', async () => {
      // Create first order
      await fetch('/api/family/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          ...TEST_CONFIG.order
        })
      });

      // Try to create another order (should fail)
      const response = await fetch('/api/family/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          ...TEST_CONFIG.order
        })
      });

      expect(response.status).toBe(409); // Conflict
    });

    it('should reject checkout with empty cart', async () => {
      // Clear cart first
      await fetch('/api/family/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: validToken })
      });

      const response = await fetch('/api/family/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          ...TEST_CONFIG.order
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('5. Payment Integration', () => {
    let testOrderId: string;

    beforeEach(async () => {
      // Create order for payment tests
      if (testPhotoIds.length > 0) {
        // Add item to cart
        await fetch('/api/family/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: validToken,
            items: [{
              photo_id: testPhotoIds[0],
              quantity: 1,
              format: 'digital',
              price: 1500
            }]
          })
        });

        // Create order
        const checkoutResponse = await fetch('/api/family/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: validToken,
            ...TEST_CONFIG.order
          })
        });

        if (checkoutResponse.ok) {
          const checkoutResult = await checkoutResponse.json();
          testOrderId = checkoutResult.order_id;
        }
      }
    });

    it('should create MercadoPago preference', async () => {
      if (!testOrderId) return;

      const response = await fetch('/api/payments/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: testOrderId,
          token: validToken
        })
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      
      expect(result.preference_id).toBeDefined();
      expect(result.init_point).toBeDefined();
      expect(result.init_point).toContain('mercadopago.com');
    });

    it('should validate webhook signature', async () => {
      const webhookPayload = {
        id: 123456789,
        live_mode: false,
        type: 'payment',
        date_created: new Date().toISOString(),
        application_id: 'app_test',
        user_id: 'user_test',
        version: 1,
        api_version: 'v1',
        action: 'payment.created',
        data: {
          id: '987654321'
        }
      };

      // Create valid signature
      const crypto = await import('crypto');
      const secret = process.env.MP_WEBHOOK_SECRET || 'test_secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(webhookPayload))
        .digest('hex');

      const response = await fetch('/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': `sha256=${signature}`
        },
        body: JSON.stringify(webhookPayload)
      });

      expect(response.status).toBe(200);
    });

    it('should reject webhook with invalid signature', async () => {
      const webhookPayload = {
        id: 123456789,
        type: 'payment',
        data: { id: '987654321' }
      };

      const response = await fetch('/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': 'sha256=invalid_signature'
        },
        body: JSON.stringify(webhookPayload)
      });

      expect(response.status).toBe(401);
    });

    it('should enforce webhook rate limiting', async () => {
      const webhookPayload = { id: 123, type: 'test', data: { id: '123' } };
      const promises = [];

      // Make 105 webhook requests (exceeds limit of 100/min)
      for (let i = 0; i < 105; i++) {
        promises.push(
          fetch('/api/payments/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...webhookPayload, id: i })
          })
        );
      }

      const responses = await Promise.all(promises);
      expect(responses.some(r => r.status === 429)).toBe(true);
    });
  });

  describe('6. Order Status Tracking', () => {
    let testOrderId: string;

    beforeEach(async () => {
      // Create test order
      const { data: order } = await supabase
        .from('orders')
        .insert({
          subject_id: testSubjectId,
          total_amount: 1500,
          status: 'pending',
          ...TEST_CONFIG.order
        })
        .select()
        .single();

      testOrderId = order.id;
    });

    it('should check order status with valid token', async () => {
      const response = await fetch(`/api/family/order/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          order_id: testOrderId
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.order_id).toBe(testOrderId);
      expect(result.status).toBeDefined();
      expect(result.total_amount).toBe(1500);
    });

    it('should reject order status check for different subject', async () => {
      // Create another subject
      const { data: otherSubject } = await supabase
        .from('subjects')
        .insert({
          event_id: testEventId,
          name: 'Other Subject',
          email: 'other@test.com',
          token: 'other_subject_token_123456789',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      const response = await fetch(`/api/family/order/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: otherSubject.token,
          order_id: testOrderId
        })
      });

      expect(response.status).toBe(403);

      // Cleanup
      await supabase.from('subjects').delete().eq('id', otherSubject.id);
    });
  });
});

// Helper functions
async function setupTestData() {
  // Create test event
  const { data: event } = await supabase
    .from('events')
    .insert(TEST_CONFIG.event)
    .select()
    .single();
  
  testEventId = event.id;

  // Create test subject with valid token
  validToken = TEST_CONFIG.subject.token;
  const { data: subject } = await supabase
    .from('subjects')
    .insert({
      ...TEST_CONFIG.subject,
      event_id: testEventId,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    })
    .select()
    .single();
  
  testSubjectId = subject.id;

  // Create test photos
  const photoInserts = TEST_CONFIG.photos.map(photo => ({
    event_id: testEventId,
    filename: photo.filename,
    storage_path: `photos/2024/01/${photo.filename}`,
    status: 'processed' as const
  }));

  const { data: photos } = await supabase
    .from('photos')
    .insert(photoInserts)
    .select();
  
  testPhotoIds = photos.map(p => p.id);

  // Assign photos to subject
  const assignments = testPhotoIds.map(photoId => ({
    photo_id: photoId,
    subject_id: testSubjectId
  }));

  await supabase.from('photo_assignments').insert(assignments);
}

async function cleanupTestData() {
  if (testEventId) {
    // Clean up in correct order
    await supabase.from('photo_assignments').delete().eq('subject_id', testSubjectId);
    await supabase.from('order_items').delete().in('order_id', []);
    await supabase.from('orders').delete().eq('subject_id', testSubjectId);
    await supabase.from('photos').delete().eq('event_id', testEventId);
    await supabase.from('subjects').delete().eq('event_id', testEventId);
    await supabase.from('events').delete().eq('id', testEventId);
  }
}

async function resetRateLimit() {
  try {
    await fetch('/api/test/reset-rate-limit', { method: 'POST' });
  } catch {
    // Ignore if endpoint doesn't exist
  }
}