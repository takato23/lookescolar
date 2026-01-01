/**
 * Product Type Definitions
 *
 * Comprehensive TypeScript types for product catalog system.
 * Includes physical products, digital products, and combo packages.
 *
 * @module types/product
 */

import type { Database } from './database';

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

export type ProductCategoryRow = Database['public']['Tables']['product_categories']['Row'];
export type PhotoProductRow = Database['public']['Tables']['photo_products']['Row'];
export type ComboPackageRow = Database['public']['Tables']['combo_packages']['Row'];
export type ComboPackageItemRow = Database['public']['Tables']['combo_package_items']['Row'];
export type EventProductPricingRow = Database['public']['Tables']['event_product_pricing']['Row'];

// ============================================================================
// ENUMS & LITERAL TYPES
// ============================================================================

/**
 * Product type classification
 */
export type ProductType = 'print' | 'digital' | 'package' | 'combo';

/**
 * Physical product finish types
 */
export type FinishType = 'matte' | 'glossy' | 'canvas' | 'metallic' | 'wood';

/**
 * Paper quality levels
 */
export type PaperQuality = 'standard' | 'premium' | 'professional';

/**
 * Pricing strategy types for combo packages
 */
export type PricingType = 'fixed' | 'per_photo' | 'tiered';

// ============================================================================
// CATEGORY TYPES
// ============================================================================

/**
 * Product category definition
 * Organizes products into logical groups
 */
export interface ProductCategory {
  /** Unique identifier */
  id: string;
  /** Category name */
  name: string;
  /** Category description */
  description?: string;
  /** Icon name (Lucide icon) */
  icon?: string;
  /** Display order */
  sort_order: number;
  /** Whether category is active */
  is_active: boolean;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Type for creating new category
 */
export type NewProductCategory = Omit<ProductCategory, 'id' | 'created_at' | 'updated_at'>;

/**
 * Type for updating category
 */
export type UpdateProductCategory = Partial<Omit<ProductCategory, 'id' | 'created_at' | 'updated_at'>>;

// ============================================================================
// PHOTO PRODUCT TYPES
// ============================================================================

/**
 * Photo product definition
 * Represents individual physical or digital photo products
 */
export interface PhotoProduct {
  /** Unique identifier */
  id: string;
  /** Parent category ID */
  category_id: string;
  /** Product name */
  name: string;
  /** Product description */
  description?: string;
  /** Product type */
  type: ProductType;

  // Physical specifications (required for physical products)
  /** Width in centimeters */
  width_cm?: number;
  /** Height in centimeters */
  height_cm?: number;
  /** Finish type */
  finish?: FinishType;
  /** Paper quality */
  paper_quality?: PaperQuality;

  // Pricing
  /** Base price in cents */
  base_price: number;
  /** Cost price in cents (for margin calculation) */
  cost_price?: number;

  // Display
  /** Product mockup/preview image URL */
  image_url?: string;
  /** Display order */
  sort_order: number;
  /** Whether product is active */
  is_active: boolean;
  /** Whether product is featured */
  is_featured: boolean;

  // Metadata
  /** Additional metadata (JSONB) */
  metadata?: Record<string, any>;

  // Timestamps
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;

  // Relations (optional, populated when joined)
  /** Parent category */
  category?: ProductCategory;
}

/**
 * Type for creating new photo product
 */
export type NewPhotoProduct = Omit<PhotoProduct, 'id' | 'created_at' | 'updated_at' | 'category'> & {
  category_id: string; // Required
};

/**
 * Type for updating photo product
 */
export type UpdatePhotoProduct = Partial<Omit<PhotoProduct, 'id' | 'created_at' | 'updated_at' | 'category'>>;

// ============================================================================
// COMBO PACKAGE TYPES
// ============================================================================

/**
 * Combo package definition
 * Bundles multiple products with special pricing
 */
export interface ComboPackage {
  /** Unique identifier */
  id: string;
  /** Package name */
  name: string;
  /** Package description */
  description?: string;

  // Configuration
  /** Minimum number of photos required */
  min_photos: number;
  /** Maximum number of photos allowed (null = unlimited) */
  max_photos?: number | null;
  /** Whether duplicate photo selections are allowed */
  allows_duplicates: boolean;

  // Pricing strategy
  /** Pricing type */
  pricing_type: PricingType;
  /** Base package price in cents */
  base_price: number;
  /** Additional cost per photo in cents (for per_photo pricing) */
  price_per_photo?: number;

  // Display
  /** Package mockup/preview image URL */
  image_url?: string;
  /** Badge text (e.g., "POPULAR", "BEST VALUE") */
  badge_text?: string;
  /** Badge color */
  badge_color?: string;
  /** Display order */
  sort_order: number;
  /** Whether package is active */
  is_active: boolean;
  /** Whether package is featured */
  is_featured: boolean;

