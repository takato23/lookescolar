/**
 * ACCESS TOKEN SERVICE - Hierarchical Token Management
 *
 * Manages secure hierarchical tokens with hash+salt security
 * Supports: Event tokens, Course tokens, Family tokens
 * Features: Cryptographic security, usage tracking, expiration, auditing
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';

// Types for the hierarchical token system
export type TokenScope = 'event' | 'course' | 'family';
export type AccessLevel = 'full' | 'read_only';

export interface CreateTokenParams {
  scope: TokenScope;
  resourceId: string; // event_id, course_id, or subject_id
  accessLevel?: AccessLevel;
  canDownload?: boolean;
  maxUses?: number;
  expiresAt?: Date;
  createdBy: string; // user id
  metadata?: Record<string, any>;
}

export interface AccessToken {
  id: string;
  scope: TokenScope;
  resourceId: string;
  accessLevel: AccessLevel;
  canDownload: boolean;
  maxUses?: number;
  usedCount: number;
  expiresAt?: Date;
  revokedAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  createdBy: string;
  metadata: Record<string, any>;
  // Derived fields
  tokenPrefix: string;
  isValid: boolean;
  isExpired: boolean;
  isRevoked: boolean;
  isExhausted: boolean;
}

export interface TokenValidation {
  tokenId?: string;
  scope?: TokenScope;
  resourceId?: string;
  accessLevel?: AccessLevel;
  canDownload?: boolean;
  isValid: boolean;
  reason: string;
}

export interface TokenUsageStats {
  totalAccesses: number;
  successfulAccesses: number;
  failedAccesses: number;
  uniqueIPs: number;
  firstAccess?: Date;
  lastAccess?: Date;
  avgResponseTimeMs?: number;
}

export class AccessTokenService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Generate a cryptographically secure token
   */
  private generateSecureToken(scope: TokenScope): {
    token: string;
    prefix: string;
    hash: Buffer;
    salt: Buffer;
  } {
    // Generate secure random token (32 bytes = 256 bits)
    const tokenBytes = randomBytes(32);
    const token = tokenBytes.toString('base64url'); // URL-safe base64

    // Create prefix for quick database lookups
    const scopePrefix = scope.charAt(0).toUpperCase(); // E, C, F
    const prefix = `${scopePrefix}_${token.substring(0, 8)}`;

    // Generate salt and hash
    const salt = randomBytes(16); // 128-bit salt
    const hash = createHash('sha256')
      .update(token + salt.toString('hex'))
      .digest();

    return { token, prefix, hash, salt };
  }

  /**
   * Create a new access token with hierarchical permissions
   */
  async createToken(
    params: CreateTokenParams
  ): Promise<{ token: string; tokenId: string }> {
    const { token, prefix, hash, salt } = this.generateSecureToken(
      params.scope
    );

    // Prepare token data
    const tokenData: any = {
      scope: params.scope,
      token_hash: hash,
      salt: salt,
      token_prefix: prefix,
      access_level: params.accessLevel || 'read_only',
      can_download: params.canDownload || false,
      max_uses: params.maxUses || null,
      expires_at: params.expiresAt?.toISOString() || null,
      created_by: params.resourceId,
      metadata: params.metadata || {},
    };

    // Set resource field based on scope
    switch (params.scope) {
      case 'event':
        tokenData.event_id = params.resourceId;
        break;
      case 'course':
        tokenData.course_id = params.resourceId;
        break;
      case 'family':
        tokenData.subject_id = params.resourceId;
        break;
    }

    const { data, error } = await this.supabase
      .from('access_tokens')
      .insert(tokenData)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create token: ${error.message}`);
    }

    return {
      token,
      tokenId: data.id,
    };
  }

  /**
   * Validate a token using canonical API function
   */
  async validateToken(token: string): Promise<TokenValidation> {
    try {
      // Fast-path: legacy public share tokens (64 hex) are handled by public API
      // Avoid calling PostgREST RPC which will error for these tokens
      if (/^[a-f0-9]{64}$/i.test(token)) {
        return {
          isValid: false,
          reason: 'share_token',
        };
      }

      // Call RPC without schema prefix to avoid PostgREST adding `public.` twice
      const { data, error } = await this.supabase.rpc('validate_access_token', {
        p_token_plain: token,
      });

      if (error) {
        return {
          isValid: false,
          reason: `Validation error: ${error.message}`,
        };
      }

      if (!data || data.length === 0) {
        return {
          isValid: false,
          reason: 'Token not found',
        };
      }

      const result = data[0];
      return {
        tokenId: result.token_id,
        scope: result.scope,
        resourceId: result.resource_id,
        accessLevel: result.access_level,
        canDownload: result.can_download,
        isValid: result.is_valid,
        reason: result.reason,
      };
    } catch (error: any) {
      return {
        isValid: false,
        reason: `Validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Get token information by ID
   */
  async getToken(tokenId: string): Promise<AccessToken | null> {
    const { data, error } = await this.supabase
      .from('access_tokens')
      .select(
        `
        id,
        scope,
        event_id,
        course_id, 
        subject_id,
        token_prefix,
        access_level,
        can_download,
        max_uses,
        used_count,
        expires_at,
        revoked_at,
        last_used_at,
        created_at,
        created_by,
        metadata
      `
      )
      .eq('id', tokenId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapTokenData(data);
  }

  /**
   * Get tokens by resource (event, course, or family)
   */
  async getTokensByResource(
    scope: TokenScope,
    resourceId: string
  ): Promise<AccessToken[]> {
    const resourceColumn =
      scope === 'event'
        ? 'event_id'
        : scope === 'course'
          ? 'course_id'
          : 'subject_id';

    const { data, error } = await this.supabase
      .from('access_tokens')
      .select(
        `
        id,
        scope,
        event_id,
        course_id,
        subject_id,
        token_prefix,
        access_level,
        can_download,
        max_uses,
        used_count,
        expires_at,
        revoked_at,
        last_used_at,
        created_at,
        created_by,
        metadata
      `
      )
      .eq(resourceColumn, resourceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get tokens: ${error.message}`);
    }

    return (data || []).map((token) => this.mapTokenData(token));
  }

  /**
   * Revoke a token (soft delete)
   */
  async revokeToken(tokenId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', tokenId);

    return !error;
  }

  /**
   * Get token usage statistics
   */
  async getTokenStats(tokenId: string): Promise<TokenUsageStats | null> {
    try {
      const { data, error } = await this.supabase.rpc('get_token_usage_stats', {
        p_token_id: tokenId,
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      const stats = data[0];
      return {
        totalAccesses: parseInt(stats.total_accesses) || 0,
        successfulAccesses: parseInt(stats.successful_accesses) || 0,
        failedAccesses: parseInt(stats.failed_accesses) || 0,
        uniqueIPs: parseInt(stats.unique_ips) || 0,
        firstAccess: stats.first_access
          ? new Date(stats.first_access)
          : undefined,
        lastAccess: stats.last_access ? new Date(stats.last_access) : undefined,
        avgResponseTimeMs: stats.avg_response_time_ms
          ? parseFloat(stats.avg_response_time_ms)
          : undefined,
      };
    } catch (error) {
      console.error('Failed to get token stats:', error);
      return null;
    }
  }

  /**
   * Log token access for auditing
   */
  async logAccess(
    token: string,
    action: 'list_folders' | 'list_assets' | 'download' | 'view',
    request: {
      ip?: string;
      userAgent?: string;
      path?: string;
      responseTimeMs?: number;
      success?: boolean;
      notes?: string;
    }
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.rpc('api.log_token_access', {
        p_token: token,
        p_action: action,
        p_ip: request.ip || null,
        p_user_agent: request.userAgent || null,
        p_path: request.path || null,
        p_response_time_ms: request.responseTimeMs || null,
        p_ok: request.success !== false,
        p_notes: request.notes || null,
      });

      return !error;
    } catch (error) {
      console.error('Failed to log token access:', error);
      return false;
    }
  }

  /**
   * Clean up expired tokens (maintenance)
   */
  async cleanupExpiredTokens(): Promise<{
    cleanedTokens: number;
    cleanedLogs: number;
  }> {
    try {
      const { data, error } = await this.supabase.rpc('cleanup_expired_tokens');

      if (error || !data) {
        return { cleanedTokens: 0, cleanedLogs: 0 };
      }

      return {
        cleanedTokens: data.cleaned_tokens || 0,
        cleanedLogs: data.cleaned_logs || 0,
      };
    } catch (error) {
      console.error('Failed to cleanup expired tokens:', error);
      return { cleanedTokens: 0, cleanedLogs: 0 };
    }
  }

  /**
   * Generate QR code data for token
   */
  generateQRData(token: string, baseUrl?: string): string {
    const url =
      baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://lookescolar.com';
    return `${url}/s/${token}`;
  }

  /**
   * Helper: Map database token data to AccessToken interface
   */
  private mapTokenData(data: any): AccessToken {
    const resourceId = data.event_id || data.course_id || data.subject_id;
    const now = new Date();
    const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
    const revokedAt = data.revoked_at ? new Date(data.revoked_at) : null;

    const isExpired = expiresAt ? expiresAt <= now : false;
    const isRevoked = !!revokedAt;
    const isExhausted = data.max_uses
      ? data.used_count >= data.max_uses
      : false;
    const isValid = !isExpired && !isRevoked && !isExhausted;

    return {
      id: data.id,
      scope: data.scope,
      resourceId,
      accessLevel: data.access_level,
      canDownload: data.can_download,
      maxUses: data.max_uses,
      usedCount: data.used_count,
      expiresAt,
      revokedAt,
      lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : null,
      createdAt: new Date(data.created_at),
      createdBy: data.created_by,
      metadata: data.metadata || {},
      tokenPrefix: data.token_prefix,
      isValid,
      isExpired,
      isRevoked,
      isExhausted,
    };
  }
}

// Singleton instance
export const accessTokenService = new AccessTokenService();
