import { createClient } from '@/lib/supabase/server';
import { validatePassword, sanitizePassword } from '@/lib/utils/password-utils';
import { AdminSecurityLogger } from './admin-auth.middleware';

const logger = new AdminSecurityLogger();

// Rate limiting for password attempts (in-memory for simplicity, use Redis in production)
const passwordAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export interface PasswordValidationResult {
  isValid: boolean;
  requiresPassword: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * Check if rate limit is exceeded for password attempts
 */
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const attempt = passwordAttempts.get(identifier);

  if (!attempt) {
    passwordAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }

  // Reset if outside window
  if (now - attempt.lastAttempt > WINDOW_MS) {
    passwordAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }

  // Increment and check
  attempt.count++;
  attempt.lastAttempt = now;

  if (attempt.count > MAX_ATTEMPTS) {
    return true;
  }

  return false;
}

/**
 * Validate password for a share token
 * @param token - The share token to validate
 * @param password - The password to validate
 * @param clientIp - Client IP for rate limiting and logging
 */
export async function validateShareTokenPassword(
  token: string,
  password: string | undefined | null,
  clientIp?: string
): Promise<PasswordValidationResult> {
  const supabase = await createClient();
  const identifier = `token:${token}:${clientIp || 'unknown'}`;

  try {
    // Check rate limiting
    if (checkRateLimit(identifier)) {
      await logger.logFailedAccess('password_validation', {
        reason: 'Rate limit exceeded',
        token: token.substring(0, 8) + '***',
        ip: clientIp
      });

      return {
        isValid: false,
        requiresPassword: true,
        error: 'Too many password attempts. Please try again later.',
        statusCode: 429
      };
    }

    // Fetch share token data
    const { data: shareToken, error: fetchError } = await supabase
      .from('share_tokens')
      .select('password_hash, is_active, expires_at')
      .eq('token', token)
      .single();

    if (fetchError || !shareToken) {
      return {
        isValid: false,
        requiresPassword: false,
        error: 'Invalid token',
        statusCode: 404
      };
    }

    // Check if token is active and not expired
    if (!shareToken.is_active) {
      return {
        isValid: false,
        requiresPassword: false,
        error: 'Token is inactive',
        statusCode: 403
      };
    }

    if (shareToken.expires_at && new Date(shareToken.expires_at) < new Date()) {
      return {
        isValid: false,
        requiresPassword: false,
        error: 'Token has expired',
        statusCode: 403
      };
    }

    // Check if password is required
    if (!shareToken.password_hash) {
      return {
        isValid: true,
        requiresPassword: false
      };
    }

    // Password is required
    const sanitizedPassword = sanitizePassword(password);

    if (!sanitizedPassword) {
      await logger.logFailedAccess('password_validation', {
        reason: 'Missing password',
        token: token.substring(0, 8) + '***',
        ip: clientIp
      });

      return {
        isValid: false,
        requiresPassword: true,
        error: 'Password required',
        statusCode: 401
      };
    }

    // Validate password
    const validationResult = validatePassword(sanitizedPassword, shareToken.password_hash);

    if (!validationResult.isValid) {
      await logger.logFailedAccess('password_validation', {
        reason: 'Invalid password',
        token: token.substring(0, 8) + '***',
        ip: clientIp
      });

      return {
        isValid: false,
        requiresPassword: true,
        error: 'Invalid password',
        statusCode: 403
      };
    }

    // Password is valid
    await logger.logSuccessfulAccess('password_validation', {
      token: token.substring(0, 8) + '***',
      ip: clientIp
    });

    return {
      isValid: true,
      requiresPassword: true
    };

  } catch (error) {
    console.error('Password validation error:', error);
    await logger.logFailedAccess('password_validation', {
      reason: 'Internal error',
      error: error instanceof Error ? error.message : 'Unknown error',
      token: token.substring(0, 8) + '***',
      ip: clientIp
    });

    return {
      isValid: false,
      requiresPassword: false,
      error: 'Internal server error',
      statusCode: 500
    };
  }
}

/**
 * Validate password for store settings (using database function)
 * @param token - The store token
 * @param password - The password to validate
 */
export async function validateStorePassword(
  token: string,
  password: string
): Promise<PasswordValidationResult> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc('validate_store_password', {
      p_token: token,
      p_password: password
    });

    if (error) {
      console.error('Store password validation error:', error);
      return {
        isValid: false,
        requiresPassword: true,
        error: 'Password validation failed',
        statusCode: 500
      };
    }

    return {
      isValid: data === true,
      requiresPassword: true,
      error: data === true ? undefined : 'Invalid password',
      statusCode: data === true ? undefined : 403
    };

  } catch (error) {
    console.error('Store password validation error:', error);
    return {
      isValid: false,
      requiresPassword: false,
      error: 'Internal server error',
      statusCode: 500
    };
  }
}

/**
 * Clean up old rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  passwordAttempts.forEach((attempt, key) => {
    if (now - attempt.lastAttempt > WINDOW_MS) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => passwordAttempts.delete(key));
}, WINDOW_MS);