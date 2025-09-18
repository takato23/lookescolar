/**
 * Configuración de seguridad centralizada para LookEscolar
 *
 * CRÍTICO: Este archivo contiene la configuración de seguridad del sistema.
 * Cualquier cambio debe ser revisado por el equipo de seguridad.
 */

export const SECURITY_CONFIG = {
  // Configuración de tokens
  TOKEN: {
    MIN_LENGTH: 20,
    MAX_LENGTH: 64,
    DEFAULT_EXPIRY_DAYS: 30,
    ROTATION_WARNING_DAYS: 7,
    MAX_ROTATION_ATTEMPTS: 10,
  },

  // Configuración de rate limiting (requests por minuto)
  RATE_LIMITS: {
    GENERAL: { requests: 100, window: 60000 }, // 100 req/min
    AUTH: { requests: 3, window: 60000, block: 300000 }, // 3 req/min, bloqueo 5min
    UPLOAD: { requests: 10, window: 60000 }, // 10 req/min
    SIGNED_URL: { requests: 60, window: 60000 }, // 60 req/min
    FAMILY_GALLERY: { requests: 30, window: 60000 }, // 30 req/min
    WEBHOOK: { requests: 100, window: 60000 }, // 100 req/min total
  },

  // Configuración de archivos
  FILES: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_BATCH_SIZE: 20, // 20 archivos por request
    ALLOWED_TYPES: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/tiff',
    ],
    MIN_DIMENSION: 100,
    MAX_DIMENSION: 8000,
    PROCESSING_CONCURRENCY: 3,
  },

  // Headers de seguridad
  HEADERS: {
    CSP_POLICY: {
      'default-src': "'self'",
      'script-src':
        "'self' 'unsafe-eval' 'unsafe-inline' https://sdk.mercadopago.com",
      'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
      'img-src': "'self' blob: data: https://*.supabase.co",
      'font-src': "'self' https://fonts.gstatic.com",
      'connect-src': "'self' https://*.supabase.co https://api.mercadopago.com",
      'frame-src': 'https://www.mercadopago.com',
      'object-src': "'none'",
      'base-uri': "'self'",
      'form-action': "'self' https://www.mercadopago.com",
      'frame-ancestors': "'none'",
    },
    HSTS_MAX_AGE: 31536000, // 1 año
  },

  // Configuración de CORS
  cors: {
    origins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
    ],
  },

  // Configuración de anti-hotlinking
  ANTI_HOTLINKING: {
    ENABLED: true,
    ALLOWED_DOMAINS: ['localhost', '127.0.0.1'],
    SENSITIVE_PATHS: [
      '/api/storage/',
      '/photos/',
      '/uploads/',
      '/api/admin/photos/',
    ],
    BLOCKED_USER_AGENTS: [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /nodejs/i,
    ],
  },

  // Configuración de logs
  LOGGING: {
    MASK_SENSITIVE: true,
    LOG_LEVEL: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    SENSITIVE_FIELDS: [
      'token',
      'password',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
    ],
    MAX_LOG_SIZE: 1000, // caracteres
  },

  // Timeouts y límites
  TIMEOUTS: {
    REQUEST_TIMEOUT: 30000, // 30 segundos
    UPLOAD_TIMEOUT: 300000, // 5 minutos
    WEBHOOK_TIMEOUT: 3000, // 3 segundos (Mercado Pago requirement)
    SESSION_TIMEOUT: 86400000, // 24 horas
  },

  // Configuración de validación
  VALIDATION: {
    MAX_FILENAME_LENGTH: 255,
    MAX_EMAIL_LENGTH: 320,
    MAX_NAME_LENGTH: 100,
    MAX_NOTES_LENGTH: 500,
    MAX_PHOTOS_PER_ORDER: 50,
    UUID_REGEX:
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    FILENAME_SAFE_REGEX: /^[a-zA-Z0-9\-_\.]+$/,
  },

  // Configuración de storage
  STORAGE: {
    BUCKET_PRIVATE: true,
    SIGNED_URL_EXPIRY: 3600, // 1 hora
    PATH_PATTERN: /^eventos\/[a-f0-9\-]{36}\/previews\/[a-zA-Z0-9\-_\.]+$/,
    MAX_PATH_LENGTH: 500,
  },

  // Configuración de pagos
  PAYMENTS: {
    WEBHOOK_SIGNATURE_REQUIRED: true,
    WEBHOOK_IDEMPOTENCY: true,
    MAX_RETRY_ATTEMPTS: 3,
    SIGNATURE_ALGORITHM: 'sha256',
  },

  // Configuración de desarrollo (solo aplica en NODE_ENV=development)
  DEVELOPMENT: {
    SKIP_AUTH: process.env.SKIP_AUTH === 'true',
    MOCK_DATA: process.env.USE_MOCK_DATA === 'true',
    DISABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMIT !== 'true',
    LOG_LEVEL: 'debug',
  },
} as const;

