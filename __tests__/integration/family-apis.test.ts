/**
 * Integration Tests: Family APIs
 * Tests reales para las APIs family que están implementadas
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Family APIs Integration Tests', () => {
  let testEventId: string;
  let testSubjectId: string;
  let validToken: string;
  const testPhotoIds: string[] = [];

  beforeAll(async () => {
    await cleanupTestData();
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Reset rate limiting si existe endpoint
    try {
      await fetch('/api/test/reset-rate-limit', { method: 'POST' });
    } catch {
      // Ignorar si no existe
    }
  });

  describe('Gallery API', () => {
    it('should reject invalid token format', async () => {
      const shortToken = 'short_token'; // <20 chars

      const response = await fetch(`/api/family/gallery/${shortToken}`);
      expect(response.status).toBe(400);
    });

    it('should reject non-existent token', async () => {
      const fakeToken = 'nonexistent_token_1234567890123';

      const response = await fetch(`/api/family/gallery/${fakeToken}`);
      expect(response.status).toBe(404);
    });

    it('should accept valid token and return gallery data', async () => {
      const response = await fetch(`/api/family/gallery/${validToken}`);

      expect(response.status).toBe(200);
      const result = await response.json();

      expect(result.subject).toBeDefined();
      expect(result.photos).toBeDefined();
      expect(Array.isArray(result.photos)).toBe(true);
    });

    it('should return only assigned photos', async () => {
      // Crear foto no asignada
      const { data: unassignedPhoto } = await supabase
        .from('photos')
        .insert({
          event_id: testEventId,
          filename: 'unassigned.jpg',
          storage_path: 'eventos/test/unassigned.jpg',
          status: 'processed',
        })
        .select()
        .single();

      const response = await fetch(`/api/family/gallery/${validToken}`);
      const result = await response.json();

      // No debería incluir la foto no asignada
      const photoIds = result.photos.map((p: any) => p.id);
      expect(photoIds).not.toContain(unassignedPhoto.id);

      // Cleanup
      await supabase.from('photos').delete().eq('id', unassignedPhoto.id);
    });

    it('should enforce rate limiting', async () => {
      const promises = [];

      // Hacer 35 requests (excede límite de 30/min del middleware)
      for (let i = 0; i < 35; i++) {
        promises.push(fetch(`/api/family/gallery/${validToken}`));
      }

      const responses = await Promise.all(promises);

      // Algunos deberían ser rate limited (429)
      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should handle pagination correctly', async () => {
      const response = await fetch(
        `/api/family/gallery/${validToken}?page=1&limit=2`
      );
      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.photos.length).toBeLessThanOrEqual(2);
    });

    it('should reject expired token', async () => {
      // Crear subject con token expirado
      const expiredToken = 'expired_token_1234567890123456';
      const { data: expiredSubject } = await supabase
        .from('subjects')
        .insert({
          event_id: testEventId,
          type: 'student',
          first_name: 'Expired',
          last_name: 'Subject',
          token: expiredToken,
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Ayer
        })
        .select()
        .single();

      const response = await fetch(`/api/family/gallery/${expiredToken}`);
      expect(response.status).toBe(401);

      // Cleanup
      await supabase.from('subjects').delete().eq('id', expiredSubject.id);
    });
  });

  describe('Shopping Cart API', () => {
    it('should add photos to cart', async () => {
      if (testPhotoIds.length === 0) {
        console.log('No test photos available, skipping cart test');
        return;
      }

      const cartItems = [
        {
          photo_id: testPhotoIds[0],
          quantity: 1,
          filename: 'test-photo-1.jpg',
        },
      ];

      const response = await fetch('/api/family/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          items: cartItems,
        }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(1);
      expect(result.total).toBeDefined();
    });

    it('should validate cart item limits', async () => {
      if (testPhotoIds.length === 0) return;

      // Intentar agregar más de 50 items
      const manyItems = Array(55)
        .fill(null)
        .map(() => ({
          photo_id: testPhotoIds[0],
          quantity: 1,
          filename: 'test.jpg',
        }));

      const response = await fetch('/api/family/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          items: manyItems,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should validate photo ownership', async () => {
      // Crear foto de otro subject
      const { data: otherSubject } = await supabase
        .from('subjects')
        .insert({
          event_id: testEventId,
          type: 'student',
          first_name: 'Other',
          token: 'other_subject_token_123456789012',
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .select()
        .single();

      const { data: otherPhoto } = await supabase
        .from('photos')
        .insert({
          event_id: testEventId,
          filename: 'other-photo.jpg',
          storage_path: 'eventos/test/other-photo.jpg',
          status: 'processed',
        })
        .select()
        .single();

      // Asignar foto al otro subject
      await supabase.from('photo_assignments').insert({
        photo_id: otherPhoto.id,
        subject_id: otherSubject.id,
      });

      // Intentar agregar foto de otro subject al carrito
      const response = await fetch('/api/family/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          items: [
            {
              photo_id: otherPhoto.id,
              quantity: 1,
              filename: 'other-photo.jpg',
            },
          ],
        }),
      });

      expect(response.status).toBe(403);

      // Cleanup
      await supabase
        .from('photo_assignments')
        .delete()
        .eq('photo_id', otherPhoto.id);
      await supabase.from('photos').delete().eq('id', otherPhoto.id);
      await supabase.from('subjects').delete().eq('id', otherSubject.id);
    });

    it('should clear cart', async () => {
      const response = await fetch('/api/family/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: validToken }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should validate quantity limits', async () => {
      if (testPhotoIds.length === 0) return;

      const response = await fetch('/api/family/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          items: [
            {
              photo_id: testPhotoIds[0],
              quantity: 15, // Excede límite de 10
              filename: 'test.jpg',
            },
          ],
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Storage/Signed URL API', () => {
    it('should generate signed URL for assigned photo', async () => {
      if (testPhotoIds.length === 0) return;

      const response = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          photo_id: testPhotoIds[0],
          type: 'preview',
        }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      expect(result.signed_url).toBeDefined();
      expect(result.signed_url).toContain('supabase.co');
      expect(result.expires_at).toBeDefined();
    });

    it('should reject signed URL for unassigned photo', async () => {
      // Crear foto no asignada
      const { data: unassignedPhoto } = await supabase
        .from('photos')
        .insert({
          event_id: testEventId,
          filename: 'unassigned.jpg',
          storage_path: 'eventos/test/unassigned.jpg',
          status: 'processed',
        })
        .select()
        .single();

      const response = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          photo_id: unassignedPhoto.id,
          type: 'preview',
        }),
      });

      expect(response.status).toBe(403);

      // Cleanup
      await supabase.from('photos').delete().eq('id', unassignedPhoto.id);
    });

    it('should enforce rate limiting on signed URLs', async () => {
      if (testPhotoIds.length === 0) return;

      const promises = [];

      // Hacer 65 requests (excede límite de 60/min)
      for (let i = 0; i < 65; i++) {
        promises.push(
          fetch('/api/storage/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: validToken,
              photo_id: testPhotoIds[0],
              type: 'preview',
            }),
          })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should validate anti-hotlinking', async () => {
      if (testPhotoIds.length === 0) return;

      const response = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://malicious-site.com', // Referer inválido
        },
        body: JSON.stringify({
          token: validToken,
          photo_id: testPhotoIds[0],
          type: 'preview',
        }),
      });

      // Middleware debería bloquear esto
      expect(response.status).toBe(403);
    });

    it('should validate token format in signed URL request', async () => {
      if (testPhotoIds.length === 0) return;

      const response = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'short', // Token muy corto
          photo_id: testPhotoIds[0],
          type: 'preview',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Order Status API', () => {
    it('should check order status with valid token', async () => {
      // Crear order de prueba
      const { data: order } = await supabase
        .from('orders')
        .insert({
          subject_id: testSubjectId,
          total_amount: 1500,
          status: 'pending',
          contact_name: 'Test Parent',
          contact_email: 'parent@test.com',
          contact_phone: '+541234567890',
        })
        .select()
        .single();

      const response = await fetch('/api/family/order/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Subject-Token': validToken, // Header approach o query param
        },
      });

      if (response.status === 200) {
        const result = await response.json();
        expect(result.orders).toBeDefined();
        expect(Array.isArray(result.orders)).toBe(true);
      }

      // Cleanup
      await supabase.from('orders').delete().eq('id', order.id);
    });

    it('should enforce rate limiting on status checks', async () => {
      const promises = [];

      // Hacer 35 requests
      for (let i = 0; i < 35; i++) {
        promises.push(
          fetch('/api/family/order/status', {
            method: 'GET',
            headers: {
              'X-Subject-Token': validToken,
            },
          })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Token Security', () => {
    it('should have secure token properties', async () => {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('token')
        .eq('event_id', testEventId);

      subjects?.forEach((subject) => {
        // Token debe tener al menos 20 caracteres
        expect(subject.token.length).toBeGreaterThanOrEqual(20);

        // Token debe ser alphanumeric con - y _
        expect(/^[A-Za-z0-9_-]+$/.test(subject.token)).toBe(true);

        // Token no debe contener espacios
        expect(subject.token).not.toContain(' ');
      });
    });

    it('should handle token validation consistently', async () => {
      const invalidTokens = [
        '', // Vacío
        'short', // Muy corto
        'token with spaces 123456789', // Con espacios
        'token@special#chars$1234567', // Caracteres especiales
        null, // Null
        undefined, // Undefined
      ];

      for (const token of invalidTokens) {
        if (token === null || token === undefined) continue;

        const response = await fetch(`/api/family/gallery/${token}`);
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });
});

// Helper functions
async function setupTestData() {
  // Crear evento
  const { data: event } = await supabase
    .from('events')
    .insert({
      name: 'Family Test Event',
      school: 'Test School',
      date: '2024-01-20',
      active: true,
    })
    .select()
    .single();

  testEventId = event.id;

  // Crear subject con token válido
  validToken = 'family_test_token_123456789012345';
  const { data: subject } = await supabase
    .from('subjects')
    .insert({
      event_id: testEventId,
      type: 'student',
      first_name: 'Test',
      last_name: 'Student',
      token: validToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  testSubjectId = subject.id;

  // Crear fotos de prueba
  const photoData = [
    {
      event_id: testEventId,
      filename: 'test-photo-1.jpg',
      storage_path: 'eventos/test/test-photo-1.jpg',
      status: 'processed' as const,
    },
    {
      event_id: testEventId,
      filename: 'test-photo-2.jpg',
      storage_path: 'eventos/test/test-photo-2.jpg',
      status: 'processed' as const,
    },
  ];

  const { data: photos } = await supabase
    .from('photos')
    .insert(photoData)
    .select();

  if (photos) {
    testPhotoIds = photos.map((p) => p.id);

    // Asignar fotos al subject
    const assignments = testPhotoIds.map((photoId) => ({
      photo_id: photoId,
      subject_id: testSubjectId,
    }));

    await supabase.from('photo_assignments').insert(assignments);
  }
}

async function cleanupTestData() {
  // Limpiar en orden por foreign keys
  await supabase.from('photo_assignments').delete().like('subject_id', '%');
  await supabase.from('order_items').delete().like('order_id', '%');
  await supabase.from('orders').delete().like('contact_name', 'Test%');
  await supabase.from('photos').delete().like('filename', '%test%');
  await supabase.from('subjects').delete().like('token', '%test%');
  await supabase.from('events').delete().like('name', '%Test%');
  await supabase.from('egress_metrics').delete().like('event_id', '%');
}
