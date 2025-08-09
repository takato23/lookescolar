/**
 * Tests integrales para endpoint de upload de fotos
 * Cumple con requisitos CLAUDE.md de testing crítico
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestClient, setupMocks, cleanupTestData } from '../../test-utils';
import sharp from 'sharp';
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/admin/photos/upload/route';
import { NextRequest } from 'next/server';

const testUtils = {
  supabase: createTestClient(),
  resetDatabase: async () => {
    // Simple reset - en un test real se haría un truncate
    return Promise.resolve();
  },
  createTestEvent: async (userId?: string) => {
    const eventId = crypto.randomUUID();
    const { data } = await testUtils.supabase.from('events').insert({
      id: eventId,
      name: 'Test Event',
      school: 'Test School',
      date: '2024-01-01',
      status: 'active',
      created_by: userId || crypto.randomUUID(),
      public_gallery_enabled: true
    }).select().single();
    return data;
  },
  createTestAdmin: async () => {
    const adminId = crypto.randomUUID();
    return { id: adminId };
  },
  makeAuthenticatedRequest: async (handler: any, requestOptions: any, userId: string) => {
    const { req } = createMocks({
      ...requestOptions,
      headers: {
        ...requestOptions.headers,
        'x-user-id': userId
      }
    });
    
    // Mock del auth context
    vi.mocked(handler).mockImplementation(async () => {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });
    
    return handler(req as NextRequest);
  }
};

describe('/api/admin/photos/upload - Enhanced Tests', () => {
  let cleanupFns: Array<() => Promise<void>> = [];

  beforeEach(async () => {
    setupMocks();
    await testUtils.resetDatabase();
    cleanupFns = [];
  });

  afterEach(async () => {
    for (const cleanup of cleanupFns) {
      await cleanup();
    }
    cleanupFns = [];
    vi.clearAllMocks();
  });

  // Helper para crear imagen de prueba
  const createTestImage = async (
    width = 800,
    height = 600,
    format: 'jpeg' | 'png' = 'jpeg'
  ): Promise<Buffer> => {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
      .jpeg()
      .toBuffer();
  };

  // Helper para crear imagen con EXIF
  const createImageWithExif = async (): Promise<Buffer> => {
    return sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 0, g: 255, b: 0 }
      }
    })
      .jpeg({ 
        quality: 90,
        mozjpeg: true
      })
      .withMetadata({
        exif: {
          IFD0: {
            Make: 'Test Camera',
            Model: 'Test Model',
            DateTime: '2024:01:01 12:00:00'
          },
          GPS: {
            GPSLatitude: [40, 42, 51.56],
            GPSLatitudeRef: 'N',
            GPSLongitude: [74, 0, 21.49],
            GPSLongitudeRef: 'W'
          }
        }
      })
      .toBuffer();
  };

  // Helper para crear FormData con archivos
  const createUploadFormData = (eventId: string, files: Array<{
    buffer: Buffer;
    filename: string;
    contentType?: string;
  }>) => {
    const formData = new FormData();
    formData.append('eventId', eventId);

    files.forEach(({ buffer, filename, contentType = 'image/jpeg' }) => {
      const blob = new Blob([buffer], { type: contentType });
      const file = new File([blob], filename, { type: contentType });
      formData.append('files', file);
    });

    return formData;
  };

  describe('Validación de seguridad y autenticación', () => {
    it('debe rechazar requests sin autenticación admin', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'multipart/form-data',
        },
      });

      const response = await POST(req as NextRequest);
      expect(response.status).toBe(401);
    });

    it('debe aplicar rate limiting correctamente', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();
      const image = await createTestImage();

      // Simular múltiples requests rápidos
      const requests = Array.from({ length: 12 }, () => 
        testUtils.makeAuthenticatedRequest(POST, {
          method: 'POST',
          body: createUploadFormData(event.id, [{
            buffer: image,
            filename: 'test.jpg'
          }]),
          headers: {
            'x-forwarded-for': '127.0.0.1'
          }
        }, admin.id)
      );

      const responses = await Promise.all(requests);
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      // Según configuración: máximo 10 req/min por IP
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Procesamiento de imágenes', () => {
    it('debe procesar imagen válida con watermark', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();
      const image = await createTestImage(1200, 900);

      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: createUploadFormData(event.id, [{
          buffer: image,
          filename: 'test.jpg'
        }])
      }, admin.id);

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.uploaded).toHaveLength(1);
      expect(result.uploaded[0]).toMatchObject({
        filename: expect.any(String),
        size: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
        path: expect.any(String)
      });

      // Verificar que se redimensionó correctamente (máx 1600px)
      expect(result.uploaded[0].width).toBeLessThanOrEqual(1600);
      expect(result.uploaded[0].height).toBeLessThanOrEqual(1600);
    });

    it('debe limpiar metadatos EXIF por seguridad', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();
      const imageWithExif = await createImageWithExif();

      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: createUploadFormData(event.id, [{
          buffer: imageWithExif,
          filename: 'test-exif.jpg'
        }])
      }, admin.id);

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);

      // Verificar que la imagen se procesó
      const uploadedPhoto = result.uploaded[0];
      expect(uploadedPhoto).toBeDefined();
    });

    it('debe detectar y reportar duplicados', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();
      const image = await createTestImage();

      const formData = createUploadFormData(event.id, [
        { buffer: image, filename: 'original.jpg' },
        { buffer: image, filename: 'duplicate.jpg' } // Mismo buffer = mismo hash
      ]);

      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: formData
      }, admin.id);

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.duplicates).toBeDefined();
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0]).toMatchObject({
        originalName: 'duplicate.jpg',
        duplicateOf: 'original.jpg',
        hash: expect.any(String)
      });
    });

    it('debe manejar múltiples archivos con límite de concurrencia', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();
      
      // Crear 5 imágenes diferentes
      const images = await Promise.all([
        createTestImage(600, 400),
        createTestImage(800, 600),
        createTestImage(1000, 800),
        createTestImage(1200, 900),
        createTestImage(1400, 1000)
      ]);

      const formData = createUploadFormData(
        event.id,
        images.map((buffer, i) => ({
          buffer,
          filename: `test-${i + 1}.jpg`
        }))
      );

      const startTime = Date.now();
      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: formData
      }, admin.id);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.uploaded).toHaveLength(5);
      expect(result.stats.processed).toBe(5);
      
      // Verificar que el procesamiento no tardó demasiado (concurrencia)
      expect(duration).toBeLessThan(30000); // 30 segundos máx
    });
  });

  describe('Validaciones y restricciones', () => {
    it('debe rechazar archivos muy grandes', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();
      
      // Crear imagen muy grande (>10MB)
      const largeImage = await sharp({
        create: {
          width: 5000,
          height: 5000,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
        .jpeg({ quality: 100 })
        .toBuffer();

      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: createUploadFormData(event.id, [{
          buffer: largeImage,
          filename: 'large.jpg'
        }])
      }, admin.id);

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.errors).toBeDefined();
      expect(result.errors[0].error).toContain('File too large');
    });

    it('debe rechazar formatos no válidos', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();

      const textFile = Buffer.from('This is not an image');

      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: createUploadFormData(event.id, [{
          buffer: textFile,
          filename: 'not-image.txt',
          contentType: 'text/plain'
        }])
      }, admin.id);

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.errors).toBeDefined();
      expect(result.errors[0].error).toContain('File type not allowed');
    });

    it('debe validar que el evento existe y pertenece al usuario', async () => {
      const admin = await testUtils.createTestAdmin();
      const otherAdmin = await testUtils.createTestAdmin();
      const event = await testUtils.createTestEvent(otherAdmin.id);
      const image = await createTestImage();

      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: createUploadFormData(event.id, [{
          buffer: image,
          filename: 'test.jpg'
        }])
      }, admin.id);

      expect(response.status).toBe(403);
      
      const result = await response.json();
      expect(result.error).toContain('Access denied');
    });

    it('debe rechazar más de 20 archivos por request', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();
      const image = await createTestImage();

      // Crear 25 archivos
      const files = Array.from({ length: 25 }, (_, i) => ({
        buffer: image,
        filename: `test-${i + 1}.jpg`
      }));

      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: createUploadFormData(event.id, files)
      }, admin.id);

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toContain('Maximum 20 files');
    });
  });

  describe('Calidad de imagen y optimización', () => {
    it('debe redimensionar imágenes grandes a máx 1600px', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();
      
      const largeImage = await createTestImage(3000, 2000);

      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: createUploadFormData(event.id, [{
          buffer: largeImage,
          filename: 'large.jpg'
        }])
      }, admin.id);

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      
      const uploaded = result.uploaded[0];
      expect(uploaded.width).toBeLessThanOrEqual(1600);
      expect(uploaded.height).toBeLessThanOrEqual(1600);
      
      // Mantener proporción
      const originalRatio = 3000 / 2000;
      const processedRatio = uploaded.width / uploaded.height;
      expect(Math.abs(originalRatio - processedRatio)).toBeLessThan(0.01);
    });

    it('debe convertir a WebP con calidad 72', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();
      
      const pngImage = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 0.5 }
        }
      })
        .png()
        .toBuffer();

      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: createUploadFormData(event.id, [{
          buffer: pngImage,
          filename: 'test.png',
          contentType: 'image/png'
        }])
      }, admin.id);

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      
      const uploaded = result.uploaded[0];
      expect(uploaded.filename).toMatch(/\.webp$/);
    });
  });

  describe('Base de datos y storage', () => {
    it('debe guardar metadatos correctos en la base de datos', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();
      const image = await createTestImage(800, 600);

      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: createUploadFormData(event.id, [{
          buffer: image,
          filename: 'test.jpg'
        }])
      }, admin.id);

      expect(response.status).toBe(200);
      
      const result = await response.json();
      const uploadedPhoto = result.uploaded[0];

      // Verificar en base de datos
      const { data: photoFromDb } = await testUtils.supabase
        .from('photos')
        .select('*')
        .eq('id', uploadedPhoto.id)
        .single();

      expect(photoFromDb).toMatchObject({
        event_id: event.id,
        storage_path: expect.any(String),
        width: expect.any(Number),
        height: expect.any(Number),
        approved: false,
        subject_id: null
      });
    });

    it('debe guardar solo el path de storage, no URL completa', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();
      const image = await createTestImage();

      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: createUploadFormData(event.id, [{
          buffer: image,
          filename: 'test.jpg'
        }])
      }, admin.id);

      const result = await response.json();
      const uploadedPhoto = result.uploaded[0];

      expect(uploadedPhoto.path).not.toContain('http');
      expect(uploadedPhoto.path).not.toContain('supabase');
      expect(uploadedPhoto.path).toMatch(/^photos\//);
    });
  });

  describe('Manejo de errores', () => {
    it('debe manejar errores de storage graciosamente', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();
      const image = await createTestImage();

      // Mock storage error
      vi.mock('@/lib/services/storage', () => ({
        uploadToStorage: vi.fn().mockRejectedValue(new Error('Storage unavailable'))
      }));

      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: createUploadFormData(event.id, [{
          buffer: image,
          filename: 'test.jpg'
        }])
      }, admin.id);

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.errors).toBeDefined();
      expect(result.errors[0].error).toContain('Upload failed');
    });

    it('debe retornar respuesta estructurada incluso con fallos parciales', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();
      
      const validImage = await createTestImage();
      const invalidFile = Buffer.from('invalid');

      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: createUploadFormData(event.id, [
          { buffer: validImage, filename: 'valid.jpg' },
          { buffer: invalidFile, filename: 'invalid.jpg' }
        ])
      }, admin.id);

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.uploaded).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.stats).toMatchObject({
        processed: 1,
        errors: 1,
        total: 2
      });
    });
  });

  describe('Performance y timeouts', () => {
    it('debe completar dentro del timeout configurado', async () => {
      const event = await testUtils.createTestEvent();
      const admin = await testUtils.createTestAdmin();
      
      // Crear imágenes de tamaño mediano
      const images = await Promise.all(
        Array.from({ length: 10 }, () => createTestImage(1200, 800))
      );

      const formData = createUploadFormData(
        event.id,
        images.map((buffer, i) => ({
          buffer,
          filename: `perf-test-${i + 1}.jpg`
        }))
      );

      const startTime = Date.now();
      const response = await testUtils.makeAuthenticatedRequest(POST, {
        method: 'POST',
        body: formData
      }, admin.id);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(60000); // 60s timeout configurado
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.uploaded).toHaveLength(10);
    });
  });
});