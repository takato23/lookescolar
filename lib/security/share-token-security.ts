import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';
import { headers } from 'next/headers';

export interface ShareTokenValidation {
  isValid: boolean;
  token?: {
    id: string;
    token: string;
    event_id: string;
    folder_id: string | null;
    photo_ids: string[] | null;
    share_type: string;
    expires_at: string | null;
    max_views: number | null;
    view_count: number;
    allow_download: boolean;
    allow_comments: boolean;
    password_hash: string | null;
    metadata: Record<string, any>;
    created_at: string;
  };
  error?: string;
  errorCode?:
    | 'INVALID_TOKEN'
    | 'EXPIRED'
    | 'MAX_VIEWS_EXCEEDED'
    | 'PASSWORD_REQUIRED'
    | 'ACCESS_DENIED';
}

export interface AccessAttempt {
  token: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  error_reason?: string;
  timestamp: string;
}

class ShareTokenSecurity {
  private readonly MAX_ACCESS_ATTEMPTS_PER_IP = 50; // Per hour
  private readonly MAX_ACCESS_ATTEMPTS_PER_TOKEN = 100; // Per hour
  private readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 20; // Failed attempts per hour

  private async getSupabase() {
    return await createServerSupabaseServiceClient();
  }

  /**
   * Validate share token with comprehensive security checks
   */
  async validateToken(
    token: string,
    password?: string,
    requestContext?: {
      ip?: string;
      userAgent?: string;
    }
  ): Promise<ShareTokenValidation> {
    const requestId = crypto.randomUUID();

    try {
      // Basic token format validation
      if (!token || typeof token !== 'string' || token.length !== 64) {
        return {
          isValid: false,
          error: 'Invalid token format',
          errorCode: 'INVALID_TOKEN',
        };
      }

      // Check rate limiting before database query
      const rateLimitCheck = await this.checkRateLimit(
        token,
        requestContext?.ip
      );
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded for share token access', {
          requestId,
          token: token.substring(0, 8) + '...',
          ip: requestContext?.ip,
          reason: rateLimitCheck.reason,
        });

