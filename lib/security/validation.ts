import { z } from 'zod';
import path from 'path';
import crypto from 'crypto';

// Security constants
export const SECURITY_CONSTANTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  MIN_TOKEN_LENGTH: 20,
  MAX_FILENAME_LENGTH: 255,
  MAX_BATCH_SIZE: 50,
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 60,
};

// Zod schemas for validation
export const uuidSchema = z.string().uuid();

export const tokenSchema = z.string().min(SECURITY_CONSTANTS.MIN_TOKEN_LENGTH);

export const fileUploadSchema = z.object({
  filename: z.string().max(SECURITY_CONSTANTS.MAX_FILENAME_LENGTH),
  size: z.number().max(SECURITY_CONSTANTS.MAX_FILE_SIZE),
  type: z.enum(SECURITY_CONSTANTS.ALLOWED_IMAGE_TYPES as [string, ...string[]]),
});

export const photoUpdateSchema = z
  .object({
    original_filename: z
      .string()
      .max(SECURITY_CONSTANTS.MAX_FILENAME_LENGTH)
      .optional(),
    approved: z.boolean().optional(),
  })
  .strict();

export const photoApprovalSchema = z.object({
  photoIds: z
    .array(z.string().uuid())
    .min(1)
    .max(SECURITY_CONSTANTS.MAX_BATCH_SIZE),
  approved: z.boolean().optional().default(true),
});

export const photoAssignmentSchema = z.object({
  photoIds: z
    .array(z.string().uuid())
    .min(1)
    .max(SECURITY_CONSTANTS.MAX_BATCH_SIZE),
  subjectId: z.string().uuid().nullable().optional(),
  eventId: z.string().uuid().optional(),
});

