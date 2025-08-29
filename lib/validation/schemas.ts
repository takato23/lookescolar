/**
 * Comprehensive Input Validation Schemas
 * Uses Zod for runtime type checking and input sanitization
 */

import { z } from 'zod';

// Base validation schemas
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format')
  .describe('UUID identifier');

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email too long')
  .toLowerCase()
  .describe('Email address');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-'\.]+$/, 'Invalid characters in name')
  .transform((s) => s.trim())
  .describe('Person name');

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone format')
  .min(8, 'Phone too short')
  .max(20, 'Phone too long')
  .transform((s) => s.replace(/\s/g, ''))
  .optional()
  .describe('Phone number');

export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL too long')
  .describe('URL');

export const tokenSchema = z
  .string()
  .min(20, 'Token too short')
  .max(64, 'Token too long')
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid token format')
  .describe('Security token');

// File validation schemas
export const fileTypeSchema = z
  .string()
  .refine(
    (type) =>
      ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(type),
    'Invalid file type. Only JPEG, PNG, and WebP images are allowed'
  )
  .describe('File MIME type');

export const fileExtensionSchema = z
  .string()
  .refine(
    (ext) => ['.jpg', '.jpeg', '.png', '.webp'].includes(ext.toLowerCase()),
    'Invalid file extension'
  )
  .describe('File extension');

export const fileSizeSchema = z
  .number()
  .min(1, 'File cannot be empty')
  .max(10 * 1024 * 1024, 'File too large (max 10MB)')
  .describe('File size in bytes');

export const filenameSchema = z
  .string()
  .min(1, 'Filename is required')
  .max(255, 'Filename too long')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid characters in filename')
  .refine(
    (name) => !name.startsWith('.') && !name.includes('..'),
    'Invalid filename pattern'
  )
  .describe('Safe filename');

// Photo upload schemas
export const photoUploadSchema = z.object({
  event_id: uuidSchema.optional(),
  photo_type: z.enum(['private', 'public', 'classroom']).default('private'),
  files: z
    .array(
      z.object({
        name: filenameSchema,
        type: fileTypeSchema,
        size: fileSizeSchema,
      })
    )
    .min(1, 'At least one file is required')
    .max(100, 'Too many files (max 100)'),
});

// Event schemas
export const eventCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Event name is required')
    .max(200, 'Event name too long')
    .transform((s) => s.trim()),
  description: z
    .string()
    .max(1000, 'Description too long')
    .optional()
    .transform((s) => s?.trim()),
  school_name: z
    .string()
    .min(1, 'School name is required')
    .max(200, 'School name too long')
    .transform((s) => s.trim()),
  start_date: z
    .string()
    .datetime('Invalid start date format')
    .transform((s) => new Date(s)),
  end_date: z
    .string()
    .datetime('Invalid end date format')
    .transform((s) => new Date(s)),
  location: z
    .string()
    .max(300, 'Location too long')
    .optional()
    .transform((s) => s?.trim()),
});

export const eventUpdateSchema = eventCreateSchema.partial();

// Subject schemas
export const subjectCreateSchema = z.object({
  name: nameSchema,
  event_id: uuidSchema,
  grade: z
    .string()
    .max(50, 'Grade too long')
    .optional()
    .transform((s) => s?.trim()),
  section: z
    .string()
    .max(50, 'Section too long')
    .optional()
    .transform((s) => s?.trim()),
  student_number: z
    .string()
    .max(50, 'Student number too long')
    .optional()
    .transform((s) => s?.trim()),
});

export const subjectUpdateSchema = subjectCreateSchema
  .partial()
  .omit({ event_id: true });

// Order schemas
export const orderCreateSchema = z.object({
  family_email: emailSchema,
  family_name: nameSchema,
  family_phone: phoneSchema,
  selected_photos: z
    .array(uuidSchema)
    .min(1, 'At least one photo must be selected')
    .max(50, 'Too many photos selected (max 50)'),
  total_amount_cents: z
    .number()
    .min(1, 'Amount must be greater than 0')
    .max(1000000, 'Amount too large'), // $10,000 max
  notes: z
    .string()
    .max(500, 'Notes too long')
    .optional()
    .transform((s) => s?.trim()),
});

// Token management schemas
export const tokenGenerateSchema = z.object({
  subject_id: uuidSchema,
  expiry_days: z
    .number()
    .min(1, 'Expiry must be at least 1 day')
    .max(365, 'Expiry cannot exceed 1 year')
    .default(30),
  rotate_existing: z.boolean().default(false),
});

