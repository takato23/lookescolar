/**
 * Enhanced Rate Limiting Middleware
 *
 * Provides sophisticated rate limiting with QR-specific protections,
 * adaptive limits, and comprehensive logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { securityAuditService } from './qr-audit.service';

export interface RateLimitConfig {
  identifier: string;
  limit: number;
  window: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  headers?: boolean;
  onLimitReached?: (request: NextRequest, identifier: string) => Promise<void>;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  identifier: string;
  blocked?: boolean;
}

export interface AdaptiveRateLimitConfig extends RateLimitConfig {
  suspicious?: {
    failureThreshold: number;
    reducedLimit: number;
    timeWindow: string;
  };
  burst?: {
    allowBurst: boolean;
    burstLimit: number;
    burstWindow: string;
  };
}

export class EnhancedRateLimitService {
  private redis: Redis | null = null;
  private memoryStore: Map<string, { count: number; resetTime: number }> =
    new Map();
  private suspiciousIPs: Map<
    string,
    { failures: number; lastFailure: number }
  > = new Map();

  constructor() {
    // Initialize Redis if available
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken && redisUrl !== 'http://localhost:6379') {
      this.redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
    } else {
      console.warn('[RateLimit] Redis not configured, using memory store');
    }
  }

  /**
   * Create rate limiter with configuration
   */
  createRateLimiter(config: RateLimitConfig): Ratelimit | null {
    if (!this.redis) {
      return null; // Fall back to memory-based limiting
    }

    return new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(config.limit, config.window),
      analytics: true,
      prefix: 'rl',
    });
  }

  /**
   * Apply rate limiting to request
   */
  async applyRateLimit(
    request: NextRequest,
    config: RateLimitConfig
  ): Promise<{ response?: NextResponse; result: RateLimitResult }> {
    const identifier = await this.getIdentifier(request, config);

    // Check if IP is suspicious and apply adaptive limits
    const adaptiveConfig = await this.getAdaptiveConfig(identifier, config);

    let result: RateLimitResult;

    if (this.redis) {
      result = await this.applyRedisRateLimit(identifier, adaptiveConfig);
    } else {
      result = await this.applyMemoryRateLimit(identifier, adaptiveConfig);
    }

    // Log rate limit event if blocked
    if (result.blocked) {
      await this.logRateLimitEvent(request, identifier, result, adaptiveConfig);

      if (config.onLimitReached) {
        await config.onLimitReached(request, identifier);
      }
    }

    // Create response if rate limited
    if (result.blocked) {
      const response = this.createRateLimitResponse(config, result);
      return { response, result };
    }

    return { result };
  }

  /**
   * QR-specific rate limiting
   */
  async applyQRRateLimit(
    request: NextRequest,
    qrType: 'generation' | 'validation' | 'access'
  ): Promise<{ response?: NextResponse; result: RateLimitResult }> {
    const configs: Record<'generation' | 'validation' | 'access', RateLimitConfig> =
      {
        generation: {
          identifier: await this.getIdentifier(request, {
            identifier: 'ip',
          } as RateLimitConfig),
          limit: 50, // 50 QR generations per hour
          window: '1h',
          message: 'Too many QR code generation requests',
        },
        validation: {
          identifier: await this.getIdentifier(request, {
            identifier: 'ip',
          } as RateLimitConfig),
          limit: 100, // 100 validations per hour
          window: '1h',
          message: 'Too many QR code validation requests',
        },
        access: {
          identifier: await this.getIdentifier(request, {
            identifier: 'ip',
          } as RateLimitConfig),
          limit: 200, // 200 QR accesses per hour
          window: '1h',
          message: 'Too many QR code access requests',
        },
      };

    const config = configs[qrType];
    return await this.applyRateLimit(request, config);
  }

  /**
   * Authentication rate limiting with progressive delays
   */
  async applyAuthRateLimit(
    request: NextRequest,
    email?: string
  ): Promise<{ response?: NextResponse; result: RateLimitResult }> {
    const ip = this.getClientIP(request);

    // Apply both IP and email-based rate limiting
    const ipResult = await this.applyRateLimit(request, {
      identifier: ip,
      limit: 5, // 5 attempts per 15 minutes per IP
      window: '15m',
      message: 'Too many authentication attempts from this IP',
    });

    if (ipResult.response) {
      return ipResult;
    }

    if (email) {
      const emailResult = await this.applyRateLimit(request, {
        identifier: `email:${email}`,
        limit: 3, // 3 attempts per 15 minutes per email
        window: '15m',
        message: 'Too many authentication attempts for this email',
      });

      if (emailResult.response) {
        return emailResult;
      }
    }

    return { result: ipResult.result };
  }

  /**
   * Track authentication failures for adaptive limiting
   */
  async trackAuthFailure(request: NextRequest, email?: string): Promise<void> {
    const ip = this.getClientIP(request);
    const now = Date.now();

    // Track IP failures
    const ipFailures = this.suspiciousIPs.get(ip) || {
      failures: 0,
      lastFailure: 0,
    };
    ipFailures.failures += 1;
    ipFailures.lastFailure = now;
    this.suspiciousIPs.set(ip, ipFailures);

    // Track email failures if provided
    if (email) {
      const emailKey = `email:${email}`;
      const emailFailures = this.suspiciousIPs.get(emailKey) || {
        failures: 0,
        lastFailure: 0,
      };
      emailFailures.failures += 1;
      emailFailures.lastFailure = now;
      this.suspiciousIPs.set(emailKey, emailFailures);
    }

    // Log the failure
    await securityAuditService.logAuthenticationAttempt({
      email: email || 'unknown',
      ip,
      userAgent: request.headers.get('user-agent') || undefined,
      result: 'failure',
      reason: 'authentication_failed',
    });
  }

  /**
   * Reset failure tracking on successful auth
   */
  async resetAuthFailures(request: NextRequest, email?: string): Promise<void> {
    const ip = this.getClientIP(request);

    this.suspiciousIPs.delete(ip);

    if (email) {
      this.suspiciousIPs.delete(`email:${email}`);
    }
  }

  /**
   * Get adaptive configuration based on past behavior
   */
  private async getAdaptiveConfig(
    identifier: string,
    baseConfig: RateLimitConfig
  ): Promise<RateLimitConfig> {
    const suspicious = this.suspiciousIPs.get(identifier);
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // If there are recent failures, apply stricter limits
    if (
      suspicious &&
      suspicious.failures >= 3 &&
      suspicious.lastFailure > fiveMinutesAgo
    ) {
      return {
        ...baseConfig,
        limit: Math.max(1, Math.floor(baseConfig.limit / 2)), // Halve the limit
        message: `Rate limited due to suspicious activity. ${baseConfig.message || ''}`,
      };
    }

    return baseConfig;
  }

  /**
   * Apply Redis-based rate limiting
   */
  private async applyRedisRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const rateLimiter = this.createRateLimiter(config);

    if (!rateLimiter) {
      // Fallback to memory store
      return this.applyMemoryRateLimit(identifier, config);
    }

    try {
      const result = await rateLimiter.limit(identifier);

      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: new Date(result.reset),
        identifier,
        blocked: !result.success,
      };
    } catch (error) {
      console.error('[RateLimit] Redis rate limiting failed:', error);
      // Fallback to memory store
      return this.applyMemoryRateLimit(identifier, config);
    }
  }

  /**
   * Apply memory-based rate limiting
   */
  private async applyMemoryRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = this.parseWindow(config.window);
    const resetTime = now + windowMs;

    const existing = this.memoryStore.get(identifier);

    if (!existing || existing.resetTime <= now) {
      // New window or expired
      this.memoryStore.set(identifier, { count: 1, resetTime });

      return {
        success: true,
        limit: config.limit,
        remaining: config.limit - 1,
        reset: new Date(resetTime),
        identifier,
        blocked: false,
      };
    }

    // Increment count
    existing.count += 1;
    this.memoryStore.set(identifier, existing);

    const blocked = existing.count > config.limit;

    return {
      success: !blocked,
      limit: config.limit,
      remaining: Math.max(0, config.limit - existing.count),
      reset: new Date(existing.resetTime),
      identifier,
      blocked,
    };
  }

  /**
   * Get request identifier
   */
  private async getIdentifier(
    request: NextRequest,
    config: RateLimitConfig
  ): Promise<string> {
    if (config.identifier === 'ip') {
      return this.getClientIP(request);
    }

    return config.identifier;
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const real = request.headers.get('x-real-ip');
    const remoteAddress = request.headers.get('x-remote-address');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    if (real) {
      return real;
    }

    if (remoteAddress) {
      return remoteAddress;
    }

    return 'unknown';
  }

  /**
   * Parse time window string to milliseconds
   */
  private parseWindow(window: string): number {
    const match = window.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid window format: ${window}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Invalid time unit: ${unit}`);
    }
  }

  /**
   * Create rate limit response
   */
  private createRateLimitResponse(
    config: RateLimitConfig,
    result: RateLimitResult
  ): NextResponse {
    const message = config.message || 'Too many requests';

    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset.toISOString(),
      },
      { status: 429 }
    );

    if (config.headers !== false) {
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set(
        'X-RateLimit-Remaining',
        result.remaining.toString()
      );
      response.headers.set(
        'X-RateLimit-Reset',
        Math.ceil(result.reset.getTime() / 1000).toString()
      );
      response.headers.set(
        'Retry-After',
        Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString()
      );
    }

    return response;
  }

  /**
   * Log rate limit event
   */
  private async logRateLimitEvent(
    request: NextRequest,
    identifier: string,
    result: RateLimitResult,
    config: RateLimitConfig
  ): Promise<void> {
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent');

    await securityAuditService.logRateLimitEvent({
      ip,
      endpoint: request.nextUrl.pathname,
      limit: result.limit,
      current: result.limit - result.remaining,
      windowMs: this.parseWindow(config.window),
      userAgent: userAgent || undefined,
    });
  }

  /**
   * Cleanup old memory entries
   */
  cleanup(): void {
    const now = Date.now();

    // Clean memory store
    for (const [key, value] of this.memoryStore.entries()) {
      if (value.resetTime <= now) {
        this.memoryStore.delete(key);
      }
    }

    // Clean suspicious IPs (older than 1 hour)
    const oneHourAgo = now - 60 * 60 * 1000;
    for (const [key, value] of this.suspiciousIPs.entries()) {
      if (value.lastFailure < oneHourAgo) {
        this.suspiciousIPs.delete(key);
      }
    }
  }

  /**
   * Get rate limiting statistics
   */
  getStats() {
    return {
      memoryEntries: this.memoryStore.size,
      suspiciousIPs: this.suspiciousIPs.size,
      redisEnabled: !!this.redis,
    };
  }
}

// Singleton instance
export const enhancedRateLimitService = new EnhancedRateLimitService();

// Cleanup interval
setInterval(
  () => {
    enhancedRateLimitService.cleanup();
  },
  5 * 60 * 1000
); // Every 5 minutes
