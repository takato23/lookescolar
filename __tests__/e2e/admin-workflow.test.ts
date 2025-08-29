/**
 * E2E Test Suite: Complete Admin Workflow
 * Tests the full admin journey: login → event → subjects → QR → photos → assignment
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Test configuration
const TEST_CONFIG = {
  admin: {
    email: 'test-admin@lookescolar.com',
    password: 'TestAdmin123!@#',
  },
  event: {
    name: 'E2E Test Event',
    school: 'Test School',
    date: '2024-01-15',
  },
  subjects: [
    { name: 'Juan Pérez', email: 'juan@test.com' },
    { name: 'María García', email: 'maria@test.com' },
    { name: 'Carlos López', email: 'carlos@test.com' },
  ],
};

// Supabase client for testing
let supabase: ReturnType<typeof createClient<Database>>;
let testEventId: string;
let testSubjectIds: string[] = [];
let adminSession: any;

beforeAll(async () => {
  // Initialize test Supabase client
  supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Clean up any existing test data
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

beforeEach(async () => {
  // Reset rate limiting for consistent tests
  await resetRateLimit();
});

describe('Admin Workflow E2E Tests', () => {
  describe('1. Authentication Flow', () => {
    it('should reject invalid login credentials', async () => {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid@test.com',
          password: 'wrong-password',
        }),
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toBeDefined();
    });

    it('should authenticate admin successfully', async () => {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_CONFIG.admin),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();

      adminSession = result.session;
    });

    it('should enforce rate limiting on login attempts', async () => {
      const promises = [];

      // Make 5 login attempts (exceeds limit of 3)
      for (let i = 0; i < 5; i++) {
        promises.push(
          fetch('/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test@test.com',
              password: 'wrong',
            }),
          })
        );
      }

      const responses = await Promise.all(promises);

      // First 3 should be 401, next 2 should be 429
      expect(responses.slice(0, 3).every((r) => r.status === 401)).toBe(true);
      expect(responses.slice(3).some((r) => r.status === 429)).toBe(true);
    });
  });

  describe('2. Event Management', () => {
    it('should create new event successfully', async () => {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession.access_token}`,
        },
        body: JSON.stringify(TEST_CONFIG.event),
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(TEST_CONFIG.event.name);

      testEventId = result.id;
    });

    it('should validate required event fields', async () => {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession.access_token}`,
        },
        body: JSON.stringify({
          // Missing required fields
          name: '',
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.errors).toBeDefined();
    });

    it('should list events for admin', async () => {
      const response = await fetch('/api/admin/events', {
        headers: {
          Authorization: `Bearer ${adminSession.access_token}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(Array.isArray(result)).toBe(true);
      expect(result.some((e: any) => e.id === testEventId)).toBe(true);
    });
  });

  describe('3. Subject Management & Token Generation', () => {
    it('should bulk create subjects with secure tokens', async () => {
      const response = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession.access_token}`,
        },
        body: JSON.stringify({
          event_id: testEventId,
          subjects: TEST_CONFIG.subjects,
        }),
      });

      expect(response.status).toBe(201);
      const result = await response.json();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(TEST_CONFIG.subjects.length);

      // Validate token security requirements
      result.forEach((subject: any) => {
        expect(subject.token).toBeDefined();
        expect(subject.token.length).toBeGreaterThanOrEqual(20);
        expect(subject.expires_at).toBeDefined();

        // Token should be cryptographically secure
        expect(/^[A-Za-z0-9_-]+$/.test(subject.token)).toBe(true);
      });

      testSubjectIds = result.map((s: any) => s.id);
    });

    it('should generate QR PDF for subjects', async () => {
      const response = await fetch(`/api/admin/events/${testEventId}/qr-pdf`, {
        headers: {
          Authorization: `Bearer ${adminSession.access_token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');

      const pdfBuffer = await response.arrayBuffer();
      expect(pdfBuffer.byteLength).toBeGreaterThan(1000); // PDF should have content
    });

    it('should validate token expiration', async () => {
      // Create subject with immediate expiration
      const { data: expiredSubject } = await supabase
        .from('subjects')
        .insert({
          event_id: testEventId,
          name: 'Expired Test',
          email: 'expired@test.com',
          token: 'test_expired_token_123456789',
          expires_at: new Date(Date.now() - 1000).toISOString(), // Already expired
        })
        .select()
        .single();

      // Try to access with expired token
      const response = await fetch(
        `/api/family/gallery/${expiredSubject.token}`
      );
      expect(response.status).toBe(401);
    });

    it('should rotate compromised tokens', async () => {
      const subjectId = testSubjectIds[0];

      const response = await fetch('/api/admin/subjects/rotate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession.access_token}`,
        },
        body: JSON.stringify({ subject_id: subjectId }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      expect(result.token).toBeDefined();
      expect(result.token.length).toBeGreaterThanOrEqual(20);
      expect(result.token).not.toBe(testSubjectIds[0]); // Should be different
    });
  });

  describe('4. Photo Upload & Processing', () => {
    it('should upload and process photos with watermark', async () => {
      // Create test image buffer (1x1 PNG)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
        0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      const formData = new FormData();
      const blob = new Blob([testImageBuffer], { type: 'image/png' });
      formData.append('file', blob, 'test-image.png');
      formData.append('event_id', testEventId);

      const response = await fetch('/api/admin/photos/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession.access_token}`,
        },
        body: formData,
      });

      expect(response.status).toBe(201);
      const result = await response.json();

      expect(result.id).toBeDefined();
      expect(result.storage_path).toBeDefined();
      expect(result.event_id).toBe(testEventId);
      expect(result.status).toBe('processed');

      // Verify the file is stored in private bucket
      expect(result.storage_path).toMatch(/^photos\/\d{4}\/\d{2}\//);
    });

    it('should enforce upload rate limiting', async () => {
      const testImage = new Blob([new Uint8Array(100)], { type: 'image/png' });
      const promises = [];

      // Make 15 upload attempts (exceeds limit of 10/min)
      for (let i = 0; i < 15; i++) {
        const formData = new FormData();
        formData.append('file', testImage, `test-${i}.png`);
        formData.append('event_id', testEventId);

        promises.push(
          fetch('/api/admin/photos/upload', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${adminSession.access_token}`,
            },
            body: formData,
          })
        );
      }

      const responses = await Promise.all(promises);

      // Some requests should be rate limited
      expect(responses.some((r) => r.status === 429)).toBe(true);
    });

    it('should reject invalid file types', async () => {
      const invalidFile = new Blob(['invalid content'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', invalidFile, 'test.txt');
      formData.append('event_id', testEventId);

      const response = await fetch('/api/admin/photos/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession.access_token}`,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
    });

    it('should validate file size limits', async () => {
      // Create a large file (>10MB)
      const largeFile = new Blob([new Uint8Array(11 * 1024 * 1024)], {
        type: 'image/jpeg',
      });
      const formData = new FormData();
      formData.append('file', largeFile, 'large.jpg');
      formData.append('event_id', testEventId);

      const response = await fetch('/api/admin/photos/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession.access_token}`,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
    });
  });

  describe('5. Photo-Subject Assignment (Tagging)', () => {
    it('should assign photos to subjects', async () => {
      // First get photos for the event
      const photosResponse = await fetch(
        `/api/admin/events/${testEventId}/photos`,
        {
          headers: {
            Authorization: `Bearer ${adminSession.access_token}`,
          },
        }
      );

      const photos = await photosResponse.json();
      expect(Array.isArray(photos)).toBe(true);

      if (photos.length > 0 && testSubjectIds.length > 0) {
        const photoId = photos[0].id;
        const subjectId = testSubjectIds[0];

        const response = await fetch('/api/admin/tagging', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.access_token}`,
          },
          body: JSON.stringify({
            photo_id: photoId,
            subject_id: subjectId,
          }),
        });

        expect(response.status).toBe(201);
        const result = await response.json();
        expect(result.photo_id).toBe(photoId);
        expect(result.subject_id).toBe(subjectId);
      }
    });

    it('should prevent duplicate assignments', async () => {
      const photosResponse = await fetch(
        `/api/admin/events/${testEventId}/photos`,
        {
          headers: {
            Authorization: `Bearer ${adminSession.access_token}`,
          },
        }
      );

      const photos = await photosResponse.json();

      if (photos.length > 0 && testSubjectIds.length > 0) {
        const photoId = photos[0].id;
        const subjectId = testSubjectIds[0];

        // Try to assign the same photo-subject combination twice
        await fetch('/api/admin/tagging', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.access_token}`,
          },
          body: JSON.stringify({
            photo_id: photoId,
            subject_id: subjectId,
          }),
        });

        const duplicateResponse = await fetch('/api/admin/tagging', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.access_token}`,
          },
          body: JSON.stringify({
            photo_id: photoId,
            subject_id: subjectId,
          }),
        });

        expect(duplicateResponse.status).toBe(409); // Conflict
      }
    });
  });

  describe('6. Order Management', () => {
    it('should list orders for admin', async () => {
      const response = await fetch('/api/admin/orders', {
        headers: {
          Authorization: `Bearer ${adminSession.access_token}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should export orders to CSV', async () => {
      const response = await fetch('/api/admin/orders/export', {
        headers: {
          Authorization: `Bearer ${adminSession.access_token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/csv');
    });

    it('should update order status', async () => {
      // Create a test order first
      const { data: testOrder } = await supabase
        .from('orders')
        .insert({
          subject_id: testSubjectIds[0],
          total_amount: 1500,
          status: 'approved',
          contact_name: 'Test Parent',
          contact_email: 'parent@test.com',
          contact_phone: '+541234567890',
        })
        .select()
        .single();

      const response = await fetch(`/api/admin/orders/${testOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession.access_token}`,
        },
        body: JSON.stringify({
          status: 'delivered',
        }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.status).toBe('delivered');
    });
  });
});

// Helper functions
async function cleanupTestData() {
  if (testEventId) {
    // Clean up in correct order due to foreign key constraints
    await supabase
      .from('photo_assignments')
      .delete()
      .eq('subject_id', testSubjectIds[0]);
    await supabase.from('order_items').delete().in('order_id', []);
    await supabase.from('orders').delete().in('subject_id', testSubjectIds);
    await supabase.from('photos').delete().eq('event_id', testEventId);
    await supabase.from('subjects').delete().eq('event_id', testEventId);
    await supabase.from('events').delete().eq('id', testEventId);
  }
}

async function resetRateLimit() {
  // In a real implementation, you'd reset Redis or clear the rate limit cache
  // For testing purposes, we can make a request to a reset endpoint
  try {
    await fetch('/api/test/reset-rate-limit', { method: 'POST' });
  } catch {
    // Ignore if endpoint doesn't exist
  }
}
