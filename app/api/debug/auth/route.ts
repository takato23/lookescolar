import { NextRequest, NextResponse } from 'next/server';
import { robustAuthCheck } from '@/lib/middleware/auth-robust.middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await robustAuthCheck(request);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasAdminEmails: !!process.env.ADMIN_EMAILS,
        hasDevBypass: !!process.env.ALLOW_DEV_BYPASS,
        hasProdBypass: !!process.env.ENABLE_PROD_BYPASS,
      },
      authResult: {
        authenticated: authResult.authenticated,
        isAdmin: authResult.isAdmin,
        error: authResult.error,
        userId: authResult.user?.id,
        userEmail: authResult.user?.email,
        requestId: authResult.requestId
      },
      request: {
        method: request.method,
        url: request.url,
        headers: {
          'user-agent': request.headers.get('user-agent')?.substring(0, 100),
          'host': request.headers.get('host'),
          'x-forwarded-for': request.headers.get('x-forwarded-for'),
          'authorization': request.headers.get('authorization') ? 'present' : 'missing',
          'x-auth-email': request.headers.get('x-auth-email') || 'missing',
          'x-bypass-token': request.headers.get('x-bypass-token') || 'missing',
        },
        cookies: request.cookies.getAll().map(c => ({
          name: c.name,
          hasValue: !!c.value,
          length: c.value?.length || 0
        }))
      }
    };

    return NextResponse.json(debugInfo, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}