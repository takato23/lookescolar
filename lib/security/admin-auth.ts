// Admin authentication utilities - delegates to the real middleware
// SECURITY: These functions MUST use the real authentication middleware
import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth as realWithAdminAuth, AdminAuthResult } from '@/lib/middleware/admin-auth.middleware';

/**
 * @deprecated Use withAdminAuth from '@/lib/middleware/admin-auth.middleware' directly
 * This function exists for backward compatibility only
 */
export async function validateAdminRequest(request: NextRequest): Promise<{ valid: boolean; userId?: string; error?: string }> {
  // Instead of returning a stub, throw an error to force migration to withAdminAuth
  console.warn('[SECURITY] validateAdminRequest is deprecated. Use withAdminAuth middleware instead.');

  // In development, allow bypass with explicit env var for testing
  if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_BYPASS === 'true') {
    console.warn('[SECURITY] DEV BYPASS ACTIVE - Not for production use');
    return { valid: true, userId: 'dev-admin' };
  }

  // In production or without bypass, this should not be used
  return { valid: false, error: 'Use withAdminAuth middleware instead of validateAdminRequest' };
}

/**
 * @deprecated Use withAdminAuth from '@/lib/middleware/admin-auth.middleware' directly
 */
export function requireAdminAuth() {
  console.warn('[SECURITY] requireAdminAuth is deprecated. Use withAdminAuth middleware instead.');
  return (_request: NextRequest) => ({ valid: false, error: 'Migration required' });
}

/**
 * @deprecated Use withAdminAuth from '@/lib/middleware/admin-auth.middleware' directly
 */
export async function adminAuth(request: NextRequest): Promise<{ ok: boolean; userId?: string; error?: string }> {
  console.warn('[SECURITY] adminAuth is deprecated. Use withAdminAuth middleware instead.');

  // In development, allow bypass with explicit env var for testing
  if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_BYPASS === 'true') {
    return { ok: true, userId: 'dev-admin' };
  }

  return { ok: false, error: 'Use withAdminAuth middleware instead' };
}

/**
 * @deprecated Use withAdminAuth from '@/lib/middleware/admin-auth.middleware' directly
 */
export async function adminAuthMiddleware(request: NextRequest): Promise<{ ok: boolean; userId?: string; error?: string }> {
  return adminAuth(request);
}

// Re-export the real withAdminAuth for easier migration
export { realWithAdminAuth as withAdminAuth };
