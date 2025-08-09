import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { TokenService } from '@/lib/services/token.service'
import { generateSecureToken, maskToken } from '@/lib/utils/tokens'

// Mock de Supabase
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  gte: vi.fn(() => mockSupabase)
}

// Mock del cliente de Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase))
}))

// Mock de console.log para evitar spam en tests
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('TokenService', () => {
  let tokenService: TokenService

  beforeEach(() => {
    vi.clearAllMocks()
    tokenService = new TokenService()
  })

  describe('generateTokenForSubject', () => {
    it('should generate new token for subject without existing token', async () => {
      const subjectId = 'subject-123'
      const mockToken = 'ABC123DEF456GHI789JKL'

      // Mock: no existing token
      mockSupabase.single.mockResolvedValueOnce({ data: null })
      
      // Mock: token uniqueness check (no duplicate)
      mockSupabase.single.mockResolvedValueOnce({ data: null })
      
      // Mock: successful insert
      mockSupabase.insert.mockResolvedValueOnce({ data: 'success' })

      // Mock generateSecureToken
      vi.mocked(generateSecureToken).mockReturnValue(mockToken)

      const result = await tokenService.generateTokenForSubject(subjectId)

      expect(result.token).toBe(mockToken)
      expect(result.isNew).toBe(true)
      expect(result.expiresAt).toBeInstanceOf(Date)
      
      // Verify token was inserted
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        subject_id: subjectId,
        token: mockToken,
        expires_at: expect.any(String)
      })
    })

    it('should return existing valid token without rotation', async () => {
      const subjectId = 'subject-123'
      const existingToken = 'EXISTING123TOKEN456'
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      // Mock: existing valid token
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          token: existingToken,
          expires_at: futureDate,
          subject_id: subjectId
        }
      })

      const result = await tokenService.generateTokenForSubject(subjectId, {
        rotateExisting: false
      })

      expect(result.token).toBe(existingToken)
      expect(result.isNew).toBe(false)
      expect(mockSupabase.insert).not.toHaveBeenCalled()
      expect(mockSupabase.update).not.toHaveBeenCalled()
    })

    it('should rotate expired token', async () => {
      const subjectId = 'subject-123'
      const oldToken = 'OLD123TOKEN456'
      const newToken = 'NEW123TOKEN789'
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      // Mock: existing expired token
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          token: oldToken,
          expires_at: pastDate,
          subject_id: subjectId
        }
      })

      // Mock: token uniqueness check (no duplicate)
      mockSupabase.single.mockResolvedValueOnce({ data: null })

      // Mock: successful update
      mockSupabase.update.mockResolvedValueOnce({ data: 'success' })

      // Mock generateSecureToken
      vi.mocked(generateSecureToken).mockReturnValue(newToken)

      const result = await tokenService.generateTokenForSubject(subjectId)

      expect(result.token).toBe(newToken)
      expect(result.isNew).toBe(false) // Update, not insert
      expect(mockSupabase.update).toHaveBeenCalled()
    })

    it('should retry token generation if duplicate found', async () => {
      const subjectId = 'subject-123'
      const firstToken = 'DUPLICATE123'
      const secondToken = 'UNIQUE456TOKEN789'

      // Mock: no existing token
      mockSupabase.single.mockResolvedValueOnce({ data: null })

      // Mock: first token is duplicate, second is unique
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'duplicate' } }) // First token duplicate
        .mockResolvedValueOnce({ data: null }) // Second token unique

      // Mock: successful insert
      mockSupabase.insert.mockResolvedValueOnce({ data: 'success' })

      // Mock generateSecureToken to return different tokens
      vi.mocked(generateSecureToken)
        .mockReturnValueOnce(firstToken)
        .mockReturnValueOnce(secondToken)

      const result = await tokenService.generateTokenForSubject(subjectId)

      expect(result.token).toBe(secondToken)
      expect(generateSecureToken).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max retry attempts', async () => {
      const subjectId = 'subject-123'

      // Mock: no existing token
      mockSupabase.single.mockResolvedValueOnce({ data: null })

      // Mock: all tokens are duplicates
      mockSupabase.single.mockResolvedValue({ data: { id: 'duplicate' } })

      // Mock generateSecureToken to always return same token
      vi.mocked(generateSecureToken).mockReturnValue('ALWAYS_DUPLICATE')

      await expect(
        tokenService.generateTokenForSubject(subjectId)
      ).rejects.toThrow('No se pudo generar un token único')

      expect(generateSecureToken).toHaveBeenCalledTimes(10) // Max attempts
    })

    it('should handle custom expiry days', async () => {
      const subjectId = 'subject-123'
      const customDays = 60
      const mockToken = 'CUSTOM123TOKEN456'

      // Mock: no existing token
      mockSupabase.single.mockResolvedValueOnce({ data: null })
      
      // Mock: token uniqueness check
      mockSupabase.single.mockResolvedValueOnce({ data: null })
      
      // Mock: successful insert
      mockSupabase.insert.mockResolvedValueOnce({ data: 'success' })

      // Mock generateSecureToken
      vi.mocked(generateSecureToken).mockReturnValue(mockToken)

      const result = await tokenService.generateTokenForSubject(subjectId, {
        expiryDays: customDays
      })

      // Check that expiry date is approximately 60 days from now
      const expectedExpiry = new Date()
      expectedExpiry.setDate(expectedExpiry.getDate() + customDays)
      
      const timeDiff = Math.abs(result.expiresAt.getTime() - expectedExpiry.getTime())
      expect(timeDiff).toBeLessThan(1000) // Within 1 second
    })
  })

  describe('validateToken', () => {
    it('should return valid for existing non-expired token', async () => {
      const token = 'VALID123TOKEN456'
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const mockTokenInfo = {
        token,
        expires_at: futureDate,
        subject_id: 'subject-123',
        subjects: {
          id: 'subject-123',
          first_name: 'John',
          last_name: 'Doe',
          type: 'student'
        }
      }

      mockSupabase.single.mockResolvedValueOnce({ data: mockTokenInfo })

      const result = await tokenService.validateToken(token)

      expect(result.isValid).toBe(true)
      expect(result.subject).toBeDefined()
      expect(result.tokenInfo).toBeDefined()
    })

    it('should return invalid for expired token', async () => {
      const token = 'EXPIRED123TOKEN456'
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const mockTokenInfo = {
        token,
        expires_at: pastDate,
        subject_id: 'subject-123',
        subjects: { id: 'subject-123', first_name: 'John' }
      }

      mockSupabase.single.mockResolvedValueOnce({ data: mockTokenInfo })

      const result = await tokenService.validateToken(token)

      expect(result.isValid).toBe(false)
    })

    it('should return invalid for non-existent token', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null })

      const result = await tokenService.validateToken('NON_EXISTENT_TOKEN')

      expect(result.isValid).toBe(false)
    })

    it('should return invalid for empty token', async () => {
      const result = await tokenService.validateToken('')

      expect(result.isValid).toBe(false)
      expect(mockSupabase.select).not.toHaveBeenCalled()
    })
  })

  describe('generateTokensForSubjects', () => {
    it('should generate tokens for multiple subjects', async () => {
      const subjectIds = ['subject-1', 'subject-2', 'subject-3']
      const mockTokens = ['TOKEN123', 'TOKEN456', 'TOKEN789']

      // Mock successful token generation for each subject
      subjectIds.forEach((_, index) => {
        // No existing token
        mockSupabase.single.mockResolvedValueOnce({ data: null })
        // Token is unique
        mockSupabase.single.mockResolvedValueOnce({ data: null })
        // Successful insert
        mockSupabase.insert.mockResolvedValueOnce({ data: 'success' })
      })

      // Mock generateSecureToken for each call
      mockTokens.forEach(token => {
        vi.mocked(generateSecureToken).mockReturnValueOnce(token)
      })

      const results = await tokenService.generateTokensForSubjects(subjectIds)

      expect(results.size).toBe(3)
      subjectIds.forEach((id, index) => {
        const result = results.get(id)
        expect(result?.token).toBe(mockTokens[index])
        expect(result?.isNew).toBe(true)
      })
    })

    it('should handle partial failures gracefully', async () => {
      const subjectIds = ['subject-1', 'subject-2', 'subject-3']

      // Subject 1: Success
      mockSupabase.single.mockResolvedValueOnce({ data: null }) // No existing
      mockSupabase.single.mockResolvedValueOnce({ data: null }) // Unique
      mockSupabase.insert.mockResolvedValueOnce({ data: 'success' })
      vi.mocked(generateSecureToken).mockReturnValueOnce('TOKEN123')

      // Subject 2: Failure (mock database error)
      mockSupabase.single.mockRejectedValueOnce(new Error('Database error'))

      // Subject 3: Success
      mockSupabase.single.mockResolvedValueOnce({ data: null }) // No existing
      mockSupabase.single.mockResolvedValueOnce({ data: null }) // Unique
      mockSupabase.insert.mockResolvedValueOnce({ data: 'success' })
      vi.mocked(generateSecureToken).mockReturnValueOnce('TOKEN789')

      const results = await tokenService.generateTokensForSubjects(subjectIds)

      // Should have 2 successful results (subject-1 and subject-3)
      expect(results.size).toBe(2)
      expect(results.has('subject-1')).toBe(true)
      expect(results.has('subject-2')).toBe(false) // Failed
      expect(results.has('subject-3')).toBe(true)
    })
  })

  describe('rotateToken', () => {
    it('should rotate existing token', async () => {
      const subjectId = 'subject-123'
      const oldToken = 'OLD123TOKEN'
      const newToken = 'NEW123TOKEN'

      // Mock existing token
      mockSupabase.single.mockResolvedValueOnce({ data: null })
      
      // Mock token uniqueness check
      mockSupabase.single.mockResolvedValueOnce({ data: null })
      
      // Mock successful update
      mockSupabase.update.mockResolvedValueOnce({ data: 'success' })

      // Mock generateSecureToken
      vi.mocked(generateSecureToken).mockReturnValue(newToken)

      const result = await tokenService.rotateToken(subjectId)

      expect(result.token).toBe(newToken)
      expect(result.isNew).toBe(false) // It's an update
    })
  })

  describe('generatePortalUrl', () => {
    it('should generate correct portal URL', () => {
      const token = 'TEST123TOKEN456'
      const baseUrl = 'https://example.com'

      const url = TokenService.generatePortalUrl(token, baseUrl)

      expect(url).toBe(`${baseUrl}/f/${token}`)
    })

    it('should use default URL when base not provided', () => {
      const token = 'TEST123TOKEN456'
      
      // Mock process.env
      process.env.NEXT_PUBLIC_APP_URL = 'https://test.com'

      const url = TokenService.generatePortalUrl(token)

      expect(url).toBe(`https://test.com/f/${token}`)
    })

    it('should use localhost fallback', () => {
      const token = 'TEST123TOKEN456'
      
      // Clear env var
      delete process.env.NEXT_PUBLIC_APP_URL

      const url = TokenService.generatePortalUrl(token)

      expect(url).toBe(`http://localhost:3000/f/${token}`)
    })
  })
})

// Tests for utility functions
describe('Token Utilities', () => {
  describe('generateSecureToken', () => {
    it('should generate token with correct length', () => {
      const token = generateSecureToken()
      expect(token.length).toBe(20)
    })

    it('should generate unique tokens', () => {
      const tokens = new Set()
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken())
      }
      expect(tokens.size).toBe(100) // All unique
    })
  })

  describe('maskToken', () => {
    it('should mask token correctly', () => {
      const token = 'ABC123DEF456GHI789'
      const masked = maskToken(token)
      
      expect(masked).toBe('tok_ABC***789')
      expect(masked).not.toContain('123DEF456GHI')
    })

    it('should handle short tokens', () => {
      const shortToken = '12345'
      const masked = maskToken(shortToken)
      
      expect(masked).toBe('tok_***')
    })

    it('should handle empty token', () => {
      const masked = maskToken('')
      expect(masked).toBe('tok_***')
    })
  })
})