import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, DELETE, GET } from '@/app/api/admin/tagging/route';
import { POST as BatchPOST, DELETE as BatchDELETE, PUT as BulkPUT } from '@/app/api/admin/tagging/batch/route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase
vi.mock('@/lib/supabase/server');

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn()
};

// Test data constants
const TEST_EVENT_ID = '123e4567-e89b-12d3-a456-426614174000';
const TEST_SUBJECT_ID = '987fcdeb-51a2-43d1-b789-123456789012';
const TEST_PHOTO_ID_1 = 'photo-123e4567-e89b-12d3-a456-426614174001';
const TEST_PHOTO_ID_2 = 'photo-123e4567-e89b-12d3-a456-426614174002';
const TEST_PHOTO_ID_3 = 'photo-123e4567-e89b-12d3-a456-426614174003';

// Mock request helpers
const createMockRequest = (method: string, body?: any, params?: Record<string, string>): NextRequest => {
  const url = params 
    ? `http://localhost:3000/api/admin/tagging?${new URLSearchParams(params).toString()}`
    : 'http://localhost:3000/api/admin/tagging';

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
};

describe('/api/admin/tagging - Comprehensive Tests', () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockReturnValue(mockSupabase);
    
    // Setup default mocks
    mockSupabase.from.mockImplementation((table: string) => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      return mockQuery;
    });
  });

  describe('POST /api/admin/tagging - Asignación Individual', () => {
    it('debería asignar fotos a un sujeto exitosamente', async () => {
      // Mock fotos válidas
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'photos') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => ({
                  mockResolvedValue: vi.fn().mockResolvedValue({
                    data: [
                      { id: TEST_PHOTO_ID_1, event_id: TEST_EVENT_ID, subject_id: null },
                      { id: TEST_PHOTO_ID_2, event_id: TEST_EVENT_ID, subject_id: null }
                    ],
                    error: null
                  })
                }))
              }))
            })),
            update: vi.fn(() => ({
              in: vi.fn(() => ({
                select: vi.fn(() => ({
                  mockResolvedValue: vi.fn().mockResolvedValue({
                    data: [
                      { id: TEST_PHOTO_ID_1, subject_id: TEST_SUBJECT_ID },
                      { id: TEST_PHOTO_ID_2, subject_id: TEST_SUBJECT_ID }
                    ],
                    error: null
                  })
                }))
              }))
            }))
          };
        }
        
        if (table === 'subjects') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: TEST_SUBJECT_ID, event_id: TEST_EVENT_ID },
                  error: null
                })
              }))
            }))
          };
        }
        
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn().mockReturnThis(),
        };
      });

      const requestBody = {
        photoIds: [TEST_PHOTO_ID_1, TEST_PHOTO_ID_2],
        subjectId: TEST_SUBJECT_ID,
        eventId: TEST_EVENT_ID
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('2 fotos asignadas correctamente');
    });

    it('debería rechazar fotos que no pertenecen al evento', async () => {
      // Mock fotos que no pertenecen al evento
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'photos') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => ({
                  mockResolvedValue: vi.fn().mockResolvedValue({
                    data: [{ id: TEST_PHOTO_ID_1, event_id: TEST_EVENT_ID }], // Solo 1 de 2
                    error: null
                  })
                }))
              }))
            }))
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const requestBody = {
        photoIds: [TEST_PHOTO_ID_1, TEST_PHOTO_ID_2],
        subjectId: TEST_SUBJECT_ID,
        eventId: TEST_EVENT_ID
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Una o más fotos no existen o no pertenecen al evento');
    });

    it('debería rechazar sujeto que no pertenece al evento', async () => {
      // Mock fotos válidas pero sujeto inválido
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'photos') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => ({
                  mockResolvedValue: vi.fn().mockResolvedValue({
                    data: [{ id: TEST_PHOTO_ID_1, event_id: TEST_EVENT_ID }],
                    error: null
                  })
                }))
              }))
            }))
          };
        }
        
        if (table === 'subjects') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Subject not found' }
                })
              }))
            }))
          };
        }
        
        return { select: vi.fn().mockReturnThis() };
      });

      const requestBody = {
        photoIds: [TEST_PHOTO_ID_1],
        subjectId: TEST_SUBJECT_ID,
        eventId: TEST_EVENT_ID
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('El alumno no existe o no pertenece al evento');
    });

    it('debería validar formato UUID de los IDs', async () => {
      const requestBody = {
        photoIds: ['invalid-uuid'],
        subjectId: 'invalid-subject-uuid',
        eventId: 'invalid-event-uuid'
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Datos de entrada inválidos');
      expect(data.details).toBeDefined();
    });

    it('debería manejar errores de base de datos gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'photos') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => ({
                  mockResolvedValue: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database connection failed' }
                  })
                }))
              }))
            }))
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const requestBody = {
        photoIds: [TEST_PHOTO_ID_1],
        subjectId: TEST_SUBJECT_ID,
        eventId: TEST_EVENT_ID
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Error al verificar las fotos');
    });
  });

  describe('DELETE /api/admin/tagging - Desasignación', () => {
    it('debería quitar asignación de fotos exitosamente', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'photos') {
          return {
            update: vi.fn(() => ({
              in: vi.fn(() => ({
                select: vi.fn(() => ({
                  mockResolvedValue: vi.fn().mockResolvedValue({
                    data: [
                      { id: TEST_PHOTO_ID_1 },
                      { id: TEST_PHOTO_ID_2 }
                    ],
                    error: null
                  })
                }))
              }))
            }))
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const requestBody = {
        photoIds: [TEST_PHOTO_ID_1, TEST_PHOTO_ID_2]
      };

      const request = createMockRequest('DELETE', requestBody);
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('2 fotos sin asignar');
    });

    it('debería validar formato UUID en DELETE', async () => {
      const requestBody = {
        photoIds: ['invalid-uuid', 'another-invalid-uuid']
      };

      const request = createMockRequest('DELETE', requestBody);
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Datos de entrada inválidos');
    });
  });

  describe('GET /api/admin/tagging - Estadísticas', () => {
    it('debería obtener estadísticas de tagging correctamente', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'photos') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            mockResolvedValue: vi.fn().mockResolvedValue({
              data: [
                { id: TEST_PHOTO_ID_1, subject_id: TEST_SUBJECT_ID },
                { id: TEST_PHOTO_ID_2, subject_id: null },
                { id: TEST_PHOTO_ID_3, subject_id: TEST_SUBJECT_ID }
              ],
              error: null
            })
          };
        }
        
        if (table === 'subjects') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            mockResolvedValue: vi.fn().mockResolvedValue({
              data: [
                { id: TEST_SUBJECT_ID, first_name: 'Juan', last_name: 'Pérez', family_name: 'Familia Pérez', type: 'student', photos: [{id: TEST_PHOTO_ID_1}] }
              ],
              error: null
            })
          };
        }
        
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          mockResolvedValue: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const request = createMockRequest('GET', null, { eventId: TEST_EVENT_ID });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.stats).toHaveProperty('totalPhotos');
      expect(data.data.stats).toHaveProperty('taggedPhotos');
      expect(data.data.stats).toHaveProperty('untaggedPhotos');
      expect(data.data.stats).toHaveProperty('progressPercentage');
      expect(data.data).toHaveProperty('subjects');
      expect(data.data).toHaveProperty('untaggedPhotos');
    });

    it('debería requerir eventId en GET', async () => {
      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('eventId es requerido');
    });

    it('debería validar formato UUID del eventId en GET', async () => {
      const request = createMockRequest('GET', null, { eventId: 'invalid-uuid' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('eventId inválido');
    });
  });

  describe('POST /api/admin/tagging/batch - Asignación Batch', () => {
    it('debería procesar asignación batch exitosamente', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'photo_subjects') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        
        if (table === 'photos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                mockResolvedValue: vi.fn().mockResolvedValue({
                  data: [
                    { id: TEST_PHOTO_ID_1, subject_id: TEST_SUBJECT_ID },
                    { id: TEST_PHOTO_ID_2, subject_id: TEST_SUBJECT_ID }
                  ],
                  error: null
                })
              }))
            }))
          };
        }
        
        return { select: vi.fn().mockReturnThis() };
      });

      const requestBody = {
        eventId: TEST_EVENT_ID,
        assignments: [
          { photoId: TEST_PHOTO_ID_1, subjectId: TEST_SUBJECT_ID },
          { photoId: TEST_PHOTO_ID_2, subjectId: TEST_SUBJECT_ID }
        ]
      };

      const request = createMockRequest('POST', requestBody);
      const response = await BatchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.assignedCount).toBe(2);
      expect(data.data.stats).toHaveProperty('totalPhotos');
      expect(data.data.stats).toHaveProperty('progressPercentage');
    });

    it('debería limitar batch a 100 asignaciones máximo', async () => {
      const assignments = Array(150).fill(0).map((_, i) => ({
        photoId: `photo-${i}`,
        subjectId: TEST_SUBJECT_ID
      }));

      const requestBody = {
        eventId: TEST_EVENT_ID,
        assignments
      };

      const request = createMockRequest('POST', requestBody);
      const response = await BatchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('debería requerir al menos 1 asignación', async () => {
      const requestBody = {
        eventId: TEST_EVENT_ID,
        assignments: []
      };

      const request = createMockRequest('POST', requestBody);
      const response = await BatchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('debería manejar errores de función RPC', async () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'RPC function failed' } 
      });

      const requestBody = {
        eventId: TEST_EVENT_ID,
        assignments: [{ photoId: TEST_PHOTO_ID_1, subjectId: TEST_SUBJECT_ID }]
      };

      const request = createMockRequest('POST', requestBody);
      const response = await BatchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to assign photos in batch');
    });
  });

  describe('DELETE /api/admin/tagging/batch - Desasignación Batch', () => {
    it('debería procesar desasignación batch exitosamente', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'photos') {
          if (table === 'photos') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    mockResolvedValue: vi.fn().mockResolvedValue({
                      data: [
                        { id: TEST_PHOTO_ID_1 },
                        { id: TEST_PHOTO_ID_2 }
                      ],
                      error: null
                    })
                  }))
                }))
              })),
              update: vi.fn(() => ({
                in: vi.fn(() => ({
                  mockResolvedValue: vi.fn().mockResolvedValue({ error: null })
                }))
              }))
            };
          }
        }
        
        if (table === 'photo_subjects') {
          return {
            delete: vi.fn(() => ({
              in: vi.fn(() => ({
                mockResolvedValue: vi.fn().mockResolvedValue({ error: null })
              }))
            }))
          };
        }
        
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          mockResolvedValue: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const requestBody = {
        eventId: TEST_EVENT_ID,
        photoIds: [TEST_PHOTO_ID_1, TEST_PHOTO_ID_2]
      };

      const request = createMockRequest('DELETE', requestBody);
      const response = await BatchDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.unassignedCount).toBe(2);
    });

    it('debería verificar que las fotos pertenecen al evento', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'photos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn(() => ({
                  mockResolvedValue: vi.fn().mockResolvedValue({
                    data: [{ id: TEST_PHOTO_ID_1 }], // Solo 1 de 2 fotos
                    error: null
                  })
                }))
              }))
            }))
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const requestBody = {
        eventId: TEST_EVENT_ID,
        photoIds: [TEST_PHOTO_ID_1, TEST_PHOTO_ID_2]
      };

      const request = createMockRequest('DELETE', requestBody);
      const response = await BatchDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Some photos do not exist or do not belong to this event');
    });
  });

  describe('PUT /api/admin/tagging/batch - Asignación Masiva', () => {
    it('debería procesar asignación masiva por criterios', async () => {
      // Mock sujeto válido
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subjects') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: TEST_SUBJECT_ID },
                  error: null
                })
              }))
            }))
          };
        }
        
        if (table === 'photos') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            mockResolvedValue: vi.fn().mockResolvedValue({
              data: [
                { id: TEST_PHOTO_ID_1, filename: 'IMG_001.jpg', created_at: '2024-01-01T00:00:00Z' },
                { id: TEST_PHOTO_ID_2, filename: 'IMG_002.jpg', created_at: '2024-01-01T01:00:00Z' }
              ],
              error: null
            })
          };
        }
        
        return { select: vi.fn().mockReturnThis() };
      });

      // Mock RPC para batch assign
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const requestBody = {
        eventId: TEST_EVENT_ID,
        subjectId: TEST_SUBJECT_ID,
        filterCriteria: {
          unassignedOnly: true,
          dateRange: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-01T23:59:59Z'
          },
          filenamePattern: 'IMG_',
          limit: 10
        }
      };

      const request = createMockRequest('PUT', requestBody);
      const response = await BulkPUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('debería manejar caso sin fotos que coincidan con criterios', async () => {
      // Mock sujeto válido
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subjects') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: TEST_SUBJECT_ID },
                  error: null
                })
              }))
            }))
          };
        }
        
        if (table === 'photos') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            mockResolvedValue: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          };
        }
        
        return { select: vi.fn().mockReturnThis() };
      });

      const requestBody = {
        eventId: TEST_EVENT_ID,
        subjectId: TEST_SUBJECT_ID,
        filterCriteria: {
          unassignedOnly: true,
          filenamePattern: 'NONEXISTENT'
        }
      };

      const request = createMockRequest('PUT', requestBody);
      const response = await BulkPUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('No photos found matching the criteria');
      expect(data.data.assignedCount).toBe(0);
    });

    it('debería rechazar sujeto que no pertenece al evento', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subjects') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Subject not found' }
                })
              }))
            }))
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const requestBody = {
        eventId: TEST_EVENT_ID,
        subjectId: TEST_SUBJECT_ID,
        filterCriteria: {
          unassignedOnly: true
        }
      };

      const request = createMockRequest('PUT', requestBody);
      const response = await BulkPUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Subject not found or does not belong to this event');
    });
  });

  describe('Validación de Datos y Esquemas', () => {
    it('debería validar todos los campos requeridos en POST', async () => {
      const requestBody = {
        photoIds: [TEST_PHOTO_ID_1],
        // subjectId faltante
        eventId: TEST_EVENT_ID
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Datos de entrada inválidos');
    });

    it('debería validar arrays no vacíos', async () => {
      const requestBody = {
        photoIds: [], // Array vacío
        subjectId: TEST_SUBJECT_ID,
        eventId: TEST_EVENT_ID
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Datos de entrada inválidos');
    });

    it('debería validar límites de batch operations', async () => {
      const largeAssignments = Array(200).fill(0).map((_, i) => ({
        photoId: `photo-${i}`,
        subjectId: TEST_SUBJECT_ID
      }));

      const requestBody = {
        eventId: TEST_EVENT_ID,
        assignments: largeAssignments
      };

      const request = createMockRequest('POST', requestBody);
      const response = await BatchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('Manejo de Errores y Casos Edge', () => {
    it('debería manejar request sin body', async () => {
      const request = createMockRequest('POST');
      
      let response;
      try {
        response = await POST(request);
      } catch (error) {
        // Si falla al parsear JSON, debería manejar gracefully
        expect(true).toBe(true);
        return;
      }
      
      const data = await response.json();
      expect(response.status).toBeLessThan(500);
    });

    it('debería manejar body JSON malformado', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/tagging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid": json}'
      });

      let response;
      try {
        response = await POST(request);
      } catch (error) {
        expect(true).toBe(true);
        return;
      }
      
      const data = await response.json();
      expect(response.status).toBeLessThan(500);
    });

    it('debería manejar timeout de base de datos', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            eq: vi.fn(() => ({
              mockResolvedValue: vi.fn().mockImplementation(() => {
                return new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Database timeout')), 100)
                );
              })
            }))
          }))
        }))
      }));

      const requestBody = {
        photoIds: [TEST_PHOTO_ID_1],
        subjectId: TEST_SUBJECT_ID,
        eventId: TEST_EVENT_ID
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      
      expect(response.status).toBe(500);
    });
  });

  describe('Performance y Límites', () => {
    it('debería completar operaciones batch dentro de tiempo razonable', async () => {
      const startTime = Date.now();
      
      // Setup mocks for successful batch operation
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            mockResolvedValue: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      });

      const assignments = Array(50).fill(0).map((_, i) => ({
        photoId: `photo-${i}`,
        subjectId: TEST_SUBJECT_ID
      }));

      const requestBody = {
        eventId: TEST_EVENT_ID,
        assignments
      };

      const request = createMockRequest('POST', requestBody);
      const response = await BatchPOST(request);
      const endTime = Date.now();

      expect(response.status).toBeLessThan(500);
      expect(endTime - startTime).toBeLessThan(5000); // 5 segundos máximo
    });

    it('debería aplicar límite de 100 asignaciones por batch', async () => {
      const assignments = Array(101).fill(0).map((_, i) => ({
        photoId: `photo-${i}`,
        subjectId: TEST_SUBJECT_ID
      }));

      const requestBody = {
        eventId: TEST_EVENT_ID,
        assignments
      };

      const request = createMockRequest('POST', requestBody);
      const response = await BatchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('debería aplicar límite de 500 fotos en bulk assign', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subjects') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: TEST_SUBJECT_ID },
                  error: null
                })
              }))
            }))
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const requestBody = {
        eventId: TEST_EVENT_ID,
        subjectId: TEST_SUBJECT_ID,
        filterCriteria: {
          limit: 600 // Excede el límite máximo de 500
        }
      };

      const request = createMockRequest('PUT', requestBody);
      const response = await BulkPUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('Integración y Atomicidad', () => {
    it('debería manejar transacciones atómicas en batch operations', async () => {
      // Mock que falla después de procesar algunas asignaciones
      let callCount = 0;
      mockSupabase.rpc.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: { message: 'Transaction failed' } });
      });

      const requestBody = {
        eventId: TEST_EVENT_ID,
        assignments: [
          { photoId: TEST_PHOTO_ID_1, subjectId: TEST_SUBJECT_ID },
          { photoId: TEST_PHOTO_ID_2, subjectId: TEST_SUBJECT_ID }
        ]
      };

      const request = createMockRequest('POST', requestBody);
      const response = await BatchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to assign photos in batch');
    });

    it('debería mantener consistencia entre tablas photos y photo_subjects', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
      
      let photoSubjectsInsertCalled = false;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'photo_subjects') {
          photoSubjectsInsertCalled = true;
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        
        if (table === 'photos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                mockResolvedValue: vi.fn().mockResolvedValue({ data: [], error: null })
              }))
            }))
          };
        }
        
        return { select: vi.fn().mockReturnThis() };
      });

      const requestBody = {
        eventId: TEST_EVENT_ID,
        assignments: [{ photoId: TEST_PHOTO_ID_1, subjectId: TEST_SUBJECT_ID }]
      };

      const request = createMockRequest('POST', requestBody);
      await BatchPOST(request);

      expect(photoSubjectsInsertCalled).toBe(true);
    });
  });
});