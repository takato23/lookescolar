import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/gallery/checkout/route';
import { createTestClient, setupTestData, cleanupTestData, setupPublicTestData } from '../test-utils';

describe('/api/gallery/checkout', () => {
  let testData: any;
  let publicData: any;

  beforeEach(async () => {
    testData = await setupTestData();
    publicData = await setupPublicTestData(testData.eventId);
  });

  afterEach(async () => {
    await cleanupTestData({ ...testData, ...publicData });
  });

  describe('POST /api/gallery/checkout (Public)', () => {
    it('should create public checkout successfully', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
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
            },
            {
              photoId: publicData.publicPhotoIds[1],
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
      expect(data.event.id).toBe(publicData.eventId);
      expect(data.event.name).toBeDefined();
    });

    it('should reject invalid event ID', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          eventId: 'invalid-uuid',
          contactInfo: {
            name: 'Public Customer',
            email: 'customer@public.com'
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

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid checkout data');
      expect(data.details).toContain('Event ID inválido');
    });

    it('should reject non-existent event', async () => {
      const nonExistentEventId = crypto.randomUUID();
      
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          eventId: nonExistentEventId,
          contactInfo: {
            name: 'Public Customer',
            email: 'customer@public.com'
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

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Event not found');
    });

    it('should reject inactive event', async () => {
      // Make the event inactive
      await createTestClient()
        .from('events')
        .update({ status: 'inactive' })
        .eq('id', publicData.eventId);

      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          eventId: publicData.eventId,
          contactInfo: {
            name: 'Public Customer',
            email: 'customer@public.com'
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

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Event is not active for purchases');
    });

    it('should reject when public gallery is disabled', async () => {
      // Disable public gallery
      await createTestClient()
        .from('events')
        .update({ public_gallery_enabled: false })
        .eq('id', publicData.eventId);

      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          eventId: publicData.eventId,
          contactInfo: {
            name: 'Public Customer',
            email: 'customer@public.com'
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

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Public gallery is not enabled for this event');
    });

    it('should reject photos that are not publicly visible', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          eventId: publicData.eventId,
          contactInfo: {
            name: 'Public Customer',
            email: 'customer@public.com'
          },
          items: [
            {
              photoId: publicData.privatePhotoId, // Photo with public_visible = false
              quantity: 1,
              priceType: 'base'
            }
          ]
        }
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Some photos are not publicly available for this event');
    });

    it('should reject when customer already has pending order for event', async () => {
      const customerEmail = 'customer@public.com';
      
      // Create a pending public order first
      await createTestClient().from('orders').insert({
        id: crypto.randomUUID(),
        event_id: publicData.eventId,
        contact_name: 'Previous Customer',
        contact_email: customerEmail,
        status: 'pending',
        is_public_order: true,
        created_by: 'public_checkout',
        total_amount_cents: 1000
      });

      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          eventId: publicData.eventId,
          contactInfo: {
            name: 'Public Customer',
            email: customerEmail
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

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('pending order with this email');
    });

    it('should reject invalid photo IDs', async () => {
      const invalidPhotoId = crypto.randomUUID();
      
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          eventId: publicData.eventId,
          contactInfo: {
            name: 'Public Customer',
            email: 'customer@public.com'
          },
          items: [
            {
              photoId: invalidPhotoId, // Non-existent photo
              quantity: 1,
              priceType: 'base'
            }
          ]
        }
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Some photos are not available');
    });

    it('should reject photos from different event', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          eventId: publicData.eventId,
          contactInfo: {
            name: 'Public Customer',
            email: 'customer@public.com'
          },
          items: [
            {
              photoId: testData.photoIds[0], // Photo from different event
              quantity: 1,
              priceType: 'base'
            }
          ]
        }
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Some photos are not publicly available for this event');
    });

    it('should respect rate limiting', async () => {
      const requests = [];
      
      // Make 6 requests quickly (limit is 5/min)
      for (let i = 0; i < 6; i++) {
        const { req } = createMocks({
          method: 'POST',
          headers: { 
            'content-type': 'application/json',
            'x-forwarded-for': '192.168.1.200' // Same IP for all
          },
          body: {
            eventId: publicData.eventId,
            contactInfo: {
              name: 'Public Customer',
              email: `customer${i}@public.com`
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

        requests.push(POST(req));
      }

      const responses = await Promise.all(requests);
      const lastResponse = responses[responses.length - 1];
      
      expect(lastResponse!.status).toBe(429);
      
      const data = await lastResponse!.json();
      expect(data.error).toContain('Rate limit exceeded');
    });

    it('should calculate total correctly for multiple items', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          eventId: publicData.eventId,
          contactInfo: {
            name: 'Public Customer',
            email: 'customer@public.com'
          },
          items: [
            {
              photoId: publicData.publicPhotoIds[0],
              quantity: 3,
              priceType: 'base'
            },
            {
              photoId: publicData.publicPhotoIds[1],
              quantity: 2,
              priceType: 'base'
            }
          ]
        }
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.total).toBe(publicData.basePrice * 5); // 3 + 2 = 5 items
      expect(data.items).toHaveLength(2);
      expect(data.items[0].quantity).toBe(3);
      expect(data.items[1].quantity).toBe(2);
    });

    it('should create order with correct public order fields', async () => {
      const { req } = createMocks({
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

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Verify order was created correctly in database
      const supabase = createTestClient();
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', data.orderId)
        .single();

      expect(order).toBeTruthy();
      expect(order.subject_id).toBeNull();
      expect(order.event_id).toBe(publicData.eventId);
      expect(order.is_public_order).toBe(true);
      expect(order.created_by).toBe('public_checkout');
      expect(order.contact_name).toBe('Public Customer');
      expect(order.contact_email).toBe('customer@public.com');
      expect(order.contact_phone).toBe('1234567890');
    });
  });
});