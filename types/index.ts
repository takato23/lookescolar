/**
 * Type Definitions Index
 *
 * Central export point for all TypeScript type definitions.
 * Import types from this file for consistency across the application.
 *
 * @module types
 *
 * @example
 * ```typescript
 * import type { StoreConfig, PhotoProduct, TemplateProps } from '@/types';
 * ```
 */

// ============================================================================
// STORE CONFIGURATION TYPES
// ============================================================================

export type {
  // Main Types
  StoreConfig,
  NewStoreConfig,
  UpdateStoreConfig,
  PatchStoreConfig,

  // Design System Types
  TemplateType,
  CoverStyle,
  CoverVariant,
  TypographyStyle,
  ColorScheme,
  GridStyle,
  ThumbSize,
  GridSpacing,
  NavStyle,
  AppDensity,
  HeaderStyle,

  // Structured Config Types
  BrandColors,
  GridSettings,
  CoverSettings,
  TypographySettings,
  ColorSettings,
  AppSettings,
  DesignConfig,
  StoreTexts,
  PaymentMethod,
  StoreFeatures,
  ThemeCustomization,

  // Product Types (Store-specific)
  ProductType as StoreProductType,
  ProductQuality,
  ProductOptions,
  StoreProduct,

  // Database Types
  StoreSettingsRow,
  StoreSettingsInsert,
  StoreSettingsUpdate,

  // Constants
  SupportedCurrency,
} from './store-config';

export {
  // Type Guards
  isTemplateType,
  isProductType as isStoreProductType,
  isStoreProduct,
  isStoreConfig,

  // Constants
  DEFAULT_BRAND_COLORS,
  DEFAULT_STORE_TEXTS,
  DEFAULT_GRID_SETTINGS,
  DEFAULT_FEATURES,
  SUPPORTED_CURRENCIES,
} from './store-config';

// ============================================================================
// PRODUCT CATALOG TYPES
// ============================================================================

export type {
  // Category Types
  ProductCategory,
  NewProductCategory,
  UpdateProductCategory,

  // Photo Product Types
  PhotoProduct,
  NewPhotoProduct,
  UpdatePhotoProduct,

  // Combo Package Types
  ComboPackage,
  NewComboPackage,
  UpdateComboPackage,
  ComboPackageItem,
  NewComboPackageItem,
  UpdateComboPackageItem,

  // Event Pricing Types
  EventProductPricing,
  NewEventProductPricing,
  UpdateEventProductPricing,

  // Enhanced Types
  PhotoProductWithCategory,
  ComboPackageWithItems,
  EventPricingWithDetails,

  // Catalog & Pricing Types
  ProductCatalog,
  PriceCalculation,

  // Enum Types
  ProductType,
  FinishType,
  PaperQuality,
  PricingType,

  // Database Types
  ProductCategoryRow,
  PhotoProductRow,
  ComboPackageRow,
  ComboPackageItemRow,
  EventProductPricingRow,
} from './product';

export {
  // Type Guards
  isPhysicalProduct,
  isDigitalProduct,
  isComboProduct,
  isPricingType,
  isFinishType,
  isPaperQuality,

  // Utility Functions
  formatProductSize,
  formatProductSpecs,
  calculateComboPrice,
  calculateMargin,

  // Constants
  PRODUCT_CONSTANTS,
  COMMON_PHOTO_SIZES,
} from './product';

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export type {
  // Photo and Subject Types
  Photo,
  Subject,

  // Base Template Props
  BaseTemplateProps,

  // Template-Specific Props
  PixiesetTemplateProps,
  PremiumStoreTemplateProps,
  ModernMinimalTemplateProps,
  StudioDarkTemplateProps,
  TemplateSpecificProps,

  // Template Component Types
  TemplateComponent,
  TemplateRegistryEntry,

  // Context Types
  TemplateContext,
  GalleryMode,
  GalleryOptions,

  // Selection Types
  SelectedPhoto,
  TemplateCartState,
  CartAction,

  // Customization Types
  TypographyCustomization,
  LayoutCustomization,
  AnimationCustomization,
  TemplateCustomization,

  // Responsive Types
  ResponsiveBreakpoints,

  // Hook Return Types
  UseTemplateCartReturn,
  UseTemplateGalleryReturn,

  // Metadata & Events
  TemplateMetadata,
  TemplateEventType,
  TemplateEvent,
} from './template';

export {
  // Constants
  DEFAULT_BREAKPOINTS,
} from './template';

// ============================================================================
// API TYPES
// ============================================================================

export type {
  // Existing API Types
  ApiResponse,
  PaginatedResponse,
  Photo as ApiPhoto,
  PhotoWithSignedUrl,
  PhotoAssignment,
  Subject as ApiSubject,
  SubjectWithEvent,
  Event,
  Order,
  OrderItem,
  GalleryResponse,
  UploadProgress,
  MercadoPagoWebhook,
  CartItem as ApiCartItem,
  CartValidationResponse,
  CartCalculationResponse,
  ApiError,
  ValidationError as ApiValidationError,

  // Store Config API Types
  StoreConfigResponse,
  StoreConfigListResponse,

  // Product API Types
  ProductResponse,
  ProductsResponse,
  CreateProductRequest,
  UpdateProductRequest,

  // Combo API Types
  ComboPackageResponse,
  ComboPackagesResponse,
  CreateComboRequest,

  // Category API Types
  CategoryResponse,
  CategoriesResponse,

  // Pricing API Types
  CalculatePriceRequest,
  PriceCalculationResponse,
  ProductCatalogResponse,
} from './api';

// ============================================================================
// DATABASE TYPES
// ============================================================================

export type {
  Database,
  Json,
} from './database';

// ============================================================================
// RE-EXPORT COMMON PATTERNS
// ============================================================================

/**
 * Common type for entities with ID and timestamps
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Common type for tenant-scoped entities
 */
export interface TenantEntity extends BaseEntity {
  tenant_id: string;
}

/**
 * Common type for paginated lists
 */
export interface PaginatedList<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    has_more: boolean;
  };
}

/**
 * Common type for API success/error responses
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