  // Metadata
  /** Additional metadata (JSONB) */
  metadata?: Record<string, any>;

  // Timestamps
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;

  // Relations (optional, populated when joined)
  /** Products included in package */
  items?: ComboPackageItem[];
}

/**
 * Type for creating new combo package
 */
export type NewComboPackage = Omit<ComboPackage, 'id' | 'created_at' | 'updated_at' | 'items'>;

/**
 * Type for updating combo package
 */
export type UpdateComboPackage = Partial<Omit<ComboPackage, 'id' | 'created_at' | 'updated_at' | 'items'>>;

// ============================================================================
// COMBO PACKAGE ITEM TYPES
// ============================================================================

/**
 * Combo package item definition
 * Represents a product included in a combo package
 */
export interface ComboPackageItem {
  /** Unique identifier */
  id: string;
  /** Parent combo package ID */
  combo_id: string;
  /** Product ID */
  product_id: string;
  /** Quantity of this product in the combo */
  quantity: number;
  /** Whether this product is required */
  is_required: boolean;
  /** Additional price in cents (if different from base product price) */
  additional_price?: number;

  // Timestamps
  /** Creation timestamp */
  created_at: string;

  // Relations (optional, populated when joined)
  /** Product details */
  product?: PhotoProduct;
}

/**
 * Type for creating new combo package item
 */
export type NewComboPackageItem = Omit<ComboPackageItem, 'id' | 'created_at' | 'product'> & {
  combo_id: string;    // Required
  product_id: string;  // Required
};

/**
 * Type for updating combo package item
 */
export type UpdateComboPackageItem = Partial<Omit<ComboPackageItem, 'id' | 'combo_id' | 'product_id' | 'created_at' | 'product'>>;

// ============================================================================
// EVENT PRICING TYPES
// ============================================================================

/**
 * Event-specific product pricing
 * Allows overriding product/combo prices per event
 */
export interface EventProductPricing {
  /** Unique identifier */
  id: string;
  /** Event ID */
  event_id: string;
  /** Product ID (null if combo_id is set) */
  product_id?: string | null;
  /** Combo package ID (null if product_id is set) */
  combo_id?: string | null;
  /** Override price in cents */
  override_price: number;
  /** Whether this pricing is active */
  is_active: boolean;

  // Timestamps
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;

