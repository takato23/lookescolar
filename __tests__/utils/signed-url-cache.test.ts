/**
 * Tests para el sistema de caché de URLs firmadas
 * Testing crítico para el sistema de caché siguiendo CLAUDE.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getCachedUrl,
  setCachedUrl,
  removeCachedUrl,
  clearUrlCache,
  getCacheStats,
  preloadPhotoUrls,
  initializeUrlCache
} from '@/lib/utils/signed-url-cache'

// Mock global fetch
global.fetch = vi.fn()

// Mock sessionStorage
const mockSessionStorage = {
  store: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockSessionStorage.store.get(key) || null),
  setItem: vi.fn((key: string, value: string) => {
    mockSessionStorage.store.set(key, value)
  }),
  removeItem: vi.fn((key: string) => {
    mockSessionStorage.store.delete(key)
  }),
  clear: vi.fn(() => {
    mockSessionStorage.store.clear()
  })
}

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
})

// Mock window object
Object.defineProperty(window, 'location', {
  value: { href: 'http://localhost:3000' }
})

describe('Signed URL Cache System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionStorage.store.clear()
    clearUrlCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    clearUrlCache()
  })

  describe('Cache Operations', () => {
    it('debe almacenar y recuperar URL correctamente', () => {
      const photoId = 'photo-123'
      const url = 'https://storage.supabase.co/signed-url'
      
      setCachedUrl(photoId, url)
      const cached = getCachedUrl(photoId)
      
      expect(cached).toBe(url)
    })

    it('debe retornar null para foto no cacheada', () => {
      const cached = getCachedUrl('non-existent-photo')
      expect(cached).toBeNull()
    })

    it('debe remover URL específica del caché', () => {
      const photoId = 'photo-456'
      const url = 'https://storage.supabase.co/another-signed-url'
      
      setCachedUrl(photoId, url)
      expect(getCachedUrl(photoId)).toBe(url)
      
      removeCachedUrl(photoId)
      expect(getCachedUrl(photoId)).toBeNull()
    })

    it('debe limpiar todo el caché', () => {
      setCachedUrl('photo-1', 'url-1')
      setCachedUrl('photo-2', 'url-2')
      
      expect(getCachedUrl('photo-1')).toBe('url-1')
      expect(getCachedUrl('photo-2')).toBe('url-2')
      
      clearUrlCache()
      
      expect(getCachedUrl('photo-1')).toBeNull()
      expect(getCachedUrl('photo-2')).toBeNull()
    })
  })

  describe('Expiration Management', () => {
    it('debe expirar URLs después de 1 hora (CLAUDE.md requirement)', () => {
      const photoId = 'photo-expiry-test'
      const url = 'https://storage.supabase.co/expiry-test'
      
      setCachedUrl(photoId, url)
      expect(getCachedUrl(photoId)).toBe(url)
      
      // Avanzar tiempo 1 hora + 1 minuto
      vi.advanceTimersByTime(61 * 60 * 1000)
      
      expect(getCachedUrl(photoId)).toBeNull()
    })

    it('debe mantener URLs válidas dentro del período de expiración', () => {
      const photoId = 'photo-valid-test'
      const url = 'https://storage.supabase.co/valid-test'
      
      setCachedUrl(photoId, url)
      
      // Avanzar tiempo 30 minutos (dentro del límite)
      vi.advanceTimersByTime(30 * 60 * 1000)
      
      expect(getCachedUrl(photoId)).toBe(url)
    })

    it('debe limpiar automáticamente entradas expiradas', () => {
      const photoId1 = 'photo-expired'
      const photoId2 = 'photo-valid'
      const url1 = 'url-expired'
      const url2 = 'url-valid'
      
      // Agregar primera URL
      setCachedUrl(photoId1, url1)
      
      // Avanzar tiempo 30 minutos
      vi.advanceTimersByTime(30 * 60 * 1000)
      
      // Agregar segunda URL
      setCachedUrl(photoId2, url2)
      
      // Avanzar tiempo otros 45 minutos (total 75 minutos)
      vi.advanceTimersByTime(45 * 60 * 1000)
      
      // Primera URL debe haber expirado, segunda debe ser válida
      expect(getCachedUrl(photoId1)).toBeNull()
      expect(getCachedUrl(photoId2)).toBe(url2)
    })
  })

  describe('SessionStorage Persistence', () => {
    it('debe persistir caché en sessionStorage', () => {
      const photoId = 'photo-persist'
      const url = 'https://storage.supabase.co/persist-test'
      
      setCachedUrl(photoId, url)
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'photo_url_cache',
        expect.stringContaining(photoId)
      )
    })

    it('debe cargar caché desde sessionStorage al inicializar', () => {
      const cachedData = {
        'photo-stored': {
          url: 'https://storage.supabase.co/stored-url',
          expires: Date.now() + 3600000, // 1 hora en el futuro
          photoId: 'photo-stored',
          cachedAt: Date.now()
        }
      }
      
      mockSessionStorage.store.set('photo_url_cache', JSON.stringify(cachedData))
      
      // Reinicializar caché
      initializeUrlCache()
      
      expect(getCachedUrl('photo-stored')).toBe('https://storage.supabase.co/stored-url')
    })

    it('debe ignorar entradas expiradas al cargar desde sessionStorage', () => {
      const cachedData = {
        'photo-expired': {
          url: 'https://storage.supabase.co/expired-url',
          expires: Date.now() - 1000, // Expirada
          photoId: 'photo-expired',
          cachedAt: Date.now() - 3700000
        },
        'photo-valid': {
          url: 'https://storage.supabase.co/valid-url',
          expires: Date.now() + 3600000, // Válida
          photoId: 'photo-valid',
          cachedAt: Date.now()
        }
      }
      
      mockSessionStorage.store.set('photo_url_cache', JSON.stringify(cachedData))
      
      initializeUrlCache()
      
      expect(getCachedUrl('photo-expired')).toBeNull()
      expect(getCachedUrl('photo-valid')).toBe('https://storage.supabase.co/valid-url')
    })

    it('debe manejar errores de sessionStorage gracefully', () => {
      // Mock error en setItem (quota exceeded)
      mockSessionStorage.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })
      
      // No debería lanzar error
      expect(() => {
        setCachedUrl('photo-quota-test', 'test-url')
      }).not.toThrow()
    })

    it('debe limpiar entradas antiguas cuando hay errores de quota', () => {
      // Llenar caché con varias entradas
      for (let i = 0; i < 10; i++) {
        setCachedUrl(`photo-${i}`, `url-${i}`)
        // Hacer que las primeras entradas sean más antiguas
        if (i < 5) {
          vi.advanceTimersByTime(60000) // 1 minuto
        }
      }
      
      // Mock error de quota en próximo setItem
      mockSessionStorage.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })
      
      // Intentar agregar nueva entrada
      setCachedUrl('photo-new', 'new-url')
      
      // Debería haber limpiado entradas antiguas y reintentado
      expect(mockSessionStorage.setItem).toHaveBeenCalledTimes(12) // 10 iniciales + 1 error + 1 retry
    })
  })

  describe('Cache Statistics', () => {
    it('debe calcular estadísticas correctas', () => {
      setCachedUrl('photo-1', 'url-1')
      setCachedUrl('photo-2', 'url-2')
      
      // Un hit
      getCachedUrl('photo-1')
      // Un miss
      getCachedUrl('non-existent')
      
      const stats = getCacheStats()
      
      expect(stats.totalEntries).toBe(2)
      expect(stats.hitRate).toBe(50) // 1 hit de 2 requests
      expect(stats.averageAge).toBeGreaterThanOrEqual(0)
    })

    it('debe calcular hit rate correctamente', () => {
      setCachedUrl('photo-test', 'url-test')
      
      // 3 hits
      getCachedUrl('photo-test')
      getCachedUrl('photo-test')
      getCachedUrl('photo-test')
      
      // 2 misses
      getCachedUrl('missing-1')
      getCachedUrl('missing-2')
      
      const stats = getCacheStats()
      expect(stats.hitRate).toBe(60) // 3 hits de 5 total requests
    })

    it('debe manejar caché vacío en estadísticas', () => {
      const stats = getCacheStats()
      
      expect(stats.totalEntries).toBe(0)
      expect(stats.hitRate).toBe(0)
      expect(stats.averageAge).toBe(0)
      expect(stats.nextExpiry).toBe(0)
    })
  })

  describe('Batch Preloading', () => {
    it('debe precargar múltiples URLs en batch', async () => {
      const photoIds = ['photo-1', 'photo-2', 'photo-3']
      const mockResponse = {
        signedUrls: {
          'photo-1': 'https://storage.supabase.co/url-1',
          'photo-2': 'https://storage.supabase.co/url-2',
          'photo-3': 'https://storage.supabase.co/url-3'
        }
      }
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)
      
      const results = await preloadPhotoUrls(photoIds)
      
      expect(fetch).toHaveBeenCalledWith('/api/admin/storage/batch-signed-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds })
      })
      
      expect(results.size).toBe(3)
      expect(results.get('photo-1')).toBe('https://storage.supabase.co/url-1')
      expect(results.get('photo-2')).toBe('https://storage.supabase.co/url-2')
      expect(results.get('photo-3')).toBe('https://storage.supabase.co/url-3')
      
      // Verificar que se cachearon
      expect(getCachedUrl('photo-1')).toBe('https://storage.supabase.co/url-1')
      expect(getCachedUrl('photo-2')).toBe('https://storage.supabase.co/url-2')
      expect(getCachedUrl('photo-3')).toBe('https://storage.supabase.co/url-3')
    })

    it('debe reutilizar URLs ya cacheadas en preload', async () => {
      const photoIds = ['cached-photo', 'new-photo']
      
      // Pre-cachear una URL
      setCachedUrl('cached-photo', 'cached-url')
      
      const mockResponse = {
        signedUrls: {
          'new-photo': 'https://storage.supabase.co/new-url'
        }
      }
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)
      
      const results = await preloadPhotoUrls(photoIds)
      
      // Solo debería haber solicitado la URL no cacheada
      expect(fetch).toHaveBeenCalledWith('/api/admin/storage/batch-signed-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: ['new-photo'] })
      })
      
      expect(results.get('cached-photo')).toBe('cached-url')
      expect(results.get('new-photo')).toBe('https://storage.supabase.co/new-url')
    })

    it('debe manejar errores de preload sin fallar', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
      
      const photoIds = ['photo-1', 'photo-2']
      const results = await preloadPhotoUrls(photoIds)
      
      // Debería retornar Map vacío sin lanzar error
      expect(results.size).toBe(0)
    })

    it('debe manejar respuestas de error HTTP en preload', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' })
      } as Response)
      
      const photoIds = ['photo-1']
      const results = await preloadPhotoUrls(photoIds)
      
      expect(results.size).toBe(0)
    })
  })

  describe('Performance Requirements', () => {
    it('debe ser eficiente con grandes cantidades de entradas', () => {
      const startTime = Date.now()
      
      // Agregar muchas entradas
      for (let i = 0; i < 1000; i++) {
        setCachedUrl(`photo-${i}`, `url-${i}`)
      }
      
      // Hacer muchas consultas
      for (let i = 0; i < 1000; i++) {
        getCachedUrl(`photo-${i}`)
      }
      
      const duration = Date.now() - startTime
      
      // Debería ser rápido (menos de 100ms para 1000 operaciones)
      expect(duration).toBeLessThan(100)
    })

    it('debe limpiar automáticamente entradas expiradas periódicamente', () => {
      // Agregar entradas que expiran
      setCachedUrl('photo-expire-1', 'url-1')
      setCachedUrl('photo-expire-2', 'url-2')
      
      // Avanzar tiempo para expirar
      vi.advanceTimersByTime(61 * 60 * 1000)
      
      // Simular limpieza automática (cada 5 minutos según código)
      vi.advanceTimersByTime(5 * 60 * 1000)
      
      const stats = getCacheStats()
      expect(stats.totalEntries).toBe(0)
    })
  })

  describe('Security & Privacy', () => {
    it('no debe loggear URLs completas', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const sensitiveUrl = 'https://storage.supabase.co/bucket/secret-token-abc123'
      setCachedUrl('photo-secret', sensitiveUrl)
      getCachedUrl('photo-secret')
      
      const loggedContent = [
        ...consoleSpy.mock.calls.flat(),
        ...consoleWarnSpy.mock.calls.flat()
      ].map(call => JSON.stringify(call))
      
      // No debería aparecer la URL completa en logs
      expect(loggedContent.some(log => log.includes('secret-token-abc123'))).toBe(false)
      
      consoleSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })

    it('debe usar sessionStorage en lugar de localStorage por seguridad', () => {
      setCachedUrl('photo-security-test', 'test-url')
      
      expect(mockSessionStorage.setItem).toHaveBeenCalled()
      
      // Verificar que no use localStorage
      expect(window.localStorage?.setItem).not.toBeDefined()
    })
  })

  describe('CLAUDE.md Compliance', () => {
    it('debe cumplir con expiración de 1 hora según especificación', () => {
      const photoId = 'compliance-test'
      const url = 'test-url'
      
      setCachedUrl(photoId, url)
      
      // Exactamente 1 hora - 1 segundo (debería ser válida)
      vi.advanceTimersByTime(59 * 60 * 1000 + 59 * 1000)
      expect(getCachedUrl(photoId)).toBe(url)
      
      // Exactamente 1 hora + 1 segundo (debería expirar)
      vi.advanceTimersByTime(2 * 1000)
      expect(getCachedUrl(photoId)).toBeNull()
    })

    it('debe cachear URLs en sessionStorage como especifica CLAUDE.md', () => {
      setCachedUrl('compliance-storage', 'test-url')
      
      const storedData = mockSessionStorage.store.get('photo_url_cache')
      expect(storedData).toBeTruthy()
      
      const parsed = JSON.parse(storedData!)
      expect(parsed).toHaveProperty('compliance-storage')
      expect(parsed['compliance-storage']).toMatchObject({
        url: 'test-url',
        expires: expect.any(Number),
        photoId: 'compliance-storage',
        cachedAt: expect.any(Number)
      })
    })

    it('debe limpiar entradas automáticamente según especificación', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      
      // Agregar entrada que va a expirar
      setCachedUrl('auto-cleanup-test', 'test-url')
      
      // Avanzar tiempo para expirar
      vi.advanceTimersByTime(61 * 60 * 1000)
      
      // Forzar limpieza consultando entrada expirada
      getCachedUrl('auto-cleanup-test')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('URL cache cleanup')
      )
      
      consoleSpy.mockRestore()
    })
  })
})