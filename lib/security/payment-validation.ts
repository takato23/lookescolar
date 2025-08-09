import crypto from 'crypto';
import { z } from 'zod';

// Security constants
export const SECURITY_CONSTANTS = {
  MIN_TOKEN_LENGTH: 20,
  MAX_AMOUNT_CENTS: 100000000, // $1,000,000 ARS max per order
  MIN_AMOUNT_CENTS: 100, // $1 ARS min per order
  MAX_ITEMS_PER_ORDER: 50,
  MAX_QUANTITY_PER_ITEM: 10,
  WEBHOOK_TIMEOUT_MS: 3000, // 3 seconds max response time
  TOKEN_MASK_LENGTH: 3, // Show only last 3 chars of token
} as const;

// Validation schemas
export const PaymentValidationSchemas = {
  // Token validation
  familyToken: z
    .string()
    .min(
      SECURITY_CONSTANTS.MIN_TOKEN_LENGTH,
      `Token must be at least ${SECURITY_CONSTANTS.MIN_TOKEN_LENGTH} characters`
    )
    .max(100, 'Token too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Token contains invalid characters'),

  // Contact info validation
  contactInfo: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name too long')
      .regex(
        /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/,
        'Name contains invalid characters'
      ),
    email: z
      .string()
      .email('Invalid email address')
      .max(255, 'Email too long')
      .toLowerCase(),
    phone: z
      .string()
      .optional()
      .refine(
        (phone) => !phone || /^\+?[0-9\s-()]{7,20}$/.test(phone),
        'Invalid phone format'
      ),
  }),

  // Order item validation
  orderItem: z.object({
    photoId: z.string().uuid('Invalid photo ID'),
    quantity: z
      .number()
      .int('Quantity must be an integer')
      .min(1, 'Quantity must be at least 1')
      .max(
        SECURITY_CONSTANTS.MAX_QUANTITY_PER_ITEM,
        `Maximum ${SECURITY_CONSTANTS.MAX_QUANTITY_PER_ITEM} items per photo`
      ),
    priceType: z
      .string()
      .min(1, 'Price type required')
      .max(50, 'Price type too long')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid price type'),
  }),

  // Order items array validation
  orderItems: z
    .array(z.any())
    .min(1, 'At least one item required')
    .max(
      SECURITY_CONSTANTS.MAX_ITEMS_PER_ORDER,
      `Maximum ${SECURITY_CONSTANTS.MAX_ITEMS_PER_ORDER} items per order`
    ),

  // Amount validation
  amountCents: z
    .number()
    .int('Amount must be an integer')
    .min(
      SECURITY_CONSTANTS.MIN_AMOUNT_CENTS,
      `Minimum amount is $${SECURITY_CONSTANTS.MIN_AMOUNT_CENTS / 100}`
    )
    .max(
      SECURITY_CONSTANTS.MAX_AMOUNT_CENTS,
      `Maximum amount is $${SECURITY_CONSTANTS.MAX_AMOUNT_CENTS / 100}`
    ),

  // Mercado Pago payment ID validation
  mpPaymentId: z
    .string()
    .min(1, 'Payment ID required')
    .max(100, 'Payment ID too long')
    .regex(/^[0-9]+$/, 'Invalid payment ID format'),

  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
};

// Security utilities
export class PaymentSecurityUtils {
  /**
   * Mask sensitive data for logging
   */
  static maskSensitiveData(data: Record<string, any>): Record<string, any> {
    const masked = { ...data };

    // Mask tokens
    if (masked.token && typeof masked.token === 'string') {
      masked.token = PaymentSecurityUtils.maskToken(masked.token);
    }

    // Mask payment IDs
    if (masked.paymentId && typeof masked.paymentId === 'string') {
      masked.paymentId = `pay_***${masked.paymentId.slice(-4)}`;
    }

    // Mask URLs
    if (masked.redirectUrl && typeof masked.redirectUrl === 'string') {
      masked.redirectUrl = '*masked*';
    }

    if (masked.signedUrl && typeof masked.signedUrl === 'string') {
      masked.signedUrl = '*masked*';
    }

    // Mask email (show domain)
    if (masked.email && typeof masked.email === 'string') {
      const [local, domain] = masked.email.split('@');
      if (domain) {
        masked.email = `${local.slice(0, 2)}***@${domain}`;
      }
    }

    // Remove sensitive fields entirely
    delete masked.mp_webhook_secret;
    delete masked.signature;
    delete masked.password;
    delete masked.secret;

    return masked;
  }

  /**
   * Mask token for logging
   */
  static maskToken(token: string): string {
    if (token.length <= SECURITY_CONSTANTS.TOKEN_MASK_LENGTH) {
      return 'tok_***';
    }
    return `tok_***${token.slice(-SECURITY_CONSTANTS.TOKEN_MASK_LENGTH)}`;
  }

