import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Hash a password using SHA256
 * @param password - Plain text password
 * @returns SHA256 hash of the password
 */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Validate a password against a SHA256 hash using timing-safe comparison
 * @param password - Plain text password to validate
 * @param hash - SHA256 hash to compare against
 * @returns Validation result with timing-safe comparison
 */
export function validatePassword(password: string, hash: string): PasswordValidationResult {
  if (!password || !hash) {
    return {
      isValid: false,
      error: 'Missing password or hash'
    };
  }

  try {
    const passwordHash = hashPassword(password);
    const hashBuffer = Buffer.from(hash, 'hex');
    const passwordHashBuffer = Buffer.from(passwordHash, 'hex');

    // Use timing-safe comparison to prevent timing attacks
    if (hashBuffer.length !== passwordHashBuffer.length) {
      return {
        isValid: false,
        error: 'Invalid password'
      };
    }

    const isValid = timingSafeEqual(hashBuffer, passwordHashBuffer);

    return {
      isValid,
      error: isValid ? undefined : 'Invalid password'
    };
  } catch (error) {
    console.error('Password validation error:', error);
    return {
      isValid: false,
      error: 'Password validation failed'
    };
  }
}

/**
 * Generate a secure random token
 * @param length - Length of the token in bytes (default: 32)
 * @returns Hex-encoded secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Sanitize password input
 * @param password - Raw password input
 * @returns Sanitized password
 */
export function sanitizePassword(password: string | undefined | null): string {
  if (!password || typeof password !== 'string') {
    return '';
  }
  // Trim whitespace and limit length to prevent DoS
  return password.trim().slice(0, 256);
}

/**
 * Check password strength (for future use)
 * @param password - Password to check
 * @returns Strength assessment
 */
export function checkPasswordStrength(password: string): {
  isStrong: boolean;
  score: number;
  suggestions: string[];
} {
  const suggestions: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (password.length < 8) suggestions.push('Use at least 8 characters');
  if (!/[a-z]/.test(password)) suggestions.push('Include lowercase letters');
  if (!/[A-Z]/.test(password)) suggestions.push('Include uppercase letters');
  if (!/[0-9]/.test(password)) suggestions.push('Include numbers');
  if (!/[^a-zA-Z0-9]/.test(password)) suggestions.push('Include special characters');

  return {
    isStrong: score >= 4,
    score,
    suggestions
  };
}