/**
 * Configuración dinámica basada en variables de entorno
 */
export function getEnvironmentSecurity() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercel = !!process.env.VERCEL_URL;

  return {
    // Dominios permitidos dinámicos
    allowedDomains: [
      ...SECURITY_CONFIG.ANTI_HOTLINKING.ALLOWED_DOMAINS,
      ...(process.env.VERCEL_URL
        ? [process.env.VERCEL_URL.replace('https://', '')]
        : []),
      ...(process.env.NEXT_PUBLIC_APP_URL
        ? [process.env.NEXT_PUBLIC_APP_URL.replace(/https?:\/\//, '')]
        : []),
    ].filter(Boolean),

    // CSP dinámico
    cspConnectSrc: [
      "'self'",
      'https://*.supabase.co',
      'https://api.mercadopago.com',
      ...(isProduction ? [] : ['http://localhost:*', 'http://127.0.0.1:*']),
    ].join(' '),

    // Rate limiting
    rateLimitingEnabled:
      isProduction || process.env.ENABLE_RATE_LIMIT === 'true',

    // HSTS
    hstsEnabled: isProduction && process.env.NODE_ENV === 'production',

    // Logging
    logLevel: isProduction ? 'warn' : 'debug',
    maskSensitive: isProduction,
  };
}

/**
 * Validadores de seguridad
 */
export const SecurityValidators = {
  isValidDomain(domain: string): boolean {
    const config = getEnvironmentSecurity();
    return config.allowedDomains.includes(domain);
  },

  isSecureEnvironment(): boolean {
    return process.env.NODE_ENV === 'production';
  },

  isSensitiveField(fieldName: string): boolean {
    return SECURITY_CONFIG.LOGGING.SENSITIVE_FIELDS.some((field) =>
      fieldName.toLowerCase().includes(field)
    );
  },

  validateTokenLength(token: string): boolean {
    return (
      token.length >= SECURITY_CONFIG.TOKEN.MIN_LENGTH &&
      token.length <= SECURITY_CONFIG.TOKEN.MAX_LENGTH
    );
  },

  validateFileType(mimeType: string): boolean {
    return SECURITY_CONFIG.FILES.ALLOWED_TYPES.includes(mimeType.toLowerCase());
  },
};

/**
 * Configuración de CSP como string
 */
export function generateCSPHeader(): string {
  const config = getEnvironmentSecurity();
  const policy = SECURITY_CONFIG.HEADERS.CSP_POLICY;

  return Object.entries({
    ...policy,
    'connect-src': config.cspConnectSrc,
    'img-src':
      policy['img-src'] +
      (config.allowedDomains.length > 2
        ? ' http://localhost:* http://127.0.0.1:*'
        : ''),
  })
    .map(([key, value]) => `${key} ${value}`)
    .join('; ');
}

/**
 * Configuración de rate limits por endpoint
 */
export function getRateLimitConfig(endpoint: string) {
  const { RATE_LIMITS } = SECURITY_CONFIG;

  const endpointConfigs = {
    '/api/admin/auth': RATE_LIMITS.AUTH,
    '/api/auth/login': RATE_LIMITS.AUTH,
    '/api/admin/photos/upload': RATE_LIMITS.UPLOAD,
    '/api/storage/signed-url': RATE_LIMITS.SIGNED_URL,
    '/api/family/gallery': RATE_LIMITS.FAMILY_GALLERY,
    '/api/payments/webhook': RATE_LIMITS.WEBHOOK,
  };

  // Buscar configuración específica
  for (const [path, config] of Object.entries(endpointConfigs)) {
    if (endpoint.startsWith(path)) {
      return config;
    }
  }

  return RATE_LIMITS.GENERAL;
}

/**
 * Configuración de headers de seguridad completos
 */
export function getSecurityHeaders(request: {
  nextUrl: { protocol: string };
}): Record<string, string> {
  const config = getEnvironmentSecurity();

  const headers = {
    'Content-Security-Policy': generateCSPHeader(),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=()',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };

  // HSTS solo en producción con HTTPS
  if (config.hstsEnabled && request.nextUrl.protocol === 'https:') {
    headers['Strict-Transport-Security'] =
      `max-age=${SECURITY_CONFIG.HEADERS.HSTS_MAX_AGE}; includeSubDomains; preload`;
  }

  return headers;
}

export default SECURITY_CONFIG;
