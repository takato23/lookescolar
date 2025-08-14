import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SecurityValidator } from '@/lib/security/validation';
import crypto from 'crypto';

// Request ID generator for tracking
export function generateRequestId(): string {
  return `req_${crypto.randomBytes(8).toString('hex')}`;
}

// Security logger for structured logging
export class SecurityLogger {
  static logSecurityEvent(
    event: string,
    metadata: Record<string, any>,
    level: 'info' | 'warning' | 'error' = 'info'
  ): void {
    const log: any = {
      requestId: metadata['requestId'] || generateRequestId(),
      timestamp: new Date().toISOString(),
      level,
      event,
      ...metadata,
    };

    // Mask sensitive data
    if (log['token']) {
      log['token'] = SecurityValidator.maskSensitiveData(log['token'], 'token');
    }
    if (log['signedUrl']) {
      log['signedUrl'] = SecurityValidator.maskSensitiveData(log['signedUrl'], 'url');
    }

    // In production, use a proper logging service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to logging service (e.g., Datadog, CloudWatch, etc.)
      console.log(JSON.stringify(log));
    } else {
      console.log(`[${log.level.toUpperCase()}]`, log.event, log);
    }
  }

  static logResourceAccess(
    resource: string,
    authContext: { isAdmin: boolean; user?: any },
    request: NextRequest
  ): void {
    this.logSecurityEvent(
      'resource_access',
      {
        resource,
        userId: authContext.user?.id || 'unknown',
        isAdmin: authContext.isAdmin,
        method: request.method,
        url: request.url,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
      'info'
    );
  }
}

// Authentication result type
export interface AuthResult {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    role?: string;
    metadata?: Record<string, any>;
  };
  error?: string;
  requestId: string;
}

// Main authentication middleware
export async function authenticateAdmin(
  request: NextRequest
): Promise<AuthResult> {
  const requestId = generateRequestId();

  try {
    // Bypass de autenticación en desarrollo en cualquier host
    // Permite trabajar en local sin sesión de Supabase
    if (process.env.NODE_ENV !== 'production') {
      SecurityLogger.logSecurityEvent(
        'auth_dev_bypass',
        {
          requestId,
          host: request.headers.get('host') ?? '',
          forwardedHost: request.headers.get('x-forwarded-host') ?? '',
        },
        'info'
      );

      return {
        authenticated: true,
        user: {
          id: 'dev-user',
          email: 'admin@lookescolar.dev',
          role: 'admin',
          metadata: { env: 'development' },
        },
        requestId,
      };
    }

    const supabase = await createServerSupabaseClient();

    // Get user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      SecurityLogger.logSecurityEvent(
        'auth_failed',
        {
          requestId,
          reason: authError?.message || 'No user session',
          ip:
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
        'warning'
      );

      return {
        authenticated: false,
        error: 'Authentication required',
        requestId,
      };
    }

    // Check if user has admin role (implement based on your user model)
    // This is a placeholder - implement actual role checking based on your schema
    const isAdmin = await checkAdminRole(user.id);

    if (!isAdmin) {
      SecurityLogger.logSecurityEvent(
        'unauthorized_access_attempt',
        {
          requestId,
          userId: user.id,
          email: user.email,
          attemptedEndpoint: request.url,
          ip:
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip'),
        },
        'warning'
      );

      return {
        authenticated: false,
        error: 'Admin access required',
        requestId,
      };
    }

    SecurityLogger.logSecurityEvent(
      'auth_success',
      {
        requestId,
        userId: user.id,
        email: user.email,
      },
      'info'
    );

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email || '',
        role: 'admin',
        metadata: user.user_metadata,
      },
      requestId,
    };
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'auth_error',
      {
        requestId,
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

// Check if user has admin role
async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    // In development mode, allow access without strict admin check
    if (process.env.NODE_ENV === 'development') {
      return true; // Allow all authenticated users in development
    }

    const supabase = await createServerSupabaseClient();

    // Option 1: Check user metadata for admin role
    const {
      data: { user },
      error: _userError,
    } = await supabase.auth.getUser();
    if (user?.user_metadata?.['role'] === 'admin') {
      return true;
    }

    // Option 2: Check separate admin table (if you have one)
    // const { data: adminData, error: adminError } = await supabase
    //   .from('admins')
    //   .select('id')
    //   .eq('user_id', userId)
    //   .single();
    //
    // return !!adminData && !adminError;

    // For now, you might want to use an environment variable for allowed admin emails
    const adminEmails = process.env['ADMIN_EMAILS']?.split(',') || [];
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    return currentUser?.email ? adminEmails.includes(currentUser.email) : false;
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'role_check_error',
      {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );
    return false;
  }
}

// Higher-order function to wrap API routes with authentication
export function withAuth(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse<any>>
) {
  return async (
    request: NextRequest,
    ...args: any[]
  ): Promise<NextResponse<any>> => {
    const authResult = await authenticateAdmin(request);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        {
          status: 401,
          headers: {
            'X-Request-Id': authResult.requestId,
          },
        }
      );
    }

    try {
      const response = await handler(request, ...args);

      // Add request ID to response headers
      response.headers.set('X-Request-Id', authResult.requestId);

      return response;
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        'handler_error',
        {
          requestId: authResult.requestId,
          userId: authResult.user!.id,
          endpoint: request.url,
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

// CSRF token validation
export function validateCSRFToken(request: NextRequest): boolean {
  const token = request.headers.get('x-csrf-token');
  const cookieToken = request.cookies.get('csrf-token')?.value;

  if (!token || !cookieToken) {
    return false;
  }

  return token === cookieToken;
}

// Generate CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Export AuthMiddleware class for compatibility
export class AuthMiddleware {
  static withAuth<T extends any[], R>(
    handler: (request: NextRequest, auth: { isAdmin: boolean; user?: any }, ...args: T) => Promise<NextResponse<R>>,
    _role?: string
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse<R | { error: string }>> => {
      const authResult = await authenticateAdmin(request);

      if (!authResult.authenticated) {
        return NextResponse.json(
          { error: authResult.error || 'Authentication required' },
          {
            status: 401,
            headers: {
              'X-Request-Id': authResult.requestId,
            },
          }
        );
      }

      const auth = {
        isAdmin: authResult.user?.role === 'admin' || process.env.NODE_ENV === 'development',
        user: authResult.user,
      };

      try {
        const response = await handler(request, auth, ...args);

        // Add request ID to response headers
        response.headers.set('X-Request-Id', authResult.requestId);

        return response;
      } catch (error) {
        SecurityLogger.logSecurityEvent(
          'handler_error',
          {
            requestId: authResult.requestId,
            userId: authResult.user!.id,
            endpoint: request.url,
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
}
