import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

// Magic bytes para validación de archivos
const MAGIC_BYTES = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF
  gif: [0x47, 0x49, 0x46, 0x38], // GIF8
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
} as const;

// Extensiones permitidas por tipo
const ALLOWED_EXTENSIONS = {
  image: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  document: ['.pdf'],
} as const;

// Patrones peligrosos para XSS
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi, // event handlers
  /<object\b/gi,
  /<embed\b/gi,
  /<applet\b/gi,
  /<meta\b[^>]*http-equiv/gi,
  /<link\b[^>]*href\s*=\s*["']?\s*javascript:/gi,
] as const;

// Patrones para SQL injection
const SQL_INJECTION_PATTERNS = [
  /(\%27)|(\%3D)|(\')|(\-\-)|(\%23)|(#)/gi,
  /((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/gi,
  /((\%3C)|<)((\%69)|i|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))[^\n]+((\%3E)|>)/gi,
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
  /union\s*select/gi,
  /drop\s*table/gi,
  /insert\s*into/gi,
  /delete\s*from/gi,
  /update\s*set/gi,
] as const;

// Patrones para path traversal
const PATH_TRAVERSAL_PATTERNS = [
  /\.\./g,
  /\.\\\./g,
  /\.\/\.\//g,
  /\%2e\%2e/gi,
  /\%2f/gi,
  /\%5c/gi,
] as const;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: string;
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  detectedType?: string;
  size?: number;
}

/**
 * Sanitiza input del usuario removiendo contenido peligroso
 */
export function sanitizeInput(
  input: string,
  options: {
    allowHtml?: boolean;
    maxLength?: number;
    removeXSS?: boolean;
  } = {}
): ValidationResult {
  const { allowHtml = false, maxLength = 1000, removeXSS = true } = options;

  const errors: string[] = [];
  let sanitized = input || '';

  try {
    // Verificar longitud
    if (sanitized.length > maxLength) {
      errors.push(`Input exceeds maximum length of ${maxLength} characters`);
      sanitized = sanitized.substring(0, maxLength);
    }

    // Remover XSS si está habilitado
    if (removeXSS && !allowHtml) {
      const originalLength = sanitized.length;

      // Remover patrones XSS
      XSS_PATTERNS.forEach((pattern) => {
        sanitized = sanitized.replace(pattern, '');
      });

      if (sanitized.length < originalLength) {
        errors.push('Potentially dangerous content removed');
      }
    }

    // Si no se permite HTML, escapar caracteres especiales
    if (!allowHtml) {
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    // Verificar SQL injection patterns
    const hasSqlInjection = SQL_INJECTION_PATTERNS.some((pattern) =>
      pattern.test(sanitized)
    );

    if (hasSqlInjection) {
      errors.push('Potentially dangerous SQL patterns detected');
      // Para SQL injection, es mejor rechazar completamente
      return { valid: false, errors };
    }

    // Verificar path traversal
    const hasPathTraversal = PATH_TRAVERSAL_PATTERNS.some((pattern) =>
      pattern.test(sanitized)
    );

    if (hasPathTraversal) {
      errors.push('Path traversal patterns detected');
      return { valid: false, errors };
    }

    // Normalizar espacios en blanco
    sanitized = sanitized.trim().replace(/\s+/g, ' ');

    return {
      valid: errors.length === 0,
      errors,
      sanitized,
    };
  } catch (error) {
    logger.error('Input sanitization error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      inputLength: input?.length || 0,
    });

    return {
      valid: false,
      errors: ['Sanitization failed'],
    };
  }
}

/**
 * Valida y sanitiza parámetros de URL
 */
export function sanitizeUrlParams(
  params: Record<string, any>
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      const result = sanitizeInput(value, { maxLength: 500 });
      if (result.valid && result.sanitized) {
        sanitized[key] = result.sanitized;
      }
    } else if (typeof value === 'number') {
      sanitized[key] = value.toString();
    } else if (typeof value === 'boolean') {
      sanitized[key] = value.toString();
    }
    // Ignorar otros tipos por seguridad
  }

  return sanitized;
}

