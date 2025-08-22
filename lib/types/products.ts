// Product Catalog Types for Photo Products and Combos

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string; // Lucide icon name
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductType = 'print' | 'digital' | 'package' | 'combo';
export type FinishType = 'matte' | 'glossy' | 'canvas' | 'metallic' | 'wood';
export type PaperQuality = 'standard' | 'premium' | 'professional';
export type PricingType = 'fixed' | 'per_photo' | 'tiered';

export interface PhotoProduct {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  type: ProductType;
  
  // Physical specifications
  width_cm?: number;
  height_cm?: number;
  finish?: FinishType;
  paper_quality?: PaperQuality;
  
  // Pricing
  base_price: number; // in cents
  cost_price?: number; // in cents
  
  // Display
  image_url?: string;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
  
  // Relations
  category?: ProductCategory;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ComboPackage {
  id: string;
  name: string;
  description?: string;
  
  // Configuration
  min_photos: number;
  max_photos?: number;
  allows_duplicates: boolean;
  
  // Pricing
  pricing_type: PricingType;
  base_price: number; // in cents
  price_per_photo?: number; // in cents
  
  // Display
  image_url?: string;
  badge_text?: string;
  badge_color?: string;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
  
  // Relations
  items?: ComboPackageItem[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ComboPackageItem {
  id: string;
  combo_id: string;
  product_id: string;
  quantity: number;
  is_required: boolean;
  additional_price?: number; // in cents
  
  // Relations
  product?: PhotoProduct;
  created_at: string;
}

export interface EventProductPricing {
  id: string;
  event_id: string;
  product_id?: string;
  combo_id?: string;
  override_price: number; // in cents
  is_active: boolean;
  
  // Relations
  product?: PhotoProduct;
  combo?: ComboPackage;
  created_at: string;
  updated_at: string;
}

// Enhanced cart item with product details
export interface EnhancedCartItem {
  id?: string;
  photo_id: string;
  product_id?: string;
  combo_id?: string;
  
  // Product details
  product_name: string;
  product_specs: {
    type: ProductType;
    width_cm?: number;
    height_cm?: number;
    finish?: FinishType;
    paper_quality?: PaperQuality;
    is_digital?: boolean;
  };
  
  // Pricing and quantity
  quantity: number;
  unit_price: number; // in cents
  subtotal: number; // in cents
  
  // Display
  filename?: string;
  watermark_url?: string;
  
  // Metadata
  metadata?: {
    event_id?: string;
    context?: 'public' | 'family';
    token?: string;
  };
}

// Product selection state
export interface ProductSelection {
  photos: string[]; // selected photo IDs
  products: Array<{
    product_id?: string;
    combo_id?: string;
    quantity: number;
    custom_options?: Record<string, any>;
  }>;
  total_price: number;
  item_count: number;
}

// Product catalog response
export interface ProductCatalog {
  categories: ProductCategory[];
  products: PhotoProduct[];
  combos: ComboPackage[];
  event_pricing?: EventProductPricing[];
}

// Product pricing calculation
export interface PriceCalculation {
  base_price: number;
  discounts: number;
  additions: number;
  subtotal: number;
  tax?: number;
  total: number;
  breakdown: Array<{
    item_type: 'product' | 'combo' | 'discount' | 'tax';
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

// Product search and filter options
export interface ProductFilters {
  category_ids?: string[];
  types?: ProductType[];
  finishes?: FinishType[];
  paper_qualities?: PaperQuality[];
  price_range?: {
    min: number;
    max: number;
  };
  size_range?: {
    min_width?: number;
    max_width?: number;
    min_height?: number;
    max_height?: number;
  };
  is_featured?: boolean;
  is_active?: boolean;
}

// Product recommendation
export interface ProductRecommendation {
  product?: PhotoProduct;
  combo?: ComboPackage;
  reason: 'popular' | 'best_value' | 'similar' | 'upsell' | 'featured';
  confidence: number; // 0-1
  savings?: number; // in cents
  description: string;
}

// Shopping cart state for products
export interface ProductCartState {
  items: EnhancedCartItem[];
  selection: ProductSelection;
  pricing: PriceCalculation;
  recommendations: ProductRecommendation[];
  
  // Validation
  is_valid: boolean;
  validation_errors: string[];
  
  // Session
  event_id?: string;
  token?: string;
}

// API request/response types
export interface CreateProductRequest {
  category_id: string;
  name: string;
  description?: string;
  type: ProductType;
  width_cm?: number;
  height_cm?: number;
  finish?: FinishType;
  paper_quality?: PaperQuality;
  base_price: number;
  image_url?: string;
  is_featured?: boolean;
}

export interface CreateComboRequest {
  name: string;
  description?: string;
  min_photos: number;
  max_photos?: number;
  allows_duplicates?: boolean;
  pricing_type: PricingType;
  base_price: number;
  price_per_photo?: number;
  image_url?: string;
  badge_text?: string;
  badge_color?: string;
  is_featured?: boolean;
  items: Array<{
    product_id: string;
    quantity: number;
    is_required?: boolean;
    additional_price?: number;
  }>;
}

export interface ProductCatalogResponse {
  success: boolean;
  data?: ProductCatalog;
  error?: string;
}

export interface PriceCalculationRequest {
  event_id: string;
  selections: Array<{
    photo_id: string;
    product_id?: string;
    combo_id?: string;
    quantity: number;
  }>;
}

export interface PriceCalculationResponse {
  success: boolean;
  data?: PriceCalculation;
  error?: string;
}

// Utility types
export type ProductWithCategory = PhotoProduct & {
  category: ProductCategory;
};

export type ComboWithItems = ComboPackage & {
  items: Array<ComboPackageItem & { product: PhotoProduct }>;
};

export type EventPricingWithProduct = EventProductPricing & {
  product?: PhotoProduct;
  combo?: ComboPackage;
};

// Constants for validation
export const PRODUCT_CONSTANTS = {
  MAX_PHOTOS_PER_ORDER: 50,
  MIN_PHOTO_WIDTH_CM: 5,
  MAX_PHOTO_WIDTH_CM: 100,
  MIN_PHOTO_HEIGHT_CM: 5,
  MAX_PHOTO_HEIGHT_CM: 150,
  MIN_PRICE_CENTS: 100, // $1 minimum
  MAX_PRICE_CENTS: 1000000, // $10,000 maximum
  DEFAULT_PAPER_QUALITY: 'standard' as PaperQuality,
  DEFAULT_FINISH: 'glossy' as FinishType,
} as const;

// Helper functions for type validation
export function isPhysicalProduct(product: PhotoProduct): boolean {
  return product.type === 'print' && 
         product.width_cm !== undefined && 
         product.height_cm !== undefined;
}

export function isDigitalProduct(product: PhotoProduct): boolean {
  return product.type === 'digital';
}

export function isComboProduct(product: PhotoProduct): boolean {
  return product.type === 'combo' || product.type === 'package';
}

export function formatProductSize(product: PhotoProduct): string {
  if (!isPhysicalProduct(product)) {
    return 'Digital';
  }
  return `${product.width_cm}×${product.height_cm}cm`;
}

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