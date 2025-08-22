/**
 * Production Configuration Manager
 * Centralized configuration management for production deployment
 */

export interface ProductionConfig {
  // Environment
  environment: 'production' | 'development' | 'test';
  isProduction: boolean;

  // URLs and Domains
  appUrl: string;
  corsOrigin: string;
  allowedDomains: string[];

  // Security
  sessionSecret: string;
  tokenMinLength: number;
  tokenMaxLength: number;
  tokenExpiryDays: number;
  skipAuth: boolean;
  maskSensitiveLogs: boolean;
  securityHeadersEnabled: boolean;
  hstsMaxAge: number;

  // Rate Limiting
  rateLimitEnabled: boolean;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  rateLimits: {
    auth: number;
    upload: number;
    gallery: number;
    webhook: number;
    signedUrl: number;
  };

  // Storage
  storageBucket: string;
  signedUrlExpiryMinutes: number;
  maxFileSize: number;
  maxFilesPerRequest: number;
  allowedFileTypes: string[];

  // Photo Processing
  maxConcurrentUploads: number;
  watermarkOpacity: number;
  photoMaxSize: number;
  photoQuality: number;
  photoFormat: 'webp' | 'jpeg' | 'png';

  // Performance
  enableRedisCache: boolean;
  cacheTTL: {
    gallery: number;
    signedUrls: number;
    stats: number;
  };

  // Monitoring
  enableHealthChecks: boolean;
  enablePerformanceMonitoring: boolean;
  enableMetrics: boolean;
  enableEgressMonitoring: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';

  // Features
  features: {
    autoTagging: boolean;
    advancedGallery: boolean;
    mobileUpload: boolean;
    bulkOperations: boolean;
    maintenanceMode: boolean;
  };

