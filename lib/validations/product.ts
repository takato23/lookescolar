/**
 * Product Validation Schemas
 *
 * Zod validation schemas for product catalog system.
 * Provides runtime validation and type safety for all product-related operations.
 *
 * @module lib/validations/product
 */

import { z } from 'zod';
import { PRODUCT_CONSTANTS } from '@/types/product';

// ============================================================================
// CATEGORY VALIDATION
// ============================================================================

/**
 * Product category validation schema
 */
export const ProductCategorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(100, 'Category name too long'),

  description: z.string()
    .max(500, 'Description too long')
    .optional(),

  icon: z.string()
    .max(50, 'Icon name too long')
    .optional(),

  sort_order: z.number()
    .int('Sort order must be an integer')
    .min(0, 'Sort order must be non-negative')
    .default(0),

  is_active: z.boolean()
    .default(true)
});

/**
 * Create category request validation
 */
export const CreateCategorySchema = ProductCategorySchema;

/**
 * Update category request validation
 */
export const UpdateCategorySchema = ProductCategorySchema.partial();

// ============================================================================
// PHOTO PRODUCT VALIDATION
// ============================================================================

/**
 * Base photo product validation schema
 */
export const PhotoProductBaseSchema = z.object({
  category_id: z.string()
    .uuid('Invalid category ID'),

  name: z.string()
    .min(1, 'Product name is required')
    .max(200, 'Product name too long'),

  description: z.string()
    .max(1000, 'Description too long')
    .optional(),

  type: z.enum(['print', 'digital', 'package', 'combo'], {
    errorMap: () => ({ message: 'Invalid product type' })
  }),

  base_price: z.number()
    .int('Price must be in cents (integer)')
    .min(PRODUCT_CONSTANTS.MIN_PRICE_CENTS, `Price must be at least ${PRODUCT_CONSTANTS.MIN_PRICE_CENTS} cents`)
    .max(PRODUCT_CONSTANTS.MAX_PRICE_CENTS, `Price cannot exceed ${PRODUCT_CONSTANTS.MAX_PRICE_CENTS} cents`),

  cost_price: z.number()
    .int('Cost price must be in cents (integer)')
    .min(0, 'Cost price must be non-negative')
    .optional(),

  image_url: z.string()
    .url('Invalid image URL')
    .max(500, 'Image URL too long')
    .optional(),

  sort_order: z.number()
    .int('Sort order must be an integer')
    .min(0, 'Sort order must be non-negative')
    .default(0),

  is_active: z.boolean()
    .default(true),

  is_featured: z.boolean()
    .default(false),

  metadata: z.record(z.any())
    .optional()
});

/**
 * Physical product specifications validation
 */
export const PhysicalProductSpecsSchema = z.object({
  width_cm: z.number()
    .min(PRODUCT_CONSTANTS.MIN_PHOTO_WIDTH_CM, `Width must be at least ${PRODUCT_CONSTANTS.MIN_PHOTO_WIDTH_CM}cm`)
    .max(PRODUCT_CONSTANTS.MAX_PHOTO_WIDTH_CM, `Width cannot exceed ${PRODUCT_CONSTANTS.MAX_PHOTO_WIDTH_CM}cm`),

  height_cm: z.number()
    .min(PRODUCT_CONSTANTS.MIN_PHOTO_HEIGHT_CM, `Height must be at least ${PRODUCT_CONSTANTS.MIN_PHOTO_HEIGHT_CM}cm`)
    .max(PRODUCT_CONSTANTS.MAX_PHOTO_HEIGHT_CM, `Height cannot exceed ${PRODUCT_CONSTANTS.MAX_PHOTO_HEIGHT_CM}cm`),

  finish: z.enum(['matte', 'glossy', 'canvas', 'metallic', 'wood'], {
    errorMap: () => ({ message: 'Invalid finish type' })
  }).optional(),

  paper_quality: z.enum(['standard', 'premium', 'professional'], {
    errorMap: () => ({ message: 'Invalid paper quality' })
  }).optional()
});

/**
 * Complete photo product validation with conditional physical specs
 */