/**
 * Valida archivo por magic bytes y extensión
 */
export async function validateFile(
  file: File | Buffer,
  options: {
    allowedTypes?: ('image' | 'document')[];
    maxSizeBytes?: number;
    requireMagicBytes?: boolean;
  } = {}
): Promise<FileValidationResult> {
  const {
    allowedTypes = ['image'],
    maxSizeBytes = 10 * 1024 * 1024, // 10MB
    requireMagicBytes = true,
  } = options;

  const errors: string[] = [];
  let detectedType: string | undefined;
  let size: number;

  try {
    // Obtener bytes y tamaño
    let bytes: Uint8Array;
    let filename: string;

    if (file instanceof File) {
      bytes = new Uint8Array(await file.arrayBuffer());
      filename = file.name;
      size = file.size;
    } else {
      bytes = new Uint8Array(file);
      filename = 'unknown';
      size = file.length;
    }

    // Verificar tamaño
    if (size > maxSizeBytes) {
      errors.push(`File size exceeds limit of ${maxSizeBytes} bytes`);
    }

    if (size === 0) {
      errors.push('File is empty');
      return { valid: false, errors };
    }

    // Verificar extensión
    const extension = filename
      .toLowerCase()
      .substring(filename.lastIndexOf('.'));
    const allowedExts = allowedTypes.flatMap(
      (type) => ALLOWED_EXTENSIONS[type]
    );

    if (!allowedExts.includes(extension as any)) {
      errors.push(`File extension ${extension} not allowed`);
    }

    // Verificar magic bytes si está habilitado
    if (requireMagicBytes && bytes.length >= 4) {
      let magicBytesMatch = false;

      for (const [type, magic] of Object.entries(MAGIC_BYTES)) {
        if (magic.every((byte, index) => bytes[index] === byte)) {
          detectedType = type;
          magicBytesMatch = true;
          break;
        }
      }

      // Verificación especial para WebP (más compleja)
      if (!magicBytesMatch && bytes.length >= 12) {
        if (
          bytes[0] === 0x52 &&
          bytes[1] === 0x49 &&
          bytes[2] === 0x46 &&
          bytes[3] === 0x46 &&
          bytes[8] === 0x57 &&
          bytes[9] === 0x45 &&
          bytes[10] === 0x42 &&
          bytes[11] === 0x50
        ) {
          detectedType = 'webp';
          magicBytesMatch = true;
        }
      }

      if (!magicBytesMatch) {
        errors.push('File magic bytes do not match expected format');
      }

      // Verificar que el tipo detectado sea permitido
      if (detectedType) {
        const isImageType = ['jpeg', 'png', 'webp', 'gif'].includes(
          detectedType
        );
        const isDocumentType = ['pdf'].includes(detectedType);

        if (allowedTypes.includes('image') && !isImageType && isDocumentType) {
          errors.push(
            `Detected file type ${detectedType} not allowed for image uploads`
          );
        }

        if (
          allowedTypes.includes('document') &&
          !isDocumentType &&
          isImageType
        ) {
          errors.push(
            `Detected file type ${detectedType} not allowed for document uploads`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      detectedType,
      size,
    };
  } catch (error) {
    logger.error('File validation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fileSize: size,
    });

    return {
      valid: false,
      errors: ['File validation failed'],
    };
  }
}

/**
 * Previene ataques XSS en contenido HTML
 */
export function preventXSS(html: string): string {
  if (!html) return '';

  // Lista blanca de tags seguros
  const allowedTags = [
    'p',
    'br',
    'strong',
    'em',
    'u',
    'ol',
    'ul',
    'li',
    'h1',
    'h2',
    'h3',
  ];

  // Remover todos los tags no permitidos
  let sanitized = html.replace(
    /<(\/?)([\w\s="':;-]+?)>/g,
    (match, slash, tag) => {
      const tagName = tag.split(' ')[0].toLowerCase();
      if (allowedTags.includes(tagName)) {
        return `<${slash}${tagName}>`;
      }
      return '';
    }
  );

  // Remover atributos peligrosos
  sanitized = sanitized.replace(/\s(on\w+|style|class)=["'][^"']*["']/gi, '');

  // Decodificar entidades HTML para evitar bypass
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&');

  // Re-aplicar protecciones XSS
  XSS_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized;
}

/**
 * Genera hash seguro para comparaciones
 */
export async function generateSecureHash(
  input: string,
  algorithm: 'SHA-256' | 'SHA-1' = 'SHA-256'
): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    logger.error('Hash generation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      algorithm,
    });
    throw new Error('Failed to generate secure hash');
  }
}

/**
 * Valida formato de email
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  try {
    const emailSchema = z.string().email().max(254); // RFC 5321 limit
    emailSchema.parse(email);

    // Verificaciones adicionales de seguridad
    const sanitized = sanitizeInput(email, { maxLength: 254 });
    if (!sanitized.valid) {
      errors.push(...sanitized.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: sanitized.sanitized,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push('Invalid email format');
    } else {
      errors.push('Email validation failed');
    }

    return { valid: false, errors };
  }
}

/**
 * Valida UUID v4
 */
export function validateUUID(uuid: string): boolean {
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(uuid);
}

/**
 * Valida token de acceso (según CLAUDE.md - mínimo 20 caracteres)
 */
export function validateAccessToken(token: string): ValidationResult {
  const errors: string[] = [];

  if (!token) {
    errors.push('Token is required');
    return { valid: false, errors };
  }

  if (token.length < 20) {
    errors.push('Token must be at least 20 characters long');
  }

  // Solo caracteres alfanuméricos seguros
  const safeTokenRegex = /^[A-Za-z0-9]+$/;
  if (!safeTokenRegex.test(token)) {
    errors.push('Token contains invalid characters');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: token,
  };
}

/**
 * Enmascara datos sensibles para logging
 */
export function maskSensitiveData(data: any): any {
  if (typeof data === 'string') {
    // Enmascarar URLs
    if (data.startsWith('http')) {
      try {
        const url = new URL(data);
        return `${url.protocol}//${url.hostname}/*masked*`;
      } catch {
        return '*masked*';
      }
    }

    // Enmascarar tokens
    if (data.length >= 20 && /^[A-Za-z0-9]+$/.test(data)) {
      return `tok_${data.substring(0, 3)}***`;
    }

    // Enmascarar emails
    if (data.includes('@')) {
      const [local, domain] = data.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    }

    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item));
  }

  if (typeof data === 'object' && data !== null) {
    const masked: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Campos sensibles conocidos
      if (
        ['token', 'password', 'secret', 'key', 'url', 'email'].some(
          (sensitive) => key.toLowerCase().includes(sensitive)
        )
      ) {
        masked[key] = maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  return data;
}

/**
 * Rate limiting helper para validaciones costosas
 */
const validationLimiter = new Map<
  string,
  { count: number; resetTime: number }
>();

export function checkValidationRateLimit(
  identifier: string,
  maxAttempts: number = 10,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  let entry = validationLimiter.get(identifier);

  if (!entry) {
    entry = { count: 0, resetTime: now + windowMs };
    validationLimiter.set(identifier, entry);
  }

  if (now >= entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + windowMs;
  }

  entry.count++;

  return {
    allowed: entry.count <= maxAttempts,
    remaining: Math.max(0, maxAttempts - entry.count),
    resetTime: entry.resetTime,
  };
}

// Limpieza periódica del rate limiter
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of validationLimiter) {
        if (now >= entry.resetTime) {
          validationLimiter.delete(key);
        }
      }
    },
    5 * 60 * 1000
  ); // Cada 5 minutos
}
