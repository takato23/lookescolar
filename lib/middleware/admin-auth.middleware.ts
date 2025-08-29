import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { SecurityValidator } from '@/lib/security/validation';
import crypto from 'crypto';

// Request ID generator for tracking
export function generateRequestId(): string {
  return `req_${crypto.randomBytes(8).toString('hex')}`;
}

// Admin-specific rate limits - more restrictive for admin publish operations
const ADMIN_RATE_LIMITS = {
  '/api/admin/folders/[id]/publish': { requests: 10, windowMs: 60 * 1000 }, // 10 req/min
  '/api/admin/folders/published': { requests: 30, windowMs: 60 * 1000 }, // 30 req/min
  default: { requests: 15, windowMs: 60 * 1000 }, // Default admin: 15 req/min
} as const;

// Security audit logger specifically for admin actions
export class AdminSecurityLogger {
  static logAdminAction(
    action: string,
    metadata: Record<string, any>,
    level: 'info' | 'warning' | 'error' = 'info'
  ): void {
    const log: any = {
      requestId: metadata['requestId'] || generateRequestId(),
      timestamp: new Date().toISOString(),
      level,
      action,
      type: 'admin_security_event',
      ...metadata,
    };

    // Mask sensitive data in logs
    if (log['token']) {
      log['token'] = SecurityValidator.maskSensitiveData(log['token'], 'token');
    }
    if (log['email']) {
      log['email'] = SecurityValidator.maskSensitiveData(log['email'], 'email');
    }

    // In production, send to centralized logging
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to centralized logging service (Datadog, CloudWatch, etc.)
      console.log(JSON.stringify(log));
    } else {
      console.log(`[ADMIN-SECURITY][${log.level.toUpperCase()}]`, log.action, log);
    }
  }

  static logAdminAccess(
    endpoint: string,
    user: { id: string; email: string; role?: string },
    request: NextRequest,
    requestId: string,
    success: boolean = true
  ): void {
    this.logAdminAction(
      success ? 'admin_access_granted' : 'admin_access_denied',
      {
        requestId,
        endpoint,
        userId: user.id,
        userEmail: user.email,
        userRole: user.role || 'unknown',
        method: request.method,
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        success,
      },
      success ? 'info' : 'warning'
    );
  }

  static logUnauthorizedAccess(
    endpoint: string,
    request: NextRequest,
    requestId: string,
    reason: string
  ): void {
    this.logAdminAction(
      'admin_unauthorized_access',
      {
        requestId,
        endpoint,
        method: request.method,
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        reason,
      },
      'warning'
    );
  }

  static logRateLimitExceeded(
    endpoint: string,
    request: NextRequest,
    requestId: string,
    limit: number
  ): void {
    this.logAdminAction(
      'admin_rate_limit_exceeded',
      {
        requestId,
        endpoint,
        method: request.method,
        ip: getClientIP(request),
        limit,
      },
      'warning'
    );
  }
}

// Authentication result interface
export interface AdminAuthResult {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    metadata?: Record<string, any>;
  };
  error?: string;
  requestId: string;
  rateLimitResult?: {
    allowed: boolean;
    limit?: number;
    remaining?: number;
    resetTime?: number;
    retryAfter?: number;
  };
}

// Main admin authentication function
export async function authenticateAdmin(
  request: NextRequest,
  skipRateLimit: boolean = false
): Promise<AdminAuthResult> {
  const requestId = generateRequestId();
  const endpoint = request.nextUrl.pathname;

  try {
    // Apply admin-specific rate limiting first
    let rateLimitResult;
    if (!skipRateLimit) {
      rateLimitResult = await applyAdminRateLimit(request, requestId);
      if (!rateLimitResult.allowed) {
        AdminSecurityLogger.logRateLimitExceeded(
          endpoint,
          request,
          requestId,
          rateLimitResult.limit || 0
        );
        return {
          authenticated: false,
          error: 'Rate limit exceeded',
          requestId,
          rateLimitResult,
        };
      }
    }

    // Development bypass with explicit configuration
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.ALLOW_DEV_BYPASS === 'true'
    ) {
      const devUser = {
        id: 'dev-admin',
        email: 'admin@lookescolar.dev',
        role: 'admin',
        metadata: { env: 'development' },
      };

      AdminSecurityLogger.logAdminAccess(endpoint, devUser, request, requestId);

      return {
        authenticated: true,
        user: devUser,
        requestId,
        rateLimitResult,
      };
    }

    // Get Supabase client and validate session
    const supabase = await createServerSupabaseClient();
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      AdminSecurityLogger.logUnauthorizedAccess(
        endpoint,
        request,
        requestId,
        authError?.message || 'No user session'
      );

      return {
        authenticated: false,
        error: 'Authentication required',
        requestId,
        rateLimitResult,
      };
    }

    // Verify admin role
    const isAdmin = await verifyAdminRole(user.id, user);
    if (!isAdmin) {
      AdminSecurityLogger.logUnauthorizedAccess(
        endpoint,
        request,
        requestId,
        'User lacks admin privileges'
      );

      return {
        authenticated: false,
        error: 'Admin access required',
        requestId,
        rateLimitResult,
      };
    }

    const authenticatedUser = {
      id: user.id,
      email: user.email || '',
      role: 'admin',
      metadata: user.user_metadata,
    };

    AdminSecurityLogger.logAdminAccess(endpoint, authenticatedUser, request, requestId);

    return {
      authenticated: true,
      user: authenticatedUser,
      requestId,
      rateLimitResult,
    };
  } catch (error) {
    AdminSecurityLogger.logAdminAction(
      'admin_auth_error',
      {
        requestId,
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );

    return {
      authenticated: false,
      error: 'Authentication service error',
      requestId,
    };
  }
}

