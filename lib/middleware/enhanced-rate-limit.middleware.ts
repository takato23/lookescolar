import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// ============================================================
// TYPES AND INTERFACES
// ============================================================

export interface RateLimitConfig {
  windowMs: number;           // Time window in milliseconds
  maxAttempts: number;        // Maximum attempts per window
  blockDurationMs: number;    // Block duration after exceeding limit
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  keyGenerator?: (request: NextRequest) => string; // Custom key generation
  onLimitReached?: (key: string, request: NextRequest) => void; // Callback
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blockedUntil?: number;
  lastAttempt: number;
}

// ============================================================
// RATE LIMIT STORE (In-memory with Redis fallback)
// ============================================================

class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      // Remove entries that haven't been accessed in the last hour
      // and are not currently blocked
      if (
        now - entry.lastAttempt > 60 * 60 * 1000 && 
        (!entry.blockedUntil || now > entry.blockedUntil)
      ) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.store.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`[RateLimit] Cleaned up ${expiredKeys.length} expired entries`);
    }
  }

  getStats(): { totalEntries: number; blockedEntries: number } {
    const now = Date.now();
    let blockedCount = 0;

    for (const entry of this.store.values()) {
      if (entry.blockedUntil && now < entry.blockedUntil) {
        blockedCount++;
      }
    }

    return {
      totalEntries: this.store.size,
      blockedEntries: blockedCount
    };
  }
}

// Global store instance
const rateLimitStore = new RateLimitStore();

// ============================================================
// RATE LIMIT CONFIGURATIONS
// ============================================================

export const RATE_LIMIT_CONFIGS = {
  // Token validation - strict limits
  TOKEN_VALIDATION: {
    windowMs: 15 * 60 * 1000,     // 15 minutes
    maxAttempts: 50,              // 50 attempts per 15 minutes
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
    skipSuccessfulRequests: false
  } as RateLimitConfig,

  // Gallery access - moderate limits
  GALLERY_ACCESS: {
    windowMs: 10 * 60 * 1000,     // 10 minutes
    maxAttempts: 100,             // 100 requests per 10 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes block
    skipSuccessfulRequests: true
  } as RateLimitConfig,

  // Admin API - permissive but monitored
  ADMIN_API: {
    windowMs: 5 * 60 * 1000,      // 5 minutes
    maxAttempts: 200,             // 200 requests per 5 minutes
    blockDurationMs: 15 * 60 * 1000, // 15 minutes block
    skipSuccessfulRequests: true
  } as RateLimitConfig,

  // Distribution endpoints - very strict
  DISTRIBUTION: {
    windowMs: 60 * 60 * 1000,     // 1 hour
    maxAttempts: 10,              // 10 distribution requests per hour
    blockDurationMs: 4 * 60 * 60 * 1000, // 4 hours block
    skipSuccessfulRequests: false
  } as RateLimitConfig,

  // Public endpoints - balanced
  PUBLIC_API: {
    windowMs: 5 * 60 * 1000,      // 5 minutes
    maxAttempts: 60,              // 60 requests per 5 minutes
    blockDurationMs: 10 * 60 * 1000, // 10 minutes block
    skipSuccessfulRequests: true
  } as RateLimitConfig,

  // Device fingerprint - moderate
  DEVICE_REGISTRATION: {
    windowMs: 30 * 60 * 1000,     // 30 minutes
    maxAttempts: 20,              // 20 device registrations per 30 minutes
    blockDurationMs: 2 * 60 * 60 * 1000, // 2 hours block
    skipSuccessfulRequests: true
  } as RateLimitConfig
};

// ============================================================
// ENHANCED RATE LIMITER CLASS
// ============================================================

export class EnhancedRateLimiter {
  private config: RateLimitConfig;
  private keyPrefix: string;

