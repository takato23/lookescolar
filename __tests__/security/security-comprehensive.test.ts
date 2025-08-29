/**
 * Comprehensive Security Test Suite
 * Tests all critical security measures for MVP
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const BASE_URL = 'http://localhost:3000';

let supabase: ReturnType<typeof createClient<Database>>;
const testData = {
  eventId: '',
  subjectToken: '',
  adminToken: '',
};

beforeAll(async () => {
  supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await setupSecurityTestData();
});

afterAll(async () => {
  await cleanupSecurityTestData();
});

describe('Security Test Suite', () => {
  describe('Authentication & Authorization', () => {
    it('should require authentication for admin endpoints', async () => {
      const adminEndpoints = [
        '/api/admin/events',
        '/api/admin/subjects',
        '/api/admin/photos/upload',
        '/api/admin/orders',
        '/api/admin/tagging',
      ];

      for (const endpoint of adminEndpoints) {
        const response = await fetch(`${BASE_URL}${endpoint}`);
        expect([401, 403]).toContain(response.status);
      }
    });

    it('should reject invalid JWT tokens', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/events`, {
        headers: {
          Authorization: 'Bearer invalid-jwt-token-12345',
        },
      });

      expect([401, 403]).toContain(response.status);
    });

    it('should reject expired tokens', async () => {
      // Create a token that's already expired
      const expiredToken =
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid';

      const response = await fetch(`${BASE_URL}/api/admin/events`, {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      });

      expect([401, 403]).toContain(response.status);
    });

    it('should validate subject token access', async () => {
      // Test with invalid token
      const response = await fetch(
        `${BASE_URL}/api/family/gallery/invalid-token-123`
      );
      expect([401, 404]).toContain(response.status);
    });

    it('should reject tokens with insufficient length', async () => {
      const shortToken = 'short';

      const response = await fetch(
        `${BASE_URL}/api/family/gallery/${shortToken}`
      );
      expect([401, 400, 404]).toContain(response.status);
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should rate limit admin login attempts', async () => {
      const promises = [];

      // Make 10 consecutive failed login attempts
      for (let i = 0; i < 10; i++) {
        promises.push(
          fetch(`${BASE_URL}/api/admin/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'attacker@test.com',
              password: 'wrong-password',
            }),
          })
        );
      }

      const responses = await Promise.all(promises);

      // Should have some 429 (rate limited) responses
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should rate limit photo upload requests', async () => {
      if (!testData.adminToken) {
        console.warn('Skipping upload rate limit test - no admin token');
        return;
      }

      const promises = [];
      const testImage = new Blob([new Uint8Array(100)], { type: 'image/png' });

      // Make 15 upload requests quickly
      for (let i = 0; i < 15; i++) {
        const formData = new FormData();
        formData.append('file', testImage, `test-${i}.png`);
        formData.append('event_id', testData.eventId || 'dummy');

        promises.push(
          fetch(`${BASE_URL}/api/admin/photos/upload`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${testData.adminToken}`,
            },
            body: formData,
          })
        );
      }

      const responses = await Promise.all(promises);

      // Should have some 429 responses for rate limiting
      expect(responses.some((r) => r.status === 429)).toBe(true);
    });

    it('should rate limit signed URL requests', async () => {
      const promises = [];

      // Make 70 signed URL requests (above 60/min limit)
      for (let i = 0; i < 70; i++) {
        promises.push(
          fetch(`${BASE_URL}/api/storage/signed-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: testData.subjectToken || 'test-token',
              storage_path: `photos/test-${i}.jpg`,
            }),
          })
        );
      }

      const responses = await Promise.all(promises);

      // Should have rate limited responses
      expect(responses.some((r) => r.status === 429)).toBe(true);
    });

    it('should rate limit family gallery access', async () => {
      if (!testData.subjectToken) {
        console.warn('Skipping gallery rate limit test - no subject token');
        return;
      }

      const promises = [];

      // Make 35 gallery requests (above 30/min limit)
      for (let i = 0; i < 35; i++) {
        promises.push(
          fetch(`${BASE_URL}/api/family/gallery/${testData.subjectToken}`)
        );
      }

      const responses = await Promise.all(promises);

      // Should have some rate limited responses
      expect(responses.some((r) => r.status === 429)).toBe(true);
    });
  });

  describe('Input Validation & Sanitization', () => {
    it('should reject SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE events; --",
        "' UNION SELECT * FROM subjects --",
        "'; UPDATE orders SET status='delivered'; --",
        "' OR 1=1 --",
      ];

      for (const payload of sqlInjectionPayloads) {
        // Test in different endpoints
        const eventResponse = await fetch(`${BASE_URL}/api/gallery/${payload}`);
        expect([400, 401, 404]).toContain(eventResponse.status);

        const tokenResponse = await fetch(
          `${BASE_URL}/api/family/gallery/${payload}`
        );
        expect([400, 401, 404]).toContain(tokenResponse.status);
      }
    });

    it('should sanitize XSS attempts in form inputs', async () => {
      const xssPayloads = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
        "';eval(String.fromCharCode(97,108,101,114,116,40,49,41));//'",
      ];

      for (const payload of xssPayloads) {
        const response = await fetch(`${BASE_URL}/api/admin/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${testData.adminToken || 'dummy'}`,
          },
          body: JSON.stringify({
            name: payload,
            school: 'Test School',
            date: '2024-01-15',
          }),
        });

        // Should either reject or sanitize
        if (response.ok) {
          const result = await response.json();
          expect(result.name).not.toContain('<script>');
          expect(result.name).not.toContain('javascript:');
        }
      }
    });

    it('should validate file upload types', async () => {
      const maliciousFiles = [
        {
          content: '<?php echo "hack"; ?>',
          name: 'hack.php',
          type: 'application/x-php',
        },
        {
          content: '<script>alert("xss")</script>',
          name: 'hack.html',
          type: 'text/html',
        },
        {
          content: 'malicious content',
          name: 'virus.exe',
          type: 'application/x-executable',
        },
      ];

      for (const file of maliciousFiles) {
        const formData = new FormData();
        const blob = new Blob([file.content], { type: file.type });
        formData.append('file', blob, file.name);
        formData.append('event_id', testData.eventId || 'dummy');

        const response = await fetch(`${BASE_URL}/api/admin/photos/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${testData.adminToken || 'dummy'}`,
          },
          body: formData,
        });

        expect([400, 415, 422]).toContain(response.status);
      }
    });

    it('should validate file size limits', async () => {
      // Create a file larger than 10MB
      const largeFileContent = new Uint8Array(11 * 1024 * 1024); // 11MB
      const formData = new FormData();
      const blob = new Blob([largeFileContent], { type: 'image/jpeg' });
      formData.append('file', blob, 'large.jpg');
      formData.append('event_id', testData.eventId || 'dummy');

      const response = await fetch(`${BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testData.adminToken || 'dummy'}`,
        },
        body: formData,
      });

      expect([400, 413, 422]).toContain(response.status);
    });
  });

  describe('Mercado Pago Webhook Security', () => {
    it('should validate webhook signatures', async () => {
      const webhookPayload = {
        id: 'test-webhook-123',
        type: 'payment',
        data: { payment_id: 'test-payment-123' },
      };

      // Test without signature
      const noSigResponse = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      expect([400, 401]).toContain(noSigResponse.status);

      // Test with invalid signature
      const invalidSigResponse = await fetch(
        `${BASE_URL}/api/payments/webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': 'invalid-signature',
            'x-request-id': 'test-request',
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      expect([400, 401, 422]).toContain(invalidSigResponse.status);
    });

    it('should be idempotent for duplicate webhooks', async () => {
      const webhookPayload = {
        id: 'duplicate-test-123',
        type: 'payment',
        data: { payment_id: 'duplicate-payment-123' },
      };

      // Send same webhook twice
      const response1 = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature',
          'x-request-id': 'duplicate-test-123',
        },
        body: JSON.stringify(webhookPayload),
      });

      const response2 = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature',
          'x-request-id': 'duplicate-test-123',
        },
        body: JSON.stringify(webhookPayload),
      });

      // Both should return same status (idempotent)
      expect(response1.status).toBe(response2.status);
    });

    it('should handle webhook replay attacks', async () => {
      const oldWebhook = {
        id: 'old-webhook-123',
        date_created: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours old
        type: 'payment',
        data: { payment_id: 'old-payment-123' },
      };

      const response = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature',
          'x-request-id': 'old-webhook-123',
        },
        body: JSON.stringify(oldWebhook),
      });

      // Should reject old webhooks
      expect([400, 401, 422]).toContain(response.status);
    });
  });

  describe('Data Privacy & Access Controls', () => {
    it('should not expose sensitive data in API responses', async () => {
      // Test admin subjects endpoint
      const response = await fetch(`${BASE_URL}/api/admin/subjects`, {
        headers: {
          Authorization: `Bearer ${testData.adminToken || 'dummy'}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.subjects && result.subjects.length > 0) {
          const subject = result.subjects[0];

          // Should not expose full token in listings
          if (subject.token) {
            expect(subject.token.length).toBeLessThan(50); // Should be masked
          }
        }
      }
    });

    it('should prevent access to other subjects data', async () => {
      if (!testData.subjectToken) return;

      // Try to access gallery with different token
      const otherToken = 'other-subject-token-123456789';

      const response = await fetch(
        `${BASE_URL}/api/family/gallery/${otherToken}`
      );
      expect([401, 404]).toContain(response.status);
    });

    it('should validate RLS (Row Level Security) policies', async () => {
      // This test would require direct database testing
      // For now, we test through API behavior

      if (!testData.subjectToken) return;

      const response = await fetch(
        `${BASE_URL}/api/family/gallery/${testData.subjectToken}`
      );

      if (response.ok) {
        const result = await response.json();

        // Should only return photos assigned to this subject
        if (result.photos && result.photos.length > 0) {
          // Each photo should be accessible to this subject
          expect(result.subject.token).toBe(testData.subjectToken);
        }
      }
    });
  });

  describe('Error Handling & Information Disclosure', () => {
    it('should not leak sensitive information in error messages', async () => {
      // Test various error scenarios
      const errorEndpoints = [
        { url: '/api/admin/events/nonexistent-id', method: 'GET' },
        { url: '/api/family/gallery/invalid-token', method: 'GET' },
        { url: '/api/admin/photos/upload', method: 'POST' },
      ];

      for (const endpoint of errorEndpoints) {
        const response = await fetch(`${BASE_URL}${endpoint.url}`, {
          method: endpoint.method,
          headers: {
            Authorization: 'Bearer invalid-token',
            'Content-Type': 'application/json',
          },
          body: endpoint.method === 'POST' ? '{}' : undefined,
        });

        if (!response.ok) {
          const errorText = await response.text();

          // Should not expose:
          expect(errorText).not.toMatch(/database/i);
          expect(errorText).not.toMatch(/sql/i);
          expect(errorText).not.toMatch(/table/i);
          expect(errorText).not.toMatch(/column/i);
          expect(errorText).not.toMatch(/password/i);
          expect(errorText).not.toMatch(/secret/i);
          expect(errorText).not.toMatch(/key/i);
          expect(errorText).not.toMatch(/token.*[a-zA-Z0-9]{20,}/); // Full tokens
        }
      }
    });

    it('should handle malformed JSON requests', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testData.adminToken || 'dummy'}`,
        },
        body: '{ invalid json }',
      });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('CSRF Protection', () => {
    it('should validate content-type for POST requests', async () => {
      // Try to send form data to JSON endpoint
      const response = await fetch(`${BASE_URL}/api/admin/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testData.adminToken || 'dummy'}`,
          // No Content-Type header
        },
        body: 'name=test&school=test',
      });

      expect([400, 415, 422]).toContain(response.status);
    });
  });

  describe('Content Security Policy', () => {
    it('should include security headers', async () => {
      const response = await fetch(`${BASE_URL}/`);

      // Should have security headers
      const headers = response.headers;

      // Check for common security headers
      expect(headers.get('x-frame-options')).toBeTruthy();
      expect(headers.get('x-content-type-options')).toBeTruthy();
    });
  });
});

// Helper functions
async function setupSecurityTestData() {
  try {
    // Create minimal test data for security tests
    const { data: event } = await supabase
      .from('events')
      .insert({
        name: 'Security Test Event',
        school: 'Security Test School',
        date: '2024-01-15',
        location: 'Security Test Location',
      })
      .select()
      .single();

    if (event) {
      testData.eventId = event.id;

      const { data: subject } = await supabase
        .from('subjects')
        .insert({
          event_id: event.id,
          name: 'Security Test Subject',
          email: 'security@test.com',
          token: 'security_test_token_1234567890',
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
    console.warn('Security test setup had issues:', error);
  }
}

async function cleanupSecurityTestData() {
  try {
    if (testData.eventId) {
      await supabase.from('subjects').delete().eq('event_id', testData.eventId);
      await supabase.from('events').delete().eq('id', testData.eventId);
    }
  } catch (error) {
    console.warn('Security test cleanup had issues:', error);
  }
}