  // Mercado Pago
  mercadoPago: {
    publicKey: string;
    accessToken: string;
    webhookSecret: string;
    environment: 'sandbox' | 'production';
  };
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function getEnvArray(key: string, defaultValue: string[] = []): string[] {
  const value = process.env[key];
  return value ? value.split(',').map((item) => item.trim()) : defaultValue;
}

export function createProductionConfig(): ProductionConfig {
  const environment =
    (process.env.NODE_ENV as 'production' | 'development' | 'test') ||
    'development';
  const isProduction = environment === 'production';

  return {
    // Environment
    environment,
    isProduction,

    // URLs and Domains
    appUrl: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    corsOrigin: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
    allowedDomains: getEnvArray('ALLOWED_DOMAINS', ['localhost', '127.0.0.1']),

    // Security
    sessionSecret: getEnvVar('SESSION_SECRET'),
    tokenMinLength: getEnvNumber('TOKEN_MIN_LENGTH', 20),
    tokenMaxLength: getEnvNumber('TOKEN_MAX_LENGTH', 64),
    tokenExpiryDays: getEnvNumber('TOKEN_EXPIRY_DAYS', 30),
    skipAuth: getEnvBoolean('SKIP_AUTH', false),
    maskSensitiveLogs: getEnvBoolean('MASK_SENSITIVE_LOGS', true),
    securityHeadersEnabled: getEnvBoolean('SECURITY_HEADERS_ENABLED', true),
    hstsMaxAge: getEnvNumber('HSTS_MAX_AGE', 31536000),

    // Rate Limiting
    rateLimitEnabled: getEnvBoolean('ENABLE_RATE_LIMIT', isProduction),
    rateLimitWindowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
    rateLimitMaxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    rateLimits: {
      auth: getEnvNumber('RATE_LIMIT_AUTH', 3),
      upload: getEnvNumber('RATE_LIMIT_UPLOAD', 10),
      gallery: getEnvNumber('RATE_LIMIT_GALLERY', 30),
      webhook: getEnvNumber('RATE_LIMIT_WEBHOOK', 100),
      signedUrl: getEnvNumber('RATE_LIMIT_SIGNED_URL', 60),
    },

    // Storage
    storageBucket: getEnvVar('STORAGE_BUCKET', 'photo-private'),
    signedUrlExpiryMinutes: getEnvNumber('SIGNED_URL_EXPIRY_MINUTES', 60),
    maxFileSize: getEnvNumber('MAX_FILE_SIZE', 10485760), // 10MB
    maxFilesPerRequest: getEnvNumber('MAX_FILES_PER_REQUEST', 20),
    allowedFileTypes: getEnvArray('ALLOWED_FILE_TYPES', [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/tiff',
    ]),

    // Photo Processing - OPTIMIZED FOR SUPABASE FREE TIER
    // Target: 20,000 photos × 50KB = 1GB total storage
    maxConcurrentUploads: getEnvNumber('MAX_CONCURRENT_UPLOADS', 5),
    watermarkOpacity: parseFloat(process.env.WATERMARK_OPACITY || '0.5'),
    photoMaxSize: getEnvNumber('PHOTO_MAX_SIZE', 800), // Reduced from 1600
    photoQuality: getEnvNumber('PHOTO_QUALITY', 50), // Reduced from 72
    photoFormat:
      (process.env.PHOTO_FORMAT as 'webp' | 'jpeg' | 'png') || 'webp',
    // FREE TIER OPTIMIZATION: Target 50KB per preview image
    freetierOptimization: getEnvBoolean('FREE_TIER_OPTIMIZATION', true),
    maxPreviewSize: getEnvNumber('MAX_PREVIEW_SIZE_KB', 50), // 50KB target

    // Performance
    enableRedisCache: getEnvBoolean('ENABLE_REDIS_CACHE', isProduction),
    cacheTTL: {
      gallery: getEnvNumber('CACHE_TTL_GALLERY', 3600),
      signedUrls: getEnvNumber('CACHE_TTL_SIGNED_URLS', 300),
      stats: getEnvNumber('CACHE_TTL_STATS', 1800),
    },

    // Monitoring
    enableHealthChecks: getEnvBoolean('ENABLE_HEALTH_CHECKS', true),
    enablePerformanceMonitoring: getEnvBoolean(
      'ENABLE_PERFORMANCE_MONITORING',
      isProduction
    ),
    enableMetrics: getEnvBoolean('ENABLE_METRICS', isProduction),
    enableEgressMonitoring: getEnvBoolean(
      'ENABLE_EGRESS_MONITORING',
      isProduction
    ),
    logLevel:
      (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') ||
      (isProduction ? 'warn' : 'info'),

    // Features
    features: {
      autoTagging: getEnvBoolean('ENABLE_AUTO_TAGGING', true),
      advancedGallery: getEnvBoolean('ENABLE_ADVANCED_GALLERY', true),
      mobileUpload: getEnvBoolean('ENABLE_MOBILE_UPLOAD', true),
      bulkOperations: getEnvBoolean('ENABLE_BULK_OPERATIONS', true),
      maintenanceMode: getEnvBoolean('MAINTENANCE_MODE', false),
    },

    // Mercado Pago
    mercadoPago: {
      publicKey: getEnvVar('NEXT_PUBLIC_MP_PUBLIC_KEY'),
      accessToken: getEnvVar('MP_ACCESS_TOKEN'),
      webhookSecret: getEnvVar('MP_WEBHOOK_SECRET'),
      environment:
        (process.env.NEXT_PUBLIC_MP_ENVIRONMENT as 'sandbox' | 'production') ||
        'sandbox',
    },
  };
}

// Singleton instance
let config: ProductionConfig | null = null;

export function getProductionConfig(): ProductionConfig {
  if (!config) {
    config = createProductionConfig();
  }
  return config;
}

// Configuration validation
export function validateProductionConfig(config: ProductionConfig): string[] {
  const issues: string[] = [];

  // Production-specific validations
  if (config.isProduction) {
    if (config.skipAuth) {
      issues.push('Authentication cannot be skipped in production');
    }

    if (!config.maskSensitiveLogs) {
      issues.push('Sensitive logs must be masked in production');
    }

    if (!config.securityHeadersEnabled) {
      issues.push('Security headers must be enabled in production');
    }

    if (!config.rateLimitEnabled) {
      issues.push('Rate limiting must be enabled in production');
    }

    if (!config.appUrl.startsWith('https://')) {
      issues.push('App URL must use HTTPS in production');
    }

    if (config.mercadoPago.environment === 'sandbox') {
      issues.push('Mercado Pago must use production environment in production');
    }

    if (config.tokenMinLength < 20) {
      issues.push(
        'Token minimum length must be at least 20 characters in production'
      );
    }
  }

  // Performance validations
  if (config.maxConcurrentUploads > 10) {
    issues.push(
      'Maximum concurrent uploads should not exceed 10 for optimal performance'
    );
  }

  if (config.photoMaxSize > 2000) {
    issues.push(
      'Photo maximum size should not exceed 2000px to avoid storage issues'
    );
  }

  if (config.signedUrlExpiryMinutes > 120) {
    issues.push('Signed URL expiry should not exceed 120 minutes for security');
  }

  return issues;
}

// Export for middleware and startup validation
export function logConfigurationSummary(config: ProductionConfig): void {
  const logger = console;

  logger.log('\n🔧 Production Configuration Summary:');
  logger.log(`  Environment: ${config.environment}`);
  logger.log(`  App URL: ${config.appUrl}`);
  logger.log(
    `  Rate Limiting: ${config.rateLimitEnabled ? '✅ Enabled' : '❌ Disabled'}`
  );
  logger.log(
    `  Security Headers: ${config.securityHeadersEnabled ? '✅ Enabled' : '❌ Disabled'}`
  );
  logger.log(
    `  Sensitive Log Masking: ${config.maskSensitiveLogs ? '✅ Enabled' : '❌ Disabled'}`
  );
  logger.log(
    `  Photo Processing: ${config.photoFormat.toUpperCase()} @ ${config.photoQuality}% quality`
  );
  logger.log(
    `  Storage: ${config.storageBucket} (${Math.round(config.maxFileSize / 1024 / 1024)}MB max)`
  );
  logger.log(`  Mercado Pago: ${config.mercadoPago.environment}`);
  logger.log(
    `  Monitoring: ${config.enablePerformanceMonitoring ? '✅ Enabled' : '❌ Disabled'}\n`
  );
}