  constructor(config: RateLimitConfig, keyPrefix: string = 'rl') {
    this.config = config;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Check if request is allowed under rate limit
   */
  async checkLimit(request: NextRequest): Promise<RateLimitResult> {
    const key = this.generateKey(request);
    const now = Date.now();
    
    // Get current entry
    const entry = rateLimitStore.get(key) || {
      count: 0,
      windowStart: now,
      lastAttempt: now
    };

    // Check if currently blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      // Log blocked attempt
      await this.logRateLimitEvent(key, request, 'blocked', {
        remainingBlockTime: entry.blockedUntil - now,
        totalAttempts: entry.count
      });

      return {
        success: false,
        remaining: 0,
        resetTime: entry.blockedUntil,
        blocked: true,
        blockUntil: entry.blockedUntil
      };
    }

    // Check if window has expired
    if (now - entry.windowStart >= this.config.windowMs) {
      // Reset window
      entry.count = 0;
      entry.windowStart = now;
      delete entry.blockedUntil;
    }

    // Increment attempt count
    entry.count++;
    entry.lastAttempt = now;

    // Check if limit exceeded
    if (entry.count > this.config.maxAttempts) {
      // Apply block
      entry.blockedUntil = now + this.config.blockDurationMs;
      
      // Store updated entry
      rateLimitStore.set(key, entry);

      // Log limit exceeded
      await this.logRateLimitEvent(key, request, 'limit_exceeded', {
        maxAttempts: this.config.maxAttempts,
        windowMs: this.config.windowMs,
        blockDurationMs: this.config.blockDurationMs
      });

      // Call callback if configured
      if (this.config.onLimitReached) {
        this.config.onLimitReached(key, request);
      }

      return {
        success: false,
        remaining: 0,
        resetTime: entry.blockedUntil,
        blocked: true,
        blockUntil: entry.blockedUntil
      };
    }

    // Store updated entry
    rateLimitStore.set(key, entry);

    // Calculate remaining attempts and reset time
    const remaining = Math.max(0, this.config.maxAttempts - entry.count);
    const resetTime = entry.windowStart + this.config.windowMs;

    return {
      success: true,
      remaining,
      resetTime,
      blocked: false
    };
  }

  /**
   * Mark a request as successful (for skipSuccessfulRequests)
   */
  async markSuccess(request: NextRequest): Promise<void> {
    if (!this.config.skipSuccessfulRequests) {
      return;
    }

    const key = this.generateKey(request);
    const entry = rateLimitStore.get(key);

    if (entry && entry.count > 0) {
      entry.count = Math.max(0, entry.count - 1);
      rateLimitStore.set(key, entry);
    }
  }

  /**
   * Generate cache key for request
   */
  private generateKey(request: NextRequest): string {
    if (this.config.keyGenerator) {
      return `${this.keyPrefix}:${this.config.keyGenerator(request)}`;
    }

    // Default key generation based on IP and User-Agent
    const clientIP = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent')?.slice(0, 50) || 'unknown';
    const path = new URL(request.url).pathname;
    
    // Create a simple hash for the user agent to reduce key size
    const uaHash = this.simpleHash(userAgent);
    
    return `${this.keyPrefix}:${clientIP}:${uaHash}:${path}`;
  }

  /**
   * Extract client IP from request
   */
  private getClientIP(request: NextRequest): string {
    // Try various headers for IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    return 'unknown';
  }

  /**
   * Simple hash function for strings
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Log rate limit events to database
   */
  private async logRateLimitEvent(
    key: string,
    request: NextRequest,
    event: 'blocked' | 'limit_exceeded' | 'allowed',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient();
      
      await supabase
        .from('security_logs')
        .insert({
          event_type: 'rate_limit',
          event_subtype: event,
          ip_address: this.getClientIP(request),
          user_agent: request.headers.get('user-agent'),
          request_path: new URL(request.url).pathname,
          metadata: {
            rate_limit_key: key,
            window_ms: this.config.windowMs,
            max_attempts: this.config.maxAttempts,
            ...metadata
          },
          created_at: new Date().toISOString()
        });
    } catch (error) {
      // Don't fail the request if logging fails
      console.error('Failed to log rate limit event:', error);
    }
  }
}

// ============================================================
// MIDDLEWARE FACTORY FUNCTIONS
// ============================================================

/**
 * Create rate limiting middleware for specific endpoints
 */
