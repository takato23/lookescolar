/**
 * Structured Logging System for LookEscolar
 * Implements CLAUDE.md requirements:
 * - Request ID tracking across all operations
 * - Token masking and sensitive data protection
 * - Performance metrics logging
 * - Error tracking with context
 * - Never logs sensitive information
 */

import pino from 'pino';
import { nanoid } from 'nanoid';

interface LogContext {
  requestId?: string;
  eventId?: string;
  userId?: string;
  token?: string; // Will be automatically masked
  photoId?: string;
  orderId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  duration?: number; // Response time in ms
  statusCode?: number;
  bytes?: number; // Bytes transferred
  cacheHit?: boolean;
  errorCode?: string;
  errorContext?: Record<string, any>;
  businessMetric?: {
    type:
      | 'photo_upload'
      | 'photo_view'
      | 'photo_assign'
      | 'order_created'
      | 'payment_processed'
      | 'qr_scan';
    value: number;
    unit: string;
  };
  performance?: {
    dbQueryTime?: number;
    storageOpTime?: number;
    watermarkTime?: number;
    totalTime?: number;
  };
  pageType?: 'admin' | 'family' | 'public';
  security?: {
    rateLimitHit?: boolean;
    authFailure?: boolean;
    suspiciousActivity?: boolean;
  };
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

class Logger {
  private pino: pino.Logger;
  private static instance: Logger;