// Verify admin role with multiple strategies
async function verifyAdminRole(userId: string, user: any): Promise<boolean> {
  try {
    // In development mode, allow all authenticated users
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    // Strategy 1: Check user metadata for admin role
    if (user?.user_metadata?.['role'] === 'admin') {
      return true;
    }

    // Strategy 2: Check against admin emails list
    const adminEmails = process.env['ADMIN_EMAILS']?.split(',') || [];
    if (user?.email && adminEmails.includes(user.email)) {
      return true;
    }

    // Strategy 3: Database lookup (if admin table exists)
    // Uncomment if you have an admin table:
    /*
    const supabase = await createServerSupabaseClient();
    const { data: adminRecord } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (adminRecord) {
      return true;
    }
    */

    return false;
  } catch (error) {
    AdminSecurityLogger.logAdminAction(
      'admin_role_check_error',
      {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );
    return false;
  }
}

// Apply admin-specific rate limiting
async function applyAdminRateLimit(
  request: NextRequest,
  requestId: string
): Promise<{ allowed: boolean; limit?: number; remaining?: number; resetTime?: number; retryAfter?: number }> {
  try {
    // Use the general rate limit middleware with admin-specific configuration
    const result = await rateLimitMiddleware(request, requestId);
    
    // For admin endpoints, apply additional restrictions
    const pathname = request.nextUrl.pathname;
    const adminLimit = getAdminRateLimitConfig(pathname);
    
    // Apply more restrictive admin limits if needed
    if (result.allowed && adminLimit.requests < (result.limit || Infinity)) {
      // TODO: Implement admin-specific rate limiting logic here
      // For now, use the existing rate limiter
    }
    
    return result;
  } catch (error) {
    AdminSecurityLogger.logAdminAction(
      'admin_rate_limit_error',
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );
    // On error, allow the request but log it
    return { allowed: true };
  }
}

// Get admin rate limit configuration
function getAdminRateLimitConfig(pathname: string): { requests: number; windowMs: number } {
  // Check for exact match first
  for (const [route, config] of Object.entries(ADMIN_RATE_LIMITS)) {
    if (route !== 'default' && pathname.includes(route.replace(/\[.*?\]/g, ''))) {
      return config;
    }
  }
  return ADMIN_RATE_LIMITS.default;
}

// Extract client IP with proxy support
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const connectingIP = request.headers.get('cf-connecting-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (connectingIP) {
    return connectingIP;
  }
  return request.ip || 'unknown';
}

// Higher-order function to wrap admin API routes with authentication
export function withAdminAuth<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await authenticateAdmin(request);

    // Handle rate limiting
    if (authResult.rateLimitResult && !authResult.rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          details: 'Admin endpoint rate limit exceeded'
        },
        {
          status: 429,
          headers: {
            'X-Request-Id': authResult.requestId,
            'X-RateLimit-Limit': String(authResult.rateLimitResult.limit ?? 0),
            'X-RateLimit-Remaining': String(authResult.rateLimitResult.remaining ?? 0),
            'X-RateLimit-Reset': String(authResult.rateLimitResult.resetTime ?? 0),
            'Retry-After': String(authResult.rateLimitResult.retryAfter ?? 0),
          },
        }
      );
    }

    // Handle authentication failure
    if (!authResult.authenticated) {
      const statusCode = authResult.error === 'Authentication required' ? 401 : 403;
      return NextResponse.json(
        { error: authResult.error || 'Access denied' },
        {
          status: statusCode,
          headers: {
            'X-Request-Id': authResult.requestId,
          },
        }
      );
    }

    try {
      // Call the original handler with authentication context
      const response = await handler(request, ...args);
      
      // Add security headers and request ID
      response.headers.set('X-Request-Id', authResult.requestId);
      response.headers.set('X-Admin-Authenticated', 'true');
      
      // Add rate limit headers if available
      if (authResult.rateLimitResult) {
        if (authResult.rateLimitResult.limit) {
          response.headers.set('X-RateLimit-Limit', String(authResult.rateLimitResult.limit));
        }
        if (authResult.rateLimitResult.remaining !== undefined) {
          response.headers.set('X-RateLimit-Remaining', String(authResult.rateLimitResult.remaining));
        }
        if (authResult.rateLimitResult.resetTime) {
          response.headers.set('X-RateLimit-Reset', String(authResult.rateLimitResult.resetTime));
        }
      }

      return response;
    } catch (error) {
      AdminSecurityLogger.logAdminAction(
        'admin_handler_error',
        {
          requestId: authResult.requestId,
          userId: authResult.user?.id,
          endpoint: request.nextUrl.pathname,
          method: request.method,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'error'
      );

      return NextResponse.json(
        { error: 'Internal server error' },
        {
          status: 500,
          headers: {
            'X-Request-Id': authResult.requestId,
          },
        }
      );
    }
  };
}

// Export for compatibility with existing patterns
export const AdminAuthMiddleware = {
  withAuth: withAdminAuth,
  authenticate: authenticateAdmin,
  logger: AdminSecurityLogger,
};