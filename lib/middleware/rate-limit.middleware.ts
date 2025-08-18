import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// Configuración de límites por endpoint según CLAUDE.md
const RATE_LIMITS = {
  '/api/admin/photos/upload': { requests: 10, windowMs: 60 * 1000 }, // 10 req/min
  '/api/storage/signed-url': { requests: 60, windowMs: 60 * 1000 }, // 60 req/min
  '/api/family/gallery': { requests: 30, windowMs: 60 * 1000 }, // 30 req/min
  '/api/payments/webhook': { requests: 100, windowMs: 60 * 1000 }, // 100 req/min
  '/api/admin/tagging': { requests: 20, windowMs: 60 * 1000 }, // 20 req/min
  '/api/admin/qr/decode': { requests: 30, windowMs: 60 * 1000 }, // 30 req/min for QR operations
  '/api/admin/students': { requests: 60, windowMs: 60 * 1000 }, // 60 req/min for student lookups
  '/api/family/orders': { requests: 15, windowMs: 60 * 1000 }, // 15 req/min
  default: { requests: 100, windowMs: 60 * 1000 }, // Default: 100 req/min
} as const;

// IPs confiables que bypassean rate limiting
const TRUSTED_IPS = [
  '127.0.0.1',
  '::1',
  // Agregar IPs de desarrollo/admin aquí si es necesario
];

// Store en memoria (en producción usar Redis/Upstash)
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// Store separado por IP y por token
const ipStore = new Map<string, RateLimitEntry>();
const tokenStore = new Map<string, RateLimitEntry>();

// Métricas globales
interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  lastReset: number;
}

const metrics: RateLimitMetrics = {
  totalRequests: 0,
  blockedRequests: 0,
  lastReset: Date.now(),
};

export interface RateLimitResult {
  allowed: boolean;
  limit?: number;
  remaining?: number;
  resetTime?: number;
  retryAfter?: number;
}

/**
 * Middleware principal de rate limiting
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  requestId: string
): Promise<RateLimitResult> {
  try {
    const pathname = request.nextUrl.pathname;
    const clientIP = getClientIP(request);
    const token = extractToken(request);

    // Incrementar métrica global
    metrics.totalRequests++;

    // Bypass para IPs confiables
    if (TRUSTED_IPS.includes(clientIP)) {
      logger.debug('Rate limit bypassed for trusted IP', {
        requestId,
        clientIP: maskIP(clientIP),
        pathname,
      });
      return { allowed: true };
    }

    // Obtener configuración de límite para la ruta
    const limitConfig = getRateLimitConfig(pathname);

    // Rate limiting por IP
    const ipResult = await checkRateLimit(
      clientIP,
      limitConfig,
      ipStore,
      'ip',
      requestId
    );

    if (!ipResult.allowed) {
      metrics.blockedRequests++;
      return ipResult;
    }

    // Rate limiting adicional por token si existe
    if (token) {
      const tokenResult = await checkRateLimit(
        token,
        limitConfig,
        tokenStore,
        'token',
        requestId
      );

      if (!tokenResult.allowed) {
        metrics.blockedRequests++;
        return tokenResult;
      }

      // Retornar el más restrictivo
      return {
        allowed: true,
        limit: limitConfig.requests,
        remaining: Math.min(
          ipResult.remaining || 0,
          tokenResult.remaining || 0
        ),
        resetTime: Math.max(
          ipResult.resetTime || 0,
          tokenResult.resetTime || 0
        ),
      };
    }

    return ipResult;
  } catch (error) {
    logger.error('Rate limit middleware error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // En caso de error, permitir la request
    return { allowed: true };
  }
}

/**
 * Verifica rate limit para una clave específica
 */
async function checkRateLimit(
  key: string,
  config: { requests: number; windowMs: number },
  store: Map<string, RateLimitEntry>,
  type: 'ip' | 'token',
  requestId: string
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Obtener o crear entrada
  let entry = store.get(key);

  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
      firstRequest: now,
    };
    store.set(key, entry);
  }

  // Reset ventana si ha expirado
  if (now >= entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + config.windowMs;
    entry.firstRequest = now;
  }

  // Incrementar contador
  entry.count++;

  const remaining = Math.max(0, config.requests - entry.count);
  const allowed = entry.count <= config.requests;

  if (!allowed) {
    logger.warn('Rate limit exceeded', {
      requestId,
      type,
      key: type === 'ip' ? maskIP(key) : `tok_${key.substring(0, 3)}***`,
      count: entry.count,
      limit: config.requests,
      resetTime: entry.resetTime,
    });
  }

  return {
    allowed,
    limit: config.requests,
    remaining,
    resetTime: entry.resetTime,
    retryAfter: allowed ? 0 : Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Obtiene configuración de rate limit para una ruta
 */
function getRateLimitConfig(pathname: string): {
  requests: number;
  windowMs: number;
} {
  // Buscar configuración exacta
  if (pathname in RATE_LIMITS) {
    return RATE_LIMITS[pathname as keyof typeof RATE_LIMITS];
  }

  // Buscar por prefijo (para rutas dinámicas)
  for (const [route, config] of Object.entries(RATE_LIMITS)) {
    if (route !== 'default' && pathname.startsWith(route)) {
      return config;
    }
  }

  return RATE_LIMITS.default;
}

/**
 * Extrae IP del cliente considerando proxies
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const connectingIP = request.headers.get('cf-connecting-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (connectingIP) {
    return connectingIP;
  }

  return request.ip || 'unknown';
}

/**
 * Extrae token de la request (query param, header o body)
 */
function extractToken(request: NextRequest): string | null {
  // Token en query params
  const queryToken = request.nextUrl.searchParams.get('token');
  if (queryToken && queryToken.length >= 20) {
    return queryToken;
  }

  // Token en Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token.length >= 20) {
      return token;
    }
  }

  // Token en header personalizado
  const tokenHeader = request.headers.get('x-token');
  if (tokenHeader && tokenHeader.length >= 20) {
    return tokenHeader;
  }

  return null;
}

