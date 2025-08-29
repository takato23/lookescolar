/**
 * ACCESS TOKEN SERVICE TESTS
 *
 * Tests for hierarchical token management service
 * Covers: Token generation, validation, security, audit logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  AccessTokenService,
  TokenScope,
  AccessLevel,
} from '../../lib/services/access-token.service';

// Mock Supabase
vi.mock('@supabase/supabase-js');

const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
  storage: {
    from: vi.fn(),
  },
};

const mockFrom = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  order: vi.fn(),
};

// Setup chainable mocks
mockFrom.insert.mockReturnThis();
mockFrom.select.mockReturnThis();
mockFrom.update.mockReturnThis();
mockFrom.eq.mockReturnThis();
mockFrom.single.mockReturnThis();
mockFrom.order.mockReturnThis();

mockSupabaseClient.from.mockReturnValue(mockFrom);

vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

describe('AccessTokenService', () => {
  let service: AccessTokenService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AccessTokenService();
  });

  describe('Token Generation', () => {
    it('should generate secure token with correct prefix for event scope', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'token-123' },
        error: null,
      });

      const result = await service.createToken({
        scope: 'event',
        resourceId: 'event-123',
        createdBy: 'admin-456',
        accessLevel: 'full',
        canDownload: true,
      });

      expect(result.token).toBeDefined();
      expect(result.tokenId).toBe('token-123');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('access_tokens');

      const insertCall = mockFrom.insert.mock.calls[0][0];
      expect(insertCall.scope).toBe('event');
      expect(insertCall.event_id).toBe('event-123');
      expect(insertCall.token_prefix).toMatch(/^E_/);
      expect(insertCall.token_hash).toBeInstanceOf(Buffer);
      expect(insertCall.salt).toBeInstanceOf(Buffer);
    });

    it('should generate token with course scope', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'token-456' },
        error: null,
      });

      await service.createToken({
        scope: 'course',
        resourceId: 'course-789',
        createdBy: 'admin-456',
      });

      const insertCall = mockFrom.insert.mock.calls[0][0];
      expect(insertCall.scope).toBe('course');
      expect(insertCall.course_id).toBe('course-789');
      expect(insertCall.token_prefix).toMatch(/^C_/);
      expect(insertCall.access_level).toBe('read_only'); // default
      expect(insertCall.can_download).toBe(false); // default
    });

    it('should generate token with family scope', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'token-789' },
        error: null,
      });

      await service.createToken({
        scope: 'family',
        resourceId: 'subject-123',
        createdBy: 'admin-456',
        maxUses: 10,
        expiresAt: new Date('2024-12-31'),
      });

      const insertCall = mockFrom.insert.mock.calls[0][0];
      expect(insertCall.scope).toBe('family');
      expect(insertCall.subject_id).toBe('subject-123');
      expect(insertCall.token_prefix).toMatch(/^F_/);
      expect(insertCall.max_uses).toBe(10);
      expect(insertCall.expires_at).toBe('2024-12-31T00:00:00.000Z');
    });

    it('should handle token creation errors', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        service.createToken({
          scope: 'event',
          resourceId: 'event-123',
          createdBy: 'admin-456',
        })
      ).rejects.toThrow('Failed to create token: Database error');
    });
  });

  describe('Token Validation', () => {
    it('should validate valid token', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [
          {
            token_id: 'token-123',
            scope: 'event',
            resource_id: 'event-456',
            access_level: 'full',
            can_download: true,
            is_valid: true,
            reason: 'valid',
          },
        ],
        error: null,
      });

      const result = await service.validateToken('valid-token-123');

      expect(result.isValid).toBe(true);
      expect(result.tokenId).toBe('token-123');
      expect(result.scope).toBe('event');
      expect(result.resourceId).toBe('event-456');
      expect(result.canDownload).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'validate_access_token',
        {
          p_token_plain: 'valid-token-123',
        }
      );
    });

    it('should handle invalid token', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [
          {
            is_valid: false,
            reason: 'Token expired',
          },
        ],
        error: null,
      });

      const result = await service.validateToken('expired-token');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Token expired');
    });

    it('should handle validation errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' },
      });

      const result = await service.validateToken('error-token');

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Validation error: RPC error');
    });

    it('should handle token not found', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await service.validateToken('nonexistent-token');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Token not found');
    });
  });

  describe('Token Management', () => {
    it('should get token by ID', async () => {
      const mockTokenData = {
        id: 'token-123',
        scope: 'event',
        event_id: 'event-456',
        course_id: null,
        subject_id: null,
        token_prefix: 'E_abc123',
        access_level: 'full',
        can_download: true,
        max_uses: null,
        used_count: 5,
        expires_at: '2024-12-31T00:00:00.000Z',
        revoked_at: null,
        last_used_at: '2024-01-15T10:30:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
        created_by: 'admin-456',
        metadata: { note: 'test token' },
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockTokenData,
        error: null,
      });

      const result = await service.getToken('token-123');

      expect(result).toBeDefined();
      expect(result!.id).toBe('token-123');
      expect(result!.scope).toBe('event');
      expect(result!.resourceId).toBe('event-456');
      expect(result!.tokenPrefix).toBe('E_abc123');
      expect(result!.isValid).toBe(true); // not expired, not revoked
      expect(result!.isExpired).toBe(false);
      expect(result!.isRevoked).toBe(false);
      expect(result!.isExhausted).toBe(false); // no max_uses
    });

    it('should return null for non-existent token', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await service.getToken('nonexistent');

      expect(result).toBeNull();
    });

    it('should get tokens by resource', async () => {
      const mockTokens = [
        {
          id: 'token-1',
          scope: 'event',
          event_id: 'event-123',
          course_id: null,
          subject_id: null,
          token_prefix: 'E_abc1',
          access_level: 'full',
          can_download: true,
          max_uses: null,
          used_count: 0,
          expires_at: null,
          revoked_at: null,
          last_used_at: null,
          created_at: '2024-01-01T00:00:00.000Z',
          created_by: 'admin-456',
          metadata: {},
        },
      ];

      mockFrom.order.mockResolvedValueOnce({
        data: mockTokens,
        error: null,
      });

      const result = await service.getTokensByResource('event', 'event-123');

      expect(result).toHaveLength(1);
      expect(result[0].scope).toBe('event');
      expect(result[0].resourceId).toBe('event-123');
      expect(mockFrom.eq).toHaveBeenCalledWith('event_id', 'event-123');
    });

    it('should revoke token', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const result = await service.revokeToken('token-123');

      expect(result).toBe(true);
      expect(mockFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({ revoked_at: expect.any(String) })
      );
    });
  });

  describe('Token Statistics', () => {
    it('should get token usage stats', async () => {
      const mockStats = {
        total_accesses: '25',
        successful_accesses: '23',
        failed_accesses: '2',
        unique_ips: '5',
        first_access: '2024-01-01T10:00:00.000Z',
        last_access: '2024-01-15T15:30:00.000Z',
        avg_response_time_ms: '150.5',
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [mockStats],
        error: null,
      });

      const result = await service.getTokenStats('token-123');

      expect(result).toBeDefined();
      expect(result!.totalAccesses).toBe(25);
      expect(result!.successfulAccesses).toBe(23);
      expect(result!.failedAccesses).toBe(2);
      expect(result!.uniqueIPs).toBe(5);
      expect(result!.avgResponseTimeMs).toBe(150.5);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'get_token_usage_stats',
        {
          p_token_id: 'token-123',
        }
      );
    });

    it('should return null when stats not found', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await service.getTokenStats('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('Access Logging', () => {
    it('should log access successfully', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: 'log-id-123',
        error: null,
      });

      const result = await service.logAccess('test-token', 'list_folders', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        path: '/api/gallery',
        responseTimeMs: 250,
        success: true,
        notes: 'Successful access',
      });

      expect(result).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'api.log_token_access',
        {
          p_token: 'test-token',
          p_action: 'list_folders',
          p_ip: '192.168.1.1',
          p_user_agent: 'Mozilla/5.0...',
          p_path: '/api/gallery',
          p_response_time_ms: 250,
          p_ok: true,
          p_notes: 'Successful access',
        }
      );
    });

    it('should handle logging errors gracefully', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Logging failed' },
      });

      const result = await service.logAccess('test-token', 'download', {
        success: false,
      });

      expect(result).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should generate QR data with default URL', async () => {
      const qrData = service.generateQRData('test-token-123');

      expect(qrData).toMatch(/\/s\/test-token-123$/);
    });

    it('should generate QR data with custom base URL', async () => {
      const qrData = service.generateQRData(
        'test-token-123',
        'https://custom.domain'
      );

      expect(qrData).toBe('https://custom.domain/s/test-token-123');
    });

    it('should cleanup expired tokens', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: { cleaned_tokens: 5, cleaned_logs: 25 },
        error: null,
      });

      const result = await service.cleanupExpiredTokens();

      expect(result.cleanedTokens).toBe(5);
      expect(result.cleanedLogs).toBe(25);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'cleanup_expired_tokens'
      );
    });
  });

  describe('Token Security', () => {
    it('should never store plain text tokens', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'token-123' },
        error: null,
      });

      await service.createToken({
        scope: 'event',
        resourceId: 'event-123',
        createdBy: 'admin-456',
      });

      const insertCall = mockFrom.insert.mock.calls[0][0];
      expect(insertCall.token_hash).toBeInstanceOf(Buffer);
      expect(insertCall.salt).toBeInstanceOf(Buffer);
      expect(insertCall).not.toHaveProperty('token');
      expect(insertCall).not.toHaveProperty('token_plain');
    });

    it('should generate unique prefixes for different scopes', async () => {
      mockFrom.single.mockResolvedValue({
        data: { id: 'token-123' },
        error: null,
      });

      await service.createToken({
        scope: 'event',
        resourceId: 'event-123',
        createdBy: 'admin',
      });

      await service.createToken({
        scope: 'course',
        resourceId: 'course-123',
        createdBy: 'admin',
      });

      await service.createToken({
        scope: 'family',
        resourceId: 'family-123',
        createdBy: 'admin',
      });

      const calls = mockFrom.insert.mock.calls;
      expect(calls[0][0].token_prefix).toMatch(/^E_/);
      expect(calls[1][0].token_prefix).toMatch(/^C_/);
      expect(calls[2][0].token_prefix).toMatch(/^F_/);
    });
  });
});
