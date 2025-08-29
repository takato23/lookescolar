import { customAlphabet } from 'nanoid';
import { randomBytes } from 'crypto';
import { promisify } from 'util';

// Alfabeto seguro sin caracteres ambiguos (sin 0, O, l, I, etc.)
const SAFE_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Async version of randomBytes for better entropy
const randomBytesAsync = promisify(randomBytes);

/**
 * Generate cryptographically secure token using Node.js crypto
 * 256 bits of entropy encoded as base64url
 */
export async function generateSecureToken(): Promise<string> {
  try {
    // Generate 32 bytes (256 bits) of cryptographically secure random data
    const buffer = await randomBytesAsync(32);

    // Convert to base64url (URL-safe base64 without padding)
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (error) {
    // Fallback to nanoid if crypto fails
    console.error(
      'Crypto token generation failed, falling back to nanoid:',
      error
    );
    const fallbackGenerator = customAlphabet(SAFE_ALPHABET, 43); // Same length as base64url(32 bytes)
    return fallbackGenerator();
  }
}

/**
 * Generate shorter token for legacy compatibility (still cryptographically secure)
 */
export async function generateCompatToken(): Promise<string> {
  try {
    // Generate 20 bytes (160 bits) for shorter tokens
    const buffer = await randomBytesAsync(20);
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (error) {
    // Fallback to nanoid
    console.error(
      'Crypto token generation failed, falling back to nanoid:',
      error
    );
    const fallbackGenerator = customAlphabet(SAFE_ALPHABET, 27); // base64url(20 bytes) length
    return fallbackGenerator();
  }
}

/**
 * Generate CSRF token (hex encoded for simplicity)
 */
export async function generateCSRFToken(): Promise<string> {
  try {
    const buffer = await randomBytesAsync(32);
    return buffer.toString('hex');
  } catch (error) {
    console.error(
      'CSRF token generation failed, falling back to nanoid:',
      error
    );
    const fallbackGenerator = customAlphabet('0123456789abcdef', 64);
    return fallbackGenerator();
  }
}

// Backward compatibility - synchronous versions (use async versions for new code)
const syncTokenGenerator = customAlphabet(SAFE_ALPHABET, 20);
const syncLongTokenGenerator = customAlphabet(SAFE_ALPHABET, 32);

export { syncTokenGenerator as generateSecureTokenSync };
export { syncLongTokenGenerator as generateLongToken };

// Función para enmascarar tokens en logs
export function maskToken(token: string): string {
  if (!token || token.length < 8) return 'tok_***';
  return `tok_${token.substring(0, 3)}***${token.substring(token.length - 3)}`;
}

// Función para validar formato de token
export function isValidToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  if (token.length < 20) return false;

  // Verificar que solo contiene caracteres del alfabeto seguro
  const validChars = new RegExp(`^[${SAFE_ALPHABET}]+$`);
  return validChars.test(token);
}

// Función para calcular fecha de expiración
export function getTokenExpiryDate(days: number = 30): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