  constructor() {
    // Temporalmente usar solo console.log para evitar problemas de worker threads
    if (process.env.NODE_ENV === 'development') {
      // En desarrollo usar console.log directo para evitar problemas
      this.pino = null as any;
    } else {
      // Production-ready logger configuration (sin transports problemáticos)
      this.pino = pino({
        level: process.env['LOG_LEVEL'] || 'info',
        formatters: {
          level: (label) => {
            return { level: label };
          },
          log: (object) => {
            // Mask sensitive data before logging
            return this.maskSensitiveData(object);
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        serializers: {
          req: pino.stdSerializers.req,
          res: pino.stdSerializers.res,
          err: pino.stdSerializers.err,
        },
      });
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Mask sensitive data according to CLAUDE.md requirements
   */
  private maskSensitiveData(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const masked = { ...obj };

    // Mask tokens - show only first 4 chars + "***"
    if (masked.token && typeof masked.token === 'string') {
      masked.token = `tok_${masked.token.substring(0, 4)}***`;
    }

    // Mask signed URLs - show only the path structure
    if (masked.signedUrl && typeof masked.signedUrl === 'string') {
      try {
        const url = new URL(masked.signedUrl);
        masked.signedUrl = `${url.origin}${url.pathname.substring(0, 20)}/**masked**`;
      } catch {
        masked.signedUrl = '/**masked**';
      }
    }

    // Mask other sensitive fields
    const sensitiveFields = [
      'password',
      'secret',
      'key',
      'authorization',
      'cookie',
    ];
    sensitiveFields.forEach((field) => {
      if (masked[field]) {
        masked[field] = '***masked***';
      }
    });

    // Recursively mask nested objects
    Object.keys(masked).forEach((key) => {
      if (
        masked[key] &&
        typeof masked[key] === 'object' &&
        !Array.isArray(masked[key])
      ) {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    });

    return masked;
  }

  /**
   * Generate unique request ID for tracking
   */
  static generateRequestId(): string {
    return `req_${nanoid(12)}`;
  }

  /**
   * Log with context and automatic masking
   */
  private log(
    level: LogLevel,
    event: string,
    context: LogContext = {},
    message?: string
  ) {
    const logEntry = {
      event,
      requestId: context.requestId || 'unknown',
      timestamp: new Date().toISOString(),
      ...(message && { message }),
      ...context,
    };

    // En desarrollo o si pino no está disponible, usar console.log
    if (!this.pino || process.env.NODE_ENV === 'development') {
      console.log(
        `[${level.toUpperCase()}]`,
        event,
        this.maskSensitiveData(logEntry)
      );
      return;
    }

    // En producción usar pino de forma segura
    try {
      if (typeof this.pino[level] === 'function') {
        this.pino[level](logEntry);
      } else {
        console.log(
          `[${level.toUpperCase()}]`,
          event,
          this.maskSensitiveData(logEntry)
        );
      }
    } catch (error) {
      // Fallback a console.log si pino falla
      console.log(
        `[${level.toUpperCase()}]`,
        event,
        this.maskSensitiveData(logEntry)
      );
    }
  }

  // Convenience methods
  debug(event: string, context?: LogContext, message?: string) {
    this.log('debug', event, context, message);
  }

  info(event: string, context?: LogContext, message?: string) {
    this.log('info', event, context, message);
  }

  warn(event: string, context?: LogContext, message?: string) {
    this.log('warn', event, context, message);
  }

  error(event: string, context?: LogContext, message?: string) {
    this.log('error', event, context, message);
  }

  fatal(event: string, context?: LogContext, message?: string) {
    this.log('fatal', event, context, message);
  }

  // Business-specific logging methods

  /**
   * Log API request/response with performance metrics
   */
  apiRequest(context: {
    requestId: string;
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    ip?: string;
    userAgent?: string;
    userId?: string;
    token?: string;
    bytes?: number;
    cacheHit?: boolean;
  }) {
    this.info(
      'api_request',
      {
        ...context,
        performance: {
          totalTime: context.duration,
        },
      },
      `${context.method} ${context.path} - ${context.statusCode} (${context.duration}ms)`
    );
  }

  /**
   * Log photo operations with performance metrics
   */
  photoOperation(
    event: 'photo_upload' | 'photo_view' | 'photo_assign',
    context: {
      requestId: string;
      photoId?: string;
      filename?: string;
      duration?: number;
      bytes?: number;
      eventId?: string;
      userId?: string;
      performance?: {
        watermarkTime?: number;
        storageOpTime?: number;
        dbQueryTime?: number;
      };
    }
  ) {
    this.info(event, {
      ...context,
      businessMetric: {
        type: event,
        value: context.bytes || 1,
        unit: context.bytes ? 'bytes' : 'count',
      },
    });
  }

  /**
   * Log authentication events
   */
  authEvent(
    event:
      | 'auth_success'
      | 'auth_failure'
      | 'token_generated'
      | 'token_expired',
    context: {
      requestId: string;
      ip?: string;
      userAgent?: string;
      userId?: string;
      token?: string;
      reason?: string;
      security?: {
        rateLimitHit?: boolean;
        suspiciousActivity?: boolean;
      };
    }
  ) {
    const level = event === 'auth_failure' ? 'warn' : 'info';
    this[level](event, context);
  }

  /**
   * Log payment events
   */
  paymentEvent(
    event: 'payment_initiated' | 'payment_processed' | 'payment_failed',
    context: {
      requestId: string;
      orderId: string;
      amount?: number;
      currency?: string;
      paymentId?: string;
      token?: string;
      errorCode?: string;
    }
  ) {
    const level = event === 'payment_failed' ? 'error' : 'info';
    this[level](event, {
      ...context,
      businessMetric: {
        type: 'payment_processed',
        value: context.amount || 0,
        unit: context.currency || 'ARS',
      },
    });
  }

  /**
   * Log security events
   */
  securityEvent(
    event:
      | 'rate_limit_exceeded'
      | 'suspicious_activity'
      | 'unauthorized_access',
    context: {
      requestId: string;
      ip?: string;
      path?: string;
      userAgent?: string;
      token?: string;
      details?: Record<string, any>;
    }
  ) {
    this.warn(event, {
      ...context,
      security: {
        suspiciousActivity: true,
      },
    });
  }

  /**
   * Log performance metrics
   */
  performanceMetric(
    metric:
      | 'api_response_time'
      | 'db_query_time'
      | 'storage_operation'
      | 'watermark_process',
    context: {
      requestId: string;
      duration: number;
      path?: string;
      operation?: string;
      cacheHit?: boolean;
      bytes?: number;
    }
  ) {
    this.debug(`performance_${metric}`, {
      ...context,
      performance: {
        totalTime: context.duration,
      },
    });
  }

  /**
   * Log bandwidth/egress metrics
   */
  egressMetric(context: {
    requestId: string;
    eventId?: string;
    bytes: number;
    operation: 'photo_view' | 'photo_download' | 'qr_pdf' | 'export';
    cacheHit?: boolean;
    ip?: string;
  }) {
    this.info('egress_metric', {
      ...context,
      businessMetric: {
        type: 'photo_view',
        value: context.bytes,
        unit: 'bytes',
      },
    });
  }

  /**
   * Log error with full context and stack trace
   */
  logError(
    error: Error,
    context: {
      requestId: string;
      operation?: string;
      path?: string;
      userId?: string;
      token?: string;
      errorContext?: Record<string, any>;
    }
  ) {
    this.error(
      'application_error',
      {
        ...context,
        errorCode: error.name,
        errorContext: {
          message: error.message,
          stack: error.stack,
          ...context.errorContext,
        },
      },
      error.message
    );
  }

  /**
   * Create child logger with persistent context
   */
  child(context: Partial<LogContext>): Logger {
    const childLogger = new Logger();
    const originalLog = childLogger.log.bind(childLogger);

    childLogger.log = (
      level: LogLevel,
      event: string,
      additionalContext: LogContext = {},
      message?: string
    ) => {
      return originalLog(
        level,
        event,
        { ...context, ...additionalContext },
        message
      );
    };

    return childLogger;
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
export { Logger };

// Request ID utility for middleware
export function generateRequestId(): string {
  return Logger.generateRequestId();
}

// Helper to extract request context for logging
export function getRequestContext(req: any): Partial<LogContext> {
  return {
    ip:
      req.ip ||
      req.headers?.['x-forwarded-for'] ||
      req.connection?.remoteAddress,
    userAgent: req.headers?.['user-agent'],
    method: req.method,
    path: req.url || req.nextUrl?.pathname,
  };
}

// Helper for performance timing
export class PerformanceTimer {
  private startTime: number;
  private checkpoints: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  checkpoint(name: string): number {
    const now = Date.now();
    const elapsed = now - this.startTime;
    this.checkpoints.set(name, elapsed);
    return elapsed;
  }

  getElapsed(): number {
    return Date.now() - this.startTime;
  }

  getCheckpoints(): Record<string, number> {
    return Object.fromEntries(this.checkpoints);
  }

  static measure<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const timer = new PerformanceTimer();
    return fn().then((result) => ({
      result,
      duration: timer.getElapsed(),
    }));
  }
}
