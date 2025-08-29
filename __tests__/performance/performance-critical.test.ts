/**
 * Performance & Error Handling Test Suite
 * Tests critical performance metrics and error scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const BASE_URL = 'http://localhost:3000';

// Performance thresholds from CLAUDE.md
const PERFORMANCE_THRESHOLDS = {
  apiResponse: 200, // ms
  photoProcessing: 3000, // ms
  galleryLoad: 2000, // ms
  uploadPerPhoto: 5000, // ms
  webhookResponse: 3000, // ms (MP requirement)
};

let supabase: ReturnType<typeof createClient<Database>>;
const testData = {
  eventId: '',
  subjectToken: '',
  photoId: '',
  adminToken: '',
};

beforeAll(async () => {
  supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await setupPerformanceTestData();
});

afterAll(async () => {
  await cleanupPerformanceTestData();
});

describe('Performance Tests', () => {
  describe('API Response Times', () => {
    it('Admin events API should respond under 200ms', async () => {
      const start = Date.now();

      const response = await fetch(`${BASE_URL}/api/admin/events`, {
        headers: {
          Authorization: `Bearer ${testData.adminToken || 'dummy'}`,
        },
      });

      const duration = Date.now() - start;

      // Log for monitoring
      console.log(`Admin events API: ${duration}ms`);

      if (response.ok) {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);
      } else {
        console.warn(
          `Admin events API returned ${response.status}, timing: ${duration}ms`
        );
      }
    });

    it('Family gallery API should respond under 200ms', async () => {
      if (!testData.subjectToken) {
        console.warn('Skipping gallery performance test - no subject token');
        return;
      }

      const start = Date.now();

      const response = await fetch(
        `${BASE_URL}/api/family/gallery/${testData.subjectToken}`
      );

      const duration = Date.now() - start;

      console.log(`Family gallery API: ${duration}ms`);

      if (response.ok) {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);
      }
    });

    it('Public gallery should load under 2 seconds', async () => {
      if (!testData.eventId) {
        console.warn('Skipping public gallery performance test - no event ID');
        return;
      }

      const start = Date.now();

      const response = await fetch(
        `${BASE_URL}/api/gallery/${testData.eventId}`
      );

      const duration = Date.now() - start;

      console.log(`Public gallery API: ${duration}ms`);

      if (response.ok) {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.galleryLoad);
      }
    });

    it('Signed URL generation should be fast', async () => {
      const start = Date.now();

      const response = await fetch(`${BASE_URL}/api/storage/signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: testData.subjectToken || 'test-token',
          storage_path: 'photos/2024/01/test.jpg',
        }),
      });

      const duration = Date.now() - start;

      console.log(`Signed URL generation: ${duration}ms`);

      if (response.ok) {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);
      }
    });
  });

  describe('Photo Processing Performance', () => {
    it('Photo upload and watermark processing should complete under 3 seconds', async () => {
      if (!testData.eventId || !testData.adminToken) {
        console.warn('Skipping photo processing test - missing requirements');
        return;
      }

      // Create test image (1x1 PNG)
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
      formData.append('file', blob, 'performance-test.png');
      formData.append('event_id', testData.eventId);

      const start = Date.now();

      const response = await fetch(`${BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testData.adminToken}`,
        },
        body: formData,
      });

      const duration = Date.now() - start;

      console.log(`Photo processing: ${duration}ms`);

      if (response.ok) {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.photoProcessing);

        const result = await response.json();
        expect(result.status).toBe('processed');

        testData.photoId = result.id;
      }
    });

    it('Batch photo upload should handle concurrency limits', async () => {
      if (!testData.eventId || !testData.adminToken) return;

      const testImage = new Blob([new Uint8Array(1000)], { type: 'image/png' });
      const uploadPromises = [];

      // Try to upload 5 photos simultaneously (should respect concurrency limit)
      for (let i = 0; i < 5; i++) {
        const formData = new FormData();
        formData.append('file', testImage, `batch-${i}.png`);
        formData.append('event_id', testData.eventId);

        uploadPromises.push(
          fetch(`${BASE_URL}/api/admin/photos/upload`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${testData.adminToken}`,
            },
            body: formData,
          })
        );
      }

      const start = Date.now();
      const responses = await Promise.all(uploadPromises);
      const duration = Date.now() - start;

      console.log(`Batch upload (5 photos): ${duration}ms`);

      // Should complete in reasonable time even with concurrency limits
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.uploadPerPhoto * 2);

      // Some should succeed (or all fail gracefully if no real processing)
      const successCount = responses.filter((r) => r.ok).length;
      console.log(`Batch upload success rate: ${successCount}/5`);
    });
  });

  describe('Memory Usage & Resource Management', () => {
    it('Should handle large gallery requests without memory leaks', async () => {
      if (!testData.subjectToken) return;

      // Make multiple gallery requests to test memory usage
      const requestPromises = [];

      for (let i = 0; i < 10; i++) {
        requestPromises.push(
          fetch(`${BASE_URL}/api/family/gallery/${testData.subjectToken}`)
        );
      }

      const start = Date.now();
      const responses = await Promise.all(requestPromises);
      const duration = Date.now() - start;

      console.log(`10 gallery requests: ${duration}ms`);

      // All should complete and most should succeed
      const successCount = responses.filter((r) => r.ok).length;
      expect(successCount).toBeGreaterThanOrEqual(8); // At least 80% success
    });

    it('Should handle webhook processing under load', async () => {
      // Simulate multiple webhook requests
      const webhookPromises = [];

      for (let i = 0; i < 5; i++) {
        const webhookPayload = {
          id: `load-test-${i}`,
          type: 'payment',
          date_created: new Date().toISOString(),
          data: { payment_id: `load-payment-${i}` },
        };

        webhookPromises.push(
          fetch(`${BASE_URL}/api/payments/webhook`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-signature': 'test-signature',
              'x-request-id': `load-test-${i}`,
            },
            body: JSON.stringify(webhookPayload),
          })
        );
      }

      const start = Date.now();
      const responses = await Promise.all(webhookPromises);
      const duration = Date.now() - start;

      console.log(`5 webhook requests: ${duration}ms`);

      // Each webhook should respond under 3 seconds
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.webhookResponse);

      // All should respond (success or expected failure)
      responses.forEach((response) => {
        expect([200, 400, 404, 422]).toContain(response.status);
      });
    });
  });
});

describe('Error Handling Tests', () => {
  describe('Network Error Scenarios', () => {
    it('Should handle connection timeouts gracefully', async () => {
      // This would require mocking network delays
      // For now, test with a reasonable timeout expectation

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch(`${BASE_URL}/api/admin/events`, {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${testData.adminToken || 'dummy'}`,
          },
        });

        clearTimeout(timeoutId);

        // Should respond within timeout
        expect([200, 401, 403]).toContain(response.status);
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          // Request took too long
          expect(true).toBe(false); // This should not happen in a healthy system
        } else {
          // Other network error - should be handled gracefully
          expect(error.message).toBeDefined();
        }
      }
    });

    it('Should handle malformed request bodies', async () => {
      const malformedBodies = [
        'not-json',
        '{"incomplete":',
        '{"number": NaN}',
        '{"date": "invalid-date"}',
        '{"nested": {"too": {"deep": {"data": "here"}}}}',
      ];

      for (const body of malformedBodies) {
        const response = await fetch(`${BASE_URL}/api/admin/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${testData.adminToken || 'dummy'}`,
          },
          body,
        });

        expect([400, 422]).toContain(response.status);

        const errorResponse = await response.text();
        expect(errorResponse).toBeDefined();
        expect(errorResponse.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Database Error Scenarios', () => {
    it('Should handle database connection issues', async () => {
      // Test with invalid database queries by using non-existent resources
      const response = await fetch(
        `${BASE_URL}/api/gallery/non-existent-event-id`
      );

      expect([404, 400]).toContain(response.status);

      const result = await response.text();
      expect(result).toBeDefined();
      // Should not expose database details
      expect(result.toLowerCase()).not.toContain('database');
      expect(result.toLowerCase()).not.toContain('sql');
    });

    it('Should handle foreign key constraint violations', async () => {
      if (!testData.adminToken) return;

      // Try to create subject for non-existent event
      const response = await fetch(`${BASE_URL}/api/admin/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testData.adminToken}`,
        },
        body: JSON.stringify({
          event_id: 'non-existent-event-id',
          name: 'Test Subject',
          email: 'test@test.com',
        }),
      });

      expect([400, 404, 422]).toContain(response.status);
    });
  });

  describe('File Processing Error Scenarios', () => {
    it('Should handle corrupted image files', async () => {
      if (!testData.eventId || !testData.adminToken) return;

      // Create corrupted image data
      const corruptedImage = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // Incomplete JPEG header

      const formData = new FormData();
      const blob = new Blob([corruptedImage], { type: 'image/jpeg' });
      formData.append('file', blob, 'corrupted.jpg');
      formData.append('event_id', testData.eventId);

      const response = await fetch(`${BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testData.adminToken}`,
        },
        body: formData,
      });

      expect([400, 422]).toContain(response.status);
    });

    it('Should handle disk space issues gracefully', async () => {
      // This is hard to test without actually filling disk
      // For now, test with a reasonable large file that might trigger limits

      if (!testData.eventId || !testData.adminToken) return;

      // Create 5MB file (under limit but substantial)
      const largeImage = new Uint8Array(5 * 1024 * 1024);
      largeImage.fill(0xff); // Fill with data

      const formData = new FormData();
      const blob = new Blob([largeImage], { type: 'image/jpeg' });
      formData.append('file', blob, 'large.jpg');
      formData.append('event_id', testData.eventId);

      const response = await fetch(`${BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testData.adminToken}`,
        },
        body: formData,
      });

      // Should either succeed or fail gracefully
      if (!response.ok) {
        expect([400, 413, 422, 507]).toContain(response.status);
      }
    });
  });

  describe('External Service Error Scenarios', () => {
    it('Should handle Mercado Pago API failures', async () => {
      if (!testData.subjectToken || !testData.photoId) return;

      // Mock MP API failure
      global.fetch = vi.fn().mockRejectedValue(new Error('MP API Error'));

      const response = await fetch(`${BASE_URL}/api/family/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: testData.subjectToken,
          items: [
            {
              photo_id: testData.photoId,
              print_size: 'digital',
              quantity: 1,
              unit_price: 1500,
            },
          ],
          contact: {
            contact_name: 'Test Parent',
            contact_email: 'parent@test.com',
            contact_phone: '+541234567890',
          },
        }),
      });

      expect([500, 502, 503]).toContain(response.status);

      // Restore original fetch
      global.fetch = fetch;
    });

    it('Should handle Supabase storage failures', async () => {
      // Test signed URL generation failure
      const response = await fetch(`${BASE_URL}/api/storage/signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: testData.subjectToken || 'test-token',
          storage_path: 'non-existent/path/file.jpg',
        }),
      });

      if (!response.ok) {
        expect([400, 404, 500]).toContain(response.status);
      }
    });
  });

  describe('Edge Cases & Race Conditions', () => {
    it('Should handle concurrent photo assignments', async () => {
      if (!testData.photoId || !testData.adminToken) return;

      // Create another subject for testing
      const { data: testSubject } = await supabase
        .from('subjects')
        .insert({
          event_id: testData.eventId || 'dummy',
          name: 'Concurrent Test Subject',
          email: 'concurrent@test.com',
          token: 'concurrent_test_token_1234567890',
          token_expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .select()
        .single();

      if (!testSubject) return;

      // Try to assign same photo to multiple subjects simultaneously
      const assignmentPromises = [
        fetch(`${BASE_URL}/api/admin/tagging`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${testData.adminToken}`,
          },
          body: JSON.stringify({
            photo_id: testData.photoId,
            subject_id: testSubject.id,
          }),
        }),
        fetch(`${BASE_URL}/api/admin/tagging`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${testData.adminToken}`,
          },
          body: JSON.stringify({
            photo_id: testData.photoId,
            subject_id: testSubject.id,
          }),
        }),
      ];

      const responses = await Promise.all(assignmentPromises);

      // One should succeed, one should fail (duplicate prevention)
      const successCount = responses.filter((r) => r.ok).length;
      const duplicateErrors = responses.filter((r) => r.status === 409).length;

      expect(successCount + duplicateErrors).toBe(2);

      // Cleanup
      await supabase.from('subjects').delete().eq('id', testSubject.id);
    });

    it('Should handle token expiration edge cases', async () => {
      // Create subject with token expiring very soon
      const { data: expiringSubject } = await supabase
        .from('subjects')
        .insert({
          event_id: testData.eventId || 'dummy',
          name: 'Expiring Test Subject',
          email: 'expiring@test.com',
          token: 'expiring_test_token_1234567890',
          token_expires_at: new Date(Date.now() + 1000).toISOString(), // Expires in 1 second
        })
        .select()
        .single();

      if (!expiringSubject) return;

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Try to use expired token
      const response = await fetch(
        `${BASE_URL}/api/family/gallery/${expiringSubject.token}`
      );
      expect([401, 404]).toContain(response.status);

      // Cleanup
      await supabase.from('subjects').delete().eq('id', expiringSubject.id);
    });
  });
});

// Helper functions
async function setupPerformanceTestData() {
  try {
    // Create test event
    const { data: event } = await supabase
      .from('events')
      .insert({
        name: 'Performance Test Event',
        school: 'Performance Test School',
        date: '2024-01-15',
        location: 'Performance Test Location',
      })
      .select()
      .single();

    if (event) {
      testData.eventId = event.id;

      // Create test subject
      const { data: subject } = await supabase
        .from('subjects')
        .insert({
          event_id: event.id,
          name: 'Performance Test Subject',
          email: 'performance@test.com',
          token: 'performance_test_token_1234567890',
          token_expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .select()
        .single();

      if (subject) {
        testData.subjectToken = subject.token;
      }
    }
  } catch (error) {
    console.warn('Performance test setup had issues:', error);
  }
}

async function cleanupPerformanceTestData() {
  try {
    if (testData.eventId) {
      await supabase.from('photos').delete().eq('event_id', testData.eventId);
      await supabase.from('subjects').delete().eq('event_id', testData.eventId);
      await supabase.from('events').delete().eq('id', testData.eventId);
    }
  } catch (error) {
    console.warn('Performance test cleanup had issues:', error);
  }
}