export function createRateLimitMiddleware(
  config: RateLimitConfig,
  keyPrefix?: string
) {
  const limiter = new EnhancedRateLimiter(config, keyPrefix);

  return async function rateLimitMiddleware(
    request: NextRequest
  ): Promise<NextResponse | null> {
    const result = await limiter.checkLimit(request);

    if (!result.success) {
      const resetDate = new Date(result.resetTime).toISOString();
      
      return NextResponse.json(
        {
          error: 'Demasiadas solicitudes',
          error_code: 'RATE_LIMITED',
          message: result.blocked 
            ? 'Has excedido el límite de solicitudes y has sido bloqueado temporalmente'
            : 'Has excedido el límite de solicitudes para este periodo',
          retry_after: Math.ceil((result.resetTime - Date.now()) / 1000),
          reset_time: resetDate,
          blocked_until: result.blockUntil ? new Date(result.blockUntil).toISOString() : undefined
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxAttempts.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': resetDate,
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Add rate limit headers to successful requests
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', config.maxAttempts.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    return null; // Continue to next middleware/handler
  };
}

/**
 * Token validation rate limiter
 */
export const tokenValidationLimiter = createRateLimitMiddleware(
  RATE_LIMIT_CONFIGS.TOKEN_VALIDATION,
  'token_val'
);

/**
 * Gallery access rate limiter
 */
export const galleryAccessLimiter = createRateLimitMiddleware(
  RATE_LIMIT_CONFIGS.GALLERY_ACCESS,
  'gallery'
);

/**
 * Admin API rate limiter
 */
export const adminAPILimiter = createRateLimitMiddleware(
  RATE_LIMIT_CONFIGS.ADMIN_API,
  'admin'
);

/**
 * Distribution rate limiter
 */
export const distributionLimiter = createRateLimitMiddleware(
  RATE_LIMIT_CONFIGS.DISTRIBUTION,
  'dist'
);

/**
 * Public API rate limiter
 */
export const publicAPILimiter = createRateLimitMiddleware(
  RATE_LIMIT_CONFIGS.PUBLIC_API,
  'public'
);

/**
 * Device registration rate limiter
 */
export const deviceRegistrationLimiter = createRateLimitMiddleware(
  RATE_LIMIT_CONFIGS.DEVICE_REGISTRATION,
  'device'
);

// ============================================================
// RATE LIMIT UTILITIES
// ============================================================

/**
 * Get rate limit statistics
 */
export function getRateLimitStats(): {
  totalEntries: number;
  blockedEntries: number;
  memoryUsage: string;
} {
  const stats = rateLimitStore.getStats();
  
  return {
    ...stats,
    memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
  };
}

/**
 * Clear all rate limit entries (admin function)
 */
export function clearRateLimitCache(): void {
  rateLimitStore['store'].clear();
  console.log('[RateLimit] Cache cleared');
}

/**
 * Apply rate limiting to an API route handler
 */
export function withRateLimit<T extends any[]>(
  limiter: (request: NextRequest) => Promise<NextResponse | null>,
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async function rateLimitedHandler(
    request: NextRequest,
    ...args: T
  ): Promise<NextResponse> {
    // Apply rate limiting
    const limitResult = await limiter(request);
    if (limitResult) {
      return limitResult;
    }

    // Continue to original handler
    return handler(request, ...args);
  };
}

// ============================================================
// DEVICE FINGERPRINTING UTILITIES
// ============================================================

export interface DeviceFingerprint {
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  dnt?: string;
  screenResolution?: string;
  timezone?: string;
  platform?: string;
  hash: string;
}

/**
 * Generate device fingerprint from request headers
 */
export function generateDeviceFingerprint(request: NextRequest): DeviceFingerprint {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const dnt = request.headers.get('dnt') || undefined;

  // Combine headers for fingerprint
  const fingerprintData = [
    userAgent,
    acceptLanguage,
    acceptEncoding,
    dnt || 'unknown'
  ].join('|');

  // Generate hash
  const hash = hashString(fingerprintData);

  return {
    userAgent: userAgent.slice(0, 100), // Truncate for storage
    acceptLanguage,
    acceptEncoding,
    dnt,
    hash
  };
}

/**
 * Hash string using simple algorithm
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Enhanced device fingerprint with additional client data
 */
export function enhanceDeviceFingerprint(
  baseFingerprint: DeviceFingerprint,
  clientData?: {
    screenResolution?: string;
    timezone?: string;
    platform?: string;
  }
): DeviceFingerprint {
  if (!clientData) {
    return baseFingerprint;
  }

  // Re-generate hash with additional data
  const enhancedData = [
    baseFingerprint.userAgent,
    baseFingerprint.acceptLanguage,
    baseFingerprint.acceptEncoding,
    baseFingerprint.dnt || 'unknown',
    clientData.screenResolution || 'unknown',
    clientData.timezone || 'unknown',
    clientData.platform || 'unknown'
  ].join('|');

  return {
    ...baseFingerprint,
    ...clientData,
    hash: hashString(enhancedData)
  };
}