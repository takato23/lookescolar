/**
 * Cache Metrics API Endpoint
 * Provides cache performance statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiCache } from '@/lib/utils/api-cache';
import { RequestLoggerMiddleware } from '@/lib/middleware/request-logger.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

async function handler(request: NextRequest): Promise<NextResponse> {
  const requestId = RequestLoggerMiddleware.initRequest(request);

  try {
    const stats = apiCache.getStats();

    const response = NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, max-age=60', // 1 minute cache
      },
    });

    RequestLoggerMiddleware.finalizeRequest(requestId, response, {
      cacheHit: false,
    });

    return response;
  } catch (error) {
    const errorResponse = NextResponse.json(
      { error: 'Failed to fetch cache metrics' },
      { status: 500 }
    );

    RequestLoggerMiddleware.finalizeRequest(requestId, errorResponse, {
      errorCode: (error as Error).name,
    });

    return errorResponse;
  }
}

// Apply rate limiting
const rateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 60,
  keyGenerator: (req: NextRequest) => `metrics:cache:${req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'}`,
};

export const GET = RateLimitMiddleware.withRateLimit(handler, rateLimitConfig);
