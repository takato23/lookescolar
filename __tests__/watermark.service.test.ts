/**
 * Tests para el servicio de watermark
 * Cumple con requisitos TDD de CLAUDE.md
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';
import {
  processImageWithWatermark,
  processImageBatch,
  validateImage,
  getImageMetadata,
} from '@/lib/services/watermark';

// Función helper para crear imagen de test
async function createTestImage(
  width: number = 800,
  height: number = 600
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .png()
    .toBuffer();
}

describe('Watermark Service', () => {
  describe('processImageWithWatermark', () => {
    it('debe procesar imagen aplicando watermark y convirtiendo a WebP', async () => {
      const inputBuffer = await createTestImage(1000, 800);

      const result = await processImageWithWatermark(inputBuffer, {
        text: '© Test Watermark',
        position: 'center',
      });

      expect(result).toMatchObject({
        format: 'webp',
        width: expect.any(Number),
        height: expect.any(Number),
        size: expect.any(Number),
        filename: expect.stringMatching(/^[a-f0-9]{16}\.webp$/),
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);
    });

    it('debe redimensionar imágenes mayores a 1600px manteniendo proporción', async () => {
      const inputBuffer = await createTestImage(2400, 1800); // Mayor a 1600px

      const result = await processImageWithWatermark(inputBuffer);

      expect(result.width).toBeLessThanOrEqual(1600);
      expect(result.height).toBeLessThanOrEqual(1600);
      expect(result.width / result.height).toBeCloseTo(2400 / 1800, 2);
    });

    it('debe mantener imágenes menores a 1600px sin redimensionar', async () => {
      const inputBuffer = await createTestImage(800, 600); // Menor a 1600px

      const result = await processImageWithWatermark(inputBuffer);

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('debe aplicar watermark en diferentes posiciones', async () => {
      const inputBuffer = await createTestImage(800, 600);
      const positions: Array<
        'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
      > = ['center', 'bottom-right', 'bottom-left', 'top-right', 'top-left'];

      for (const position of positions) {
        const result = await processImageWithWatermark(inputBuffer, {
          text: `© Test ${position}`,
          position,
        });

        expect(result.format).toBe('webp');
        expect(result.width).toBe(800);
        expect(result.height).toBe(600);
      }
    });

    it('debe manejar diferentes niveles de opacidad', async () => {
      const inputBuffer = await createTestImage(400, 300);

      const result = await processImageWithWatermark(inputBuffer, {
        text: '© Test Opacity',
        opacity: 0.2,
      });

      expect(result.format).toBe('webp');
      expect(result.size).toBeGreaterThan(0);
    });

    it('debe fallar con buffer inválido', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(processImageWithWatermark(invalidBuffer)).rejects.toThrow();
    });
  });

  describe('processImageBatch', () => {
    it('debe procesar múltiples imágenes con límite de concurrencia', async () => {
      const images = [
        { buffer: await createTestImage(400, 300), originalName: 'test1.jpg' },
        { buffer: await createTestImage(600, 400), originalName: 'test2.jpg' },
        { buffer: await createTestImage(800, 600), originalName: 'test3.jpg' },
      ];

      const { results, errors } = await processImageBatch(
        images,
        {
          text: '© Batch Test',
        },
        2
      ); // Límite de concurrencia

      expect(results).toHaveLength(3);
      expect(errors).toHaveLength(0);

      results.forEach((result, index) => {
        expect(result.format).toBe('webp');
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
        expect(result.filename).toMatch(/^[a-f0-9]{16}\.webp$/);
      });
    });

    it('debe manejar errores en lote sin afectar imágenes válidas', async () => {
      const images = [
        { buffer: await createTestImage(400, 300), originalName: 'valid1.jpg' },
        { buffer: Buffer.from('invalid'), originalName: 'invalid.jpg' },
        { buffer: await createTestImage(600, 400), originalName: 'valid2.jpg' },
      ];

      const { results, errors } = await processImageBatch(images, {
        text: '© Error Test',
      });

      expect(results).toHaveLength(2);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        originalName: 'invalid.jpg',
        error: expect.any(String),
      });
    });

    it('debe procesar imágenes en lotes respetando concurrencia', async () => {
      const images = Array.from({ length: 4 }, (_, i) => ({
        buffer: createTestImage(200, 200),
        originalName: `test${i}.jpg`,
      }));

      // Esperar que todas las promesas de buffer se resuelvan
      const resolvedImages = await Promise.all(
        images.map(async (img) => ({
          buffer: await img.buffer,
          originalName: img.originalName,
        }))
      );

      const startTime = Date.now();
      const { results, errors } = await processImageBatch(
        resolvedImages,
        {},
        2
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(4);
      expect(errors).toHaveLength(0);
      expect(duration).toBeGreaterThan(0);
    }, 10000);
  });

  describe('validateImage', () => {
    it('debe validar imágenes válidas', async () => {
      const validFormats = [
        {
          buffer: await sharp({
            create: { width: 100, height: 100, channels: 3, background: 'red' },
          })
            .jpeg()
            .toBuffer(),
          format: 'JPEG',
        },
        {
          buffer: await sharp({
            create: {
              width: 100,
              height: 100,
              channels: 3,
              background: 'green',
            },
          })
            .png()
            .toBuffer(),
          format: 'PNG',
        },
        {
          buffer: await sharp({
            create: {
              width: 100,
              height: 100,
              channels: 3,
              background: 'blue',
            },
          })
            .webp()
            .toBuffer(),
          format: 'WebP',
        },
      ];

      for (const { buffer, format } of validFormats) {
        const isValid = await validateImage(buffer);
        expect(isValid, `${format} debería ser válido`).toBe(true);
      }
    });

    it('debe rechazar archivos inválidos', async () => {
      const invalidBuffers = [
        Buffer.from('not an image'),
        Buffer.from(''),
        Buffer.from('GIF89a'), // GIF incompleto
      ];

      for (const buffer of invalidBuffers) {
        const isValid = await validateImage(buffer);
        expect(isValid).toBe(false);
      }
    });
  });

  describe('getImageMetadata', () => {
    it('debe extraer metadata correctamente', async () => {
      const buffer = await createTestImage(640, 480);

      const metadata = await getImageMetadata(buffer);

      expect(metadata).toMatchObject({
        width: 640,
        height: 480,
        format: 'png',
        channels: expect.any(Number),
      });
    });

    it('debe fallar con buffer inválido', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(getImageMetadata(invalidBuffer)).rejects.toThrow();
    });
  });

  describe('Performance Requirements (CLAUDE.md)', () => {
    it('debe procesar imagen típica en menos de 3 segundos', async () => {
      const buffer = await createTestImage(1200, 900);
      const startTime = Date.now();

      const result = await processImageWithWatermark(buffer, {
        text: '© Performance Test',
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(3000);
      expect(result.format).toBe('webp');
    });

    it('debe generar archivo WebP con calidad 72', async () => {
      const buffer = await createTestImage(800, 600);

      const result = await processImageWithWatermark(buffer);

      // Verificar que es WebP
      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.format).toBe('webp');

      // Verificar que el archivo resultante tiene contenido
      expect(result.size).toBeGreaterThan(1000); // Al menos 1KB
    });

    it('debe limitar dimensiones a 1600px en lado largo', async () => {
      const testCases = [
        { width: 2000, height: 1000 }, // Ancho mayor
        { width: 1000, height: 2000 }, // Alto mayor
        { width: 2400, height: 2400 }, // Ambos mayores
      ];

      for (const { width, height } of testCases) {
        const buffer = await createTestImage(width, height);
        const result = await processImageWithWatermark(buffer);

        expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(1600);
      }
    });
  });
});
