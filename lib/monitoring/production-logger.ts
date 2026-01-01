/**
 * Production-grade structured logger
 *
 * Features:
 * - Structured JSON logging for production
 * - Pretty printing in development
 * - Sensitive data redaction
 * - Request correlation via request ID
 * - Performance timing
 * - Error serialization
 */

import pino from 'pino';

// Sensitive fields to redact from logs
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'password',
  'token',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
  'sessionToken',
  '*.password',
  '*.token',
  '*.secret',
];

// Create base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Redact sensitive information
  redact: {
    paths: REDACTED_PATHS,
    censor: '[REDACTED]',
  },

  // Custom serializers for common objects
  serializers: {
    req: (req: any) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      headers: {
        host: req.headers?.host,
        'user-agent': req.headers?.['user-agent'],
        referer: req.headers?.referer,
        // Explicitly exclude authorization and cookies
      },
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort,
    }),

    res: (res: any) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders?.(),
    }),

    err: pino.stdSerializers.err,

    error: (err: Error) => ({
      type: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
      ...err,
    }),
  },

  // Base context for all logs
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown',
    env: process.env.NODE_ENV || 'development',
    service: 'lookescolar',
  },

  // Format timestamps
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
};

// Development-specific configuration
const devConfig: pino.LoggerOptions = {
  ...baseConfig,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
      singleLine: false,
      messageFormat: '{levelLabel} - {msg}',
    },
  },
};

// Production configuration (JSON output)
const prodConfig: pino.LoggerOptions = {
  ...baseConfig,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
};

// Create logger instance
export const logger = pino(
  process.env.NODE_ENV === 'production' ? prodConfig : devConfig
);

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Log HTTP request with timing
 */
export function logRequest(
  requestId: string,
  method: string,
  path: string,
  additionalContext?: Record<string, any>
) {
  logger.info({
    requestId,
    method,
    path,
    ...additionalContext,
  }, 'Incoming request');
}

/**
 * Log HTTP response with timing
 */
export function logResponse(
  requestId: string,
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  additionalContext?: Record<string, any>
) {
  const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  logger[logLevel]({
    requestId,
    method,
    path,
    statusCode,
    duration,
    ...additionalContext,
  }, `Request completed [${statusCode}] in ${duration}ms`);
}

/**
 * Log error with context
 */
export function logError(
  message: string,
  error: Error | unknown,
  context?: Record<string, any>
) {
  logger.error({
    error: error instanceof Error ? error : new Error(String(error)),
    ...context,
  }, message);
}

/**
 * Log security event
 */
export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details?: Record<string, any>
) {
  logger.warn({
    securityEvent: event,
    severity,
    ...details,
  }, `Security event: ${event}`);
}

/**
 * Log performance metric
 */
export function logPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, any>
) {
  logger.info({
    performance: {
      operation,
      duration,
      ...metadata,
    },
  }, `Performance: ${operation} completed in ${duration}ms`);
}

/**
 * Log database query
 */
export function logDatabaseQuery(
  query: string,
  duration: number,
  rowCount?: number,
  error?: Error
) {
  if (error) {
    logger.error({
      database: {
        query: query.substring(0, 200), // Truncate long queries
        duration,
        error: error.message,
      },
    }, 'Database query failed');
  } else {
    logger.debug({
      database: {
        query: query.substring(0, 200),
        duration,
        rowCount,
      },
    }, 'Database query executed');
  }
}

/**
 * Log external API call
 */
export function logExternalApiCall(
  service: string,
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  error?: Error
) {
  if (error) {
    logger.error({
      externalApi: {
        service,
        endpoint,
        method,
        duration,
        error: error.message,
      },
    }, `External API call to ${service} failed`);
  } else {
    logger.info({
      externalApi: {
        service,
        endpoint,
        method,
        statusCode,
        duration,
      },
    }, `External API call to ${service} completed [${statusCode}]`);
  }
}

/**
 * Log user action for audit trail
 */
export function logUserAction(
  userId: string,
  action: string,
  resource: string,
  result: 'success' | 'failure',
  details?: Record<string, any>
) {
  logger.info({
    audit: {
      userId,
      action,
      resource,
      result,
      ...details,
    },
  }, `User action: ${action} on ${resource} - ${result}`);
}

/**
 * Mask sensitive data in logs
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars) {
    return '***';
  }
  return `${data.substring(0, visibleChars)}${'*'.repeat(data.length - visibleChars)}`;
}

/**
 * Mask email for logging
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '***@***.***';
  }
  const [username, domain] = email.split('@');
  const maskedUsername = username.length > 2
    ? `${username[0]}***${username[username.length - 1]}`
    : '***';
  return `${maskedUsername}@${domain}`;
}

/**
 * Mask IP address for logging
 */
export function maskIP(ip: string): string {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }

  if (ip.includes(':')) {
    // IPv6 - show only first 4 groups
    const parts = ip.split(':');
    return `${parts[0]}:${parts[1]}:***:***`;
  } else {
    // IPv4 - show only first 2 octets
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***.`;
    }
    return '***.***.***.**';
  }
}

// Export logger as default
export default logger;
