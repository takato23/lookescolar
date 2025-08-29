// Rate limiting utilities - stub implementation
import { NextRequest } from 'next/server';

export async function checkRateLimit(request: NextRequest, key: string) {
  // Stub implementation for rate limiting
  return {
    success: true,
    limit: 100,
    remaining: 99,
    reset: Date.now() + 60000,
  };
}

export function createRateLimiter(config: {
  requests: number;
  window: string;
}) {
  // Stub implementation for rate limiter creation
  return {
    check: async (key: string) => ({
      success: true,
      limit: config.requests,
      remaining: config.requests - 1,
      reset: Date.now() + 60000,
    }),
  };
}
