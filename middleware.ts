import { NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { logger } from '@/lib/utils/logger';

// Configuración de origins permitidos
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  'https://lookescolar.com',
  'https://www.lookescolar.com',
  'https://admin.lookescolar.com',
];

// Configuración CSP según CLAUDE.md - TEMPORALMENTE DESHABILITADO PARA DESARROLLO
// const CSP_HEADER = `
//   default-src 'self';
//   script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.mercadopago.com;
//   style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
//   img-src 'self' blob: data: https://*.supabase.co;
//   font-src 'self' https://fonts.gstatic.com;
//   connect-src 'self' https://*.supabase.co https://api.mercadopago.com;
//   frame-src 'self' https://mercadopago.com https://*.mercadopago.com;
//   object-src 'none';
//   base-uri 'self';
//   form-action 'self';
//   frame-ancestors 'none';
//   block-all-mixed-content;
//   upgrade-insecure-requests;
// `.replace(/\s{2,}/g, ' ').trim();
const CSP_HEADER = null; // Temporalmente deshabilitado

// Rutas que requieren anti-hotlinking estricto
const PROTECTED_PATHS = [
  '/api/storage/signed-url',
  '/api/family/gallery',
  '/api/admin/photos',
  '/api/admin/quick-setup',
];

// IPs confiables (puedes agregar tu IP de desarrollo aquí)
const TRUSTED_IPS = [
  '127.0.0.1',
  '::1',
  // Agregar IPs de desarrollo/admin si es necesario
];

/**
 * Global middleware for security, performance, and logging.
 * Applies to matched routes: API, admin, family portals.
 * @param {NextRequest} request - Incoming request
 * @returns {Promise<NextResponse>} Processed response or redirect
 */
export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  // Agregar request ID a headers para tracking
  const response = NextResponse.next();
  response.headers.set('X-Request-ID', requestId);
  
  try {
    const url = request.nextUrl.clone();
    const pathname = url.pathname;
    const method = request.method;
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer');
    const clientIP = getClientIP(request);

    // Log request básico
    logger.info('Request received', {
      requestId,
      method,
      pathname,
      userAgent: maskUserAgent(userAgent),
      clientIP: maskIP(clientIP),
      referer: referer ? maskUrl(referer) : null,
    });

    // 1. HTTPS Enforcement en producción
    if (process.env.NODE_ENV === 'production' && !request.headers.get('x-forwarded-proto')?.includes('https')) {
      const redirectUrl = url.clone();
      redirectUrl.protocol = 'https:';
      
      logger.warn('HTTP request redirected to HTTPS', {
        requestId,
        originalUrl: url.href,
        redirectUrl: redirectUrl.href,
      });
      
      return NextResponse.redirect(redirectUrl, 301);
    }

    // 2. CORS Headers
    const corsHeaders = getCorsHeaders(request, referer);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // 3. Security Headers
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // 4. Anti-hotlinking para rutas protegidas
    if (PROTECTED_PATHS.some(path => pathname.startsWith(path))) {
      const antiHotlinkResult = validateAntiHotlinking(request, referer, clientIP);
      
      if (!antiHotlinkResult.allowed) {
        logger.warn('Anti-hotlinking blocked request', {
          requestId,
          pathname,
          reason: antiHotlinkResult.reason,
          referer: referer ? maskUrl(referer) : null,
          clientIP: maskIP(clientIP),
        });
        
        return new NextResponse('Forbidden', {
          status: 403,
          headers: {
            'X-Request-ID': requestId,
            'X-Block-Reason': antiHotlinkResult.reason,
          },
        });
      }
    }

    // 5. Rate Limiting
    if (pathname.startsWith('/api/')) {
      const rateLimitResult = await rateLimitMiddleware(request, requestId);
      
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded', {
          requestId,
          pathname,
          clientIP: maskIP(clientIP),
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
        });
        
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'X-Request-ID': requestId,
            'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '0',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '0',
            'Retry-After': Math.ceil(((rateLimitResult.resetTime || Date.now()) - Date.now()) / 1000).toString(),
          },
        });
      }
      
      // Agregar headers de rate limit a respuestas exitosas
      if (rateLimitResult.limit) {
        response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
        response.headers.set('X-RateLimit-Remaining', (rateLimitResult.remaining || 0).toString());
        response.headers.set('X-RateLimit-Reset', (rateLimitResult.resetTime || 0).toString());
      }
    }

    // 6. Validación de User-Agent para bots maliciosos
    if (isBlockedUserAgent(userAgent)) {
      logger.warn('Blocked user agent', {
        requestId,
        userAgent: maskUserAgent(userAgent),
        clientIP: maskIP(clientIP),
      });
      
      return new NextResponse('Forbidden', {
        status: 403,
        headers: {
          'X-Request-ID': requestId,
          'X-Block-Reason': 'blocked-user-agent',
        },
      });
    }

    // Log exitoso
    const duration = Date.now() - startTime;
    logger.info('Request processed successfully', {
      requestId,
      pathname,
      method,
      duration,
      status: 'allowed',
    });

    return response;

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Middleware error', {
      requestId,
      pathname: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    // En caso de error del middleware, permitir que pase la request
    // pero con headers de seguridad básicos
    const errorResponse = NextResponse.next();
    errorResponse.headers.set('X-Request-ID', requestId);
    errorResponse.headers.set('X-Content-Type-Options', 'nosniff');
    errorResponse.headers.set('X-Frame-Options', 'DENY');
    errorResponse.headers.set('X-XSS-Protection', '1; mode=block');
    
    return errorResponse;
  }
}

