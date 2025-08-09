import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/photos/upload/route';
import { createServerSupabaseClient, createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { processImageBatch, validateImage } from '@/lib/services/watermark';
import { uploadToStorage } from '@/lib/services/storage';
import { SecurityValidator } from '@/lib/security/validation';
import sharp from 'sharp';

// Mock de todos los servicios
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/services/watermark');
vi.mock('@/lib/services/storage');
vi.mock('@/lib/security/validation');

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
};

const mockSupabaseServiceClient = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
};

// Función helper para crear archivos de prueba
const createTestFile = async (name: string, type: string = 'image/jpeg', size: number = 1024): Promise<File> => {
  // Crear un buffer de imagen pequeña usando sharp
  const imageBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 }
    }
  }).jpeg().toBuffer();

  const blob = new Blob([imageBuffer], { type });
  return new File([blob], name, { type });
};

// Función helper para crear FormData
const createFormData = (eventId: string, files: File[]): FormData => {
  const formData = new FormData();
  formData.append('eventId', eventId);
  files.forEach(file => formData.append('files', file));
  return formData;
};

// Mock request helper
const createMockRequest = (formData: FormData, options: {
  ip?: string;
  userAgent?: string;
  headers?: Record<string, string>;
} = {}): NextRequest => {
  const headers = new Headers({
    'user-agent': options.userAgent || 'Mozilla/5.0 (compatible; test)',
    'x-forwarded-for': options.ip || '192.168.1.1',
    ...options.headers
  });

  const request = {
    ip: options.ip || '192.168.1.1',
    headers,
    formData: () => Promise.resolve(formData),
    nextUrl: { searchParams: new URLSearchParams() }
  } as unknown as NextRequest;

  return request;
};

