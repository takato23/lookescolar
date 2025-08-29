/**
 * Tests para el servicio de storage
 * Testing crítico según CLAUDE.md
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  uploadToStorage,
  getSignedUrl,
  getSignedUrls,
  deleteFromStorage,
  deleteMultipleFromStorage,
  getFileInfo,
  listFiles,
  fileExists,
  trackEgressMetrics,
  getEgressMetrics,
  cleanupOldPreviews,
} from '@/lib/services/storage';
import { processImageWithWatermark } from '@/lib/services/watermark';
import sharp from 'sharp';

// Mock de Supabase
const mockSupabase = {
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      createSignedUrl: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      upsert: vi.fn(),
      delete: vi.fn(() => ({
        in: vi.fn(),
        lt: vi.fn(),
        eq: vi.fn(),
      })),
      gte: vi.fn(() => ({
        lte: vi.fn(() => ({
          order: vi.fn(),
        })),
        order: vi.fn(),
      })),
      lte: vi.fn(() => ({
        order: vi.fn(),
      })),
      order: vi.fn(),
    })),
  })),
};

// Mock del módulo de supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseServiceClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe('Storage Service', () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // Función helper para crear imagen de test
  async function createTestProcessedImage() {
    const buffer = await sharp({
      create: { width: 400, height: 300, channels: 3, background: 'blue' },
    })
      .png()
      .toBuffer();

    return processImageWithWatermark(buffer, {
      text: '© Test',
    });
  }

  describe('uploadToStorage', () => {
    it('debe subir imagen procesada al bucket privado', async () => {
      const processedImage = await createTestProcessedImage();
      const eventId = 'test-event-123';

      // Mock respuesta exitosa
      const mockUpload = mockSupabase.storage.from().upload as any;
      mockUpload.mockResolvedValue({ error: null });

      const result = await uploadToStorage(processedImage, eventId);

      expect(result).toMatchObject({
        path: expect.stringMatching(
          /^eventos\/test-event-123\/previews\/[a-f0-9]{16}\.webp$/
        ),
        size: processedImage.size,
      });

      // Verificar llamada correcta
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('photos-private');
      expect(mockUpload).toHaveBeenCalledWith(
        result.path,
        processedImage.buffer,
        expect.objectContaining({
          contentType: 'image/webp',
          cacheControl: '3600',
          upsert: false,
        })
      );
    });

    it('debe fallar cuando hay error de upload', async () => {
      const processedImage = await createTestProcessedImage();
      const eventId = 'test-event-123';

      // Mock error de upload
      const mockUpload = mockSupabase.storage.from().upload as any;
      mockUpload.mockResolvedValue({
        error: { message: 'Upload failed' },
      });

      await expect(uploadToStorage(processedImage, eventId)).rejects.toThrow(
        'Error al subir imagen: Upload failed'
      );
    });

    it('debe usar estructura de carpetas correcta', async () => {
      const processedImage = await createTestProcessedImage();
      const eventId = 'evento-12345';

      const mockUpload = mockSupabase.storage.from().upload as any;
      mockUpload.mockResolvedValue({ error: null });

      const result = await uploadToStorage(processedImage, eventId);

      expect(result.path).toMatch(
        /^eventos\/evento-12345\/previews\/[a-f0-9]{16}\.webp$/
      );
    });
  });

  describe('getSignedUrl', () => {
    it('debe generar URL firmada con expiración por defecto', async () => {
      const path = 'eventos/test/previews/abc123.webp';
      const signedUrl = 'https://bucket.supabase.co/signed-url';

      // Mock respuesta exitosa
      const mockCreateSignedUrl = mockSupabase.storage.from()
        .createSignedUrl as any;
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl },
        error: null,
      });

      const result = await getSignedUrl(path);

      expect(result).toBe(signedUrl);
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(path, 3600);
    });

    it('debe permitir expiración personalizada', async () => {
      const path = 'eventos/test/previews/abc123.webp';
      const customExpiry = 7200; // 2 horas
      const signedUrl = 'https://bucket.supabase.co/signed-url-2h';

      const mockCreateSignedUrl = mockSupabase.storage.from()
        .createSignedUrl as any;
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl },
        error: null,
      });

      const result = await getSignedUrl(path, customExpiry);

      expect(result).toBe(signedUrl);
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(path, customExpiry);
    });

    it('debe fallar cuando hay error generando URL', async () => {
      const path = 'eventos/test/previews/abc123.webp';

      const mockCreateSignedUrl = mockSupabase.storage.from()
        .createSignedUrl as any;
      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'File not found' },
      });

      await expect(getSignedUrl(path)).rejects.toThrow(
        'Error al generar URL firmada: File not found'
      );
    });
  });

  describe('getSignedUrls batch', () => {
    it('debe generar múltiples URLs en lotes', async () => {
      const paths = [
        'eventos/test/previews/abc1.webp',
        'eventos/test/previews/abc2.webp',
        'eventos/test/previews/abc3.webp',
      ];

      const mockCreateSignedUrl = mockSupabase.storage.from()
        .createSignedUrl as any;
      // Mock respuestas exitosas para cada path
      paths.forEach((path, index) => {
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: `https://bucket.supabase.co/${index}` },
          error: null,
        });
      });

      const urlMap = await getSignedUrls(paths);

      expect(urlMap.size).toBe(3);
      paths.forEach((path, index) => {
        expect(urlMap.get(path)).toBe(`https://bucket.supabase.co/${index}`);
      });
    });

    it('debe manejar errores individuales sin fallar todo el batch', async () => {
      const paths = [
        'eventos/test/previews/valid.webp',
        'eventos/test/previews/invalid.webp',
      ];

      const mockCreateSignedUrl = mockSupabase.storage.from()
        .createSignedUrl as any;
      // Primera URL exitosa
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://bucket.supabase.co/valid' },
        error: null,
      });
      // Segunda URL con error
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const urlMap = await getSignedUrls(paths);

      expect(urlMap.size).toBe(1);
      expect(urlMap.get(paths[0])).toBe('https://bucket.supabase.co/valid');
      expect(urlMap.has(paths[1])).toBe(false);
    });
  });

  describe('deleteFromStorage', () => {
    it('debe eliminar archivo del storage', async () => {
      const path = 'eventos/test/previews/abc123.webp';

      const mockRemove = mockSupabase.storage.from().remove as any;
      mockRemove.mockResolvedValue({ error: null });

      await expect(deleteFromStorage(path)).resolves.toBeUndefined();
      expect(mockRemove).toHaveBeenCalledWith([path]);
    });

    it('debe fallar cuando hay error eliminando', async () => {
      const path = 'eventos/test/previews/abc123.webp';

      const mockRemove = mockSupabase.storage.from().remove as any;
      mockRemove.mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      await expect(deleteFromStorage(path)).rejects.toThrow(
        'Error al eliminar imagen: Delete failed'
      );
    });
  });

  describe('trackEgressMetrics', () => {
    it('debe registrar métricas de egress correctamente', async () => {
      const path = 'eventos/event-123/previews/photo.webp';

      // Mock para getFileInfo
      const mockList = mockSupabase.storage.from().list as any;
      mockList.mockResolvedValue({
        data: [{ metadata: { size: 150000 } }],
        error: null,
      });

      // Mock para upsert de métricas
      const mockUpsert = mockSupabase.from().upsert as any;
      mockUpsert.mockResolvedValue({ error: null });

      await expect(trackEgressMetrics(path)).resolves.toBeUndefined();

      // Verificar que se llamó upsert con datos correctos
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: 'event-123',
          date: expect.any(String),
          bytes_served: expect.any(Number),
          requests_count: 1,
        }),
        expect.any(Object)
      );
    });

    it('debe extraer event_id del path correctamente', async () => {
      const testCases = [
        { path: 'eventos/abc-123/previews/photo.webp', expected: 'abc-123' },
        {
          path: 'eventos/event-uuid-456/previews/image.webp',
          expected: 'event-uuid-456',
        },
        { path: 'invalid/path/structure.webp', expected: null },
      ];

      for (const { path, expected } of testCases) {
        const mockList = mockSupabase.storage.from().list as any;
        const mockUpsert = mockSupabase.from().upsert as any;

        if (expected) {
          mockList.mockResolvedValue({
            data: [{ metadata: { size: 100000 } }],
            error: null,
          });
          mockUpsert.mockResolvedValue({ error: null });

          await trackEgressMetrics(path);

          expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
              event_id: expected,
            }),
            expect.any(Object)
          );
        } else {
          // Path inválido - no debería llamar upsert
          await trackEgressMetrics(path);
          expect(mockUpsert).not.toHaveBeenCalled();
        }

        vi.clearAllMocks();
      }
    });

    it('debe manejar errores sin fallar', async () => {
      const path = 'eventos/test/previews/photo.webp';

      // Mock error en getFileInfo
      const mockList = mockSupabase.storage.from().list as any;
      mockList.mockRejectedValue(new Error('Storage error'));

      // No debe fallar
      await expect(trackEgressMetrics(path)).resolves.toBeUndefined();
    });
  });

  describe('getEgressMetrics', () => {
    it('debe obtener métricas de un evento', async () => {
      const eventId = 'event-123';
      const mockMetrics = [
        {
          id: '1',
          event_id: eventId,
          date: '2024-01-15',
          bytes_served: 1000000,
          requests_count: 50,
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockMetrics,
        error: null,
      });
      const mockEq = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ eq: mockEq }));
      const mockFrom = vi.fn(() => ({ select: mockSelect }));

      // Reemplazar mock temporalmente
      const originalMockSupabase = mockSupabase.from;
      mockSupabase.from = mockFrom as any;

      const result = await getEgressMetrics(eventId);

      expect(result).toEqual(mockMetrics);
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('event_id', eventId);
      expect(mockOrder).toHaveBeenCalledWith('date', { ascending: false });

      // Restaurar mock original
      mockSupabase.from = originalMockSupabase;
    });

    it('debe aplicar filtros de fecha correctamente', async () => {
      const eventId = 'event-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockLte = vi.fn(() => ({ order: mockOrder }));
      const mockGte = vi.fn(() => ({ lte: mockLte }));
      const mockEq = vi.fn(() => ({ gte: mockGte }));
      const mockSelect = vi.fn(() => ({ eq: mockEq }));
      const mockFrom = vi.fn(() => ({ select: mockSelect }));

      const originalMockSupabase = mockSupabase.from;
      mockSupabase.from = mockFrom as any;

      await getEgressMetrics(eventId, startDate, endDate);

      expect(mockGte).toHaveBeenCalledWith('date', startDate);
      expect(mockLte).toHaveBeenCalledWith('date', endDate);

      mockSupabase.from = originalMockSupabase;
    });
  });

  describe('CLAUDE.md Compliance', () => {
    it('debe usar bucket privado para storage', async () => {
      const processedImage = await createTestProcessedImage();
      const eventId = 'test-event';

      const mockUpload = mockSupabase.storage.from().upload as any;
      mockUpload.mockResolvedValue({ error: null });

      await uploadToStorage(processedImage, eventId);

      // Verificar que usa el bucket privado correcto
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('photos-private');
    });

    it('debe generar URLs firmadas con expiración de 1 hora por defecto', async () => {
      const path = 'test/path.webp';

      const mockCreateSignedUrl = mockSupabase.storage.from()
        .createSignedUrl as any;
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'test-url' },
        error: null,
      });

      await getSignedUrl(path);

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(path, 3600); // 1 hora
    });

    it('debe guardar solo el path, no URL completa', async () => {
      const processedImage = await createTestProcessedImage();
      const eventId = 'test-event';

      const mockUpload = mockSupabase.storage.from().upload as any;
      mockUpload.mockResolvedValue({ error: null });

      const result = await uploadToStorage(processedImage, eventId);

      // Verificar que retorna solo el path
      expect(result.path).toMatch(/^eventos\/.*\.webp$/);
      expect(result.path).not.toMatch(/^https?:\/\//);

      // Verificar que no retorna URL completa
      expect(result).not.toHaveProperty('url');
      expect(result).not.toHaveProperty('publicUrl');
    });

    it('debe usar estructura de carpetas eventos/{eventId}/previews/', async () => {
      const processedImage = await createTestProcessedImage();
      const eventId = 'mi-evento-123';

      const mockUpload = mockSupabase.storage.from().upload as any;
      mockUpload.mockResolvedValue({ error: null });

      const result = await uploadToStorage(processedImage, eventId);

      expect(result.path).toMatch(
        /^eventos\/mi-evento-123\/previews\/[a-f0-9]{16}\.webp$/
      );
    });

    it('debe trackear egress metrics automáticamente', async () => {
      const path = 'eventos/event-123/previews/photo.webp';

      const mockList = mockSupabase.storage.from().list as any;
      mockList.mockResolvedValue({
        data: [{ metadata: { size: 100000 } }],
        error: null,
      });

      const mockUpsert = mockSupabase.from().upsert as any;
      mockUpsert.mockResolvedValue({ error: null });

      // Por defecto debe trackear egress
      await getSignedUrl(path, 3600, true);

      // Debería haber intentado registrar métricas
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: 'event-123',
          bytes_served: expect.any(Number),
          requests_count: 1,
        }),
        expect.any(Object)
      );
    });
  });
});