  // Relations (optional, populated when joined)
  /** Product details (if product_id is set) */
  product?: PhotoProduct;
  /** Combo package details (if combo_id is set) */
  combo?: ComboPackage;
}

/**
 * Type for creating new event pricing
 */
export type NewEventProductPricing = Omit<EventProductPricing, 'id' | 'created_at' | 'updated_at' | 'product' | 'combo'> & {
  event_id: string; // Required
};

/**
 * Type for updating event pricing
 */
export type UpdateEventProductPricing = Partial<Omit<EventProductPricing, 'id' | 'event_id' | 'created_at' | 'updated_at' | 'product' | 'combo'>>;

// ============================================================================
// ENHANCED TYPES WITH RELATIONS
// ============================================================================

/**
 * Photo product with category details
 */
export type PhotoProductWithCategory = PhotoProduct & {
  category: ProductCategory;
};

/**
 * Combo package with all included items and product details
 */
export type ComboPackageWithItems = ComboPackage & {
  items: Array<ComboPackageItem & { product: PhotoProduct }>;
};

/**
 * Event pricing with product or combo details
 */
export type EventPricingWithDetails = EventProductPricing & {
  product?: PhotoProduct;
  combo?: ComboPackage;
};

// ============================================================================
// CATALOG & PRICING TYPES
// ============================================================================

/**
 * Complete product catalog response
 */
export interface ProductCatalog {
  /** All product categories */
  categories: ProductCategory[];
  /** All photo products */
  products: PhotoProduct[];
  /** All combo packages */
  combos: ComboPackage[];
  /** Event-specific pricing overrides (optional) */
  event_pricing?: EventProductPricing[];
}

/**
 * Price calculation breakdown
 */
export interface PriceCalculation {
  /** Base price before discounts/additions */
  base_price: number;
  /** Total discounts applied */
  discounts: number;
  /** Additional charges */
  additions: number;
  /** Subtotal after discounts/additions */
  subtotal: number;
  /** Tax amount (optional) */
  tax?: number;
  /** Final total price */
  total: number;
  /** Detailed breakdown of each line item */
  breakdown: Array<{
    /** Type of line item */
    item_type: 'product' | 'combo' | 'discount' | 'tax';
    /** Item name */
    name: string;
    /** Quantity */
    quantity: number;
    /** Unit price in cents */
    unit_price: number;
    /** Total price for this line */
    total_price: number;
  }>;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a product is physical
 */
export function isPhysicalProduct(product: PhotoProduct): boolean {
  return (
    product.type === 'print' &&
    product.width_cm !== undefined &&
    product.height_cm !== undefined &&
    product.width_cm > 0 &&
    product.height_cm > 0
  );
}

/**
 * Type guard to check if a product is digital
 */
export function isDigitalProduct(product: PhotoProduct): boolean {
  return product.type === 'digital';
}

/**
 * Type guard to check if a product is a combo/package
 */
export function isComboProduct(product: PhotoProduct): boolean {
  return product.type === 'combo' || product.type === 'package';
}

/**
 * Type guard to check if pricing type is valid
 */
export function isPricingType(value: unknown): value is PricingType {
  return value === 'fixed' || value === 'per_photo' || value === 'tiered';
}

/**
 * Type guard to check if finish type is valid
 */
export function isFinishType(value: unknown): value is FinishType {
  const validFinishes: FinishType[] = ['matte', 'glossy', 'canvas', 'metallic', 'wood'];
  return typeof value === 'string' && validFinishes.includes(value as FinishType);
}

/**
 * Type guard to check if paper quality is valid
 */
export function isPaperQuality(value: unknown): value is PaperQuality {
  const validQualities: PaperQuality[] = ['standard', 'premium', 'professional'];
  return typeof value === 'string' && validQualities.includes(value as PaperQuality);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format product size for display
 */
export function formatProductSize(product: PhotoProduct): string {
  if (!isPhysicalProduct(product)) {
    return 'Digital';
  }
  return `${product.width_cm}×${product.height_cm}cm`;
}

/**
 * Format product specifications for display
 */
export function formatProductSpecs(product: PhotoProduct): string {
  const parts: string[] = [];

  if (isPhysicalProduct(product)) {
    parts.push(formatProductSize(product));
    if (product.finish) {
      parts.push(product.finish);
    }
    if (product.paper_quality && product.paper_quality !== 'standard') {
      parts.push(product.paper_quality);
    }
  } else {
    parts.push('Digital');
  }

  return parts.join(' • ');
}

/**
 * Calculate combo price based on pricing type
 */
export function calculateComboPrice(
  combo: ComboPackage,
  photoCount: number
): number {
  switch (combo.pricing_type) {
    case 'fixed':
      return combo.base_price;
    case 'per_photo':
      return combo.base_price + (combo.price_per_photo || 0) * photoCount;
    case 'tiered':
      // For tiered pricing, base_price is used as base tier
      // Additional tiers can be implemented via metadata
      return combo.base_price;
    default:
      return combo.base_price;
  }
}

/**
 * Calculate profit margin for a product
 */
export function calculateMargin(product: PhotoProduct): number | null {
  if (!product.cost_price || product.cost_price === 0) {
    return null;
  }
  return ((product.base_price - product.cost_price) / product.base_price) * 100;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Product validation constants
 */
export const PRODUCT_CONSTANTS = {
  /** Maximum photos per order */
  MAX_PHOTOS_PER_ORDER: 50,
  /** Minimum photo width in centimeters */
  MIN_PHOTO_WIDTH_CM: 5,
  /** Maximum photo width in centimeters */
  MAX_PHOTO_WIDTH_CM: 100,
  /** Minimum photo height in centimeters */
  MIN_PHOTO_HEIGHT_CM: 5,
  /** Maximum photo height in centimeters */
  MAX_PHOTO_HEIGHT_CM: 150,
  /** Minimum price in cents ($1) */
  MIN_PRICE_CENTS: 100,
  /** Maximum price in cents ($10,000) */
  MAX_PRICE_CENTS: 1000000,
  /** Default paper quality */
  DEFAULT_PAPER_QUALITY: 'standard' as PaperQuality,
  /** Default finish */
  DEFAULT_FINISH: 'glossy' as FinishType,
} as const;

/**
 * Common product sizes (width x height in cm)
 */
export const COMMON_PHOTO_SIZES = [
  { width: 4, height: 5, label: '4x5 cm (Carnet)' },
  { width: 10, height: 15, label: '10x15 cm (Estándar)' },
  { width: 13, height: 18, label: '13x18 cm' },
  { width: 15, height: 20, label: '15x20 cm' },
  { width: 15, height: 21, label: '15x21 cm (A5)' },
  { width: 20, height: 25, label: '20x25 cm' },
  { width: 20, height: 30, label: '20x30 cm' },
  { width: 30, height: 40, label: '30x40 cm' },
] as const;