/**
 * Limpieza periódica del store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  let cleanedCount = 0;

  // Limpiar IP store
  for (const [key, entry] of ipStore) {
    if (now >= entry.resetTime) {
      ipStore.delete(key);
      cleanedCount++;
    }
  }

  // Limpiar token store
  for (const [key, entry] of tokenStore) {
    if (now >= entry.resetTime) {
      tokenStore.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.debug('Rate limit store cleanup', {
      cleanedEntries: cleanedCount,
      ipStoreSize: ipStore.size,
      tokenStoreSize: tokenStore.size,
    });
  }
}

/**
 * Obtiene métricas de rate limiting
 */
export function getRateLimitMetrics(): {
  totalRequests: number;
  blockedRequests: number;
  blockRate: number;
  ipStoreSize: number;
  tokenStoreSize: number;
  uptime: number;
} {
  const uptime = Date.now() - metrics.lastReset;
  const blockRate =
    metrics.totalRequests > 0
      ? (metrics.blockedRequests / metrics.totalRequests) * 100
      : 0;

  return {
    totalRequests: metrics.totalRequests,
    blockedRequests: metrics.blockedRequests,
    blockRate: Math.round(blockRate * 100) / 100,
    ipStoreSize: ipStore.size,
    tokenStoreSize: tokenStore.size,
    uptime,
  };
}

/**
 * Reset métricas (útil para testing)
 */
export function resetRateLimitMetrics(): void {
  metrics.totalRequests = 0;
  metrics.blockedRequests = 0;
  metrics.lastReset = Date.now();
  ipStore.clear();
  tokenStore.clear();

  logger.info('Rate limit metrics reset');
}

/**
 * Agrega IP a lista de confiables (para admin)
 */
export function addTrustedIP(ip: string): void {
  if (!TRUSTED_IPS.includes(ip)) {
    TRUSTED_IPS.push(ip);
    logger.info('IP added to trusted list', { ip: maskIP(ip) });
  }
}

/**
 * Remueve IP de lista de confiables
 */
export function removeTrustedIP(ip: string): void {
  const index = TRUSTED_IPS.indexOf(ip);
  if (index > -1) {
    TRUSTED_IPS.splice(index, 1);
    logger.info('IP removed from trusted list', { ip: maskIP(ip) });
  }
}

/**
 * Enmascara IP para logging seguro
 */
function maskIP(ip: string): string {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }

  if (ip.includes(':')) {
    // IPv6
    const parts = ip.split(':');
    return `${parts[0]}:${parts[1]}:***:***`;
  } else {
    // IPv4
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.**`;
    }
    return '***.***.***.**';
  }
}

// Limpieza periódica cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

// Rate limit para configuraciones específicas de endpoints
export const endpointRateLimits = {
  uploadPhotos: RATE_LIMITS['/api/admin/photos/upload'],
  signedUrls: RATE_LIMITS['/api/storage/signed-url'],
  familyGallery: RATE_LIMITS['/api/family/gallery'],
  webhooks: RATE_LIMITS['/api/payments/webhook'],
  tagging: RATE_LIMITS['/api/admin/tagging'],
  orders: RATE_LIMITS['/api/family/orders'],
} as const;

/**
 * Wrapper utilitario para aplicar rate limiting a handlers de API
 */
export const RateLimitMiddleware = {
  withRateLimit<Args extends any[]>(
    handler: (
      request: NextRequest,
      ...args: Args
    ) => Promise<NextResponse> | NextResponse
  ) {
    return async (
      request: NextRequest,
      ...args: Args
    ): Promise<NextResponse> => {
      const requestId =
        (globalThis.crypto && 'randomUUID' in globalThis.crypto
          ? (globalThis.crypto as Crypto).randomUUID()
          : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      const result = await rateLimitMiddleware(request, requestId);

      if (!result.allowed) {
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'X-Request-ID': requestId,
            'X-RateLimit-Limit': String(result.limit ?? 0),
            'X-RateLimit-Remaining': String(result.remaining ?? 0),
            'X-RateLimit-Reset': String(result.resetTime ?? 0),
            'Retry-After': String(result.retryAfter ?? 0),
          },
        });
      }

      const response = await handler(request, ...args);

      // Agregar headers informativos en respuestas exitosas
      if (result.limit) {
        response.headers.set('X-RateLimit-Limit', String(result.limit));
        response.headers.set(
          'X-RateLimit-Remaining',
          String(result.remaining ?? 0)
        );
        response.headers.set(
          'X-RateLimit-Reset',
          String(result.resetTime ?? 0)
        );
      }

      return response;
    };
  },
};
