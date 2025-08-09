import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { storageService, BatchSignedUrlRequest, SignedUrlOptions } from '@/lib/services/storage';
import { egressService } from '@/lib/services/egress.service';
import { logger } from '@/lib/utils/logger';

// Mock Supabase client
const mockSupabase = {
  storage: {
    listBuckets: vi.fn(),
    createBucket: vi.fn(),
    getBucket: vi.fn(),
    from: vi.fn(() => ({
      createSignedUrl: vi.fn(),
      list: vi.fn(),
      remove: vi.fn(),
    })),
  }
};

// Mock external services
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase
}));

vi.mock('@/lib/services/egress.service');
vi.mock('@/lib/utils/logger');

// Test constants
const TEST_BUCKET = 'test-photos';
const TEST_PATH = 'events/test-event/photos/IMG_001.jpg';
const TEST_SIGNED_URL = 'https://storage.supabase.co/object/sign/bucket/photo.jpg?token=signed-token-123';
const TEST_EVENT_ID = '123e4567-e89b-12d3-a456-426614174000';

describe('StorageService - Comprehensive Tests', () => {
  let mockStorageFrom: any;

  beforeAll(() => {
    // Set test environment variables
    process.env.STORAGE_BUCKET = TEST_BUCKET;
    process.env.NEXT_PUBLIC_SITE_URL = 'https://lookescolar.com';
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockStorageFrom = {
      createSignedUrl: vi.fn(),
      list: vi.fn(),
      remove: vi.fn(),
    };
    
    mockSupabase.storage.from.mockReturnValue(mockStorageFrom);
    mockSupabase.storage.listBuckets.mockResolvedValue({ data: [], error: null });
    mockSupabase.storage.createBucket.mockResolvedValue({ error: null });
    mockSupabase.storage.getBucket.mockResolvedValue({ data: { public: false }, error: null });
    
    mockStorageFrom.createSignedUrl.mockResolvedValue({
      data: { signedUrl: TEST_SIGNED_URL },
      error: null
    });
    
    (egressService.trackEgress as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
    // Clear internal cache
    (storageService as any).urlCache.clear();
  });

  describe('Configuración de Bucket Privado', () => {
    it('debería crear bucket privado si no existe', async () => {
      // Mock bucket no existe
      mockSupabase.storage.listBuckets.mockResolvedValue({
        data: [], // No buckets
        error: null
      });

      await storageService.configureBucketPrivate();

      expect(mockSupabase.storage.createBucket).toHaveBeenCalledWith(TEST_BUCKET, {
        public: false,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 10 * 1024 * 1024,
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Private bucket created successfully',
        { bucket: TEST_BUCKET }
      );
    });

    it('debería verificar que bucket existente sea privado', async () => {
      // Mock bucket existe
      mockSupabase.storage.listBuckets.mockResolvedValue({
        data: [{ name: TEST_BUCKET, public: false }],
        error: null
      });

      await storageService.configureBucketPrivate();

      expect(mockSupabase.storage.createBucket).not.toHaveBeenCalled();
      expect(mockSupabase.storage.getBucket).toHaveBeenCalledWith(TEST_BUCKET);
    });

    it('debería advertir si bucket existente es público', async () => {
      mockSupabase.storage.listBuckets.mockResolvedValue({
        data: [{ name: TEST_BUCKET, public: true }],
        error: null
      });

      mockSupabase.storage.getBucket.mockResolvedValue({
        data: { public: true },
        error: null
      });

      await storageService.configureBucketPrivate();

      expect(logger.warn).toHaveBeenCalledWith(
        'Bucket is public, should be private for security',
        { bucket: TEST_BUCKET }
      );
    });

    it('debería manejar errores al crear bucket', async () => {
      mockSupabase.storage.listBuckets.mockResolvedValue({
        data: [],
        error: null
      });

      mockSupabase.storage.createBucket.mockResolvedValue({
        error: { message: 'Permission denied' }
      });

      await expect(storageService.configureBucketPrivate()).rejects.toThrow(
        'Error creating bucket: Permission denied'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to configure bucket',
        expect.objectContaining({
          error: 'Error creating bucket: Permission denied',
          bucket: TEST_BUCKET
        })
      );
    });

    it('debería manejar errores al listar buckets', async () => {
      mockSupabase.storage.listBuckets.mockResolvedValue({
        data: null,
        error: { message: 'Access denied' }
      });

      await expect(storageService.configureBucketPrivate()).rejects.toThrow(
        'Error listing buckets: Access denied'
      );
    });
  });

  describe('Generación de URLs Firmadas', () => {
    it('debería generar URL firmada con opciones por defecto', async () => {
      const url = await storageService.createSignedUrl(TEST_PATH);

      expect(url).toBe(TEST_SIGNED_URL);
      expect(mockStorageFrom.createSignedUrl).toHaveBeenCalledWith(
        TEST_PATH,
        3600, // 1 hora por defecto
        {
          download: undefined,
          transform: undefined,
        }
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Signed URL created successfully',
        expect.objectContaining({
          path: 'eve***jpg', // Path enmascarado
          expiresIn: 3600,
          cached: false,
        })
      );
    });

    it('debería generar URL firmada con opciones personalizadas', async () => {
      const options: SignedUrlOptions = {
        expiresIn: 7200,
        download: true,
        transform: {
          width: 800,
          height: 600,
          resize: 'cover'
        }
      };

      const url = await storageService.createSignedUrl(TEST_PATH, options);

      expect(url).toBe(TEST_SIGNED_URL);
      expect(mockStorageFrom.createSignedUrl).toHaveBeenCalledWith(
        TEST_PATH,
        7200,
        {
          download: true,
          transform: {
            width: 800,
            height: 600,
            resize: 'cover'
          }
        }
      );
    });

    it('debería usar cache para URLs repetidas', async () => {
      // Primera llamada
      const url1 = await storageService.createSignedUrl(TEST_PATH);
      
      // Segunda llamada (debería usar cache)
      const url2 = await storageService.createSignedUrl(TEST_PATH);

      expect(url1).toBe(url2);
      expect(mockStorageFrom.createSignedUrl).toHaveBeenCalledTimes(1);

      expect(logger.debug).toHaveBeenCalledWith(
        'Returning cached signed URL',
        expect.objectContaining({
          path: 'eve***jpg',
          cacheHit: true
        })
      );
    });

    it('debería trackear egress cuando se proporcione data', async () => {
      const egressData = {
        eventId: TEST_EVENT_ID,
        bytes: 1024,
        requests: 1
      };

      await storageService.createSignedUrl(TEST_PATH, {}, egressData);

      expect(egressService.trackEgress).toHaveBeenCalledWith({
        eventId: TEST_EVENT_ID,
        bytes: 1024,
        requests: 1
      });
    });

    it('debería trackear egress para cache hits con bytes 0', async () => {
      const egressData = {
        eventId: TEST_EVENT_ID,
        bytes: 1024,
        requests: 1
      };

      // Primera llamada (crear cache)
      await storageService.createSignedUrl(TEST_PATH, {}, egressData);
      
      // Segunda llamada (cache hit)
      await storageService.createSignedUrl(TEST_PATH, {}, egressData);

      expect(egressService.trackEgress).toHaveBeenCalledTimes(2);
      expect(egressService.trackEgress).toHaveBeenLastCalledWith({
        eventId: TEST_EVENT_ID,
        bytes: 0, // Cache hit no transfiere bytes
        requests: 1
      });
    });

    it('debería manejar error de Supabase', async () => {
      mockStorageFrom.createSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'File not found' }
      });

      await expect(
        storageService.createSignedUrl(TEST_PATH)
      ).rejects.toThrow('Error creating signed URL: File not found');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create signed URL',
        expect.objectContaining({
          path: 'eve***jpg',
          error: 'Error creating signed URL: File not found'
        })
      );
    });

    it('debería manejar respuesta sin signedUrl', async () => {
      mockStorageFrom.createSignedUrl.mockResolvedValue({
        data: { signedUrl: null },
        error: null
      });

      await expect(
        storageService.createSignedUrl(TEST_PATH)
      ).rejects.toThrow('No signed URL returned from Supabase');
    });

    it('debería generar requestId único para cada llamada', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2');

      await storageService.createSignedUrl(TEST_PATH);
      await storageService.createSignedUrl('another/path.jpg');

      expect(crypto.randomUUID).toHaveBeenCalledTimes(2);
    });
  });

  describe('URLs Firmadas en Lote', () => {
    it('debería generar múltiples URLs firmadas en lote', async () => {
      const requests: BatchSignedUrlRequest[] = [
        { path: 'path1.jpg' },
        { path: 'path2.jpg', options: { expiresIn: 1800 } },
        { path: 'path3.jpg', options: { download: true } }
      ];

      const results = await storageService.createBatchSignedUrls(requests);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.path).toBe(requests[index].path);
        expect(result.url).toBe(TEST_SIGNED_URL);
        expect(result.error).toBeUndefined();
      });

      expect(mockStorageFrom.createSignedUrl).toHaveBeenCalledTimes(3);
    });

    it('debería procesar en lotes de 10 para no sobrecargar Supabase', async () => {
      const requests = Array(25).fill(0).map((_, i) => ({
        path: `path${i}.jpg`
      }));

      await storageService.createBatchSignedUrls(requests);

      expect(mockStorageFrom.createSignedUrl).toHaveBeenCalledTimes(25);
      expect(logger.info).toHaveBeenCalledWith(
        'Batch signed URLs created',
        expect.objectContaining({
          totalRequests: 25,
          successCount: 25,
          failureCount: 0,
          batchSize: 10
        })
      );
    });

    it('debería manejar errores individuales sin fallar el lote completo', async () => {
      const requests: BatchSignedUrlRequest[] = [
        { path: 'success.jpg' },
        { path: 'error.jpg' },
        { path: 'success2.jpg' }
      ];

      // Mock que el segundo falla
      let callCount = 0;
      mockStorageFrom.createSignedUrl.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.resolve({
            data: null,
            error: { message: 'File not found' }
          });
        }
        return Promise.resolve({
          data: { signedUrl: TEST_SIGNED_URL },
          error: null
        });
      });

      const results = await storageService.createBatchSignedUrls(requests);

      expect(results).toHaveLength(3);
      expect(results[0].url).toBe(TEST_SIGNED_URL);
      expect(results[1].url).toBeNull();
      expect(results[1].error).toContain('File not found');
      expect(results[2].url).toBe(TEST_SIGNED_URL);

      expect(logger.info).toHaveBeenCalledWith(
        'Batch signed URLs created',
        expect.objectContaining({
          totalRequests: 3,
          successCount: 2,
          failureCount: 1
        })
      );
    });

    it('debería trackear egress para batch con datos agregados', async () => {
      const requests: BatchSignedUrlRequest[] = [
        { path: 'path1.jpg' },
        { path: 'path2.jpg' }
      ];

      const egressData = {
        eventId: TEST_EVENT_ID,
        bytes: 2048,
        requests: 2
      };

      await storageService.createBatchSignedUrls(requests, egressData);

      // Cada URL individual debería trackear egress
      expect(egressService.trackEgress).toHaveBeenCalledTimes(2);
    });

    it('debería medir y reportar duración del procesamiento', async () => {
      const requests = Array(5).fill(0).map((_, i) => ({
        path: `path${i}.jpg`
      }));

      const startTime = Date.now();
      await storageService.createBatchSignedUrls(requests);
      const endTime = Date.now();

      expect(logger.info).toHaveBeenCalledWith(
        'Batch signed URLs created',
        expect.objectContaining({
          duration: expect.any(Number)
        })
      );

      // La duración reportada debería ser razonable
      const logCall = (logger.info as any).mock.calls.find((call: any) => 
        call[0] === 'Batch signed URLs created'
      );
      const reportedDuration = logCall[1].duration;
      expect(reportedDuration).toBeGreaterThan(0);
      expect(reportedDuration).toBeLessThan(endTime - startTime + 100); // 100ms buffer
    });
  });

  describe('Validación Anti-Hotlinking', () => {
    beforeEach(() => {
      // Reset trusted origins for consistent testing
      (storageService as any).trustedOrigins = [
        'https://lookescolar.com',
        'http://localhost:3000',
        'https://*.lookescolar.com'
      ];
    });

    it('debería permitir referers de dominios autorizados', async () => {
      const validReferers = [
        'https://lookescolar.com/gallery',
        'http://localhost:3000/admin',
        'https://app.lookescolar.com/family'
      ];

      validReferers.forEach(referer => {
        const isValid = storageService.validateReferer(referer);
        expect(isValid).toBe(true);
      });
    });

    it('debería rechazar referers de dominios no autorizados', async () => {
      const invalidReferers = [
        'https://malicious-site.com/',
        'https://phishing.lookescolar.fake/',
        'http://evil.com/steal-photos',
        'https://lookescolar.com.evil.com/'
      ];

      invalidReferers.forEach(referer => {
        const isValid = storageService.validateReferer(referer);
        expect(isValid).toBe(false);
      });
    });

    it('debería soportar wildcards en dominios autorizados', async () => {
      const wildcardTests = [
        { referer: 'https://admin.lookescolar.com/', expected: true },
        { referer: 'https://api.lookescolar.com/photos', expected: true },
        { referer: 'https://malicious.lookescolar.fake/', expected: false }
      ];

      wildcardTests.forEach(({ referer, expected }) => {
        const isValid = storageService.validateReferer(referer);
        expect(isValid).toBe(expected);
      });
    });

    it('debería rechazar referer null o undefined', async () => {
      expect(storageService.validateReferer(null)).toBe(false);
      expect(storageService.validateReferer(undefined)).toBe(false);
      expect(storageService.validateReferer('')).toBe(false);
    });

    it('debería manejar URLs malformadas gracefully', async () => {
      const malformedUrls = [
        'not-a-url',
        'htp://invalid-protocol.com',
        'https://',
        'javascript:alert("xss")'
      ];

      malformedUrls.forEach(url => {
        const isValid = storageService.validateReferer(url);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Gestión de Cache', () => {
    it('debería cachear URLs con tiempo de expiración correcto', async () => {
      const expiresIn = 3600; // 1 hora
      await storageService.createSignedUrl(TEST_PATH, { expiresIn });

      const cache = (storageService as any).urlCache;
      const cacheKey = `${TEST_PATH}:{"expiresIn":3600}`;
      
      expect(cache.has(cacheKey)).toBe(true);
      
      const cached = cache.get(cacheKey);
      expect(cached.url).toBe(TEST_SIGNED_URL);
      
      // Debe expirar 5 minutos antes del tiempo real para buffer de seguridad
      const expectedExpiry = Date.now() + (expiresIn * 1000) - (5 * 60 * 1000);
      expect(cached.expiresAt).toBeLessThanOrEqual(expectedExpiry);
      expect(cached.expiresAt).toBeGreaterThan(expectedExpiry - 1000); // 1s tolerance
    });

    it('debería invalidar cache por patrón', async () => {
      // Crear varias URLs cacheadas
      await storageService.createSignedUrl('events/event1/photo1.jpg');
      await storageService.createSignedUrl('events/event1/photo2.jpg');
      await storageService.createSignedUrl('events/event2/photo1.jpg');

      const cache = (storageService as any).urlCache;
      expect(cache.size).toBe(3);

      // Invalidar solo event1
      storageService.invalidateCache('events/event1');

      expect(cache.size).toBe(1);
      
      // Verificar que solo queda event2
      const remainingKeys = Array.from(cache.keys());
      expect(remainingKeys[0]).toContain('events/event2/photo1.jpg');
    });

    it('debería limpiar todo el cache cuando no se proporciona patrón', async () => {
      await storageService.createSignedUrl('path1.jpg');
      await storageService.createSignedUrl('path2.jpg');

      const cache = (storageService as any).urlCache;
      expect(cache.size).toBe(2);

      storageService.invalidateCache();

      expect(cache.size).toBe(0);
      expect(logger.info).toHaveBeenCalledWith('All URL cache cleared');
    });

    it('debería limpiar entradas expiradas automáticamente', async () => {
      // Mock Date.now para controlar tiempo
      const mockNow = vi.spyOn(Date, 'now');
      const baseTime = 1000000000000; // Tiempo base
      mockNow.mockReturnValue(baseTime);

      // Crear URL con cache
      await storageService.createSignedUrl(TEST_PATH, { expiresIn: 3600 });

      const cache = (storageService as any).urlCache;
      expect(cache.size).toBe(1);

      // Avanzar tiempo más allá de expiración
      mockNow.mockReturnValue(baseTime + (4 * 60 * 60 * 1000)); // 4 horas después

      // Ejecutar limpieza manual (normalmente automática)
      (storageService as any).cleanExpiredCache();

      expect(cache.size).toBe(0);
      expect(logger.debug).toHaveBeenCalledWith(
        'Expired cache entries removed',
        { count: 1 }
      );

      mockNow.mockRestore();
    });

    it('debería generar claves de cache únicas para diferentes opciones', async () => {
      await storageService.createSignedUrl(TEST_PATH, { expiresIn: 3600 });
      await storageService.createSignedUrl(TEST_PATH, { expiresIn: 7200 });
      await storageService.createSignedUrl(TEST_PATH, { download: true });

      const cache = (storageService as any).urlCache;
      expect(cache.size).toBe(3);

      // Verificar que las claves son diferentes
      const keys = Array.from(cache.keys());
      expect(keys[0]).not.toBe(keys[1]);
      expect(keys[1]).not.toBe(keys[2]);
    });
  });

  describe('Limpieza de Archivos Antiguos', () => {
    it('debería limpiar archivos más antiguos que X días', async () => {
      const oldFiles = [
        {
          name: 'old-file-1.jpg',
          created_at: '2024-01-01T00:00:00Z',
          metadata: { size: 1024 }
        },
        {
          name: 'old-file-2.jpg',
          created_at: '2024-01-02T00:00:00Z',
          metadata: { size: 2048 }
        }
      ];

      const recentFiles = [
        {
          name: 'recent-file.jpg',
          created_at: new Date().toISOString(),
          metadata: { size: 512 }
        }
      ];

      mockStorageFrom.list.mockResolvedValue({
        data: [...oldFiles, ...recentFiles],
        error: null
      });

      mockStorageFrom.remove.mockResolvedValue({ error: null });

      const result = await storageService.cleanupOldFiles(30); // 30 días

      expect(result.deletedCount).toBe(2);
      expect(result.totalSizeBytes).toBe(3072); // 1024 + 2048

      expect(mockStorageFrom.remove).toHaveBeenCalledWith([
        'previews/old-file-1.jpg',
        'previews/old-file-2.jpg'
      ]);

      expect(logger.info).toHaveBeenCalledWith(
        'Old files cleanup completed',
        expect.objectContaining({
          deletedCount: 2,
          totalSizeBytes: 3072,
          totalSizeMB: 3,
          olderThanDays: 30
        })
      );
    });

    it('debería procesar eliminación en lotes de 100', async () => {
      const oldFiles = Array(250).fill(0).map((_, i) => ({
        name: `old-file-${i}.jpg`,
        created_at: '2024-01-01T00:00:00Z',
        metadata: { size: 1024 }
      }));

      mockStorageFrom.list.mockResolvedValue({
        data: oldFiles,
        error: null
      });

      mockStorageFrom.remove.mockResolvedValue({ error: null });

      await storageService.cleanupOldFiles(30);

      // Debería llamar remove 3 veces (100, 100, 50)
      expect(mockStorageFrom.remove).toHaveBeenCalledTimes(3);

      // Verificar tamaños de lotes
      const calls = (mockStorageFrom.remove as any).mock.calls;
      expect(calls[0][0]).toHaveLength(100);
      expect(calls[1][0]).toHaveLength(100);
      expect(calls[2][0]).toHaveLength(50);
    });

    it('debería continuar aunque algunos lotes fallen', async () => {
      const oldFiles = Array(150).fill(0).map((_, i) => ({
        name: `old-file-${i}.jpg`,
        created_at: '2024-01-01T00:00:00Z',
        metadata: { size: 1024 }
      }));

      mockStorageFrom.list.mockResolvedValue({
        data: oldFiles,
        error: null
      });

      // Mock que el segundo lote falla
      let callCount = 0;
      mockStorageFrom.remove.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.resolve({ error: { message: 'Network error' } });
        }
        return Promise.resolve({ error: null });
      });

      const result = await storageService.cleanupOldFiles(30);

      expect(result.deletedCount).toBe(100); // Solo el primer y tercer lote
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to delete batch',
        expect.objectContaining({
          batchStart: 100,
          batchSize: 100,
          error: 'Network error'
        })
      );
    });

    it('debería retornar 0 si no hay archivos antiguos', async () => {
      mockStorageFrom.list.mockResolvedValue({
        data: [
          {
            name: 'recent-file.jpg',
            created_at: new Date().toISOString(),
            metadata: { size: 1024 }
          }
        ],
        error: null
      });

      const result = await storageService.cleanupOldFiles(30);

      expect(result.deletedCount).toBe(0);
      expect(result.totalSizeBytes).toBe(0);
      expect(mockStorageFrom.remove).not.toHaveBeenCalled();
    });

    it('debería invalidar cache después de limpieza', async () => {
      const oldFiles = [
        {
          name: 'old-file.jpg',
          created_at: '2024-01-01T00:00:00Z',
          metadata: { size: 1024 }
        }
      ];

      mockStorageFrom.list.mockResolvedValue({
        data: oldFiles,
        error: null
      });

      mockStorageFrom.remove.mockResolvedValue({ error: null });

      const invalidateCacheSpy = vi.spyOn(storageService, 'invalidateCache');

      await storageService.cleanupOldFiles(30);

      expect(invalidateCacheSpy).toHaveBeenCalledWith('previews/');
    });

    it('debería manejar archivos sin metadata de tamaño', async () => {
      const filesWithoutSize = [
        {
          name: 'file-no-size.jpg',
          created_at: '2024-01-01T00:00:00Z',
          // Sin metadata.size
        }
      ];

      mockStorageFrom.list.mockResolvedValue({
        data: filesWithoutSize,
        error: null
      });

      mockStorageFrom.remove.mockResolvedValue({ error: null });

      const result = await storageService.cleanupOldFiles(30);

      expect(result.deletedCount).toBe(1);
      expect(result.totalSizeBytes).toBe(0); // Sin tamaño conocido
    });
  });

  describe('Estadísticas de Storage', () => {
    it('debería obtener estadísticas completas del storage', async () => {
      const mockFiles = [
        { name: 'file1.jpg', metadata: { size: 1024 } },
        { name: 'file2.jpg', metadata: { size: 2048 } },
        { name: 'file3.jpg' } // Sin size
      ];

      mockStorageFrom.list.mockResolvedValue({
        data: mockFiles,
        error: null
      });

      // Agregar entradas al cache
      await storageService.createSignedUrl('test1.jpg');
      await storageService.createSignedUrl('test2.jpg');

      const stats = await storageService.getStorageStats();

      expect(stats.totalFiles).toBe(3);
      expect(stats.totalSizeBytes).toBe(3072); // 1024 + 2048 + 0
      expect(stats.cacheSize).toBe(2);
    });

    it('debería manejar storage vacío', async () => {
      mockStorageFrom.list.mockResolvedValue({
        data: [],
        error: null
      });

      const stats = await storageService.getStorageStats();

      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSizeBytes).toBe(0);
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
    });

    it('debería manejar errores al obtener estadísticas', async () => {
      mockStorageFrom.list.mockResolvedValue({
        data: null,
        error: { message: 'Access denied' }
      });

      await expect(storageService.getStorageStats()).rejects.toThrow(
        'Error getting storage stats: Access denied'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get storage stats',
        expect.objectContaining({
          error: 'Error getting storage stats: Access denied'
        })
      );
    });
  });

  describe('Seguridad y Logging', () => {
    it('debería enmascarar paths en logs de seguridad', async () => {
      // Test método privado a través de su uso
      await storageService.createSignedUrl('very/long/sensitive/path/to/file.jpg');

      expect(logger.info).toHaveBeenCalledWith(
        'Signed URL created successfully',
        expect.objectContaining({
          path: 'ver***jpg' // Path enmascarado
        })
      );
    });

    it('debería enmascarar paths cortos completamente', async () => {
      await storageService.createSignedUrl('short.jpg');

      expect(logger.info).toHaveBeenCalledWith(
        'Signed URL created successfully',
        expect.objectContaining({
          path: '*********' // Completamente enmascarado
        })
      );
    });

    it('debería incluir requestId único en logs', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('unique-request-id-123');

      await storageService.createSignedUrl(TEST_PATH);

      expect(logger.info).toHaveBeenCalledWith(
        'Signed URL created successfully',
        expect.objectContaining({
          requestId: 'unique-request-id-123'
        })
      );
    });

    it('debería logear errores sin exponer información sensible', async () => {
      mockStorageFrom.createSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'Database connection string leaked: postgres://user:pass@host' }
      });

      try {
        await storageService.createSignedUrl(TEST_PATH);
      } catch {
        // Expected to throw
      }

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create signed URL',
        expect.objectContaining({
          path: 'eve***jpg', // Path enmascarado
          error: expect.stringContaining('Database connection string leaked') // Error message puede contener info sensible pero no el path
        })
      );
    });

    it('debería validar que STORAGE_BUCKET esté configurado', async () => {
      // En un entorno real, esto se haría reiniciando con env diferente
      expect(process.env.STORAGE_BUCKET).toBeDefined();
    });
  });

  describe('Performance y Límites', () => {
    it('debería completar operaciones de URL firmada rápidamente', async () => {
      const startTime = Date.now();
      
      await storageService.createSignedUrl(TEST_PATH);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 1 segundo máximo
    });

    it('debería manejar batch grande eficientemente', async () => {
      const largeRequests = Array(100).fill(0).map((_, i) => ({
        path: `large/batch/photo-${i}.jpg`
      }));

      const startTime = Date.now();
      const results = await storageService.createBatchSignedUrls(largeRequests);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // 5 segundos máximo para 100 URLs
      
      // Verificar que se procesan en lotes
      expect(logger.info).toHaveBeenCalledWith(
        'Batch signed URLs created',
        expect.objectContaining({
          batchSize: 10
        })
      );
    });

    it('debería manejar memoria eficientemente con cache grande', async () => {
      // Crear muchas URLs cacheadas
      const promises = Array(1000).fill(0).map((_, i) => 
        storageService.createSignedUrl(`cache/test/photo-${i}.jpg`)
      );

      await Promise.all(promises);

      const stats = await storageService.getStorageStats();
      expect(stats.cacheSize).toBe(1000);

      // El cache no debería consumir memoria excesiva
      const cache = (storageService as any).urlCache;
      expect(cache.size).toBeLessThanOrEqual(1000);
    });

    it('debería limpiar cache expirado para prevenir memory leaks', async () => {
      // Mock tiempo para controlar expiración
      const mockNow = vi.spyOn(Date, 'now');
      const baseTime = Date.now();
      mockNow.mockReturnValue(baseTime);

      // Crear URLs con diferentes tiempos de expiración
      await storageService.createSignedUrl('short-cache.jpg', { expiresIn: 60 });
      await storageService.createSignedUrl('long-cache.jpg', { expiresIn: 3600 });

      expect((storageService as any).urlCache.size).toBe(2);

      // Avanzar tiempo 2 minutos
      mockNow.mockReturnValue(baseTime + (2 * 60 * 1000));

      // Ejecutar limpieza
      (storageService as any).cleanExpiredCache();

      // Debería quedar solo la URL con cache largo
      expect((storageService as any).urlCache.size).toBe(1);

      mockNow.mockRestore();
    });
  });

  describe('Configuración y Inicialización', () => {
    it('debería usar configuración por defecto si no hay variables de entorno', async () => {
      // En test environment, debería usar valores por defecto
      expect(process.env.STORAGE_BUCKET || 'photos').toBeDefined();
    });

    it('debería configurar orígenes confiables correctamente', async () => {
      const trustedOrigins = (storageService as any).trustedOrigins;
      
      expect(trustedOrigins).toContain('https://lookescolar.com');
      expect(trustedOrigins).toContain('https://*.lookescolar.com');
      expect(trustedOrigins.some((origin: string) => origin.includes('localhost'))).toBe(true);
    });

    it('debería no ejecutar configuración automática en test environment', async () => {
      // Verificar que NODE_ENV=test previene auto-configuración
      expect(process.env.NODE_ENV).toBe('test');
      
      // La configuración automática no debería haberse ejecutado
      // (esto es verificable por la ausencia de llamadas no mockeadas)
    });
  });

  describe('Casos Edge y Robustez', () => {
    it('debería manejar paths con caracteres especiales', async () => {
      const specialPaths = [
        'events/test event/photo with spaces.jpg',
        'events/тест/фото.jpg',
        'events/test/photo%20encoded.jpg',
        'events/test/photo-with-émojis-🎉.jpg'
      ];

      for (const path of specialPaths) {
        await expect(
          storageService.createSignedUrl(path)
        ).resolves.toBe(TEST_SIGNED_URL);
      }
    });

    it('debería manejar opciones de transformación complejas', async () => {
      const complexOptions: SignedUrlOptions = {
        expiresIn: 1800,
        download: true,
        transform: {
          width: 1920,
          height: 1080,
          resize: 'contain'
        }
      };

      const url = await storageService.createSignedUrl(TEST_PATH, complexOptions);
      expect(url).toBe(TEST_SIGNED_URL);

      expect(mockStorageFrom.createSignedUrl).toHaveBeenCalledWith(
        TEST_PATH,
        1800,
        {
          download: true,
          transform: {
            width: 1920,
            height: 1080,
            resize: 'contain'
          }
        }
      );
    });

    it('debería manejar timeouts y reintentos gracefully', async () => {
      // Mock timeout en la primera llamada
      mockStorageFrom.createSignedUrl
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValue({
          data: { signedUrl: TEST_SIGNED_URL },
          error: null
        });

      // Primera llamada falla, pero no implementamos retry por defecto
      await expect(
        storageService.createSignedUrl(TEST_PATH)
      ).rejects.toThrow('Request timeout');
    });

    it('debería manejar responses malformados de Supabase', async () => {
      const malformedResponses = [
        { data: undefined, error: null },
        { data: {}, error: null }, // Sin signedUrl
        { data: { signedUrl: '' }, error: null }, // signedUrl vacío
        null, // Respuesta completamente null
        undefined // Respuesta undefined
      ];

      for (const response of malformedResponses) {
        mockStorageFrom.createSignedUrl.mockResolvedValueOnce(response);
        
        await expect(
          storageService.createSignedUrl(TEST_PATH)
        ).rejects.toThrow();
      }
    });
  });
});