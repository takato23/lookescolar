import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const storageBucket = process.env.STORAGE_BUCKET || 'photos';
    return NextResponse.json({ ok: true, nodeEnv, storageBucket });
  } catch (error) {
    console.error('[Service] /api/health error', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
/**
 * Health Check API Endpoint
 * Provides system health status for monitoring and observability
 */

import { NextRequest, NextResponse } from 'next/server';
import { healthMonitor } from '@/lib/utils/health-monitor';
import { RequestLoggerMiddleware } from '@/lib/middleware/request-logger.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

// Health check handler with logging and rate limiting
async function handler(request: NextRequest): Promise<NextResponse> {
  const requestId = RequestLoggerMiddleware.initRequest(request);

  try {
    // Check for detailed parameter
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true';

    // Get health status
    const healthResponse = healthMonitor.getHealthEndpointResponse();

    // Return simplified response if not detailed
    if (!detailed) {
      const simplifiedBody = {
        status: healthResponse.body.status,
        timestamp: healthResponse.body.timestamp,
        uptime: healthResponse.body.uptime,
      };

      const response = NextResponse.json(simplifiedBody, {
        status: healthResponse.status,
      });

      RequestLoggerMiddleware.finalizeRequest(requestId, response, {
        cacheHit: false,
      });

      return response;
    }

    // Return full health response
    const response = NextResponse.json(healthResponse.body, {
      status: healthResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    RequestLoggerMiddleware.finalizeRequest(requestId, response, {
      cacheHit: false,
    });

    return response;
  } catch (error) {
    const errorResponse = NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );

    RequestLoggerMiddleware.finalizeRequest(requestId, errorResponse, {
      errorCode: (error as Error).name,
    });

    return errorResponse;
  }
}

// Apply rate limiting (100 requests per minute)
const rateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  keyGenerator: (req: NextRequest) => `health:${req.ip ?? 'unknown'}`,
};

// Export wrapped handlers
export const GET = RateLimitMiddleware.withRateLimit(handler, rateLimitConfig);
export const HEAD = RateLimitMiddleware.withRateLimit(handler, rateLimitConfig);