export const PhotoProductSchema = PhotoProductBaseSchema.superRefine((data, ctx) => {
  // Physical products (print) must have dimensions
  if (data.type === 'print') {
    if (!('width_cm' in data) || !('height_cm' in data)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Physical products must have width_cm and height_cm',
        path: ['width_cm']
      });
    }
  }

  // Digital products should not have physical specs
  if (data.type === 'digital') {
    if ('width_cm' in data || 'height_cm' in data || 'finish' in data || 'paper_quality' in data) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Digital products should not have physical specifications',
        path: ['type']
      });
    }
  }

  // Cost price should not exceed base price
  if (data.cost_price && data.cost_price > data.base_price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Cost price cannot exceed base price',
      path: ['cost_price']
    });
  }
}).and(z.union([
  // Physical product with specs
  z.object({ type: z.literal('print') }).merge(PhysicalProductSpecsSchema),
  // Digital product without specs
  z.object({ type: z.literal('digital') }),
  // Package/combo products
  z.object({ type: z.enum(['package', 'combo']) })
]));

/**
 * Create photo product request validation
 */
export const CreatePhotoProductSchema = PhotoProductSchema;

/**
 * Update photo product request validation
 */
export const UpdatePhotoProductSchema = PhotoProductSchema.partial().omit({
  type: true // Cannot change product type after creation
});

// ============================================================================
// COMBO PACKAGE VALIDATION
// ============================================================================

/**
 * Combo package item validation
 */
export const ComboPackageItemSchema = z.object({
  product_id: z.string()
    .uuid('Invalid product ID'),

  quantity: z.number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),

  is_required: z.boolean()
    .default(true),

  additional_price: z.number()
    .int('Additional price must be in cents (integer)')
    .min(0, 'Additional price must be non-negative')
    .optional()
});

/**
 * Combo package validation schema
 */
export const ComboPackageSchema = z.object({
  name: z.string()
    .min(1, 'Package name is required')
    .max(200, 'Package name too long'),

  description: z.string()
    .max(1000, 'Description too long')
    .optional(),

  min_photos: z.number()
    .int('Minimum photos must be an integer')
    .min(1, 'Must require at least 1 photo'),

  max_photos: z.number()
    .int('Maximum photos must be an integer')
    .min(1, 'Maximum photos must be at least 1')
    .max(PRODUCT_CONSTANTS.MAX_PHOTOS_PER_ORDER, `Cannot exceed ${PRODUCT_CONSTANTS.MAX_PHOTOS_PER_ORDER} photos`)
    .optional()
    .nullable(),

  allows_duplicates: z.boolean()
    .default(true),

  pricing_type: z.enum(['fixed', 'per_photo', 'tiered'], {
    errorMap: () => ({ message: 'Invalid pricing type' })
  }),

  base_price: z.number()
    .int('Base price must be in cents (integer)')
    .min(PRODUCT_CONSTANTS.MIN_PRICE_CENTS, `Price must be at least ${PRODUCT_CONSTANTS.MIN_PRICE_CENTS} cents`)
    .max(PRODUCT_CONSTANTS.MAX_PRICE_CENTS, `Price cannot exceed ${PRODUCT_CONSTANTS.MAX_PRICE_CENTS} cents`),

  price_per_photo: z.number()
    .int('Price per photo must be in cents (integer)')
    .min(0, 'Price per photo must be non-negative')
    .optional(),

  image_url: z.string()
    .url('Invalid image URL')
    .max(500, 'Image URL too long')
    .optional(),

  badge_text: z.string()
    .max(50, 'Badge text too long')
    .optional(),

  badge_color: z.string()
    .max(50, 'Badge color too long')
    .optional(),

  sort_order: z.number()
    .int('Sort order must be an integer')
    .min(0, 'Sort order must be non-negative')
    .default(0),

  is_active: z.boolean()
    .default(true),

  is_featured: z.boolean()
    .default(false),

  metadata: z.record(z.any())
    .optional(),

  items: z.array(ComboPackageItemSchema)
    .optional()
}).superRefine((data, ctx) => {
  // Validate max_photos >= min_photos if max_photos is set
  if (data.max_photos !== null && data.max_photos !== undefined) {
    if (data.max_photos < data.min_photos) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maximum photos cannot be less than minimum photos',
        path: ['max_photos']
      });
    }
  }

  // Validate price_per_photo is required for per_photo pricing
  if (data.pricing_type === 'per_photo' && !data.price_per_photo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Price per photo is required for per_photo pricing type',
      path: ['price_per_photo']
    });
  }
});

/**
 * Create combo package request validation
 */
export const CreateComboPackageSchema = ComboPackageSchema;

/**
 * Update combo package request validation
 */
export const UpdateComboPackageSchema = ComboPackageSchema.partial().omit({
  items: true // Items updated separately
});