  /**
   * Generate secure request ID
   */
  static generateRequestId(): string {
    return `req_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Validate webhook signature with timing-safe comparison
   */
  static validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): { valid: boolean; error?: string } {
    try {
      if (!secret || !signature) {
        return { valid: false, error: 'Missing signature or secret' };
      }

      // Clean signature format (MP sends v1=hash)
      const cleanSignature = signature.startsWith('v1=')
        ? signature
        : `v1=${signature}`;

      // Compute expected signature
      const expectedHash = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      const expectedSignature = `v1=${expectedHash}`;

      // Timing-safe comparison
      const valid = crypto.timingSafeEqual(
        Buffer.from(cleanSignature),
        Buffer.from(expectedSignature)
      );

      return { valid };
    } catch (error) {
      return {
        valid: false,
        error: `Signature validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Sanitize user input
   */
  static sanitizeString(input: string, maxLength: number = 255): string {
    return input
      .trim()
      .slice(0, maxLength)
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
      .replace(/[<>]/g, ''); // Basic XSS prevention
  }

  /**
   * Validate IP address format
   */
  static isValidIpAddress(ip: string): boolean {
    // IPv4 validation
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // IPv6 validation (basic)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Check if request is from valid source
   */
  static validateRequestSource(
    userAgent?: string,
    referer?: string,
    allowedDomains: string[] = []
  ): { valid: boolean; reason?: string } {
    // Check user agent (basic bot detection)
    if (userAgent && /bot|crawler|spider|scraper/i.test(userAgent)) {
      return { valid: false, reason: 'Bot detected' };
    }

    // Check referer if provided and domains specified
    if (referer && allowedDomains.length > 0) {
      try {
        const refererUrl = new URL(referer);
        const refererDomain = refererUrl.hostname;

        const isAllowed = allowedDomains.some(
          (domain) =>
            refererDomain === domain || refererDomain.endsWith(`.${domain}`)
        );

        if (!isAllowed) {
          return { valid: false, reason: 'Invalid referer domain' };
        }
      } catch {
        return { valid: false, reason: 'Invalid referer URL' };
      }
    }

    return { valid: true };
  }

  /**
   * Calculate order total with validation
   */
  static calculateOrderTotal(
    items: Array<{ quantity: number; unitPriceCents: number }>
  ): { totalCents: number; valid: boolean; error?: string } {
    try {
      let totalCents = 0;

      for (const item of items) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          return { totalCents: 0, valid: false, error: 'Invalid quantity' };
        }

        if (
          !Number.isInteger(item.unitPriceCents) ||
          item.unitPriceCents <= 0
        ) {
          return { totalCents: 0, valid: false, error: 'Invalid unit price' };
        }

        const itemTotal = item.quantity * item.unitPriceCents;

        // Check for overflow
        if (totalCents > Number.MAX_SAFE_INTEGER - itemTotal) {
          return {
            totalCents: 0,
            valid: false,
            error: 'Order total too large',
          };
        }

        totalCents += itemTotal;
      }

      // Validate total amount
      const amountValidation =
        PaymentValidationSchemas.amountCents.safeParse(totalCents);
      if (!amountValidation.success) {
        return {
          totalCents: 0,
          valid: false,
          error:
            amountValidation.error.issues[0]?.message || 'Invalid total amount',
        };
      }

      return { totalCents, valid: true };
    } catch (error) {
      return {
        totalCents: 0,
        valid: false,
        error: `Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Rate limiting key generator
   */
  static generateRateLimitKey(
    type: 'ip' | 'token' | 'global',
    identifier: string
  ): string {
    switch (type) {
      case 'ip':
        return `rate_limit:ip:${identifier}`;
      case 'token':
        return `rate_limit:token:${PaymentSecurityUtils.maskToken(identifier)}`;
      case 'global':
        return `rate_limit:global:${identifier}`;
      default:
        return `rate_limit:${type}:${identifier}`;
    }
  }

  /**
   * Check if webhook response is within timeout
   */
  static isWebhookWithinTimeout(startTime: number): boolean {
    return Date.now() - startTime < SECURITY_CONSTANTS.WEBHOOK_TIMEOUT_MS;
  }

  /**
   * Validate webhook timing and warn if close to timeout
   */
  static validateWebhookTiming(startTime: number): {
    withinTimeout: boolean;
    duration: number;
    warning?: string;
  } {
    const duration = Date.now() - startTime;
    const withinTimeout = duration < SECURITY_CONSTANTS.WEBHOOK_TIMEOUT_MS;

    let warning: string | undefined;
    if (duration > SECURITY_CONSTANTS.WEBHOOK_TIMEOUT_MS * 0.8) {
      warning = `Webhook processing took ${duration}ms - approaching timeout`;
    }

    return { withinTimeout, duration, warning };
  }
}

// Export validation functions for easy use
export const validateFamilyToken = PaymentValidationSchemas.familyToken.parse;
export const validateContactInfo = PaymentValidationSchemas.contactInfo.parse;
export const validateOrderItems = PaymentValidationSchemas.orderItems.parse;
export const validateAmountCents = PaymentValidationSchemas.amountCents.parse;
export const validateMpPaymentId = PaymentValidationSchemas.mpPaymentId.parse;
export const validateUuid = PaymentValidationSchemas.uuid.parse;
