import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/family/checkout/route';
import { createTestClient, setupTestData, cleanupTestData } from '../test-utils';

describe('/api/family/checkout', () => {
  let testData: any;

  beforeEach(async () => {
    testData = await setupTestData();
  });

  afterEach(async () => {
    await cleanupTestData(testData);
  });

  describe('POST /api/family/checkout', () => {
    it('should create checkout successfully with valid token and items', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
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
              quantity: 1,
              priceType: 'base'
            },
            {
              photoId: testData.photoIds[1], 
              quantity: 2,
              priceType: 'base'
            }
          ]
        }
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.orderId).toBeDefined();
      expect(data.preferenceId).toBeDefined();
      expect(data.redirectUrl).toBeDefined();
      expect(data.total).toBeGreaterThan(0);
      expect(data.currency).toBe('ARS');
      expect(data.items).toHaveLength(2);
      expect(data.event).toBeDefined();
    });

    it('should reject invalid token', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          token: 'invalid_token_too_short',
          contactInfo: {
            name: 'Test Parent',
            email: 'parent@test.com'
          },
          items: [
            {
              photoId: testData.photoIds[0],
              quantity: 1,
              priceType: 'base'
            }
          ]
        }
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid checkout data');
      expect(data.details).toContain('Token inválido');
    });

    it('should reject expired token', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          token: testData.expiredToken,
          contactInfo: {
            name: 'Test Parent',
            email: 'parent@test.com'
          },
          items: [
            {
              photoId: testData.photoIds[0],
              quantity: 1,
              priceType: 'base'
            }
          ]
        }
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid or expired token');
    });

    it('should reject photos that dont belong to subject', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          token: testData.validToken,
          contactInfo: {
            name: 'Test Parent',
            email: 'parent@test.com'
          },
          items: [
            {
              photoId: testData.otherSubjectPhotoId, // Photo from different subject
              quantity: 1,
              priceType: 'base'
            }
          ]
        }
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Some photos do not belong to this subject');
    });

    it('should reject when subject already has pending order', async () => {
      // Create a pending order first
      await createTestClient().from('orders').insert({
        id: crypto.randomUUID(),
        subject_id: testData.subjectId,
        contact_name: 'Previous Order',
        contact_email: 'previous@test.com',
        status: 'pending'
      });

      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          token: testData.validToken,
          contactInfo: {
            name: 'Test Parent',
            email: 'parent@test.com'
          },
          items: [
            {
              photoId: testData.photoIds[0],
              quantity: 1,
              priceType: 'base'
            }
          ]
        }
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('pending order');
    });

    it('should reject empty cart', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          token: testData.validToken,
          contactInfo: {
            name: 'Test Parent',
            email: 'parent@test.com'
          },
          items: [] // Empty cart
        }
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid checkout data');
      expect(data.details).toContain('Carrito vacío');
    });

    it('should reject invalid contact info', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          token: testData.validToken,
          contactInfo: {
            name: 'A', // Too short
            email: 'invalid-email' // Invalid email
          },
          items: [
            {
              photoId: testData.photoIds[0],
              quantity: 1,
              priceType: 'base'
            }
          ]
        }
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid checkout data');
      expect(data.details.some((detail: string) => detail.includes('Nombre requerido'))).toBe(true);
      expect(data.details.some((detail: string) => detail.includes('Email inválido'))).toBe(true);
    });

    it('should reject invalid price type', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          token: testData.validToken,
          contactInfo: {
            name: 'Test Parent',
            email: 'parent@test.com'
          },
          items: [
            {
              photoId: testData.photoIds[0],
              quantity: 1,
              priceType: 'nonexistent_type'
            }
          ]
        }
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid price type');
    });

    it('should respect rate limiting', async () => {
      const requests = [];
      
      // Make 6 requests quickly (limit is 5/min)
      for (let i = 0; i < 6; i++) {
        const { req } = createMocks({
          method: 'POST',
          headers: { 
            'content-type': 'application/json',
            'x-forwarded-for': '192.168.1.100' // Same IP for all
          },
          body: {
            token: testData.validToken,
            contactInfo: {
              name: 'Test Parent',
              email: `parent${i}@test.com`
            },
            items: [
              {
                photoId: testData.photoIds[0],
                quantity: 1,
                priceType: 'base'
              }
            ]
          }
        });

        requests.push(POST(req));
      }

      const responses = await Promise.all(requests);
      // Verificar que al menos una request fue rate limited
      const rateLimitedResponse = responses.find(r => r.status === 429);
      expect(rateLimitedResponse).toBeDefined();
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.status).toBe(429);
        const data = await rateLimitedResponse.json();
        expect(data.error).toBe('Rate limit exceeded');
      }
    });

    it('should calculate total correctly for multiple items', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          token: testData.validToken,
          contactInfo: {
            name: 'Test Parent',
            email: 'parent@test.com'
          },
          items: [
            {
              photoId: testData.photoIds[0],
              quantity: 2,
              priceType: 'base' 
            },
            {
              photoId: testData.photoIds[1],
              quantity: 3,
              priceType: 'base'
            }
          ]
        }
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.total).toBe(testData.basePrice * 5); // 2 + 3 = 5 items
      expect(data.items).toHaveLength(2);
      expect(data.items[0].quantity).toBe(2);
      expect(data.items[1].quantity).toBe(3);
    });
  });
});