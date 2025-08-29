import { NextRequest, NextResponse } from 'next/server';
import {
  orderSecurityService,
  type SecurityContext,
} from '@/lib/services/order-security.service';

export interface SecurityMiddlewareOptions {
  required_role?: ('admin' | 'moderator' | 'viewer')[];
  resource_type?: string;
  action?: string;
  rate_limit?: {
    max_requests: number;
    window_ms: number;
  };
  audit_log?: boolean;
  validate_input?: boolean;
}

export interface SecureRequest extends NextRequest {
  security?: SecurityContext;
}

/**
 * Security middleware for order management endpoints
 */
export function withOrderSecurity(
  handler: (request: SecureRequest) => Promise<NextResponse>,
  options: SecurityMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();

    try {
      // Create security context
      const securityContext =
        await orderSecurityService.createSecurityContext(request);

      if (!securityContext) {
        console.warn('[Security Middleware] Authentication failed');
        return NextResponse.json(
          {
            error: 'Authentication required',
            code: 'AUTH_REQUIRED',
            message:
              'Valid authentication token is required to access this resource',
          },
          { status: 401 }
        );
      }

      // Check rate limiting
      if (options.rate_limit) {
        const rateLimitKey = `${securityContext.ip_address}_${securityContext.user_id}`;
        const isWithinLimit = orderSecurityService.checkRateLimit(
          rateLimitKey,
          {
            max_requests: options.rate_limit.max_requests,
            window_ms: options.rate_limit.window_ms,
            identifier_key: 'ip',
          }
        );

        if (!isWithinLimit) {
          console.warn('[Security Middleware] Rate limit exceeded', {
            user_id: securityContext.user_id,
            ip: securityContext.ip_address,
          });

          // Log security event
          await orderSecurityService.logAuditEvent(
            securityContext,
            'rate_limit_exceeded',
            'order',
            'rate_limit',
            undefined,
            undefined,
            {
              limit: options.rate_limit.max_requests,
              window: options.rate_limit.window_ms,
            }
          );

          return NextResponse.json(
            {
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please try again later.',
              retry_after: Math.ceil(options.rate_limit.window_ms / 1000),
            },
            {
              status: 429,
              headers: {
                'Retry-After': Math.ceil(
                  options.rate_limit.window_ms / 1000
                ).toString(),
                'X-RateLimit-Limit': options.rate_limit.max_requests.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': (
                  Date.now() + options.rate_limit.window_ms
                ).toString(),
              },
            }
          );
        }
      }

      // Check role-based permissions
      if (options.required_role) {
        if (!options.required_role.includes(securityContext.user_role)) {
          console.warn('[Security Middleware] Insufficient permissions', {
            user_id: securityContext.user_id,
            user_role: securityContext.user_role,
            required_roles: options.required_role,
          });

          // Log security event
          await orderSecurityService.logAuditEvent(
            securityContext,
            'permission_denied',
            'order',
            'access_control',
            undefined,
            undefined,
            {
              required_role: options.required_role,
              user_role: securityContext.user_role,
            }
          );

          return NextResponse.json(
            {
              error: 'Insufficient permissions',
              code: 'PERMISSION_DENIED',
              message: 'You do not have permission to access this resource',
            },
            { status: 403 }
          );
        }
      }

      // Check resource-specific permissions
      if (options.resource_type && options.action) {
        const hasPermission = await orderSecurityService.checkPermission(
          securityContext,
          options.action,
          options.resource_type
        );

        if (!hasPermission) {
          console.warn('[Security Middleware] Resource permission denied', {
            user_id: securityContext.user_id,
            resource_type: options.resource_type,
            action: options.action,
          });

          // Log security event
          await orderSecurityService.logAuditEvent(
            securityContext,
            'resource_permission_denied',
            'order',
            'access_control',
            undefined,
            undefined,
            { resource_type: options.resource_type, action: options.action }
          );

          return NextResponse.json(
            {
              error: 'Resource access denied',
              code: 'RESOURCE_ACCESS_DENIED',
              message: `You do not have permission to ${options.action} ${options.resource_type} resources`,
            },
            { status: 403 }
          );
        }
      }

      // Check for suspicious activity
      const isSuspicious = orderSecurityService.detectSuspiciousActivity(
        securityContext,
        options.action || 'unknown'
      );

      if (isSuspicious) {
        console.warn('[Security Middleware] Suspicious activity detected', {
          user_id: securityContext.user_id,
          ip: securityContext.ip_address,
          action: options.action,
        });

        // Log security event but don't block (adjust based on security policy)
        await orderSecurityService.logAuditEvent(
          securityContext,
          'suspicious_activity_detected',
          'order',
          'security_alert',
          undefined,
          undefined,
          {
            action: options.action,
            detection_reason: 'pattern_analysis',
            risk_level: 'medium',
          }
        );

        // Could choose to block here based on security policy
        // For now, we'll log and continue
      }

      // Attach security context to request
      const secureRequest = request as SecureRequest;
      secureRequest.security = securityContext;

      // Execute the actual handler
      const response = await handler(secureRequest);

      // Log successful access if audit logging is enabled
      if (options.audit_log && options.action) {
        await orderSecurityService.logAuditEvent(
          securityContext,
          options.action,
          (options.resource_type as any) || 'order',
          'api_access',
          undefined,
          undefined,
          {
            method: request.method,
            url: request.url,
            status_code: response.status,
            duration_ms: Date.now() - startTime,
          }
        );
      }

      // Add security headers to response
      const secureResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          // Security headers
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          // Custom security metadata
          'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      });

      return secureResponse;
    } catch (error) {
      console.error('[Security Middleware] Unexpected error:', error);

      // Log the error for security analysis
      try {
        const secureRequest = request as SecureRequest;
        if (secureRequest.security) {
          await orderSecurityService.logAuditEvent(
            secureRequest.security,
            'middleware_error',
            'order',
            'system_error',
            undefined,
            undefined,
            {
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            }
          );
        }
      } catch (logError) {
        console.error('[Security Middleware] Failed to log error:', logError);
      }

      return NextResponse.json(
        {
          error: 'Internal security error',
          code: 'SECURITY_ERROR',
          message: 'A security error occurred while processing your request',
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Input validation middleware
 */
export function withInputValidation<T>(
  validator: (
    data: unknown
  ) => { success: true; data: T } | { success: false; errors: string[] }
) {
  return (
    handler: (request: SecureRequest, validatedData: T) => Promise<NextResponse>
  ) => {
    return async (request: SecureRequest): Promise<NextResponse> => {
      try {
        // Parse request body
        let requestData: unknown;

        if (request.method === 'GET') {
          // For GET requests, validate query parameters
          const url = new URL(request.url);
          requestData = Object.fromEntries(url.searchParams.entries());
        } else {
          // For other methods, validate request body
          try {
            requestData = await request.json();
          } catch {
            return NextResponse.json(
              {
                error: 'Invalid JSON',
                code: 'INVALID_JSON',
                message: 'Request body must be valid JSON',
              },
              { status: 400 }
            );
          }
        }

        // Validate data
        const validation = validator(requestData);

        if (!validation.success) {
          console.warn(
            '[Input Validation] Validation failed:',
            validation.errors
          );

          // Log validation failure
          if (request.security) {
            await orderSecurityService.logAuditEvent(
              request.security,
              'input_validation_failed',
              'order',
              'validation_error',
              undefined,
              undefined,
              {
                errors: validation.errors,
                raw_data: requestData,
              }
            );
          }

          return NextResponse.json(
            {
              error: 'Input validation failed',
              code: 'VALIDATION_ERROR',
              message: 'The provided data is invalid',
              details: validation.errors,
            },
            { status: 400 }
          );
        }

        // Call handler with validated data
        return handler(request, validation.data);
      } catch (error) {
        console.error('[Input Validation] Unexpected error:', error);
        return NextResponse.json(
          {
            error: 'Validation error',
            code: 'VALIDATION_ERROR',
            message: 'An error occurred while validating input',
          },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Audit logging middleware
 */
export function withAuditLogging(
  action: string,
  resourceType: 'order' | 'order_item' | 'payment' | 'export' | 'workflow'
) {
  return (handler: (request: SecureRequest) => Promise<NextResponse>) => {
    return async (request: SecureRequest): Promise<NextResponse> => {
      const startTime = Date.now();

      try {
        const response = await handler(request);

        // Log successful operation
        if (request.security) {
          await orderSecurityService.logAuditEvent(
            request.security,
            action,
            resourceType,
            'api_operation',
            undefined,
            undefined,
            {
              method: request.method,
              url: request.url,
              status_code: response.status,
              duration_ms: Date.now() - startTime,
              success: response.status < 400,
            }
          );
        }

        return response;
      } catch (error) {
        // Log failed operation
        if (request.security) {
          await orderSecurityService.logAuditEvent(
            request.security,
            `${action}_failed`,
            resourceType,
            'api_operation',
            undefined,
            undefined,
            {
              method: request.method,
              url: request.url,
              error: error instanceof Error ? error.message : 'Unknown error',
              duration_ms: Date.now() - startTime,
              success: false,
            }
          );
        }

        throw error;
      }
    };
  };
}

/**
 * Common middleware combinations
 */
export const OrderMiddleware = {
  // Admin-only operations
  adminOnly: (options: Omit<SecurityMiddlewareOptions, 'required_role'> = {}) =>
    withOrderSecurity(async () => NextResponse.next(), {
      ...options,
      required_role: ['admin'],
      audit_log: true,
    }),

  // Moderator and admin operations
  moderatorAccess: (
    options: Omit<SecurityMiddlewareOptions, 'required_role'> = {}
  ) =>
    withOrderSecurity(async () => NextResponse.next(), {
      ...options,
      required_role: ['admin', 'moderator'],
      audit_log: true,
    }),

  // Read-only access
  readAccess: (
    options: Omit<SecurityMiddlewareOptions, 'required_role'> = {}
  ) =>
    withOrderSecurity(async () => NextResponse.next(), {
      ...options,
      required_role: ['admin', 'moderator', 'viewer'],
      audit_log: false,
    }),

  // High-frequency endpoints with rate limiting
  rateLimited: (maxRequests: number = 100, windowMs: number = 60000) =>
    withOrderSecurity(async () => NextResponse.next(), {
      rate_limit: { max_requests: maxRequests, window_ms: windowMs },
    }),
};
