// @ts-nocheck
import DOMPurify from 'dompurify';

/**
 * Sanitiza HTML para prevenir ataques XSS
 * @param html - Contenido HTML a sanitizar
 * @returns Contenido HTML sanitizado
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

/**
 * Sanitiza descripciones de productos para prevenir XSS
 * @param description - Descripción del producto
 * @returns Descripción sanitizada
 */
export const sanitizeProductDescription = (description: string): string => {
  // Remover HTML peligroso pero mantener formato básico
  return description
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

/**
 * Valida y sanitiza URLs para prevenir ataques de redirección
 * @param url - URL a validar
 * @returns URL sanitizada o null si es inválida
 */
export const sanitizeUrl = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);

    // Solo permitir URLs HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return null;
    }

    // Validar dominio (prevenir ataques de host header)
    const allowedDomains = [
      'lookescolar.com',
      'localhost',
      '127.0.0.1',
      'vercel.app'
    ];

    const isAllowedDomain = allowedDomains.some(domain =>
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowedDomain && !parsedUrl.hostname.includes('lookescolar')) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
};

/**
 * Sanitiza texto para prevenir inyección de código
 * @param text - Texto a sanitizar
 * @returns Texto sanitizado
 */
export const sanitizeText = (text: string): string => {
  return text
    .replace(/[<>]/g, '') // Remover caracteres HTML básicos
    .replace(/javascript:/gi, '') // Remover protocolos javascript
    .replace(/on\w+\s*=/gi, '') // Remover event handlers
    .trim();
};

/**
 * Valida y sanitiza entrada de formulario
 * @param input - Valor del input
 * @param type - Tipo de validación
 * @returns Valor sanitizado
 */
export const sanitizeFormInput = (input: string, type: 'text' | 'email' | 'number' | 'url' = 'text'): string => {
  let sanitized = input.trim();

  switch (type) {
    case 'email':
      // Validación básica de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitized)) {
        throw new Error('Formato de email inválido');
      }
      break;

    case 'number':
      // Validar que sea un número
      const num = parseFloat(sanitized);
      if (isNaN(num)) {
        throw new Error('Debe ser un número válido');
      }
      sanitized = num.toString();
      break;

    case 'url':
      const validUrl = sanitizeUrl(sanitized);
      if (!validUrl) {
        throw new Error('URL inválida');
      }
      sanitized = validUrl;
      break;

    default:
      sanitized = sanitizeText(sanitized);
  }

  return sanitized;
};