export const tokenValidateSchema = z.object({
  token: tokenSchema,
});

// Photo tagging schemas
export const photoTagSchema = z.object({
  photo_id: uuidSchema,
  subject_id: uuidSchema,
  tagged_by: z.enum(['admin', 'qr', 'manual']).default('manual'),
});

export const batchPhotoTagSchema = z.object({
  photo_ids: z
    .array(uuidSchema)
    .min(1, 'At least one photo ID is required')
    .max(100, 'Too many photos (max 100)'),
  subject_id: uuidSchema,
  tagged_by: z.enum(['admin', 'qr', 'manual']).default('manual'),
});

// QR code schemas
export const qrCodeSchema = z.object({
  text: z
    .string()
    .min(1, 'QR code text is required')
    .max(1000, 'QR code text too long')
    .regex(
      /^STUDENT:[a-f0-9-]{36}:[^:]+:[a-f0-9-]{36}$/i,
      'Invalid QR code format. Expected: STUDENT:ID:NAME:EVENT_ID'
    ),
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z
    .number()
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page too high')
    .default(1),
  limit: z
    .number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit too high (max 100)')
    .default(20),
  order_by: z
    .string()
    .max(50, 'Order by field name too long')
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid order by field name')
    .optional(),
  order_direction: z.enum(['asc', 'desc']).default('asc'),
});

// Search schemas
export const searchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .max(100, 'Search query too long')
    .transform((s) => s.trim()),
  filters: z
    .record(z.string().max(100))
    .optional()
    .refine(
      (filters) => !filters || Object.keys(filters).length <= 10,
      'Too many filters (max 10)'
    ),
});

// Payment schemas
export const paymentWebhookSchema = z.object({
  type: z.string().max(50),
  action: z.string().max(50),
  data: z.object({
    id: z.string().max(50),
  }),
});

export const paymentPreferenceSchema = z.object({
  order_id: uuidSchema,
  amount_cents: z
    .number()
    .min(1, 'Amount must be greater than 0')
    .max(1000000, 'Amount too large'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(200, 'Description too long'),
  payer_email: emailSchema,
});

// Admin schemas
export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

export const adminCreateSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(12, 'Admin password must be at least 12 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number and special character'
    ),
  name: nameSchema,
  role: z.enum(['admin', 'super_admin']).default('admin'),
});

// Settings schemas
export const settingsUpdateSchema = z.object({
  watermark_text: z.string().max(100, 'Watermark text too long').optional(),
  watermark_opacity: z
    .number()
    .min(0, 'Opacity cannot be negative')
    .max(1, 'Opacity cannot exceed 1')
    .optional(),
  default_photo_price_cents: z
    .number()
    .min(1, 'Price must be positive')
    .max(100000, 'Price too high')
    .optional(),
  max_photos_per_order: z
    .number()
    .min(1, 'Must allow at least 1 photo')
    .max(100, 'Too many photos allowed')
    .optional(),
});

// Utility functions for validation
export function validateUUID(value: unknown): value is string {
  return uuidSchema.safeParse(value).success;
}

export function validateEmail(value: unknown): value is string {
  return emailSchema.safeParse(value).success;
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 255);
}

export function sanitizeString(
  input: string,
  maxLength: number = 1000
): string {
  return input
    .trim()
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
    .substring(0, maxLength);
}

// Validation middleware helper
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (
    data: unknown
  ): Promise<
    { success: true; data: T } | { success: false; errors: string[] }
  > => {
    try {
      const validatedData = await schema.parseAsync(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(
          (err) => `${err.path.join('.')}: ${err.message}`
        );
        return { success: false, errors };
      }
      return { success: false, errors: ['Validation failed'] };
    }
  };
}

// Export commonly used validation functions
export const validatePhotoUpload =
  createValidationMiddleware(photoUploadSchema);
export const validateEventCreate =
  createValidationMiddleware(eventCreateSchema);
export const validateSubjectCreate =
  createValidationMiddleware(subjectCreateSchema);
export const validateOrderCreate =
  createValidationMiddleware(orderCreateSchema);
export const validateTokenGenerate =
  createValidationMiddleware(tokenGenerateSchema);
export const validateQRCode = createValidationMiddleware(qrCodeSchema);
export const validatePagination = createValidationMiddleware(paginationSchema);
export const validateSearch = createValidationMiddleware(searchSchema);
export const validatePaymentWebhook =
  createValidationMiddleware(paymentWebhookSchema);
export const validateAdminLogin = createValidationMiddleware(adminLoginSchema);
