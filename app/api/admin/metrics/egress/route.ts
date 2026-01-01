/**
 * Egress Metrics API Endpoint
 * Provides bandwidth usage and transfer statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { egressMonitor } from '@/lib/utils/egress-monitor';
import { RequestLoggerMiddleware } from '@/lib/middleware/request-logger.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

async function handler(request: NextRequest): Promise<NextResponse> {
  const requestId = RequestLoggerMiddleware.initRequest(request);

  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'daily';
    const eventId = url.searchParams.get('eventId');

    let metrics;

    switch (period) {
      case 'monthly':
        metrics = await egressMonitor.getMonthlyUsage();
        break;
      case 'event':
        if (!eventId) {
          return NextResponse.json(
            { error: 'eventId required for event metrics' },
            { status: 400 }
          );
        }
        metrics = await egressMonitor.getEventUsage(eventId);
        break;
      default:
        metrics = await egressMonitor.getDailyUsage();
    }

    const response = NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
      },
    });

    RequestLoggerMiddleware.finalizeRequest(requestId, response, {
      cacheHit: false,
    });

    return response;
  } catch (error) {
    const errorResponse = NextResponse.json(
      { error: 'Failed to fetch egress metrics' },
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
  maxRequests: 30,
  keyGenerator: (req: NextRequest) => `metrics:egress:${req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'}`,
};

export const GET = RateLimitMiddleware.withRateLimit(handler, rateLimitConfig);