        return {
          isValid: false,
          error: 'Too many access attempts. Please try again later.',
          errorCode: 'ACCESS_DENIED',
        };
      }

      const supabase = await this.getSupabase();

      // Get token details
      const { data: shareToken, error: tokenError } = await supabase
        .from('share_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (tokenError || !shareToken) {
        await this.logAccessAttempt({
          token,
          ip_address: requestContext?.ip || 'unknown',
          user_agent: requestContext?.userAgent || 'unknown',
          success: false,
          error_reason: 'Invalid token',
          timestamp: new Date().toISOString(),
        });

        return {
          isValid: false,
          error: 'Invalid or expired share link',
          errorCode: 'INVALID_TOKEN',
        };
      }

      // Check expiration
      if (
        shareToken.expires_at &&
        new Date(shareToken.expires_at) < new Date()
      ) {
        await this.logAccessAttempt({
          token,
          ip_address: requestContext?.ip || 'unknown',
          user_agent: requestContext?.userAgent || 'unknown',
          success: false,
          error_reason: 'Token expired',
          timestamp: new Date().toISOString(),
        });

        return {
          isValid: false,
          error: 'This share link has expired',
          errorCode: 'EXPIRED',
        };
      }

      // Check max views
      if (
        shareToken.max_views &&
        shareToken.view_count >= shareToken.max_views
      ) {
        await this.logAccessAttempt({
          token,
          ip_address: requestContext?.ip || 'unknown',
          user_agent: requestContext?.userAgent || 'unknown',
          success: false,
          error_reason: 'Max views exceeded',
          timestamp: new Date().toISOString(),
        });

        return {
          isValid: false,
          error: 'This share link has reached its view limit',
          errorCode: 'MAX_VIEWS_EXCEEDED',
        };
      }

      // Check password if required
      if (shareToken.password_hash) {
        if (!password) {
          return {
            isValid: false,
            error: 'Password required to access this content',
            errorCode: 'PASSWORD_REQUIRED',
          };
        }

        const hashedPassword = crypto
          .createHash('sha256')
          .update(password)
          .digest('hex');
        if (hashedPassword !== shareToken.password_hash) {
          await this.logAccessAttempt({
            token,
            ip_address: requestContext?.ip || 'unknown',
            user_agent: requestContext?.userAgent || 'unknown',
            success: false,
            error_reason: 'Invalid password',
            timestamp: new Date().toISOString(),
          });

          return {
            isValid: false,
            error: 'Incorrect password',
            errorCode: 'PASSWORD_REQUIRED',
          };
        }
      }

      // Log successful access
      await this.logAccessAttempt({
        token,
        ip_address: requestContext?.ip || 'unknown',
        user_agent: requestContext?.userAgent || 'unknown',
        success: true,
        timestamp: new Date().toISOString(),
      });

      // Increment view count
      await supabase
        .from('share_tokens')
        .update({
          view_count: shareToken.view_count + 1,
          metadata: {
            ...shareToken.metadata,
            last_accessed: new Date().toISOString(),
            last_ip: requestContext?.ip,
          },
        })
        .eq('id', shareToken.id);

      logger.info('Valid share token access', {
        requestId,
        tokenId: shareToken.id,
        shareType: shareToken.share_type,
        viewCount: shareToken.view_count + 1,
        ip: requestContext?.ip,
      });

      return {
        isValid: true,
        token: shareToken,
      };
    } catch (error) {
      logger.error('Error validating share token', {
        requestId,
        token: token.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        isValid: false,
        error: 'Failed to validate share link',
        errorCode: 'ACCESS_DENIED',
      };
    }
  }

  /**
   * Check rate limiting for share token access
   */
  private async checkRateLimit(
    token: string,
    ip?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const supabase = await this.getSupabase();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Check IP-based rate limiting
      if (ip) {
        const { count: ipAttempts } = await supabase
          .from('share_access_log')
          .select('*', { count: 'exact', head: true })
          .eq('ip_address', ip)
          .gte('timestamp', oneHourAgo);

        if (ipAttempts && ipAttempts > this.MAX_ACCESS_ATTEMPTS_PER_IP) {
          return { allowed: false, reason: 'IP rate limit exceeded' };
        }

        // Check for suspicious activity (too many failed attempts)
        const { count: failedAttempts } = await supabase
          .from('share_access_log')
          .select('*', { count: 'exact', head: true })
          .eq('ip_address', ip)
          .eq('success', false)
          .gte('timestamp', oneHourAgo);

        if (
          failedAttempts &&
          failedAttempts > this.SUSPICIOUS_ACTIVITY_THRESHOLD
        ) {
          return { allowed: false, reason: 'Suspicious activity detected' };
        }
      }

      // Check token-based rate limiting
      const { count: tokenAttempts } = await supabase
        .from('share_access_log')
        .select('*', { count: 'exact', head: true })
        .eq('token', token)
        .gte('timestamp', oneHourAgo);

      if (tokenAttempts && tokenAttempts > this.MAX_ACCESS_ATTEMPTS_PER_TOKEN) {
        return { allowed: false, reason: 'Token rate limit exceeded' };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking rate limit for share token', {
        token: token.substring(0, 8) + '...',
        ip,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Allow access on rate limit check failure to avoid blocking legitimate users
      return { allowed: true };
    }
  }

  /**
   * Log access attempt for monitoring and security
   */
  private async logAccessAttempt(attempt: AccessAttempt): Promise<void> {
    try {
      const supabase = await this.getSupabase();

      await supabase.from('share_access_log').insert({
        token: attempt.token,
        ip_address: attempt.ip_address,
        user_agent: attempt.user_agent,
        success: attempt.success,
        error_reason: attempt.error_reason,
        timestamp: attempt.timestamp,
      });
    } catch (error) {
      logger.error('Failed to log share token access attempt', {
        token: attempt.token.substring(0, 8) + '...',
        success: attempt.success,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get access analytics for a token
   */
  async getTokenAnalytics(tokenId: string): Promise<{
    totalAccesses: number;
    uniqueIPs: number;
    recentAccesses: AccessAttempt[];
    successRate: number;
  }> {
    try {
      const supabase = await this.getSupabase();

      // Get token details first
      const { data: token } = await supabase
        .from('share_tokens')
        .select('token')
        .eq('id', tokenId)
        .single();

      if (!token) {
        throw new Error('Token not found');
      }

      // Get access logs
      const { data: accessLogs } = await supabase
        .from('share_access_log')
        .select('*')
        .eq('token', token.token)
        .order('timestamp', { ascending: false })
        .limit(100);

      const logs = accessLogs || [];

      // Calculate analytics
      const totalAccesses = logs.length;
      const uniqueIPs = new Set(logs.map((log) => log.ip_address)).size;
      const successfulAccesses = logs.filter((log) => log.success).length;
      const successRate =
        totalAccesses > 0 ? (successfulAccesses / totalAccesses) * 100 : 0;

      return {
        totalAccesses,
        uniqueIPs,
        recentAccesses: logs.slice(0, 20), // Last 20 accesses
        successRate,
      };
    } catch (error) {
      logger.error('Error getting token analytics', {
        tokenId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        totalAccesses: 0,
        uniqueIPs: 0,
        recentAccesses: [],
        successRate: 0,
      };
    }
  }

  /**
   * Revoke a share token (security measure)
   */
  async revokeToken(
    tokenId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await this.getSupabase();

      const { error } = await supabase
        .from('share_tokens')
        .update({
          expires_at: new Date().toISOString(), // Set expiration to now
          metadata: {
            revoked: true,
            revoked_at: new Date().toISOString(),
            revoked_reason: reason,
          },
        })
        .eq('id', tokenId);

      if (error) {
        throw error;
      }

      logger.info('Share token revoked', {
        tokenId,
        reason,
      });

      return { success: true };
    } catch (error) {
      logger.error('Error revoking share token', {
        tokenId,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to revoke token',
      };
    }
  }

  /**
   * Clean up expired tokens and old access logs
   */
  async cleanupExpiredData(): Promise<{
    deletedTokens: number;
    deletedLogs: number;
  }> {
    try {
      const supabase = await this.getSupabase();

      // Delete expired tokens
      const { count: deletedTokens } = await supabase
        .from('share_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Delete access logs older than 30 days
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      const { count: deletedLogs } = await supabase
        .from('share_access_log')
        .delete()
        .lt('timestamp', thirtyDaysAgo);

      logger.info('Cleaned up expired share data', {
        deletedTokens: deletedTokens || 0,
        deletedLogs: deletedLogs || 0,
      });

      return {
        deletedTokens: deletedTokens || 0,
        deletedLogs: deletedLogs || 0,
      };
    } catch (error) {
      logger.error('Error cleaning up expired share data', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return { deletedTokens: 0, deletedLogs: 0 };
    }
  }

  /**
   * Extract request context from headers (for use in API routes)
   */
  async extractRequestContext(): Promise<{ ip?: string; userAgent?: string }> {
    try {
      const headersList = await headers();
      const ip =
        headersList.get('x-forwarded-for') ||
        headersList.get('x-real-ip') ||
        headersList.get('cf-connecting-ip') ||
        'unknown';
      const userAgent = headersList.get('user-agent') || 'unknown';

      return { ip, userAgent };
    } catch (error) {
      return { ip: 'unknown', userAgent: 'unknown' };
    }
  }
}

// Export singleton instance
export const shareTokenSecurity = new ShareTokenSecurity();
