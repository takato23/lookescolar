import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SecurityLogger } from '@/lib/middleware/auth.middleware';
import crypto from 'crypto';

// Robust authentication middleware that handles both development and production
export async function robustAuthCheck(request: NextRequest): Promise<{
  authenticated: boolean;
  user?: any;
  error?: string;
  requestId: string;
  isAdmin: boolean;
}> {
  const requestId = `req_${crypto.randomBytes(8).toString('hex')}`;

  try {
    // 1. Development bypass (if enabled)
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_BYPASS === 'true') {
      SecurityLogger.logSecurityEvent(
        'auth_dev_bypass_used',
        { requestId, path: request.nextUrl.pathname },
        'info'
      );
      
      return {
        authenticated: true,
        user: {
          id: 'dev-user',
          email: 'admin@lookescolar.dev',
          role: 'admin'
        },
        requestId,
        isAdmin: true
      };
    }

    // 2. Try Supabase authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (user && !authError) {
      // User is authenticated via Supabase
      const isAdmin = await checkAdminRole(user.id, user.email);
      
      SecurityLogger.logSecurityEvent(
        'auth_supabase_success',
        { 
          requestId, 
          userId: user.id, 
          email: user.email,
          isAdmin 
        },
        'info'
      );

      return {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email || '',
          role: isAdmin ? 'admin' : 'user'
        },
        requestId,
        isAdmin
      };
    }

    // 3. Check for admin email bypass (temporary for deployment debugging)
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);
    const authHeader = request.headers.get('authorization');
    const xAuthEmail = request.headers.get('x-auth-email');
    
    if (xAuthEmail && adminEmails.includes(xAuthEmail)) {
      SecurityLogger.logSecurityEvent(
        'auth_email_bypass_used',
        { requestId, email: xAuthEmail },
        'warning'
      );
      
      return {
        authenticated: true,
        user: {
          id: `bypass-${crypto.randomBytes(4).toString('hex')}`,
          email: xAuthEmail,
          role: 'admin'
        },
        requestId,
        isAdmin: true
      };
    }

    // 4. Production fallback for Vercel deployment debugging
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV && process.env.ENABLE_PROD_BYPASS === 'true') {
      const bypassToken = request.headers.get('x-bypass-token');
      const expectedToken = process.env.PROD_BYPASS_TOKEN;
      
      if (bypassToken && expectedToken && bypassToken === expectedToken) {
        SecurityLogger.logSecurityEvent(
          'auth_prod_bypass_used',
          { requestId, vercelEnv: process.env.VERCEL_ENV },
          'warning'
        );
        
        return {
          authenticated: true,
          user: {
            id: 'prod-bypass-user',
            email: 'admin@vercel.deploy',
            role: 'admin'
          },
          requestId,
          isAdmin: true
        };
      }
    }

    // 5. Authentication failed
    SecurityLogger.logSecurityEvent(
      'auth_failed_all_methods',
      {
        requestId,
        supabaseError: authError?.message,
        hasAuthHeader: !!authHeader,
        hasXAuthEmail: !!xAuthEmail,
        path: request.nextUrl.pathname
      },
      'warning'
    );

    return {
      authenticated: false,
      error: 'Authentication required',
      requestId,
      isAdmin: false
    };

  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'auth_system_error',
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );

    return {
      authenticated: false,
      error: 'Authentication system error',
      requestId,
      isAdmin: false
    };
  }
}

// Enhanced admin role check
async function checkAdminRole(userId: string, email?: string): Promise<boolean> {
  try {
    // 1. Development mode - allow all authenticated users
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    // 2. Check admin emails list
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);
    if (email && adminEmails.includes(email)) {
      return true;
    }

    // 3. Check Supabase user metadata
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user?.user_metadata?.role === 'admin') {
      return true;
    }

    // 4. Check custom admin table (if exists)
    try {
      const { data: adminData } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (adminData) {
        return true;
      }
    } catch {
      // Table might not exist, continue
    }

    return false;
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'admin_check_error',
      {
        userId,
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );
    return false;
  }
}

// Wrapper function for API routes
export function withRobustAuth(
  handler: (
    request: NextRequest,
    context: { user: any; requestId: string } & Record<string, any>
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const authResult = await robustAuthCheck(request);

    if (!authResult.authenticated || !authResult.isAdmin) {
      return NextResponse.json(
        { 
          error: authResult.error || 'Admin access required',
          requestId: authResult.requestId
        },
        { 
          status: authResult.authenticated ? 403 : 401,
          headers: {
            'X-Request-Id': authResult.requestId,
          }
        }
      );
    }

    try {
      const baseContext =
        args && args.length > 0 && typeof args[0] === 'object' && args[0] !== null
          ? args[0]
          : {};

      const response = await handler(request, {
        ...baseContext,
        user: authResult.user!,
        requestId: authResult.requestId,
      });

      // Add request ID to response headers
      response.headers.set('X-Request-Id', authResult.requestId);
      return response;

    } catch (error) {
      SecurityLogger.logSecurityEvent(
        'handler_execution_error',
        {
          requestId: authResult.requestId,
          userId: authResult.user!.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'error'
      );

      return NextResponse.json(
        { error: 'Internal server error', requestId: authResult.requestId },
        { 
          status: 500,
          headers: {
            'X-Request-Id': authResult.requestId,
          }
        }
      );
    }
  };
}