// ============================================================================
// EVENT PRICING VALIDATION
// ============================================================================

/**
 * Event product pricing validation schema
 */
export const EventProductPricingSchema = z.object({
  event_id: z.string()
    .uuid('Invalid event ID'),

  product_id: z.string()
    .uuid('Invalid product ID')
    .optional()
    .nullable(),

  combo_id: z.string()
    .uuid('Invalid combo ID')
    .optional()
    .nullable(),

  override_price: z.number()
    .int('Override price must be in cents (integer)')
    .min(0, 'Override price must be non-negative')
    .max(PRODUCT_CONSTANTS.MAX_PRICE_CENTS, `Price cannot exceed ${PRODUCT_CONSTANTS.MAX_PRICE_CENTS} cents`),

  is_active: z.boolean()
    .default(true)
}).superRefine((data, ctx) => {
  // Must specify either product_id OR combo_id, but not both
  const hasProduct = data.product_id !== null && data.product_id !== undefined;
  const hasCombo = data.combo_id !== null && data.combo_id !== undefined;

  if (!hasProduct && !hasCombo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Must specify either product_id or combo_id',
      path: ['product_id']
    });
  }

  if (hasProduct && hasCombo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Cannot specify both product_id and combo_id',
      path: ['product_id']
    });
  }
});

/**
 * Create event pricing request validation
 */
export const CreateEventPricingSchema = EventProductPricingSchema;

/**
 * Update event pricing request validation
 */
export const UpdateEventPricingSchema = EventProductPricingSchema.partial().omit({
  event_id: true,
  product_id: true,
  combo_id: true
});

// ============================================================================
// PRICE CALCULATION VALIDATION
// ============================================================================

/**
 * Selection item for price calculation
 */
export const PriceCalculationItemSchema = z.object({
  photo_id: z.string()
    .uuid('Invalid photo ID'),

  product_id: z.string()
    .uuid('Invalid product ID')
    .optional(),

  combo_id: z.string()
    .uuid('Invalid combo ID')
    .optional(),

  quantity: z.number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100'),

  options: z.record(z.any())
    .optional()
}).superRefine((data, ctx) => {
  // Must specify either product_id OR combo_id
  const hasProduct = data.product_id !== undefined;
  const hasCombo = data.combo_id !== undefined;

  if (!hasProduct && !hasCombo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Must specify either product_id or combo_id',
      path: ['product_id']
    });
  }

  if (hasProduct && hasCombo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Cannot specify both product_id and combo_id',
      path: ['product_id']
    });
  }
});

/**
 * Price calculation request validation
 */
export const PriceCalculationRequestSchema = z.object({
  event_id: z.string()
    .uuid('Invalid event ID'),

  selections: z.array(PriceCalculationItemSchema)
    .min(1, 'Must have at least one selection')
    .max(PRODUCT_CONSTANTS.MAX_PHOTOS_PER_ORDER, `Cannot exceed ${PRODUCT_CONSTANTS.MAX_PHOTOS_PER_ORDER} selections`),

  applyDiscounts: z.boolean()
    .optional()
    .default(true),

  promoCode: z.string()
    .max(50, 'Promo code too long')
    .optional()
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate and parse product category
 */
export function validateProductCategory(data: unknown) {
  return ProductCategorySchema.parse(data);
}

/**
 * Validate and parse photo product
 */
export function validatePhotoProduct(data: unknown) {
  return PhotoProductSchema.parse(data);
}

/**
 * Validate and parse combo package
 */
export function validateComboPackage(data: unknown) {
  return ComboPackageSchema.parse(data);
}

/**
 * Validate and parse event pricing
 */
export function validateEventPricing(data: unknown) {
  return EventProductPricingSchema.parse(data);
}

/**
 * Validate and parse price calculation request
 */
export function validatePriceCalculation(data: unknown) {
  return PriceCalculationRequestSchema.parse(data);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ProductCategoryInput = z.infer<typeof ProductCategorySchema>;
export type PhotoProductInput = z.infer<typeof PhotoProductSchema>;
export type ComboPackageInput = z.infer<typeof ComboPackageSchema>;
export type ComboPackageItemInput = z.infer<typeof ComboPackageItemSchema>;
export type EventProductPricingInput = z.infer<typeof EventProductPricingSchema>;
export type PriceCalculationInput = z.infer<typeof PriceCalculationRequestSchema>;
