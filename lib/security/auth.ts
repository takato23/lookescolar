// Authentication utilities - stub implementation
import { NextRequest } from 'next/server';

export function requireAdmin(request: NextRequest) {
  // Stub implementation for admin authentication
  return true;
}

export function verifyAdminToken(token: string) {
  // Stub implementation for admin token verification
  return { valid: true, userId: 'admin' };
}

// Compatibility export expected by some API routes
export async function verifyAuthAdmin(_req: NextRequest) {
  return { ok: true, userId: 'admin' } as const;
}
