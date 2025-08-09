/**
 * Tests para API de URLs firmadas
 * Testing crítico según CLAUDE.md para /api/storage/signed-url
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/storage/signed-url/route'
import { NextRequest } from 'next/server'

// Mocks
const mockAuth = {
  data: { user: { id: 'user-123', email: 'admin@test.com' } }
}

const mockSubject = {
  id: 'subject-123',
  event_id: 'event-123',
  token: 'valid-token-12345'
}

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(() => Promise.resolve(mockAuth))
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ 
          data: mockSubject, 
          error: null 
        }))
      }))
    }))
  }))
}

const mockSignedUrl = 'https://bucket.supabase.co/signed-url?token=abc123'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/storage', () => ({
  getSignedUrl: vi.fn(() => Promise.resolve(mockSignedUrl))
}))

vi.mock('@/lib/utils/tokens', () => ({
  maskToken: vi.fn((token) => `${token.substring(0, 4)}***`)
}))

describe('/api/storage/signed-url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper para crear request de test
  function createTestRequest(body: any, headers: Record<string, string> = {}, ip = '127.0.0.1') {
    return {
      json: () => Promise.resolve(body),
      ip,
      headers: new Map(Object.entries({
        'x-forwarded-for': ip,
        ...headers
      }))
    } as unknown as NextRequest
  }

  describe('Authentication & Authorization', () => {
    it('debe rechazar requests sin auth ni token', async () => {
      // Mock sin usuario ni token
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValueOnce({ 
        data: { user: null } 
      } as any)

      const request = createTestRequest({
        path: 'eventos/event-123/previews/photo.webp'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No autorizado')
    })

    it('debe aceptar admin autenticado', async () => {
      const request = createTestRequest({
        path: 'eventos/event-123/previews/photo.webp'
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled()
    })

    it('debe aceptar token de familia válido', async () => {
      // Mock sin usuario pero con token válido
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValueOnce({ 
        data: { user: null } 
      } as any)

      const request = createTestRequest(
        { path: 'eventos/event-123/previews/photo.webp' },
        { 'x-family-token': 'valid-token-12345' }
      )

      const response = await POST(request)
      
      expect(response.status).toBe(200)
    })

    it('debe rechazar token de familia inválido', async () => {
      // Mock sin usuario
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValueOnce({ 
        data: { user: null } 
      } as any)

      // Mock subject no encontrado
      vi.mocked(mockSupabaseClient.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: null 
            }))
          }))
        }))
      } as any)

      const request = createTestRequest(
        { path: 'eventos/event-123/previews/photo.webp' },
        { 'x-family-token': 'invalid-token' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Token inválido')
    })
  })

  describe('Rate Limiting', () => {
    it('debe aplicar rate limit por usuario', async () => {
      const requests = Array.from({ length: 61 }, () => // Límite es 60/min
        createTestRequest({
          path: 'eventos/event-123/previews/photo.webp'
        }, {}, '192.168.1.100')
      )

      const responses = []
      for (const request of requests) {
        responses.push(await POST(request))
      }

      const successResponses = responses.filter(r => r.status === 200)
      const rateLimitedResponses = responses.filter(r => r.status === 429)

      expect(successResponses.length).toBe(60)
      expect(rateLimitedResponses.length).toBe(1)
    })

    it('debe aplicar rate limit separado por token de familia', async () => {
      // Mock sin usuario
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({ 
        data: { user: null } 
      } as any)

      const token1 = 'token-familia-1'
      const token2 = 'token-familia-2'

      // 60 requests con token1 (límite exacto)
      const requests1 = Array.from({ length: 60 }, () =>
        createTestRequest(
          { path: 'eventos/event-123/previews/photo.webp' },
          { 'x-family-token': token1 }
        )
      )

      // 1 request con token2 (debería pasar)
      const request2 = createTestRequest(
        { path: 'eventos/event-123/previews/photo.webp' },
        { 'x-family-token': token2 }
      )

      // Procesar requests de token1
      for (const request of requests1) {
        await POST(request)
      }

      // Request con token2 debería pasar
      const response2 = await POST(request2)
      expect(response2.status).toBe(200)

      // Request adicional con token1 debería fallar
      const extraRequest1 = createTestRequest(
        { path: 'eventos/event-123/previews/photo.webp' },
        { 'x-family-token': token1 }
      )
      const extraResponse1 = await POST(extraRequest1)
      expect(extraResponse1.status).toBe(429)
    })
  })

  describe('Access Control', () => {
    it('debe verificar que familia tiene acceso solo a su evento', async () => {
      // Mock sin usuario
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValueOnce({ 
        data: { user: null } 
      } as any)

      const request = createTestRequest(
        { path: 'eventos/event-456/previews/photo.webp' }, // Evento diferente
        { 'x-family-token': 'valid-token-12345' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Sin acceso a esta foto')
    })

    it('debe permitir acceso a foto del mismo evento', async () => {
      // Mock sin usuario
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValueOnce({ 
        data: { user: null } 
      } as any)

      const request = createTestRequest(
        { path: 'eventos/event-123/previews/photo.webp' }, // Mismo evento que el subject
        { 'x-family-token': 'valid-token-12345' }
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('debe extraer eventId correctamente del path', async () => {
      // Mock sin usuario
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValueOnce({ 
        data: { user: null } 
      } as any)

      // Modificar el subject para que tenga un eventId diferente
      vi.mocked(mockSupabaseClient.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { ...mockSubject, event_id: 'extracted-event-id' }, 
              error: null 
            }))
          }))
        }))
      } as any)

      const request = createTestRequest(
        { path: 'eventos/extracted-event-id/previews/photo.webp' },
        { 'x-family-token': 'valid-token-12345' }
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('URL Generation', () => {
    it('debe generar URL firmada exitosamente', async () => {
      const { getSignedUrl } = await import('@/lib/services/storage')
      
      const request = createTestRequest({
        path: 'eventos/event-123/previews/photo.webp'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe(mockSignedUrl)
      expect(data.expiresIn).toBe(3600)
      expect(getSignedUrl).toHaveBeenCalledWith('eventos/event-123/previews/photo.webp')
    })

    it('debe requerir path en el body', async () => {
      const request = createTestRequest({}) // Sin path

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Se requiere path')
    })

    it('debe manejar errores al generar URL', async () => {
      const { getSignedUrl } = await import('@/lib/services/storage')
      vi.mocked(getSignedUrl).mockRejectedValueOnce(
        new Error('File not found')
      )

      const request = createTestRequest({
        path: 'eventos/event-123/previews/nonexistent.webp'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al generar URL firmada')
    })
  })

  describe('Logging & Security', () => {
    it('debe loggear generación exitosa sin exponer URLs completas', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const request = createTestRequest({
        path: 'eventos/event-123/previews/very-long-filename-that-should-be-truncated.webp'
      })

      await POST(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.stringMatching(/^req_/),
          event: 'signed_url_generated',
          path: expect.stringMatching(/^eventos\/event-123\/previews\/.{30}\.\.\./),
          identifier: expect.any(String)
        })
      )

      // Verificar que no se loggea la URL completa
      const loggedContent = consoleSpy.mock.calls.flat()
      const hasFullUrl = loggedContent.some(call => 
        JSON.stringify(call).includes(mockSignedUrl)
      )
      expect(hasFullUrl).toBe(false)

      consoleSpy.mockRestore()
    })

    it('debe enmascarar tokens en logs', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const { maskToken } = await import('@/lib/utils/tokens')

      // Mock sin usuario
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValueOnce({ 
        data: { user: null } 
      } as any)

      const request = createTestRequest(
        { path: 'eventos/event-123/previews/photo.webp' },
        { 'x-family-token': 'sensitive-token-12345' }
      )

      await POST(request)

      expect(maskToken).toHaveBeenCalledWith(expect.stringContaining('token_'))
      
      // Verificar que el token completo no aparece en logs
      const loggedContent = consoleSpy.mock.calls.flat()
      const hasFullToken = loggedContent.some(call => 
        JSON.stringify(call).includes('sensitive-token-12345')
      )
      expect(hasFullToken).toBe(false)

      consoleSpy.mockRestore()
    })

    it('debe loggear rate limit exceeded', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Hacer requests hasta exceder límite
      const requests = Array.from({ length: 61 }, () =>
        createTestRequest({
          path: 'eventos/event-123/previews/photo.webp'
        }, {}, '10.0.0.1')
      )

      for (const request of requests) {
        await POST(request)
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'rate_limit_exceeded'
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('CLAUDE.md Compliance', () => {
    it('debe usar rate limit de 60 req/min por token según especificación', async () => {
      // Hacer exactamente 60 requests (límite)
      const requests = Array.from({ length: 60 }, () =>
        createTestRequest({
          path: 'eventos/event-123/previews/photo.webp'
        })
      )

      let successCount = 0
      for (const request of requests) {
        const response = await POST(request)
        if (response.status === 200) {
          successCount++
        }
      }

      expect(successCount).toBe(60)

      // Request 61 debería fallar
      const extraRequest = createTestRequest({
        path: 'eventos/event-123/previews/photo.webp'
      })
      const extraResponse = await POST(extraRequest)
      expect(extraResponse.status).toBe(429)
    })

    it('debe generar URLs con expiración de 1 hora por defecto', async () => {
      const request = createTestRequest({
        path: 'eventos/event-123/previews/photo.webp'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.expiresIn).toBe(3600) // 1 hora en segundos
    })

    it('debe verificar acceso por token antes de generar URL', async () => {
      // Mock sin usuario
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValueOnce({ 
        data: { user: null } 
      } as any)

      const request = createTestRequest(
        { path: 'eventos/event-123/previews/photo.webp' },
        { 'x-family-token': 'valid-token-12345' }
      )

      await POST(request)

      // Verificar que se consultó el subject por token
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subjects')
      
      const mockSelect = mockSupabaseClient.from().select as any
      expect(mockSelect).toHaveBeenCalledWith('id, event_id')
    })

    it('debe no loggear tokens ni URLs firmadas completas', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const request = createTestRequest(
        { path: 'eventos/event-123/previews/photo.webp' },
        { 'x-family-token': 'secret-token-abc123' }
      )

      await POST(request)

      // Verificar logs
      const allLogs = [
        ...consoleSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat()
      ]
      
      const loggedStrings = allLogs.map(call => JSON.stringify(call))
      
      // No debe aparecer el token completo
      expect(loggedStrings.some(log => log.includes('secret-token-abc123'))).toBe(false)
      
      // No debe aparecer la URL firmada completa
      expect(loggedStrings.some(log => log.includes(mockSignedUrl))).toBe(false)

      consoleSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })
})