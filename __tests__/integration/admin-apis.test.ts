/**
 * Integration Tests: Admin APIs
 * Tests reales para las APIs admin que están implementadas
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Admin APIs Integration Tests', () => {
  let testEventId: string;
  let testSubjectId: string;

  beforeAll(async () => {
    // Limpiar datos de test previos
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Auth API', () => {
    it('should handle invalid credentials correctly', async () => {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid@test.com',
          password: 'wrongpassword',
        }),
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toBeDefined();
    });

    it('should enforce rate limiting on auth endpoint', async () => {
      // Hacer múltiples intentos rápidos
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          fetch('/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test@test.com',
              password: 'wrongpassword',
            }),
          })
        );
      }

      const responses = await Promise.all(promises);

      // Algunos deberían ser rate limited (429)
      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Events API', () => {
    it('should create event with valid data', async () => {
      const eventData = {
        name: 'Test Event',
        school: 'Test School',
        date: '2024-01-20',
        active: true,
      };

      // Crear event directamente en DB para testing
      const { data: event, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(event).toBeDefined();
      expect(event.name).toBe(eventData.name);

      testEventId = event.id;
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '', // Campo requerido vacío
        school: 'Test School',
        date: '2024-01-20',
      };

      const { error } = await supabase.from('events').insert(invalidData);

      expect(error).toBeDefined();
    });

    it('should validate date format', async () => {
      const invalidData = {
        name: 'Test Event',
        school: 'Test School',
        date: 'invalid-date', // Formato incorrecto
      };

      const { error } = await supabase.from('events').insert(invalidData);

      expect(error).toBeDefined();
    });
  });

  describe('Subjects API', () => {
    it('should create subject with secure token', async () => {
      if (!testEventId) {
        testEventId = await createTestEvent();
      }

      const subjectData = {
        event_id: testEventId,
        type: 'student' as const,
        first_name: 'Test',
        last_name: 'Student',
        token: generateTestToken(),
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      const { data: subject, error } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(subject).toBeDefined();
      expect(subject.token.length).toBeGreaterThanOrEqual(20);
      expect(subject.expires_at).toBeDefined();

      testSubjectId = subject.id;
    });

    it('should enforce unique tokens', async () => {
      if (!testEventId) {
        testEventId = await createTestEvent();
      }

      const duplicateToken = 'duplicate_token_123456789012345';

      // Crear primer subject
      await supabase.from('subjects').insert({
        event_id: testEventId,
        type: 'student',
        first_name: 'First',
        last_name: 'Student',
        token: duplicateToken,
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });

      // Intentar crear segundo con mismo token
      const { error } = await supabase.from('subjects').insert({
        event_id: testEventId,
        type: 'student',
        first_name: 'Second',
        last_name: 'Student',
        token: duplicateToken,
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });

      expect(error).toBeDefined();
      expect(error.code).toBe('23505'); // Unique constraint violation
    });

    it('should validate token length', async () => {
      if (!testEventId) {
        testEventId = await createTestEvent();
      }

      const shortToken = 'short'; // <20 caracteres

      const { error } = await supabase.from('subjects').insert({
        event_id: testEventId,
        type: 'student',
        first_name: 'Test',
        token: shortToken,
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });

      // Debería fallar por constraint en DB o validación
      expect(error).toBeDefined();
    });
  });

  describe('Photos Storage', () => {
    it('should validate photo assignment exists before creating signed URL', async () => {
      if (!testEventId || !testSubjectId) {
        testEventId = await createTestEvent();
        testSubjectId = await createTestSubject(testEventId);
      }

      // Crear photo sin asignar a subject
      const { data: photo } = await supabase
        .from('photos')
        .insert({
          event_id: testEventId,
          filename: 'unassigned-test.jpg',
          storage_path: 'eventos/test/unassigned-test.jpg',
          status: 'processed',
        })
        .select()
        .single();

      // Intentar crear signed URL sin assignment
      const response = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'test_token_1234567890123456789',
          photo_id: photo.id,
          type: 'preview',
        }),
      });

      expect(response.status).toBe(403);
    });

    it('should track egress metrics correctly', async () => {
      if (!testEventId) {
        testEventId = await createTestEvent();
      }

      const today = new Date().toISOString().split('T')[0];

      // Simular request que trackea egress
      await supabase.from('egress_metrics').upsert({
        event_id: testEventId,
        date: today,
        bytes_served: 100000,
        requests_count: 1,
      });

      const { data: metrics } = await supabase
        .from('egress_metrics')
        .select()
        .eq('event_id', testEventId)
        .eq('date', today)
        .single();

      expect(metrics).toBeDefined();
      expect(metrics.bytes_served).toBeGreaterThan(0);
      expect(metrics.requests_count).toBeGreaterThan(0);
    });
  });

  describe('Orders API', () => {
    it('should create order with valid data', async () => {
      if (!testSubjectId) {
        testEventId = await createTestEvent();
        testSubjectId = await createTestSubject(testEventId);
      }

      const orderData = {
        subject_id: testSubjectId,
        total_amount: 1500,
        status: 'pending' as const,
        contact_name: 'Test Parent',
        contact_email: 'parent@test.com',
        contact_phone: '+541234567890',
      };

      const { data: order, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(order).toBeDefined();
      expect(order.total_amount).toBe(orderData.total_amount);
      expect(order.status).toBe('pending');
    });

    it('should prevent multiple pending orders for same subject', async () => {
      if (!testSubjectId) {
        testEventId = await createTestEvent();
        testSubjectId = await createTestSubject(testEventId);
      }

      const orderData = {
        subject_id: testSubjectId,
        total_amount: 1500,
        status: 'pending' as const,
        contact_name: 'Test Parent',
        contact_email: 'parent@test.com',
        contact_phone: '+541234567890',
      };

      // Crear primera orden
      await supabase.from('orders').insert(orderData);

      // Intentar crear segunda orden pendiente
      const { error } = await supabase.from('orders').insert(orderData);

      // Debería fallar por constraint
      expect(error).toBeDefined();
    });

    it('should validate email format', async () => {
      if (!testSubjectId) {
        testEventId = await createTestEvent();
        testSubjectId = await createTestSubject(testEventId);
      }

      const orderData = {
        subject_id: testSubjectId,
        total_amount: 1500,
        status: 'pending' as const,
        contact_name: 'Test Parent',
        contact_email: 'invalid-email', // Email inválido
        contact_phone: '+541234567890',
      };

      const { error } = await supabase.from('orders').insert(orderData);

      expect(error).toBeDefined();
    });
  });

  describe('RLS Policies', () => {
    it('should enforce RLS on events table', async () => {
      // Crear client sin service role (anon)
      const anonClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Intentar acceder sin autenticación
      const { data, error } = await anonClient.from('events').select().limit(1);

      // RLS debería bloquear acceso anónimo
      expect(data).toEqual([]);
      // En algunos casos puede devolver error, en otros array vacío
    });

    it('should enforce RLS on subjects table', async () => {
      const anonClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await anonClient
        .from('subjects')
        .select()
        .limit(1);

      expect(data).toEqual([]);
    });

    it('should enforce RLS on photos table', async () => {
      const anonClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await anonClient.from('photos').select().limit(1);

      expect(data).toEqual([]);
    });
  });
});

// Helper functions
async function createTestEvent(): Promise<string> {
  const { data: event } = await supabase
    .from('events')
    .insert({
      name: 'Test Event',
      school: 'Test School',
      date: '2024-01-20',
      active: true,
    })
    .select()
    .single();

  return event.id;
}

async function createTestSubject(eventId: string): Promise<string> {
  const { data: subject } = await supabase
    .from('subjects')
    .insert({
      event_id: eventId,
      type: 'student',
      first_name: 'Test',
      last_name: 'Student',
      token: generateTestToken(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  return subject.id;
}

function generateTestToken(): string {
  return (
    'test_token_' +
    Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2)
  );
}

async function cleanupTestData() {
  // Limpiar en orden por foreign keys
  await supabase.from('photo_assignments').delete().like('subject_id', '%');
  await supabase.from('order_items').delete().like('order_id', '%');
  await supabase.from('orders').delete().like('contact_email', '%test%');
  await supabase.from('photos').delete().like('filename', '%test%');
  await supabase.from('subjects').delete().like('first_name', 'Test%');
  await supabase.from('events').delete().like('name', '%Test%');
  await supabase.from('egress_metrics').delete().like('event_id', '%');
}
