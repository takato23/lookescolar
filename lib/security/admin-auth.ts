// Admin authentication utilities - stub implementation
import { NextRequest } from 'next/server';

export async function validateAdminRequest(request: NextRequest) {
  // Stub implementation for admin request validation
  return { valid: true, userId: 'admin' };
}

export function requireAdminAuth() {
  // Stub implementation for admin auth middleware
  return (request: NextRequest) => ({ valid: true });
}

// Compatibility exports expected by routes
export async function adminAuth(request: NextRequest) {
  return { ok: true, userId: 'admin' } as const;
}

export async function adminAuthMiddleware(request: NextRequest) {
  return { ok: true, userId: 'admin' } as const;
}
