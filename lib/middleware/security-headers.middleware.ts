/**
 * Security Headers Middleware
 * Implements comprehensive security headers for protection against common attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { SECURITY_CONFIG } from '@/lib/config/security.config';

export interface SecurityHeadersOptions {
  enableHSTS?: boolean;
  enableCSP?: boolean;
  customCSP?: string;
  enableFrameOptions?: boolean;
  enableContentTypeOptions?: boolean;
  enableXSSProtection?: boolean;
  enableReferrerPolicy?: boolean;
  enablePermissionsPolicy?: boolean;
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  options: SecurityHeadersOptions = {}
): NextResponse {
  const {
    enableHSTS = true,
    enableCSP = true,
    enableFrameOptions = true,
    enableContentTypeOptions = true,
    enableXSSProtection = true,
    enableReferrerPolicy = true,
    enablePermissionsPolicy = true,
    customCSP
  } = options;

  const isProduction = process.env.NODE_ENV === 'production';
  const isHTTPS = request.nextUrl.protocol === 'https:';

  // Content Security Policy
  if (enableCSP) {
    const csp = customCSP || generateCSPHeader(request);
    response.headers.set('Content-Security-Policy', csp);
  }

  // X-Frame-Options (Clickjacking protection)
  if (enableFrameOptions) {
    response.headers.set('X-Frame-Options', 'DENY');
  }

  // X-Content-Type-Options (MIME type sniffing protection)
  if (enableContentTypeOptions) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
  }

  // X-XSS-Protection (Legacy XSS protection)
  if (enableXSSProtection) {
    response.headers.set('X-XSS-Protection', '1; mode=block');
  }

  // Referrer Policy
  if (enableReferrerPolicy) {
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  // Permissions Policy (Feature Policy successor)
  if (enablePermissionsPolicy) {
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()'
    );
  }

  // Strict-Transport-Security (HSTS) - only in production with HTTPS
  if (enableHSTS && isProduction && isHTTPS) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Additional security headers
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Enhanced security headers for QR system
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-site');
  
  // Additional protection headers
  response.headers.set('X-Content-Security-Policy', 'default-src \'self\'');
  response.headers.set('Expect-CT', 'enforce, max-age=86400');
  
  // QR-specific security headers
  if (request.nextUrl.pathname.includes('/qr') || request.nextUrl.pathname.includes('/api/qr')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('X-QR-Security', 'enhanced');
  }

  // Remove potentially revealing headers
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');

  return response;
}

/**
 * Generate Content Security Policy header
 */
function generateCSPHeader(request: NextRequest): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const nonce = generateNonce();

  // Base CSP directives
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      ...(isProduction ? [] : ["'unsafe-eval'"]), // Allow unsafe-eval in development for Next.js
      `'nonce-${nonce}'`,
      'https://sdk.mercadopago.com',
      'https://www.mercadopago.com'
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for dynamic styles in React
      'https://fonts.googleapis.com'
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.supabase.co',
      'https://www.mercadopago.com',
      ...(isProduction ? [] : ['http://localhost:*'])
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com'
    ],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'https://api.mercadopago.com',
      ...(isProduction ? [] : [
        'ws://localhost:*',
        'http://localhost:*',
        'https://localhost:*'
      ])
    ],
    'frame-src': [
      'https://www.mercadopago.com',
      'https://mpago.li'
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': [
      "'self'",
      'https://www.mercadopago.com'
    ],
    'frame-ancestors': ["'none'"],
    'block-all-mixed-content': [],
    'upgrade-insecure-requests': isProduction ? [] : null
  };

  // Build CSP string
  const cspParts = Object.entries(directives)
    .filter(([_, values]) => values !== null)
    .map(([directive, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        return `${directive} ${values.join(' ')}`;
      } else if (!Array.isArray(values)) {
        return directive;
      }
      return '';
    })
    .filter(Boolean);

  return cspParts.join('; ');
}

/**
 * Generate random nonce for CSP
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto.getRandomValues
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Buffer.from(array).toString('base64');
}

/**
 * Middleware wrapper for automatic security headers
 */
export function withSecurityHeaders(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse> | NextResponse,
  options: SecurityHeadersOptions = {}
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    let response: NextResponse;

    try {
      response = await handler(request, ...args);
    } catch (error) {
      // Create error response
      response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return applySecurityHeaders(response, request, options);
  };
}

/**
 * Check if request needs CORS headers
 */
export function applyCORSHeaders(
  response: NextResponse,
  request: NextRequest,
  allowedOrigins: string[] = SECURITY_CONFIG.cors.origins
): NextResponse {
  const origin = request.headers.get('origin');
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Methods',
      SECURITY_CONFIG.cors.methods.join(', ')
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      SECURITY_CONFIG.cors.allowedHeaders.join(', ')
    );
  }

  return response;
}

/**
 * Validate and sanitize request headers
 */
export function validateRequestHeaders(request: NextRequest): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  
  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url'
  ];

  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header);
    if (value && !isAllowedHeaderValue(header, value)) {
      violations.push(`Suspicious ${header}: ${value}`);
    }
  }

  // Validate Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    if (contentType && !isAllowedContentType(contentType)) {
      violations.push(`Invalid content-type: ${contentType}`);
    }
  }

  // Check User-Agent
  const userAgent = request.headers.get('user-agent');
  if (userAgent && isSuspiciousUserAgent(userAgent)) {
    violations.push(`Suspicious user-agent: ${userAgent.substring(0, 50)}...`);
  }

  return {
    isValid: violations.length === 0,
    violations
  };
}

/**
 * Check if header value is allowed
 */
function isAllowedHeaderValue(header: string, value: string): boolean {
  switch (header) {
    case 'x-forwarded-host':
      // Only allow known hosts
      const allowedHosts = [
        'localhost',
        '127.0.0.1',
        process.env.NEXT_PUBLIC_SITE_URL,
        process.env.VERCEL_URL
      ].filter(Boolean);
      
      return allowedHosts.some(host => 
        value.includes(host!.replace(/https?:\/\//, ''))
      );
      
    default:
      return true;
  }
}

/**
 * Check if content type is allowed
 */
function isAllowedContentType(contentType: string): boolean {
  const allowedTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain'
  ];

  return allowedTypes.some(type => contentType.toLowerCase().includes(type));
}

/**
 * Check for suspicious user agents
 */
function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /scanner/i,
    /nikto/i,
    /sqlmap/i,
    /nmap/i
  ];

  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Complete security middleware that combines all protections
 */
export function securityMiddleware(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse> | NextResponse,
  options: SecurityHeadersOptions & { enableCORS?: boolean } = {}
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    // Validate request headers
    const headerValidation = validateRequestHeaders(request);
    if (!headerValidation.isValid) {
      console.warn('Security header violations:', headerValidation.violations);
      // In production, might want to block these requests
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Request validation failed' },
          { status: 400 }
        );
      }
    }

    // Execute handler
    let response: NextResponse;
    try {
      response = await handler(request, ...args);
    } catch (error) {
      response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // Apply security headers
    response = applySecurityHeaders(response, request, options);

    // Apply CORS if enabled
    if (options.enableCORS) {
      response = applyCORSHeaders(response, request);
    }

    return response;
  };
}