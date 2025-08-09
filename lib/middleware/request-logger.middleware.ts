/**
 * Request Logging Middleware
 * Implements comprehensive request/response logging with performance tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  logger,
  generateRequestId,
  getRequestContext,
  PerformanceTimer,
} from '@/lib/utils/logger';

interface RequestLogContext {
  requestId: string;
  startTime: number;
  timer: PerformanceTimer;
  userId?: string;
  token?: string;
  eventId?: string;
}

// Store for request contexts (using WeakMap to prevent memory leaks)
const requestContexts = new Map<string, RequestLogContext>();

/**
 * Request Logging Middleware
 * Adds request ID, tracks performance, and logs all requests
 */
export class RequestLoggerMiddleware {
  /**
   * Initialize request logging
   */
  static initRequest(request: NextRequest): string {
    const requestId = generateRequestId();
    const timer = new PerformanceTimer();

    const context: RequestLogContext = {
      requestId,
      startTime: Date.now(),
      timer,
      // Extract user context from headers/cookies
      userId: request.headers.get('x-user-id') || undefined,
      token:
        request.headers.get('x-family-token') ||
        request.cookies.get('family-token')?.value ||
        undefined,
      eventId: request.headers.get('x-event-id') || undefined,
    };

    requestContexts.set(requestId, context);

    // Log request start
    logger.info(
      'request_start',
      {
        requestId,
        ...getRequestContext(request),
        userId: context.userId,
        token: context.token,
        eventId: context.eventId,
      },
      `Incoming ${request.method} ${request.nextUrl.pathname}`
    );

    // Add request ID to headers for downstream consumption
    request.headers.set('x-request-id', requestId);

    return requestId;
  }

  /**
   * Finalize request logging with response details
   */
  static finalizeRequest(
    requestId: string,
    response: NextResponse,
    additionalContext?: {
      cacheHit?: boolean;
      dbQueries?: number;
      dbQueryTime?: number;
      storageOps?: number;
      storageOpTime?: number;
      bytes?: number;
      errorCode?: string;
    }
  ): void {
    const context = requestContexts.get(requestId);
    if (!context) return;

    const duration = context.timer.getElapsed();
    const statusCode = response.status;

    // Determine log level based on status code
    const logLevel =
      statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    // Log API request completion
    logger[logLevel](
      'request_complete',
      {
        requestId,
        statusCode,
        duration,
        userId: context.userId,
        token: context.token,
        eventId: context.eventId,
        cacheHit: additionalContext?.cacheHit,
        bytes: additionalContext?.bytes,
        performance: {
          totalTime: duration,
          dbQueryTime: additionalContext?.dbQueryTime,
          storageOpTime: additionalContext?.storageOpTime,
        },
        ...(additionalContext?.errorCode && {
          errorCode: additionalContext.errorCode,
        }),
      },
      `${statusCode} - ${duration}ms`
    );

    // Add performance headers to response
    response.headers.set('X-Request-ID', requestId);
    response.headers.set('X-Response-Time', `${duration}ms`);

    if (additionalContext?.cacheHit !== undefined) {
      response.headers.set(
        'X-Cache',
        additionalContext.cacheHit ? 'HIT' : 'MISS'
      );
    }

    // Clean up context
    requestContexts.delete(requestId);
  }

  /**
   * Get current request context
   */
  static getContext(requestId: string): RequestLogContext | undefined {
    return requestContexts.get(requestId);
  }

  /**
   * Add checkpoint to current request
   */
  static checkpoint(requestId: string, name: string): number {
    const context = requestContexts.get(requestId);
    if (!context) return 0;

    return context.timer.checkpoint(name);
  }

  /**
   * Wrapper for API route handlers with automatic logging
   */
  static withRequestLogging<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const requestId = this.initRequest(request);
      let response: NextResponse;
      let errorCode: string | undefined;

      try {
        // Execute handler
        response = await handler(request, ...args);

        // Extract performance metrics if handler added them
        const performanceHeader = response.headers.get('X-Performance-Metrics');
        let additionalContext: any = {};

        if (performanceHeader) {
          try {
            additionalContext = JSON.parse(performanceHeader);
            response.headers.delete('X-Performance-Metrics'); // Remove internal header
          } catch {
            // Ignore parsing errors
          }
        }

        this.finalizeRequest(requestId, response, additionalContext);
        return response;
      } catch (error) {
        // Log error and create error response
        errorCode = error instanceof Error ? error.name : 'UnknownError';

        logger.logError(error as Error, {
          requestId,
          operation: 'api_handler',
          path: request.nextUrl.pathname,
        });

        response = new NextResponse(
          JSON.stringify({ error: 'Internal Server Error', requestId }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );

        this.finalizeRequest(requestId, response, { errorCode });
        return response;
      }
    };
  }

  /**
   * Cleanup expired contexts (run periodically)
   */
  static cleanup(): number {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    let cleaned = 0;

    for (const [requestId, context] of requestContexts.entries()) {
      if (now - context.startTime > maxAge) {
        requestContexts.delete(requestId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(
        'context_cleanup',
        {
          requestId: 'system',
          cleaned,
        },
        `Cleaned up ${cleaned} expired request contexts`
      );
    }

    return cleaned;
  }

  /**
   * Get system metrics
   */
  static getMetrics(): {
    activeRequests: number;
    averageResponseTime: number;
    oldestRequestAge: number;
  } {
    const now = Date.now();
    const contexts = Array.from(requestContexts.values());

    const responseTimes = contexts.map((c) => c.timer.getElapsed());
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const oldestRequestAge =
      contexts.length > 0
        ? Math.max(...contexts.map((c) => now - c.startTime))
        : 0;

    return {
      activeRequests: contexts.length,
      averageResponseTime,
      oldestRequestAge,
    };
  }
}

// Helper function to add performance metrics to response
export function addPerformanceMetrics(
  response: NextResponse,
  metrics: {
    cacheHit?: boolean;
    dbQueries?: number;
    dbQueryTime?: number;
    storageOps?: number;
    storageOpTime?: number;
    bytes?: number;
  }
): NextResponse {
  response.headers.set('X-Performance-Metrics', JSON.stringify(metrics));
  return response;
}

// Clean up expired contexts every 5 minutes
if (typeof global !== 'undefined') {
  setInterval(
    () => {
      RequestLoggerMiddleware.cleanup();
    },
    5 * 60 * 1000
  );
}

// Export for use in API routes
export { requestContexts };
