import { customAlphabet } from 'nanoid';

// Alfabeto seguro sin caracteres ambiguos (sin 0, O, l, I, etc.)
const SAFE_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Generador de tokens con longitud mínima de 20 caracteres
export const generateSecureToken = customAlphabet(SAFE_ALPHABET, 20);

// Generador de tokens más largos para casos especiales
export const generateLongToken = customAlphabet(SAFE_ALPHABET, 32);

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
