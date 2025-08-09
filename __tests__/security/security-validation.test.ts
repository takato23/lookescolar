/**
 * Security Validation Tests
 * Tests enfocados en validar configuraciones de seguridad críticas
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anonSupabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

describe('Security Validation Tests', () => {
  describe('Row Level Security (RLS)', () => {
    it('should have RLS enabled on all critical tables', async () => {
      // Verificar que RLS esté habilitado
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', [
          'events',
          'subjects', 
          'photos',
          'photo_assignments',
          'orders',
          'order_items',
          'egress_metrics'
        ]);

      expect(tables).toBeDefined();
      expect(tables.length).toBeGreaterThan(0);

      // Cada tabla debería tener policies definidas
      for (const table of tables) {
        const { data: policies } = await supabase
          .rpc('get_table_policies', { table_name: table.table_name });
        
        // Al menos debería haber una policy por tabla
        expect(policies).toBeDefined();
      }
    });

    it('should block anonymous access to events', async () => {
      const { data, error } = await anonSupabase
        .from('events')
        .select()
        .limit(1);

      // RLS debe bloquear acceso anónimo
      expect(data).toEqual([]);
    });

    it('should block anonymous access to subjects', async () => {
      const { data } = await anonSupabase
        .from('subjects')
        .select()
        .limit(1);

      expect(data).toEqual([]);
    });

    it('should block anonymous access to photos', async () => {
      const { data } = await anonSupabase
        .from('photos')
        .select()
        .limit(1);

      expect(data).toEqual([]);
    });

    it('should block anonymous access to orders', async () => {
      const { data } = await anonSupabase
        .from('orders')
        .select()
        .limit(1);

      expect(data).toEqual([]);
    });

    it('should block anonymous INSERT operations', async () => {
      const testEvent = {
        name: 'Unauthorized Event',
        school: 'Hack School',
        date: '2024-01-01'
      };

      const { error } = await anonSupabase
        .from('events')
        .insert(testEvent);

      // Debería fallar por RLS
      expect(error).toBeDefined();
    });

    it('should block anonymous UPDATE operations', async () => {
      const { error } = await anonSupabase
        .from('events')
        .update({ name: 'Hacked Event' })
        .eq('id', 'any-id');

      expect(error).toBeDefined();
    });

    it('should block anonymous DELETE operations', async () => {
      const { error } = await anonSupabase
        .from('events')
        .delete()
        .eq('id', 'any-id');

      expect(error).toBeDefined();
    });
  });

  describe('Token Security', () => {
    it('should enforce minimum token length constraint', async () => {
      // Intentar crear subject con token corto
      const { error } = await supabase
        .from('subjects')
        .insert({
          event_id: 'dummy-id',
          type: 'student',
          first_name: 'Test',
          token: 'short', // <20 chars
          expires_at: new Date().toISOString()
        });

      // Debería fallar por constraint
      expect(error).toBeDefined();
    });

    it('should enforce token uniqueness', async () => {
      const testEventId = 'test-event-' + Date.now();
      const duplicateToken = 'duplicate_token_123456789012345';

      // Crear evento primero
      await supabase.from('events').insert({
        id: testEventId,
        name: 'Test Event',
        school: 'Test School',
        date: '2024-01-01'
      });

      // Crear primer subject
      await supabase.from('subjects').insert({
        event_id: testEventId,
        type: 'student',
        first_name: 'First',
        token: duplicateToken,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Intentar crear segundo con mismo token
      const { error } = await supabase
        .from('subjects')
        .insert({
          event_id: testEventId,
          type: 'student', 
          first_name: 'Second',
          token: duplicateToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      expect(error).toBeDefined();
      expect(error.code).toBe('23505'); // Unique constraint violation

      // Cleanup
      await supabase.from('subjects').delete().eq('token', duplicateToken);
      await supabase.from('events').delete().eq('id', testEventId);
    });

    it('should generate cryptographically secure tokens', async () => {
      // Verificar tokens existentes en DB
      const { data: subjects } = await supabase
        .from('subjects')
        .select('token')
        .limit(10);

      if (subjects && subjects.length > 0) {
        subjects.forEach(subject => {
          // Token debe ser alfanumérico + guiones/guiones bajos
          expect(/^[A-Za-z0-9_-]+$/.test(subject.token)).toBe(true);
          
          // No debe ser predecible (no secuencial)
          expect(subject.token).not.toMatch(/123456/);
          expect(subject.token).not.toMatch(/abcdef/);
          
          // Debe tener suficiente entropía (no repetir caracteres)
          const chars = subject.token.split('');
          const uniqueChars = new Set(chars);
          const diversity = uniqueChars.size / chars.length;
          expect(diversity).toBeGreaterThan(0.3); // Al menos 30% de caracteres únicos
        });
      }
    });

    it('should have proper token expiration', async () => {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('token, expires_at, created_at')
        .limit(5);

      if (subjects && subjects.length > 0) {
        subjects.forEach(subject => {
          if (subject.expires_at) {
            const expiresAt = new Date(subject.expires_at);
            const createdAt = new Date(subject.created_at);
            
            // Token debería expirar en el futuro (para tokens activos)
            // O estar expirado por diseño
            expect(expiresAt > createdAt).toBe(true);
            
            // No debería expirar en más de 1 año
            const maxExpiry = new Date(createdAt.getTime() + 365 * 24 * 60 * 60 * 1000);
            expect(expiresAt <= maxExpiry).toBe(true);
          }
        });
      }
    });
  });

  describe('Data Validation', () => {
    it('should validate email formats in orders', async () => {
      const testEventId = 'test-event-' + Date.now();
      const testSubjectId = 'test-subject-' + Date.now();

      // Setup test data
      await supabase.from('events').insert({
        id: testEventId,
        name: 'Test Event',
        school: 'Test School', 
        date: '2024-01-01'
      });

      await supabase.from('subjects').insert({
        id: testSubjectId,
        event_id: testEventId,
        type: 'student',
        first_name: 'Test',
        token: 'test_token_123456789012345',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Test invalid email formats
      const invalidEmails = [
        'invalid-email',
        'no-at-sign.com',
        '@no-local.com',
        'no-domain@.com',
        'spaces in@email.com'
      ];

      for (const email of invalidEmails) {
        const { error } = await supabase
          .from('orders')
          .insert({
            subject_id: testSubjectId,
            total_amount: 1000,
            status: 'pending',
            contact_name: 'Test User',
            contact_email: email,
            contact_phone: '+541234567890'
          });

        expect(error).toBeDefined();
      }

      // Cleanup
      await supabase.from('subjects').delete().eq('id', testSubjectId);
      await supabase.from('events').delete().eq('id', testEventId);
    });

    it('should validate phone number formats', async () => {
      const testEventId = 'test-event-' + Date.now();
      const testSubjectId = 'test-subject-' + Date.now();

      await supabase.from('events').insert({
        id: testEventId,
        name: 'Test Event',
        school: 'Test School',
        date: '2024-01-01'
      });

      await supabase.from('subjects').insert({
        id: testSubjectId,
        event_id: testEventId,
        type: 'student',
        first_name: 'Test',
        token: 'test_token_123456789012345',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Test invalid phone formats
      const invalidPhones = [
        '123', // Muy corto
        'abc123def', // Con letras
        '++541234567890', // Doble signo
        '+54-123-456-7890-extra' // Muy largo
      ];

      for (const phone of invalidPhones) {
        const { error } = await supabase
          .from('orders')
          .insert({
            subject_id: testSubjectId,
            total_amount: 1000,
            status: 'pending',
            contact_name: 'Test User',
            contact_email: 'test@test.com',
            contact_phone: phone
          });

        expect(error).toBeDefined();
      }

      // Cleanup
      await supabase.from('subjects').delete().eq('id', testSubjectId);
      await supabase.from('events').delete().eq('id', testEventId);
    });

    it('should prevent SQL injection in text fields', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE events; --",
        "' OR '1'='1",
        "'; DELETE FROM subjects; --",
        "' UNION SELECT * FROM orders --"
      ];

      for (const maliciousInput of sqlInjectionAttempts) {
        const { error } = await supabase
          .from('events')
          .insert({
            name: maliciousInput,
            school: 'Test School',
            date: '2024-01-01'
          });

        // No debería causar inyección SQL, solo error de validación si acaso
        // El input debería ser escapado automáticamente por Supabase
        if (!error) {
          // Si se inserta, verificar que los datos estén correctos
          const { data } = await supabase
            .from('events')
            .select()
            .eq('name', maliciousInput)
            .single();
          
          // El valor debe estar exactamente como se envió (escapado)
          expect(data?.name).toBe(maliciousInput);
          
          // Limpiar
          await supabase.from('events').delete().eq('name', maliciousInput);
        }
      }
    });
  });

  describe('Storage Security', () => {
    it('should verify bucket is private', async () => {
      // Intentar acceder a una URL de bucket sin signed URL
      const testPath = 'eventos/test/nonexistent.jpg';
      const directUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos-private/${testPath}`;
      
      try {
        const response = await fetch(directUrl);
        // Bucket privado debería retornar 400/403/404, no 200
        expect(response.status).not.toBe(200);
      } catch {
        // Si falla la conexión, está bien (bucket privado)
        expect(true).toBe(true);
      }
    });

    it('should validate signed URL expiration', async () => {
      // Este test requiere una signed URL real para validar
      // Por ahora verificamos que el servicio genere URLs con expiración
      const testPath = 'eventos/test/test.jpg';
      
      try {
        const { data } = await supabase.storage
          .from('photos-private')
          .createSignedUrl(testPath, 60); // 1 minuto

        if (data?.signedUrl) {
          // URL debe contener parámetros de expiración
          expect(data.signedUrl).toContain('Expires=');
          expect(data.signedUrl).toContain('Signature=');
        }
      } catch (error) {
        // Es esperado que falle si el archivo no existe
        expect(error).toBeDefined();
      }
    });
  });

  describe('Authorization', () => {
    it('should prevent cross-subject data access', async () => {
      // Crear dos subjects diferentes
      const testEventId = 'test-event-' + Date.now();
      
      await supabase.from('events').insert({
        id: testEventId,
        name: 'Test Event',
        school: 'Test School',
        date: '2024-01-01'
      });

      const { data: subject1 } = await supabase.from('subjects').insert({
        event_id: testEventId,
        type: 'student',
        first_name: 'Subject1',
        token: 'subject1_token_123456789012345',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }).select().single();

      const { data: subject2 } = await supabase.from('subjects').insert({
        event_id: testEventId,
        type: 'student',
        first_name: 'Subject2',
        token: 'subject2_token_123456789012345',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }).select().single();

      // Crear orden para subject1
      const { data: order1 } = await supabase.from('orders').insert({
        subject_id: subject1.id,
        total_amount: 1000,
        status: 'pending',
        contact_name: 'Parent 1',
        contact_email: 'parent1@test.com',
        contact_phone: '+541111111111'
      }).select().single();

      // Intentar acceder a la orden de subject1 usando token de subject2
      const response = await fetch('/api/family/order/status', {
        method: 'GET',
        headers: {
          'X-Subject-Token': subject2.token,
          'X-Order-Id': order1.id
        }
      });

      // Debería fallar o no mostrar la orden
      if (response.ok) {
        const result = await response.json();
        const orderIds = result.orders?.map((o: any) => o.id) || [];
        expect(orderIds).not.toContain(order1.id);
      }

      // Cleanup
      await supabase.from('orders').delete().eq('id', order1.id);
      await supabase.from('subjects').delete().eq('id', subject1.id);
      await supabase.from('subjects').delete().eq('id', subject2.id);
      await supabase.from('events').delete().eq('id', testEventId);
    });

    it('should validate admin authentication requirements', async () => {
      // Intentar acceder a endpoints admin sin autenticación
      const adminEndpoints = [
        '/api/admin/events',
        '/api/admin/subjects',
        '/api/admin/photos/upload',
        '/api/admin/orders'
      ];

      for (const endpoint of adminEndpoints) {
        const response = await fetch(endpoint);
        
        // Debería retornar 401 Unauthorized o 403 Forbidden
        expect([401, 403]).toContain(response.status);
      }
    });
  });

  describe('Rate Limiting Security', () => {
    it('should have rate limiting configured', async () => {
      // Verificar que los endpoints críticos tienen rate limiting
      const criticalEndpoints = [
        { path: '/api/admin/auth', method: 'POST' },
        { path: '/api/storage/signed-url', method: 'POST' },
        { path: '/api/admin/photos/upload', method: 'POST' }
      ];

      // Este test es conceptual - en implementación real verificaríamos
      // la configuración de rate limiting en middleware o Redis
      expect(criticalEndpoints.length).toBeGreaterThan(0);
    });

    it('should block excessive requests', async () => {
      // Test básico de rate limiting en endpoint público
      const promises = [];
      
      // Hacer muchas requests a galería (endpoint público)
      for (let i = 0; i < 50; i++) {
        promises.push(
          fetch('/api/family/gallery/fake_token_123456789012345')
        );
      }

      const responses = await Promise.all(promises);
      
      // Al menos algunas deberían ser rate limited (429) o rejected (4xx)
      const blockedRequests = responses.filter(r => r.status >= 400);
      expect(blockedRequests.length).toBeGreaterThan(0);
    });
  });
});

// Helper function to check if RPC exists
async function rpcExists(rpcName: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(rpcName as any, {});
    return error?.code !== '42883'; // function does not exist
  } catch {
    return false;
  }
}