export const searchParamsSchema = z.object({
  event_id: z.string().uuid().optional(),
  subject_id: z.string().uuid().optional(),
  // Allow filtering by a specific code_id or the literal string 'null' to represent unassigned
  code_id: z.union([z.string().uuid(), z.literal('null')]).optional(),
  approved: z.enum(['true', 'false']).optional(),
  tagged: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export const batchSignedUrlSchema = z.object({
  photoIds: z
    .array(z.string().uuid())
    .min(1)
    .max(SECURITY_CONSTANTS.MAX_BATCH_SIZE),
});

// Security validator class
export class SecurityValidator {
  /**
   * Check if IP is allowed (whitelist-based)
   */
  static isAllowedIP(ip: string): boolean {
    // In development, allow all IPs
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }

    // Define allowed IP patterns (whitelist)
    const allowedIPs = [
      '127.0.0.1', // Localhost
      '::1', // IPv6 localhost
      // Add other trusted IPs or IP ranges as needed
    ];

    // Check if IP is in whitelist
    return allowedIPs.some((allowedIP) => {
      if (allowedIP.includes('/')) {
        // Handle CIDR notation
        return this.isIPInRange(ip, allowedIP);
      }
      return ip === allowedIP;
    });
  }

  /**
   * Check if IP is in a CIDR range
   */
  static isIPInRange(ip: string, cidr: string): boolean {
    // Basic implementation - in a real system, you might want to use a more robust library
    const [range, prefix] = cidr.split('/');
    if (!range || !prefix) return false;

    // For IPv4 only in this simple implementation
    if (ip.includes(':') || range.includes(':')) return false;

    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);
    const prefixNum = parseInt(prefix);

    if (ipParts.length !== 4 || rangeParts.length !== 4 || isNaN(prefixNum)) {
      return false;
    }

    // Convert to binary and compare based on prefix
    let ipNum = 0;
    let rangeNum = 0;
    let mask = 0;

    for (let i = 0; i < 4; i++) {
      ipNum = (ipNum << 8) + ipParts[i];
      rangeNum = (rangeNum << 8) + rangeParts[i];
    }

    mask = ~((1 << (32 - prefixNum)) - 1);

    return (ipNum & mask) === (rangeNum & mask);
  }

  /**
   * Check if User-Agent is suspicious
   */
  static isSuspiciousUserAgent(userAgent: string | null): boolean {
    if (!userAgent) return false;

    // List of suspicious patterns
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scanner/i,
      /automated/i,
      /python/i,
      /curl/i,
      /wget/i,
      /postman/i,
      /insomnia/i,
    ];

    // Allow list of known good user agents
    const allowedUserAgents = [
      /mozilla/i,
      /chrome/i,
      /safari/i,
      /firefox/i,
      /edge/i,
      /opera/i,
      /mobile/i,
      /android/i,
      /iphone/i,
      /ipad/i,
    ];

    // If it's a known good user agent, allow it
    if (allowedUserAgents.some((pattern) => pattern.test(userAgent))) {
      return false;
    }

    // Check for suspicious patterns
    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * Check if filename is safe
   */
  static isSafeFilename(filename: string): boolean {
    if (!filename) return false;

    // Check for dangerous characters or patterns
    const dangerousPatterns = [
      /\.\./, // Path traversal
      /\/|\\/, // Directory separators
      /:|\*|\?|"|<|>|\|/, // Windows forbidden characters
      /^\./, // Hidden files
      /~$/, // Backup files
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(filename));
  }

  /**
   * Validate image dimensions
   */
  static isValidImageDimensions(width: number, height: number): boolean {
    // Check if dimensions are within reasonable limits
    if (width <= 0 || height <= 0) return false;

    // Maximum dimensions (adjust as needed)
    const maxWidth = 10000;
    const maxHeight = 10000;

    if (width > maxWidth || height > maxHeight) return false;

    // Minimum dimensions
    const minWidth = 10;
    const minHeight = 10;

    if (width < minWidth || height < minHeight) return false;

    return true;
  }

  /**
   * Validate storage path to prevent path traversal
   */
  static isValidStoragePath(storagePath: string): boolean {
    if (!storagePath) return false;

    // Normalize and resolve the path
    const normalizedPath = path.normalize(storagePath);

    // Check for path traversal attempts
    if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
      return false;
    }

    // Check for absolute paths (should be relative to storage bucket)
    if (path.isAbsolute(normalizedPath)) {
      return false;
    }

    // Check for valid characters (alphanumeric, dash, underscore, slash, dot)
    const validPathRegex = /^[a-zA-Z0-9\-_\/\.]+$/;
    if (!validPathRegex.test(normalizedPath)) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize filename for storage
   */
  static sanitizeFilename(filename: string): string {
    if (!filename) return '';

    // Get file extension
    const ext = path.extname(filename).toLowerCase();
    const name = path.basename(filename, ext);

    // Remove special characters, keep only alphanumeric, dash, underscore
    const sanitizedName = name.replace(/[^a-zA-Z0-9\-_]/g, '_');

    // Limit length
    const truncatedName = sanitizedName.substring(0, 100);

    // Add timestamp for uniqueness
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(4).toString('hex');

    return `${truncatedName}_${timestamp}_${randomStr}${ext}`;
  }

  /**
   * Check if content type is allowed
   */
  static isAllowedContentType(contentType: string): boolean {
    return SECURITY_CONSTANTS.ALLOWED_IMAGE_TYPES.includes(
      contentType.toLowerCase()
    );
  }

  /**
   * Check if file extension is allowed
   */
  static isAllowedExtension(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return SECURITY_CONSTANTS.ALLOWED_EXTENSIONS.includes(ext);
  }

  /**
   * Generate secure token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Mask sensitive data for logging
   */
  static maskSensitiveData(
    data: string,
    type: 'token' | 'url' = 'token'
  ): string {
    if (!data) return '';

    if (type === 'token') {
      return data.length > 6 ? `${data.substring(0, 3)}***` : '***';
    }

    if (type === 'url') {
      try {
        const url = new URL(data);
        url.search = '?***masked***';
        return url.toString();
      } catch {
        return '***masked-url***';
      }
    }

    return '***';
  }

  /**
   * Validate request referer for anti-hotlinking
   */
  static isValidReferer(
    referer: string | null,
    allowedOrigins: string[]
  ): boolean {
    if (!referer) return false;

    try {
      const refererUrl = new URL(referer);
      return allowedOrigins.some((origin) => {
        const allowedUrl = new URL(origin);
        return refererUrl.hostname === allowedUrl.hostname;
      });
    } catch {
      return false;
    }
  }

  /**
   * Validate and sanitize pagination params
   */
  static sanitizePaginationParams(params: any): {
    limit: number;
    offset: number;
  } {
    const limit = Math.min(Math.max(1, parseInt(params.limit) || 50), 100);
    const offset = Math.max(0, parseInt(params.offset) || 0);
    return { limit, offset };
  }
}

// Type guard functions
export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && uuidSchema.safeParse(value).success;
}

export function isValidToken(value: unknown): value is string {
  return typeof value === 'string' && tokenSchema.safeParse(value).success;
}