/**
 * Gets the real client IP considering proxies and CDNs.
 * @param {NextRequest} request - Incoming request
 * @returns {string} Client IP or 'unknown'
 */
function getClientIP(request: NextRequest): string {
  // Headers comunes de proxies/CDNs
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const connectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (forwardedFor) {
    // x-forwarded-for puede ser una lista separada por comas
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (connectingIP) {
    return connectingIP;
  }
  
  // Fallback a IP de Next.js
  return request.ip || 'unknown';
}

/**
 * Generates CORS headers based on origin.
 * @param {NextRequest} request - Incoming request
 * @param {string|null} referer - Referer header
 * @returns {Record<string, string>} CORS headers
 */
function getCorsHeaders(request: NextRequest, referer?: string | null): Record<string, string> {
  const origin = request.headers.get('origin');
  const isAllowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*', '[^.]*');
      const regex = new RegExp(`^${pattern}$`, 'i');
      return regex.test(origin);
    }
    return origin === allowed;
  });
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Request-ID',
    'Access-Control-Max-Age': '86400', // 24 horas
  };
  
  if (isAllowedOrigin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = 'null';
  }
  
  return headers;
}

/**
 * Generates security headers.
 * @returns {Record<string, string>} Security headers
 */
function getSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    // Otros headers de seguridad
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    
    // HSTS en producción
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }),
  };
  
  // CSP - Solo agregar si está definido (temporalmente deshabilitado)
  if (CSP_HEADER) {
    headers['Content-Security-Policy'] = CSP_HEADER;
  }
  
  return headers;
}

/**
 * Validates anti-hotlinking for protected routes.
 * @param {NextRequest} request - Incoming request
 * @param {string|null} referer - Referer header
 * @param {string} [clientIP] - Client IP
 * @returns {{allowed: boolean; reason?: string}} Validation result
 */
function validateAntiHotlinking(
  request: NextRequest, 
  referer?: string | null, 
  clientIP?: string
): { allowed: boolean; reason?: string } {
  // Permitir IPs confiables sin referer check y relajar protección en desarrollo
  const isLocal = clientIP && TRUSTED_IPS.includes(clientIP);
  if (isLocal || process.env.NODE_ENV !== 'production') {
    return { allowed: true };
  }
  
  // Permitir requests directos (sin referer) solo para GET
  if (!referer) {
    if (request.method === 'GET') {
      return { allowed: true };
    }
    return { allowed: false, reason: 'no-referer-non-get' };
  }
  
  try {
    const refererUrl = new URL(referer);
    
    // Verificar si el referer está en la lista de permitidos
    const isAllowed = ALLOWED_ORIGINS.some(origin => {
      if (origin.includes('*')) {
        const pattern = origin.replace('*', '[^.]*');
        const regex = new RegExp(`^https?://${pattern}$`, 'i');
        return regex.test(`${refererUrl.protocol}//${refererUrl.hostname}`);
      }
      
      const originUrl = new URL(origin);
      return refererUrl.hostname === originUrl.hostname;
    });
    
    if (!isAllowed) {
      return { allowed: false, reason: 'invalid-referer' };
    }
    
    return { allowed: true };
    
  } catch {
    return { allowed: false, reason: 'malformed-referer' };
  }
}

/**
 * Checks if User-Agent is blocked (malicious bots).
 * Allows known good bots like Googlebot.
 * @param {string} userAgent - User-Agent header
 * @returns {boolean} True if blocked
 */
function isBlockedUserAgent(userAgent: string): boolean {
  const blockedPatterns = [
    /bot.*bot/i, // Bots maliciosos
    /crawler/i,
    /scraper/i,
    /spider/i,
    /wget/i,
    /curl/i,
    /^$/,  // User-Agent vacío
  ];
  
  // Permitir bots legítimos conocidos
  const allowedBots = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i, // Yahoo
    /duckduckbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
  ];
  
  // Si es un bot permitido, no bloquear
  if (allowedBots.some(pattern => pattern.test(userAgent))) {
    return false;
  }
  
  // Bloquear si coincide con patrones maliciosos
  return blockedPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Masks IP for secure logging (IPv4/IPv6).
 * @param {string} [ip] - IP address
 * @returns {string} Masked IP
 */
function maskIP(ip?: string): string {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }
  
  if (ip.includes(':')) {
    // IPv6 - mostrar solo primeros 4 grupos
    const parts = ip.split(':');
    return `${parts[0]}:${parts[1]}:***:***`;
  } else {
    // IPv4 - mostrar solo primeros 2 octetos
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***.`;
    }
    return '***.***.***.**';
  }
}

/**
 * Masks User-Agent for secure logging.
 * @param {string} ua - User-Agent string
 * @returns {string} Masked User-Agent
 */
function maskUserAgent(ua: string): string {
  if (ua.length <= 20) {
    return ua.substring(0, 5) + '***';
  }
  
  return ua.substring(0, 10) + '***' + ua.substring(ua.length - 5);
}

/**
 * Masks URL for secure logging.
 * @param {string} url - URL to mask
 * @returns {string} Masked URL
 */
function maskUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}/*masked*`;
  } catch {
    return '*masked*';
  }
}

// Configuración de rutas donde aplicar el middleware
export const config = {
  matcher: [
    // Aplicar a todas las rutas de API
    '/api/:path*',
    
    // Aplicar a rutas específicas de la app (pero NO a estáticos de Next)
    '/admin/:path*',
    '/f/:path*',
    
    // Excluir explícitamente archivos estáticos y assets de Next
    // Importante: evitar interceptar `/_next/*` para no romper CSS/JS
    '/((?!_next/|_next/static|_next/image|favicon.ico|\.well-known|robots\.txt|sitemap\.xml).*)',
  ],
};