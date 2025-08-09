import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from './test-utils';

describe('Tagging API', () => {
  let supabase: ReturnType<typeof createTestClient>;
  let testEventId: string;
  let testSubjectId: string;
  let testPhotoIds: string[] = [];

  beforeAll(async () => {
    supabase = createTestClient();
    
    // Crear evento de prueba
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: 'Test Tagging Event',
        school: 'Test School',
        date: '2024-01-15',
        active: true
      })
      .select()
      .single();

    if (eventError) throw eventError;
    testEventId = event.id;

    // Crear sujeto de prueba
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .insert({
        event_id: testEventId,
        type: 'student',
        first_name: 'Test',
        last_name: 'Student'
      })
      .select()
      .single();

    if (subjectError) throw subjectError;
    testSubjectId = subject.id;

    // Crear fotos de prueba
    const photos = [
      {
        event_id: testEventId,
        storage_path: 'test/photo1.jpg',
        approved: true
      },
      {
        event_id: testEventId,
        storage_path: 'test/photo2.jpg',
        approved: true
      }
    ];

    const { data: createdPhotos, error: photosError } = await supabase
      .from('photos')
      .insert(photos)
      .select();

    if (photosError) throw photosError;
    testPhotoIds = createdPhotos.map(p => p.id);
  });

  afterAll(async () => {
    // Cleanup
    if (testEventId) {
      await supabase.from('events').delete().eq('id', testEventId);
    }
  });

  describe('GET /api/admin/tagging', () => {
    it('should return tagging data for an event', async () => {
      const response = await fetch(`http://localhost:3000/api/admin/tagging?eventId=${testEventId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('stats');
      expect(data.data).toHaveProperty('untaggedPhotos');
      expect(data.data).toHaveProperty('subjects');
      expect(data.data.stats.totalPhotos).toBe(2);
      expect(data.data.untaggedPhotos).toHaveLength(2);
      expect(data.data.subjects).toHaveLength(1);
    });

    it('should return 400 for missing eventId', async () => {
      const response = await fetch('http://localhost:3000/api/admin/tagging', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('eventId es requerido');
    });
  });

  describe('POST /api/admin/tagging', () => {
    beforeEach(async () => {
      // Reset photos to untagged state
      await supabase
        .from('photos')
        .update({ subject_id: null })
        .in('id', testPhotoIds);
    });

    it('should successfully assign photos to a subject', async () => {
      const response = await fetch('http://localhost:3000/api/admin/tagging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoIds: testPhotoIds,
          subjectId: testSubjectId,
          eventId: testEventId
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.message).toContain('2 fotos asignadas correctamente');
      expect(data.data).toHaveLength(2);

      // Verificar en la base de datos
      const { data: photos } = await supabase
        .from('photos')
        .select('subject_id')
        .in('id', testPhotoIds);

      photos?.forEach(photo => {
        expect(photo.subject_id).toBe(testSubjectId);
      });
    });

    it('should return 400 for invalid photo IDs', async () => {
      const response = await fetch('http://localhost:3000/api/admin/tagging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoIds: ['00000000-0000-0000-0000-000000000000'],
          subjectId: testSubjectId,
          eventId: testEventId
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Una o más fotos no existen');
    });

    it('should return 400 for invalid subject ID', async () => {
      const response = await fetch('http://localhost:3000/api/admin/tagging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoIds: testPhotoIds,
          subjectId: '00000000-0000-0000-0000-000000000000',
          eventId: testEventId
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('El alumno no existe');
    });

    it('should return 400 for invalid request body', async () => {
      const response = await fetch('http://localhost:3000/api/admin/tagging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoIds: 'invalid', // Should be array
          subjectId: testSubjectId,
          eventId: testEventId
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Datos de entrada inválidos');
    });
  });

  describe('DELETE /api/admin/tagging', () => {
    beforeEach(async () => {
      // Assign photos first
      await supabase
        .from('photos')
        .update({ subject_id: testSubjectId })
        .in('id', testPhotoIds);
    });

    it('should successfully unassign photos', async () => {
      const response = await fetch('http://localhost:3000/api/admin/tagging', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoIds: testPhotoIds
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.message).toContain('2 fotos sin asignar');

      // Verificar en la base de datos
      const { data: photos } = await supabase
        .from('photos')
        .select('subject_id')
        .in('id', testPhotoIds);

      photos?.forEach(photo => {
        expect(photo.subject_id).toBeNull();
      });
    });

    it('should return 400 for invalid request body', async () => {
      const response = await fetch('http://localhost:3000/api/admin/tagging', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoIds: 'invalid' // Should be array
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Datos de entrada inválidos');
    });
  });
});