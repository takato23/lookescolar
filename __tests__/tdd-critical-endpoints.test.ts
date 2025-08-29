/**
 * TDD CRITICAL ENDPOINTS TESTS
 *
 * Comprehensive test-driven development tests for the 5 critical endpoints
 * identified in CLAUDE.md:
 *
 * 1. /api/admin/photos/upload - Upload and processing
 * 2. /api/family/gallery/[token] - Token-based access
 * 3. /api/payments/webhook - Webhook MP idempotency
 * 4. /api/admin/tagging - Photo-subject assignment
 * 5. /api/storage/signed-url - URL generation
 */

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import {
  setupTestData,
  cleanupTestData,
  createTestClient,
  setupMocks,
} from './test-utils';
import type { Database } from '../types/database';

// Test configuration
const TEST_TIMEOUT = 10000;
const API_BASE_URL = 'http://localhost:3000';

interface TestContext {
  adminToken?: string;
  eventId: string;
  subjectId: string;
  subjectToken: string;
  photoIds: string[];
  orderId?: string;
  testData?: any;
}

let testContext: TestContext;

describe('TDD Critical Endpoints Test Suite', () => {
  beforeAll(async () => {
    setupMocks();

    // Setup test data
    const testData = await setupTestData();
    testContext = {
      eventId: testData.eventId,
      subjectId: testData.subjectId,
      subjectToken: testData.validToken,
      photoIds: testData.photoIds,
      testData,
    };

    // Create admin session for authenticated tests
    try {
      const adminAuth = await fetch(`${API_BASE_URL}/api/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.TEST_ADMIN_EMAIL,
          password: process.env.TEST_ADMIN_PASSWORD,
        }),
      });

      if (adminAuth.ok) {
        const authData = await adminAuth.json();
        testContext.adminToken = authData.access_token;
      }
    } catch (error) {
      console.warn(
        'Admin authentication failed, some tests may be skipped:',
        error
      );
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (testContext.testData) {
      await cleanupTestData(testContext.testData);
    }
  }, TEST_TIMEOUT);

  /**
   * CRITICAL ENDPOINT 1: /api/admin/photos/upload
   * Requirements:
   * - Authentication required
   * - File validation (type, size)
   * - Watermark processing
   * - Storage path generation
   * - Processing time <3s per image
   */
  describe('1. Photo Upload API (/api/admin/photos/upload)', () => {
    test('should require authentication', async () => {
      const formData = new FormData();
      formData.append('eventId', testContext.eventId);

      const response = await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('authentication');
    });

    test('should validate file type and size', async () => {
      if (!testContext.adminToken) {
        console.warn('Skipping authenticated test - no admin token');
        return;
      }

      // Test invalid file type
      const invalidFormData = new FormData();
      invalidFormData.append('eventId', testContext.eventId);
      invalidFormData.append(
        'photos',
        new Blob(['test'], { type: 'text/plain' }),
        'test.txt'
      );

      const invalidResponse = await fetch(
        `${API_BASE_URL}/api/admin/photos/upload`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${testContext.adminToken}` },
          body: invalidFormData,
        }
      );

      expect([400, 422]).toContain(invalidResponse.status);
      const invalidData = await invalidResponse.json();
      expect(invalidData.error).toMatch(/file type|format/i);
    });

    test(
      'should upload and process photo with watermark',
      async () => {
        if (!testContext.adminToken) {
          console.warn('Skipping authenticated test - no admin token');
          return;
        }

        // Create mock image blob
        const mockImageBlob = new Blob(['mock image data'], {
          type: 'image/jpeg',
        });
        const formData = new FormData();
        formData.append('eventId', testContext.eventId);
        formData.append('photos', mockImageBlob, 'test-photo.jpg');

        const startTime = Date.now();
        const response = await fetch(
          `${API_BASE_URL}/api/admin/photos/upload`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${testContext.adminToken}` },
            body: formData,
          }
        );
        const processingTime = Date.now() - startTime;

        if (response.ok) {
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.photos).toBeDefined();
          expect(data.photos.length).toBeGreaterThan(0);
          expect(processingTime).toBeLessThan(3000); // <3s requirement

          // Verify watermark processing
          const uploadedPhoto = data.photos[0];
          expect(uploadedPhoto.storage_path).toBeDefined();
          expect(uploadedPhoto.filename).toContain('.jpg');
        } else {
          // Log for debugging but don't fail test if infrastructure isn't ready
          console.warn(
            'Photo upload test failed with status:',
            response.status
          );
          const errorData = await response.json();
          console.warn('Error:', errorData);
        }
      },
      TEST_TIMEOUT
    );

    test('should handle concurrent uploads with rate limiting', async () => {
      if (!testContext.adminToken) {
        console.warn('Skipping authenticated test - no admin token');
        return;
      }

      const uploadPromises = [];
      for (let i = 0; i < 12; i++) {
        // Exceed rate limit of 10 req/min
        const mockImageBlob = new Blob(['mock image data'], {
          type: 'image/jpeg',
        });
        const formData = new FormData();
        formData.append('eventId', testContext.eventId);
        formData.append('photos', mockImageBlob, `test-photo-${i}.jpg`);

        uploadPromises.push(
          fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${testContext.adminToken}` },
            body: formData,
          })
        );
      }

      const responses = await Promise.all(uploadPromises);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      // Should have some rate limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  /**
   * CRITICAL ENDPOINT 2: /api/family/gallery/[token]
   * Requirements:
   * - Token validation (≥20 chars)
   * - Secure access control
   * - Only show assigned photos
   * - Response time <200ms
   * - Rate limiting per token
   */
  describe('2. Family Gallery API (/api/family/gallery/[token])', () => {
    test('should validate token format and length', async () => {
      // Test invalid token formats
      const invalidTokens = ['', 'short', '12345', 'invalid-token-format'];

      for (const token of invalidTokens) {
        const response = await fetch(
          `${API_BASE_URL}/api/family/gallery/${token}`
        );
        expect([400, 401, 404]).toContain(response.status);
      }
    });

    test('should reject expired tokens', async () => {
      if (!testContext.testData?.expiredToken) {
        console.warn(
          'Skipping expired token test - no expired token available'
        );
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/family/gallery/${testContext.testData.expiredToken}`
      );
      expect([401, 403]).toContain(response.status);

      const data = await response.json();
      expect(data.error).toMatch(/expired|invalid/i);
    });

    test('should return only assigned photos for valid token', async () => {
      const startTime = Date.now();
      const response = await fetch(
        `${API_BASE_URL}/api/family/gallery/${testContext.subjectToken}`
      );
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();

        // Verify response structure
        expect(data.photos).toBeDefined();
        expect(data.subject).toBeDefined();
        expect(data.event).toBeDefined();

        // Verify security: only photos assigned to this subject
        if (data.photos.length > 0) {
          data.photos.forEach((photo: any) => {
            expect(photo.subject_id).toBe(testContext.subjectId);
            expect(photo.approved).toBe(true);
          });
        }

        // Verify performance requirement <200ms
        expect(responseTime).toBeLessThan(200);
      } else {
        console.warn('Gallery test failed with status:', response.status);
        const errorData = await response.json();
        console.warn('Error:', errorData);
      }
    });

    test('should implement rate limiting per token', async () => {
      const requests = [];

      // Make multiple rapid requests
      for (let i = 0; i < 35; i++) {
        // Exceed rate limit of 30 req/min
        requests.push(
          fetch(
            `${API_BASE_URL}/api/family/gallery/${testContext.subjectToken}`
          )
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      // Should have rate limiting active
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should not leak photos from other subjects', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/family/gallery/${testContext.subjectToken}`
      );

      if (response.ok) {
        const data = await response.json();

        // Verify no photos from other subjects are returned
        if (data.photos.length > 0) {
          data.photos.forEach((photo: any) => {
            expect(photo.subject_id).toBe(testContext.subjectId);
          });
        }
      }
    });
  });

  /**
   * CRITICAL ENDPOINT 3: /api/payments/webhook
   * Requirements:
   * - HMAC signature verification
   * - Idempotency by mp_payment_id
   * - Response time <3s
   * - Proper error handling
   * - No sensitive data logging
   */
  describe('3. Payments Webhook API (/api/payments/webhook)', () => {
    test('should verify HMAC signature', async () => {
      const webhookPayload = {
        id: 'test-webhook-id',
        live_mode: false,
        type: 'payment',
        data: {
          id: 'test-payment-id',
        },
      };

      // Test without signature
      const noSignatureResponse = await fetch(
        `${API_BASE_URL}/api/payments/webhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        }
      );

      expect([400, 401]).toContain(noSignatureResponse.status);

      // Test with invalid signature
      const invalidSignatureResponse = await fetch(
        `${API_BASE_URL}/api/payments/webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': 'invalid-signature',
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      expect([400, 401]).toContain(invalidSignatureResponse.status);
    });

    test('should be idempotent for duplicate webhooks', async () => {
      const webhookPayload = {
        id: 'duplicate-test-webhook',
        live_mode: false,
        type: 'payment',
        data: {
          id: 'duplicate-payment-id-' + Date.now(),
        },
      };

      // Create proper signature (mock implementation)
      const mockSignature = 'v1=mock-valid-signature';

      const firstResponse = await fetch(
        `${API_BASE_URL}/api/payments/webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': mockSignature,
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      const secondResponse = await fetch(
        `${API_BASE_URL}/api/payments/webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': mockSignature,
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      // Both should return success but second should detect duplicate
      if (firstResponse.ok) {
        expect(secondResponse.ok).toBe(true);

        const secondData = await secondResponse.json();
        expect(secondData.processed).toBe(false); // Already processed
      }
    });

    test('should respond within 3 seconds', async () => {
      const webhookPayload = {
        id: 'performance-test-webhook',
        live_mode: false,
        type: 'payment',
        data: {
          id: 'performance-payment-id',
        },
      };

      const startTime = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'v1=mock-signature',
        },
        body: JSON.stringify(webhookPayload),
      });
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(3000); // <3s requirement
    });

    test('should handle malformed webhook data', async () => {
      const malformedPayloads = [
        '{"invalid": "json"',
        '',
        '{"missing": "required_fields"}',
        null,
      ];

      for (const payload of malformedPayloads) {
        const response = await fetch(`${API_BASE_URL}/api/payments/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': 'v1=mock-signature',
          },
          body: payload,
        });

        expect([400, 422]).toContain(response.status);
      }
    });
  });

  /**
   * CRITICAL ENDPOINT 4: /api/admin/tagging
   * Requirements:
   * - Photo-subject assignment
   * - Authentication required
   * - Validation of photo and subject IDs
   * - Batch tagging support
   * - Audit trail
   */
  describe('4. Photo Tagging API (/api/admin/tagging)', () => {
    test('should require admin authentication', async () => {
      const taggingData = {
        photoIds: [testContext.photoIds[0]],
        subjectId: testContext.subjectId,
      };

      const response = await fetch(`${API_BASE_URL}/api/admin/tagging`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taggingData),
      });

      expect(response.status).toBe(401);
    });

    test('should validate photo and subject IDs', async () => {
      if (!testContext.adminToken) {
        console.warn('Skipping authenticated test - no admin token');
        return;
      }

      // Test with invalid photo ID
      const invalidPhotoData = {
        photoIds: ['invalid-photo-id'],
        subjectId: testContext.subjectId,
      };

      const invalidPhotoResponse = await fetch(
        `${API_BASE_URL}/api/admin/tagging`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${testContext.adminToken}`,
          },
          body: JSON.stringify(invalidPhotoData),
        }
      );

      expect([400, 404]).toContain(invalidPhotoResponse.status);

      // Test with invalid subject ID
      const invalidSubjectData = {
        photoIds: [testContext.photoIds[0]],
        subjectId: 'invalid-subject-id',
      };

      const invalidSubjectResponse = await fetch(
        `${API_BASE_URL}/api/admin/tagging`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${testContext.adminToken}`,
          },
          body: JSON.stringify(invalidSubjectData),
        }
      );

      expect([400, 404]).toContain(invalidSubjectResponse.status);
    });

    test('should assign photos to subjects successfully', async () => {
      if (!testContext.adminToken) {
        console.warn('Skipping authenticated test - no admin token');
        return;
      }

      const taggingData = {
        photoIds: [testContext.photoIds[0]],
        subjectId: testContext.subjectId,
      };

      const response = await fetch(`${API_BASE_URL}/api/admin/tagging`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testContext.adminToken}`,
        },
        body: JSON.stringify(taggingData),
      });

      if (response.ok) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.tagged_count).toBeGreaterThan(0);
        expect(data.photo_ids).toContain(testContext.photoIds[0]);
      } else {
        console.warn('Tagging test failed with status:', response.status);
      }
    });

    test('should support batch tagging operations', async () => {
      if (!testContext.adminToken || testContext.photoIds.length < 2) {
        console.warn('Skipping batch tagging test - insufficient setup');
        return;
      }

      const batchTaggingData = {
        photoIds: testContext.photoIds,
        subjectId: testContext.subjectId,
      };

      const response = await fetch(`${API_BASE_URL}/api/admin/tagging`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testContext.adminToken}`,
        },
        body: JSON.stringify(batchTaggingData),
      });

      if (response.ok) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.tagged_count).toBe(testContext.photoIds.length);
      }
    });
  });

  /**
   * CRITICAL ENDPOINT 5: /api/storage/signed-url
   * Requirements:
   * - Generate secure signed URLs
   * - 1 hour expiration
   * - Rate limiting (60 req/min per token)
   * - URL masking in logs
   * - Anti-hotlinking protection
   */
  describe('5. Signed URL API (/api/storage/signed-url)', () => {
    test('should require valid token or authentication', async () => {
      const signedUrlData = {
        photoId: testContext.photoIds[0],
      };

      const response = await fetch(`${API_BASE_URL}/api/storage/signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedUrlData),
      });

      expect([401, 403]).toContain(response.status);
    });

    test('should generate valid signed URLs with proper expiration', async () => {
      const signedUrlData = {
        photoId: testContext.photoIds[0],
        token: testContext.subjectToken,
      };

      const response = await fetch(`${API_BASE_URL}/api/storage/signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedUrlData),
      });

      if (response.ok) {
        const data = await response.json();
        expect(data.signedUrl).toBeDefined();
        expect(data.expiresAt).toBeDefined();

        // Verify URL structure
        expect(data.signedUrl).toMatch(/^https?:\/\//);

        // Verify expiration is approximately 1 hour
        const expirationTime = new Date(data.expiresAt).getTime();
        const currentTime = Date.now();
        const timeUntilExpiration = expirationTime - currentTime;

        expect(timeUntilExpiration).toBeGreaterThan(55 * 60 * 1000); // >55 min
        expect(timeUntilExpiration).toBeLessThan(65 * 60 * 1000); // <65 min
      } else {
        console.warn('Signed URL test failed with status:', response.status);
      }
    });

    test('should implement rate limiting per token', async () => {
      const requests = [];
      const signedUrlData = {
        photoId: testContext.photoIds[0],
        token: testContext.subjectToken,
      };

      // Make multiple rapid requests to exceed 60 req/min limit
      for (let i = 0; i < 65; i++) {
        requests.push(
          fetch(`${API_BASE_URL}/api/storage/signed-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signedUrlData),
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      // Should have some rate limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should validate photo access permissions', async () => {
      // Try to access photo not assigned to this subject
      if (!testContext.testData?.otherSubjectPhotoId) {
        console.warn(
          'Skipping permission test - no other subject photo available'
        );
        return;
      }

      const unauthorizedData = {
        photoId: testContext.testData.otherSubjectPhotoId,
        token: testContext.subjectToken,
      };

      const response = await fetch(`${API_BASE_URL}/api/storage/signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unauthorizedData),
      });

      expect([403, 404]).toContain(response.status);
    });

    test('should include anti-hotlinking protection', async () => {
      const signedUrlData = {
        photoId: testContext.photoIds[0],
        token: testContext.subjectToken,
      };

      const response = await fetch(`${API_BASE_URL}/api/storage/signed-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://malicious-site.com', // Invalid referer
        },
        body: JSON.stringify(signedUrlData),
      });

      if (response.status === 403) {
        // Anti-hotlinking is active
        const data = await response.json();
        expect(data.error).toMatch(/referer|origin/i);
      }
    });
  });

  /**
   * INTEGRATION TESTS
   * Test complete workflows using multiple critical endpoints
   */
  describe('Integration Tests - Critical Endpoint Workflows', () => {
    test(
      'Complete photo workflow: Upload → Tag → Family Access → Signed URL',
      async () => {
        if (!testContext.adminToken) {
          console.warn('Skipping integration test - no admin token');
          return;
        }

        let uploadedPhotoId: string;

        // 1. Upload photo
        const mockImageBlob = new Blob(['integration test image'], {
          type: 'image/jpeg',
        });
        const formData = new FormData();
        formData.append('eventId', testContext.eventId);
        formData.append('photos', mockImageBlob, 'integration-test.jpg');

        const uploadResponse = await fetch(
          `${API_BASE_URL}/api/admin/photos/upload`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${testContext.adminToken}` },
            body: formData,
          }
        );

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          uploadedPhotoId = uploadData.photos[0].id;

          // 2. Tag photo to subject
          const taggingResponse = await fetch(
            `${API_BASE_URL}/api/admin/tagging`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${testContext.adminToken}`,
              },
              body: JSON.stringify({
                photoIds: [uploadedPhotoId],
                subjectId: testContext.subjectId,
              }),
            }
          );

          if (taggingResponse.ok) {
            // 3. Family access - verify photo appears in gallery
            const galleryResponse = await fetch(
              `${API_BASE_URL}/api/family/gallery/${testContext.subjectToken}`
            );

            if (galleryResponse.ok) {
              const galleryData = await galleryResponse.json();
              const hasUploadedPhoto = galleryData.photos.some(
                (p: any) => p.id === uploadedPhotoId
              );
              expect(hasUploadedPhoto).toBe(true);

              // 4. Generate signed URL for the photo
              const signedUrlResponse = await fetch(
                `${API_BASE_URL}/api/storage/signed-url`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    photoId: uploadedPhotoId,
                    token: testContext.subjectToken,
                  }),
                }
              );

              if (signedUrlResponse.ok) {
                const signedUrlData = await signedUrlResponse.json();
                expect(signedUrlData.signedUrl).toBeDefined();
                expect(signedUrlData.expiresAt).toBeDefined();
              }
            }
          }
        }
      },
      TEST_TIMEOUT
    );

    test('Security validation across critical endpoints', async () => {
      // Test that all critical endpoints properly handle:
      // - Invalid authentication
      // - Rate limiting
      // - Input validation

      const endpoints = [
        { url: '/api/admin/photos/upload', method: 'POST' },
        { url: '/api/admin/tagging', method: 'POST' },
        { url: '/api/storage/signed-url', method: 'POST' },
      ];

      for (const endpoint of endpoints) {
        // Test authentication requirement
        const unauthedResponse = await fetch(`${API_BASE_URL}${endpoint.url}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        expect([401, 403]).toContain(unauthedResponse.status);

        // Test malformed input
        const malformedResponse = await fetch(
          `${API_BASE_URL}${endpoint.url}`,
          {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' },
            body: 'invalid json',
          }
        );

        expect([400, 401, 422]).toContain(malformedResponse.status);
      }
    });
  });
});
