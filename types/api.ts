// API Response Types

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    has_more: boolean;
  };
}

// Photo Types
export interface Photo {
  id: string;
  filename: string;
  storage_path: string;
  processed_at: string | null;
  metadata: Record<string, any>;
  event_id: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface PhotoWithSignedUrl extends Photo {
  signed_url: string;
  expires_at?: string;
}

export interface PhotoAssignment {
  id: string;
  photo_id: string;
  subject_id: string;
  assigned_at: string;
  photo: Photo;
}

// Subject Types
export interface Subject {
  id: string;
  name: string;
  parent_name: string;
  parent_email: string;
  event_id: string;
  token: string;
  token_expires_at: string;
  created_at: string;
  updated_at?: string;
}

export interface SubjectWithEvent extends Subject {
  event: {
    id: string;
    name: string;
    date: string;
    school_name: string;
    status: string;
    photo_prices: Record<string, number>;
  };
}

// Event Types
export interface Event {
  id: string;
  name: string;
  description: string | null;
  date: string;
  school_name: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  photo_prices: Record<string, number>;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Order Types
export interface Order {
  id: string;
  subject_id: string;
  status: 'pending' | 'processing' | 'paid' | 'cancelled' | 'delivered';
  total_amount: number;
  mp_preference_id?: string;
  mp_payment_id?: string;
  customer_data?: {
    name: string;
    email: string;
    phone: string;
  };
  payment_data?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  photo_id: string;
  quantity: number;
  price: number;
}

// Gallery Types
export interface GalleryResponse {
  subject: {
    id: string;
    name: string;
    parent_name: string;
    parent_email: string;
    event: {
      id: string;
      name: string;
      date: string;
      school_name: string;
      photo_prices: Record<string, number>;
    } | null;
  };
  photos: PhotoWithSignedUrl[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
    total_pages: number;
  };
  active_order?: {
    id: string;
    status: string;
    total_amount: number;
    created_at: string;
    items_count: number;
  } | null;
}

// Upload Types
export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

// Webhook Types
export interface MercadoPagoWebhook {
  id: number;
  live_mode: boolean;
  type: string;
  date_created: string;
  application_id: number;
  user_id: number;
  version: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

// Cart Types
export interface CartItem {
  photo_id: string;
  filename: string;
  quantity: number;
  price: number;
}

export interface CartValidationResponse {
  valid: boolean;
  message?: string;
  subject_id?: string;
  items_count?: number;
  total_quantity?: number;
  validation_time?: string;
  error?: string;
  active_order?: {
    id: string;
    status: string;
    total_amount: number;
    created_at: string;
  };
}

export interface CartCalculationResponse {
  valid: boolean;
  subject_id: string;
  event: {
    id: string;
    name: string;
    school_name: string;
  };
  pricing: {
    base_price: number;
    currency: string;
    prices: Record<string, number>;
  };
  items: Array<{
    photo_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    filename: string;
  }>;
  summary: {
    items_count: number;
    total_quantity: number;
    subtotal: number;
    tax: number;
    total: number;
  };
  calculation_time: string;
}

// Error Types
export interface ApiError {
  error: string;
  details?: any;
  code?: string;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// STORE CONFIGURATION API TYPES
// ============================================================================

import type { StoreConfig } from './store-config';
import type {
  PhotoProduct,
  ComboPackage,
  ProductCategory,
  EventProductPricing,
  ProductCatalog,
  PriceCalculation,
} from './product';

/**
 * Store configuration response
 */
export type StoreConfigResponse = ApiResponse<StoreConfig>;

/**
 * Store configuration list response
 */
export interface StoreConfigListResponse {
  data: StoreConfig[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    has_more: boolean;
  };
}

// ============================================================================
// PRODUCT API TYPES
// ============================================================================

/**
 * Product response
 */
export type ProductResponse = ApiResponse<PhotoProduct>;

/**
 * Products list response
 */
export type ProductsResponse = ApiResponse<PhotoProduct[]>;

/**
 * Create product request
 */
export interface CreateProductRequest {
  category_id: string;
  name: string;
  description?: string;
  type: 'print' | 'digital' | 'package' | 'combo';
  width_cm?: number;
  height_cm?: number;
  finish?: string;
  paper_quality?: string;
  base_price: number;
  cost_price?: number;
  image_url?: string;
  sort_order?: number;
  is_featured?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Update product request
 */
export interface UpdateProductRequest {
  id: string;
  updates: Partial<Omit<PhotoProduct, 'id' | 'created_at' | 'updated_at' | 'category'>>;
}

// ============================================================================
// COMBO PACKAGE API TYPES
// ============================================================================

/**
 * Combo package response
 */
export type ComboPackageResponse = ApiResponse<ComboPackage>;

/**
 * Combo packages list response
 */
export type ComboPackagesResponse = ApiResponse<ComboPackage[]>;

/**
 * Create combo request
 */
export interface CreateComboRequest {
  name: string;
  description?: string;
  min_photos: number;
  max_photos?: number | null;
  allows_duplicates?: boolean;
  pricing_type: 'fixed' | 'per_photo' | 'tiered';
  base_price: number;
  price_per_photo?: number;
  image_url?: string;
  badge_text?: string;
  badge_color?: string;
  is_featured?: boolean;
  items?: Array<{
    product_id: string;
    quantity: number;
    is_required?: boolean;
    additional_price?: number;
  }>;
}

// ============================================================================
// CATEGORY API TYPES
// ============================================================================

/**
 * Category response
 */
export type CategoryResponse = ApiResponse<ProductCategory>;

/**
 * Categories list response
 */
export type CategoriesResponse = ApiResponse<ProductCategory[]>;

// ============================================================================
// PRICING API TYPES
// ============================================================================

/**
 * Calculate price request
 */
export interface CalculatePriceRequest {
  event_id: string;
  selections: Array<{
    photo_id: string;
    product_id?: string;
    combo_id?: string;
    quantity: number;
    options?: Record<string, any>;
  }>;
  applyDiscounts?: boolean;
  promoCode?: string;
}

/**
 * Price calculation response
 */
export type PriceCalculationResponse = ApiResponse<PriceCalculation>;

/**
 * Product catalog response
 */
export type ProductCatalogResponse = ApiResponse<ProductCatalog>;
