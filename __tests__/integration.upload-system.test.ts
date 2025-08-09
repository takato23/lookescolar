/**
 * Tests de integración para el sistema completo de upload
 * Verificar que watermark, storage y DB trabajan juntos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  processImageWithWatermark, 
  processImageBatch,
  validateImage
} from '@/lib/services/watermark'
import { uploadToStorage, getSignedUrl, trackEgressMetrics } from '@/lib/services/storage'
import sharp from 'sharp'

// Mock de Supabase para evitar conexiones reales
const mockUpload = vi.fn(() => Promise.resolve({ error: null }))
const mockCreateSignedUrl = vi.fn(() => Promise.resolve({ 
  data: { signedUrl: 'https://test.supabase.co/signed-url' }, 
  error: null 
}))
const mockList = vi.fn(() => Promise.resolve({
  data: [{ metadata: { size: 125000 } }],
  error: null
}))
const mockUpsert = vi.fn(() => Promise.resolve({ error: null }))

const mockSupabase = {
  storage: {
    from: vi.fn(() => ({
      upload: mockUpload,
      createSignedUrl: mockCreateSignedUrl,
      list: mockList
    }))
  },
  from: vi.fn(() => ({
    upsert: mockUpsert,
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseServiceClient: vi.fn(() => Promise.resolve(mockSupabase))
}))

describe('Sistema de Upload Integrado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper para crear imagen de test
  async function createTestImage(width = 800, height = 600) {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 128, b: 64 }
      }
    }).jpeg().toBuffer()
  }

  describe('Flujo completo de procesamiento', () => {
    it('debe procesar, subir y generar URL firmada para una imagen', async () => {
      const eventId = 'test-event-12345'
      const originalBuffer = await createTestImage(1000, 800)
      
      // Paso 1: Validar imagen
      const isValid = await validateImage(originalBuffer)
      expect(isValid).toBe(true)
      
      // Paso 2: Procesar con watermark
      const processed = await processImageWithWatermark(originalBuffer, {
        text: '© Test Event - MUESTRA',
        position: 'center'
      })
      
      expect(processed.format).toBe('webp')
      expect(processed.width).toBeLessThanOrEqual(1600)
      expect(processed.height).toBeLessThanOrEqual(1600)
      expect(processed.filename).toMatch(/^[a-f0-9]{16}\.webp$/)
      
      // Paso 3: Subir a storage
      const { path, size } = await uploadToStorage(processed, eventId)
      
      expect(path).toMatch(`eventos/${eventId}/previews/${processed.filename}`)
      expect(size).toBe(processed.size)
      
      // Paso 4: Generar URL firmada
      const signedUrl = await getSignedUrl(path)
      
      expect(signedUrl).toBe('https://test.supabase.co/signed-url')
      
      // Verificar llamadas al storage
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('photos-private')
    })

    it('debe procesar múltiples imágenes respetando concurrencia', async () => {
      const eventId = 'batch-test-event'
      const images = [
        { buffer: await createTestImage(400, 300), originalName: 'img1.jpg' },
        { buffer: await createTestImage(600, 450), originalName: 'img2.jpg' },
        { buffer: await createTestImage(800, 600), originalName: 'img3.jpg' }
      ]

      // Procesar en lote
      const startTime = Date.now()
      const { results, errors } = await processImageBatch(images, {
        text: '© Batch Test - MUESTRA'
      }, 2) // Límite de concurrencia
      
      const duration = Date.now() - startTime
      
      expect(results).toHaveLength(3)
      expect(errors).toHaveLength(0)
      expect(duration).toBeGreaterThan(0)
      
      // Verificar que todas las imágenes están procesadas correctamente
      results.forEach((result, index) => {
        expect(result.format).toBe('webp')
        expect(result.width).toBeGreaterThan(0)
        expect(result.height).toBeGreaterThan(0)
        expect(result.size).toBeGreaterThan(1000) // Al menos 1KB
      })
    })

    it('debe manejar errores de imagen inválida sin afectar el lote', async () => {
      const images = [
        { buffer: await createTestImage(400, 300), originalName: 'valid.jpg' },
        { buffer: Buffer.from('not an image'), originalName: 'invalid.txt' },
        { buffer: await createTestImage(600, 400), originalName: 'valid2.jpg' }
      ]

      const { results, errors } = await processImageBatch(images, {
        text: '© Error Test'
      })

      expect(results).toHaveLength(2)
      expect(errors).toHaveLength(1)
      expect(errors[0].originalName).toBe('invalid.txt')
      expect(errors[0].error).toBeTruthy()
    })
  })

  describe('Cumplimiento de requisitos CLAUDE.md', () => {
    it('debe aplicar todas las transformaciones requeridas', async () => {
      const originalBuffer = await createTestImage(2000, 1500) // Imagen grande
      
      const processed = await processImageWithWatermark(originalBuffer, {
        text: '© Test School - MUESTRA'
      })

      // Verificar dimensiones máximas (1600px)
      expect(Math.max(processed.width, processed.height)).toBeLessThanOrEqual(1600)
      
      // Verificar formato WebP
      expect(processed.format).toBe('webp')
      
      // Verificar que mantiene proporción
      const originalRatio = 2000 / 1500
      const processedRatio = processed.width / processed.height
      expect(processedRatio).toBeCloseTo(originalRatio, 2)
    })

    it('debe usar estructura de storage correcta', async () => {
      const processed = await processImageWithWatermark(
        await createTestImage(400, 300)
      )
      const eventId = 'storage-test-event'
      
      const { path } = await uploadToStorage(processed, eventId)
      
      // Verificar estructura: eventos/{eventId}/previews/{filename}
      expect(path).toMatch(/^eventos\/storage-test-event\/previews\/[a-f0-9]{16}\.webp$/)
    })

    it('debe trackear métricas de egress automáticamente', async () => {
      const path = 'eventos/metrics-test/previews/photo123.webp'
      
      // Llamar trackEgressMetrics
      await trackEgressMetrics(path)
      
      // Verificar que se intentó registrar métricas
      expect(mockSupabase.from).toHaveBeenCalledWith('egress_metrics')
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: 'metrics-test',
          bytes_served: expect.any(Number),
          requests_count: 1
        }),
        expect.any(Object)
      )
    })

    it('debe generar URLs firmadas con expiración de 1 hora', async () => {
      const path = 'eventos/url-test/previews/photo.webp'
      
      const url = await getSignedUrl(path)
      
      // Verificar resultado y llamada correcta
      expect(url).toBe('https://test.supabase.co/signed-url')
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(path, 3600) // 1 hora
    })
  })

  describe('Performance y concurrencia', () => {
    it('debe procesar imagen típica rápidamente', async () => {
      const buffer = await createTestImage(1200, 900)
      const startTime = Date.now()
      
      const result = await processImageWithWatermark(buffer)
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(3000) // 3 segundos máximo
      expect(result.size).toBeGreaterThan(0)
    })

    it('debe manejar procesamiento concurrente correctamente', async () => {
      const promises = Array.from({ length: 5 }, async (_, i) => {
        const buffer = await createTestImage(400, 300)
        return processImageWithWatermark(buffer, {
          text: `© Concurrent Test ${i}`
        })
      })

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result.format).toBe('webp')
        expect(result.size).toBeGreaterThan(0)
      })
    })
  })

  describe('Seguridad y validación', () => {
    it('debe rechazar archivos que no son imágenes', async () => {
      const invalidBuffers = [
        Buffer.from('not an image'),
        Buffer.from(''),
        Buffer.from('<?xml version="1.0"?>'), // XML
        Buffer.from('{"json": "file"}') // JSON
      ]

      for (const buffer of invalidBuffers) {
        const isValid = await validateImage(buffer)
        expect(isValid).toBe(false)
      }
    })

    it('debe validar correctamente imágenes reales', async () => {
      const validImages = [
        await sharp({ create: { width: 100, height: 100, channels: 3, background: 'red' } }).jpeg().toBuffer(),
        await sharp({ create: { width: 100, height: 100, channels: 3, background: 'blue' } }).png().toBuffer(),
        await sharp({ create: { width: 100, height: 100, channels: 3, background: 'green' } }).webp().toBuffer()
      ]

      for (const buffer of validImages) {
        const isValid = await validateImage(buffer)
        expect(isValid).toBe(true)
      }
    })

    it('debe usar bucket privado para storage', async () => {
      const processed = await processImageWithWatermark(
        await createTestImage(400, 300)
      )
      
      await uploadToStorage(processed, 'security-test')
      
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('photos-private')
    })
  })
})