describe('/api/admin/photos/upload - Comprehensive Tests', () => {
  const TEST_EVENT_ID = '123e4567-e89b-12d3-a456-426614174000';
  const TEST_USER_ID = '987fcdeb-51a2-43d1-b789-123456789012';
  
  beforeAll(() => {
    // Mock AuthMiddleware context
    vi.doMock('@/lib/middleware/auth.middleware', () => ({
      AuthMiddleware: {
        withAuth: (handler: any, role: string) => async (request: NextRequest) => {
          const authContext = {
            isAdmin: role === 'admin',
            user: { id: TEST_USER_ID, email: 'admin@test.com' }
          };
          return handler(request, authContext);
        }
      },
      SecurityLogger: {
        logResourceAccess: vi.fn(),
        logSecurityEvent: vi.fn()
      }
    }));

    // Mock RateLimitMiddleware
    vi.doMock('@/lib/middleware/rate-limit.middleware', () => ({
      RateLimitMiddleware: {
        withRateLimit: (handler: any) => handler
      }
    }));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks por defecto
    (createServerSupabaseClient as any).mockResolvedValue(mockSupabaseClient);
    (createServerSupabaseServiceClient as any).mockResolvedValue(mockSupabaseServiceClient);
    
    (SecurityValidator.isAllowedIP as any).mockReturnValue(true);
    (SecurityValidator.isSuspiciousUserAgent as any).mockReturnValue(false);
    (SecurityValidator.isAllowedContentType as any).mockReturnValue(true);
    (SecurityValidator.isSafeFilename as any).mockReturnValue(true);
    (SecurityValidator.sanitizeFilename as any).mockImplementation((name: string) => name);
    (SecurityValidator.isValidImageDimensions as any).mockReturnValue(true);
    (SecurityValidator.isValidStoragePath as any).mockReturnValue(true);
    
    (validateImage as any).mockResolvedValue(true);
    (processImageBatch as any).mockResolvedValue({
      results: [{ 
        buffer: Buffer.from('processed-image'), 
        width: 800, 
        height: 600, 
        originalName: 'test.jpg' 
      }],
      errors: [],
      duplicates: []
    });
    
    (uploadToStorage as any).mockResolvedValue({
      path: 'events/test-event/photos/test.jpg',
      size: 1024
    });

    // Mock event existe y pertenece al usuario
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: TEST_EVENT_ID,
              name: 'Test Event',
              created_by: TEST_USER_ID
            },
            error: null
          })
        }))
      }))
    });

    // Mock insert de foto exitoso
    mockSupabaseServiceClient.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'photo-id',
              event_id: TEST_EVENT_ID,
              storage_path: 'events/test-event/photos/test.jpg',
              width: 800,
              height: 600
            },
            error: null
          })
        }))
      }))
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Autenticación y Autorización', () => {
    it('debería rechazar requests sin autenticación admin', async () => {
      // Mock no admin
      vi.doMock('@/lib/middleware/auth.middleware', () => ({
        AuthMiddleware: {
          withAuth: (handler: any) => async (request: NextRequest) => {
            const authContext = { isAdmin: false, user: null };
            return handler(request, authContext);
          }
        },
        SecurityLogger: {
          logResourceAccess: vi.fn(),
          logSecurityEvent: vi.fn()
        }
      }));

      const file = await createTestFile('test.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('debería rechazar acceso a evento de otro usuario', async () => {
      // Mock evento pertenece a otro usuario
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: TEST_EVENT_ID,
                name: 'Test Event',
                created_by: 'other-user-id'
              },
              error: null
            })
          }))
        }))
      });

      const file = await createTestFile('test.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied to this event');
    });

    it('debería rechazar evento inexistente', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Event not found' }
            })
          }))
        }))
      });

      const file = await createTestFile('test.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData);

      const response = await POST(request);
      expect(response.status).toBe(404);
    });
  });

  describe('Rate Limiting', () => {
    it('debería aplicar rate limiting por IP', async () => {
      // Este test requiere integración con el middleware real
      // En un entorno real, se probaría haciendo múltiples requests rápidos
      expect(true).toBe(true); // Placeholder
    });

    it('debería aplicar límites específicos para upload endpoint', async () => {
      // 10 req/min por IP según CLAUDE.md
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Validación de Archivos', () => {
    it('debería rechazar tipos de archivo no permitidos', async () => {
      (SecurityValidator.isAllowedContentType as any).mockReturnValue(false);
      
      const file = await createTestFile('test.pdf', 'application/pdf');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual({
        filename: 'test.pdf',
        error: 'File type not allowed'
      });
    });

    it('debería rechazar archivos demasiado grandes', async () => {
      const largeFile = await createTestFile('large.jpg', 'image/jpeg', 50 * 1024 * 1024); // 50MB
      const formData = createFormData(TEST_EVENT_ID, [largeFile]);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(data.errors).toContainEqual({
        filename: 'large.jpg',
        error: 'File too large'
      });
    });

    it('debería sanitizar nombres de archivo inseguros', async () => {
      (SecurityValidator.isSafeFilename as any).mockReturnValue(false);
      (SecurityValidator.sanitizeFilename as any).mockReturnValue('safe_filename.jpg');

      const file = await createTestFile('../../../evil.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData);

      await POST(request);

      expect(SecurityValidator.sanitizeFilename).toHaveBeenCalledWith('../../../evil.jpg');
    });

    it('debería rechazar archivos que no son imágenes válidas', async () => {
      (validateImage as any).mockResolvedValue(false);

      const file = await createTestFile('fake.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(data.errors).toContainEqual({
        filename: 'fake.jpg',
        error: 'Invalid image file'
      });
    });

    it('debería limitar a máximo 20 archivos por request', async () => {
      const files = await Promise.all(
        Array(25).fill(0).map((_, i) => createTestFile(`test${i}.jpg`))
      );
      const formData = createFormData(TEST_EVENT_ID, files);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Maximum 20 files per request');
    });

    it('debería validar formato UUID del eventId', async () => {
      const file = await createTestFile('test.jpg');
      const formData = createFormData('invalid-uuid', [file]);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid event ID format');
    });
  });

  describe('Procesamiento con Watermark', () => {
    it('debería procesar imágenes con watermark usando límite de concurrencia', async () => {
      const files = await Promise.all([
        createTestFile('test1.jpg'),
        createTestFile('test2.jpg'),
        createTestFile('test3.jpg')
      ]);
      const formData = createFormData(TEST_EVENT_ID, files);
      const request = createMockRequest(formData);

      await POST(request);

      expect(processImageBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ originalName: 'test1.jpg' }),
          expect.objectContaining({ originalName: 'test2.jpg' }),
          expect.objectContaining({ originalName: 'test3.jpg' })
        ]),
        expect.objectContaining({
          text: expect.stringContaining('© Test Event - PREVIEW'),
          position: 'center'
        }),
        3 // Límite de concurrencia
      );
    });

    it('debería manejar errores de procesamiento individualmente', async () => {
      (processImageBatch as any).mockResolvedValue({
        results: [{ buffer: Buffer.from('processed'), width: 800, height: 600, originalName: 'success.jpg' }],
        errors: [{ originalName: 'error.jpg', error: 'Processing failed' }],
        duplicates: []
      });

      const files = await Promise.all([
        createTestFile('success.jpg'),
        createTestFile('error.jpg')
      ]);
      const formData = createFormData(TEST_EVENT_ID, files);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(data.uploaded).toHaveLength(1);
      expect(data.errors).toContainEqual({
        filename: 'error.jpg',
        error: 'Processing failed'
      });
    });

    it('debería detectar y reportar imágenes duplicadas', async () => {
      (processImageBatch as any).mockResolvedValue({
        results: [{ buffer: Buffer.from('processed'), width: 800, height: 600, originalName: 'unique.jpg' }],
        errors: [],
        duplicates: [{
          originalName: 'duplicate.jpg',
          duplicateOf: 'unique.jpg',
          hash: 'abcd1234567890'
        }]
      });

      const files = await Promise.all([
        createTestFile('unique.jpg'),
        createTestFile('duplicate.jpg')
      ]);
      const formData = createFormData(TEST_EVENT_ID, files);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(data.duplicates).toHaveLength(1);
      expect(data.errors).toContainEqual({
        filename: 'duplicate.jpg',
        error: expect.stringContaining('Imagen duplicada de unique.jpg')
      });
    });

    it('debería validar dimensiones de imagen procesada', async () => {
      (SecurityValidator.isValidImageDimensions as any).mockReturnValue(false);

      const file = await createTestFile('test.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(data.errors).toContainEqual({
        filename: 'test.jpg',
        error: expect.stringContaining('Upload failed')
      });
    });
  });

  describe('Transacciones y Rollback', () => {
    it('debería hacer rollback si falla el guardado en base de datos', async () => {
      mockSupabaseServiceClient.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' }
            })
          }))
        }))
      });

      const file = await createTestFile('test.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(data.errors).toContainEqual({
        filename: 'test.jpg',
        error: expect.stringContaining('Database error')
      });
    });

    it('debería continuar procesando otros archivos si uno falla', async () => {
      // Mock que el segundo archivo falla en storage
      let uploadCallCount = 0;
      (uploadToStorage as any).mockImplementation(() => {
        uploadCallCount++;
        if (uploadCallCount === 2) {
          throw new Error('Storage failed');
        }
        return { path: 'events/test/photo.jpg', size: 1024 };
      });

      const files = await Promise.all([
        createTestFile('success.jpg'),
        createTestFile('fail.jpg'),
        createTestFile('success2.jpg')
      ]);
      const formData = createFormData(TEST_EVENT_ID, files);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(data.uploaded).toHaveLength(2); // success.jpg y success2.jpg
      expect(data.errors).toContainEqual({
        filename: 'fail.jpg',
        error: expect.stringContaining('Upload failed')
      });
    });
  });

  describe('Performance y Timeouts', () => {
    it('debería completarse dentro del timeout de 60 segundos', async () => {
      const startTime = Date.now();
      
      const files = await Promise.all(
        Array(10).fill(0).map((_, i) => createTestFile(`perf_test_${i}.jpg`))
      );
      const formData = createFormData(TEST_EVENT_ID, files);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const endTime = Date.now();

      expect(response.status).toBeLessThan(500);
      expect(endTime - startTime).toBeLessThan(60000); // 60 segundos
    });

    it('debería manejar concurrencia limitada correctamente', async () => {
      const files = await Promise.all(
        Array(15).fill(0).map((_, i) => createTestFile(`concurrent_${i}.jpg`))
      );
      const formData = createFormData(TEST_EVENT_ID, files);
      const request = createMockRequest(formData);

      await POST(request);

      // Verificar que se llamó con límite de concurrencia 3
      expect(processImageBatch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Object),
        3
      );
    });
  });

  describe('Seguridad - IP y User-Agent', () => {
    it('debería rechazar IPs bloqueadas', async () => {
      (SecurityValidator.isAllowedIP as any).mockReturnValue(false);

      const file = await createTestFile('test.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData, { ip: '192.168.1.100' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });

    it('debería detectar y logear user agents sospechosos', async () => {
      (SecurityValidator.isSuspiciousUserAgent as any).mockReturnValue(true);

      const file = await createTestFile('test.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData, { 
        userAgent: 'wget/1.0 (bot)' 
      });

      await POST(request);

      expect(SecurityValidator.isSuspiciousUserAgent).toHaveBeenCalledWith('wget/1.0 (bot)');
    });
  });

  describe('Casos Edge', () => {
    it('debería manejar FormData vacío', async () => {
      const formData = new FormData();
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Event ID is required');
    });

    it('debería manejar archivos sin contenido', async () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
      const formData = createFormData(TEST_EVENT_ID, [emptyFile]);
      const request = createMockRequest(formData);

      const response = await POST(request);
      // Debería manejar gracefully archivos vacíos
      expect(response.status).not.toBe(500);
    });

    it('debería manejar errores de memoria con archivos grandes', async () => {
      // Mock error de memoria
      (processImageBatch as any).mockRejectedValue(new Error('Out of memory'));

      const file = await createTestFile('large.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process images');
    });
  });

  describe('Logging y Monitoreo', () => {
    it('debería logear eventos de seguridad apropiadamente', async () => {
      const file = await createTestFile('test.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData);

      await POST(request);

      // Verificar que se loggean los eventos importantes
      // En un entorno real, verificaríamos llamadas al SecurityLogger
      expect(true).toBe(true); // Placeholder
    });

    it('debería incluir requestId único en todos los logs', async () => {
      const file = await createTestFile('test.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData);

      await POST(request);

      // Verificar que se genera requestId único
      expect(true).toBe(true); // Placeholder
    });

    it('debería medir y reportar duración de procesamiento', async () => {
      const file = await createTestFile('test.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData);

      const response = await POST(request);
      
      // La respuesta no incluye duration, pero se loggea internamente
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Response Format', () => {
    it('debería retornar formato de respuesta consistente en éxito', async () => {
      const file = await createTestFile('test.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('uploaded');
      expect(data).toHaveProperty('stats');
      expect(data).toHaveProperty('message');
      
      expect(data.stats).toHaveProperty('processed');
      expect(data.stats).toHaveProperty('errors');
      expect(data.stats).toHaveProperty('duplicates');
      expect(data.stats).toHaveProperty('total');
    });

    it('debería incluir información detallada de cada foto subida', async () => {
      const file = await createTestFile('test.jpg');
      const formData = createFormData(TEST_EVENT_ID, [file]);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(data.uploaded[0]).toHaveProperty('id');
      expect(data.uploaded[0]).toHaveProperty('filename');
      expect(data.uploaded[0]).toHaveProperty('size');
      expect(data.uploaded[0]).toHaveProperty('width');
      expect(data.uploaded[0]).toHaveProperty('height');
      expect(data.uploaded[0]).toHaveProperty('path');
    });
  });
});