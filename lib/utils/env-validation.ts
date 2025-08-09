/**
 * Production Environment Validation
 * Validates all required environment variables for production deployment
 */

import { z } from 'zod';
import crypto from 'node:crypto';

// Production environment validation schema
const ProductionEnvSchema = z.object({
  // Core Infrastructure
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Must be a valid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Service role key is required'),

  // Application URLs
  NEXT_PUBLIC_APP_URL: z.string().url('Must be a valid app URL'),
  CORS_ORIGIN: z.string().url('Must be a valid CORS origin'),

  // Security
  SESSION_SECRET: z
    .string()
    .min(32, 'Session secret must be at least 32 characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']),

  // Mercado Pago
  NEXT_PUBLIC_MP_PUBLIC_KEY: z.string().min(1, 'MP public key is required'),
  MP_ACCESS_TOKEN: z.string().min(1, 'MP access token is required'),
  MP_WEBHOOK_SECRET: z
    .string()
    .min(32, 'MP webhook secret must be at least 32 characters'),

  // Storage
  STORAGE_BUCKET: z.string().min(1, 'Storage bucket name is required'),

  // Rate Limiting
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url('Must be a valid Redis URL')
    .optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

// Development environment validation schema (more permissive)
const DevelopmentEnvSchema = ProductionEnvSchema.partial({
  UPSTASH_REDIS_REST_URL: true,
  UPSTASH_REDIS_REST_TOKEN: true,
  MP_WEBHOOK_SECRET: true,
}).extend({
  SESSION_SECRET: z
    .string()
    .min(16, 'Session secret must be at least 16 characters in development'),
});

export interface EnvironmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  critical: string[];
  environment: 'development' | 'production' | 'test';
}

export function validateEnvironment(): EnvironmentValidationResult {
  const env = process.env;
  const environment =
    (env.NODE_ENV as 'development' | 'production' | 'test') || 'development';

  const result: EnvironmentValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    critical: [],
    environment,
  };

  // Choose schema based on environment
  const schema =
    environment === 'production' ? ProductionEnvSchema : DevelopmentEnvSchema;

  try {
    schema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      result.isValid = false;
      result.errors = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
    }
  }

  // Additional production checks
  if (environment === 'production') {
    // Critical security checks
    if (env['SKIP_AUTH'] === 'true') {
      result.critical.push('SKIP_AUTH must not be true in production');
      result.isValid = false;
    }

    if (env['DEBUG_ENABLED'] === 'true') {
      result.critical.push('DEBUG_ENABLED must not be true in production');
      result.isValid = false;
    }

    if (env['MASK_SENSITIVE_LOGS'] !== 'true') {
      result.critical.push('MASK_SENSITIVE_LOGS must be true in production');
      result.isValid = false;
    }

    // Token security checks
    const tokenMinLength = parseInt(env['TOKEN_MIN_LENGTH'] || '20');
    if (tokenMinLength < 20) {
      result.critical.push(
        'TOKEN_MIN_LENGTH must be at least 20 in production'
      );
      result.isValid = false;
    }

    // Rate limiting checks
    if (env['ENABLE_RATE_LIMIT'] !== 'true') {
      result.warnings.push('ENABLE_RATE_LIMIT should be true in production');
    }

    // HTTPS checks
    if (!env['NEXT_PUBLIC_APP_URL']?.startsWith('https://')) {
      result.critical.push('NEXT_PUBLIC_APP_URL must use HTTPS in production');
      result.isValid = false;
    }

    if (!env['CORS_ORIGIN']?.startsWith('https://')) {
      result.critical.push('CORS_ORIGIN must use HTTPS in production');
      result.isValid = false;
    }

    // Check for test/development values
    if (env['NEXT_PUBLIC_MP_PUBLIC_KEY']?.includes('TEST-')) {
      result.warnings.push(
        'Using TEST Mercado Pago keys in production environment'
      );
    }

    // Security headers
    if (env['SECURITY_HEADERS_ENABLED'] !== 'true') {
      result.critical.push(
        'SECURITY_HEADERS_ENABLED must be true in production'
      );
      result.isValid = false;
    }

    // Storage security
    if (
      env['SIGNED_URL_EXPIRY_MINUTES'] &&
      parseInt(env['SIGNED_URL_EXPIRY_MINUTES']) > 120
    ) {
      result.warnings.push(
        'SIGNED_URL_EXPIRY_MINUTES should be 120 minutes or less in production'
      );
    }
  }

  // Performance warnings
  const maxConcurrentUploads = parseInt(env['MAX_CONCURRENT_UPLOADS'] || '5');
  if (maxConcurrentUploads > 10) {
    result.warnings.push(
      'MAX_CONCURRENT_UPLOADS > 10 may cause performance issues'
    );
  }

  const photoMaxSize = parseInt(env['PHOTO_MAX_SIZE'] || '1600');
  if (photoMaxSize > 2000) {
    result.warnings.push('PHOTO_MAX_SIZE > 2000px may cause storage issues');
  }

  return result;
}

export function validateCriticalSecuritySettings(): string[] {
  const issues: string[] = [];
  const env = process.env;

  // Validate token generation settings
  if (!env['TOKEN_MIN_LENGTH'] || parseInt(env['TOKEN_MIN_LENGTH']) < 20) {
    issues.push('Token minimum length must be at least 20 characters');
  }

  // Validate session security
  if (!env['SESSION_SECRET'] || env['SESSION_SECRET'].length < 32) {
    issues.push('Session secret must be at least 32 characters long');
  }

  // Validate storage security
  if (!env['STORAGE_BUCKET'] || !env['STORAGE_BUCKET'].includes('private')) {
    issues.push('Storage bucket should be private');
  }

  // Validate rate limiting
  if (env['NODE_ENV'] === 'production' && env['ENABLE_RATE_LIMIT'] !== 'true') {
    issues.push('Rate limiting must be enabled in production');
  }

  // Validate webhook security
  if (!env['MP_WEBHOOK_SECRET'] || env['MP_WEBHOOK_SECRET'].length < 32) {
    issues.push('Mercado Pago webhook secret must be at least 32 characters');
  }

  return issues;
}

export function generateSecureDefaults(): Record<string, string> {
  return {
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    MP_WEBHOOK_SECRET: crypto.randomBytes(32).toString('hex'),
    METRICS_AUTH_TOKEN: crypto.randomBytes(16).toString('hex'),
    PWA_CACHE_VERSION: `v${Date.now()}`,
  };
}

export function logEnvironmentStatus(
  result: EnvironmentValidationResult
): void {
  const logger = console;

  if (result.isValid) {
    logger.log('✅ Environment validation passed');
  } else {
    logger.error('❌ Environment validation failed');
  }

  if (result.critical.length > 0) {
    logger.error('🚨 CRITICAL ISSUES:');
    result.critical.forEach((issue) => logger.error(`  - ${issue}`));
  }

  if (result.errors.length > 0) {
    logger.error('⚠️  ERRORS:');
    result.errors.forEach((error) => logger.error(`  - ${error}`));
  }

  if (result.warnings.length > 0) {
    logger.warn('⚠️  WARNINGS:');
    result.warnings.forEach((warning) => logger.warn(`  - ${warning}`));
  }
}
