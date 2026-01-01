/**
 * Store Configuration Type Definitions
 *
 * Comprehensive TypeScript types for the LookEscolar store configuration system.
 * These types match the database schema exactly and provide strict type safety
 * for all store-related operations.
 *
 * @module types/store-config
 */

import type { Database } from './database';

// ============================================================================
// DATABASE ROW TYPES (Auto-generated from Supabase schema)
// ============================================================================

/**
 * Store settings table row type from database
 */
export type StoreSettingsRow = Database['public']['Tables']['store_settings']['Row'];
export type StoreSettingsInsert = Database['public']['Tables']['store_settings']['Insert'];
export type StoreSettingsUpdate = Database['public']['Tables']['store_settings']['Update'];

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

/**
 * Available store template types
 * Each template provides a unique visual style and layout
 */
export type TemplateType =
  | 'pixieset'              // Pixieset-inspired template (default)
  | 'premium-store'         // Premium photography store
  | 'modern-minimal'        // Clean, minimal design
  | 'studio-dark'           // Dark theme studio template
  | 'editorial'             // Editorial/magazine style
  | 'minimal'               // Ultra-minimal design
  | 'bold-vibrant'          // Vibrant, colorful template
  | 'premium-photography'   // Premium photography showcase
  | 'classic-gallery'       // Classic gallery layout
  | 'fashion-editorial'     // Fashion-focused editorial
  | 'modern'                // Modern template
  | 'classic';              // Classic template

// ============================================================================
// DESIGN SYSTEM TYPES
// ============================================================================

/**
 * Cover style options for store hero section
 */
export type CoverStyle =
  | 'center'    // Centered layout
  | 'joy'       // Joyful, energetic style
  | 'left'      // Left-aligned layout
  | 'novel'     // Novel, creative style
  | 'vintage'   // Vintage aesthetic
  | 'frame'     // Framed presentation
  | 'stripe'    // Striped design
  | 'divider';  // With divider elements

/**
 * Cover variant options
 */
export type CoverVariant =
  | 'default'   // Default variant
  | 'bold'      // Bold, prominent style
  | 'subtle';   // Subtle, understated style

/**
 * Typography style presets
 */
export type TypographyStyle =
  | 'sans'      // Sans-serif fonts
  | 'serif'     // Serif fonts
  | 'modern'    // Modern typography
  | 'timeless'  // Classic, timeless fonts
  | 'bold'      // Bold typography
  | 'subtle';   // Subtle, minimal typography

/**
 * Color scheme/palette options
 */
export type ColorScheme =
  | 'light'      // Light color scheme (default)
  | 'gold'       // Gold accent colors
  | 'rose'       // Rose/pink tones
  | 'terracotta' // Terracotta/earth tones
  | 'sand'       // Sand/beige tones
  | 'olive'      // Olive green tones
  | 'agave'      // Agave/teal tones
  | 'sea';       // Sea blue tones

/**
 * Grid display styles
 */
export type GridStyle =
  | 'vertical'    // Vertical layout
  | 'horizontal'; // Horizontal layout

/**
 * Thumbnail size options
 */
export type ThumbSize =
  | 'regular'  // Regular size thumbnails
  | 'large';   // Large thumbnails

/**
 * Grid spacing options
 */
export type GridSpacing =
  | 'regular'  // Regular spacing
  | 'wide';    // Wide spacing

/**
 * Navigation style options
 */
export type NavStyle =
  | 'classic'  // Classic navigation
  | 'minimal'; // Minimal navigation

/**
 * App density options
 */
export type AppDensity =
  | 'compact'     // Compact layout
  | 'comfortable' // Comfortable layout
  | 'spacious';   // Spacious layout

/**
 * Header style options
 */
export type HeaderStyle =
  | 'default'  // Default header
  | 'minimal'  // Minimal header
  | 'bold';    // Bold header

// ============================================================================
// STRUCTURED CONFIG TYPES
// ============================================================================

/**
 * Brand color configuration
 */
export interface BrandColors {
  /** Primary brand color (hex) */
  primary: string;
  /** Secondary brand color (hex) */
  secondary: string;
  /** Accent color for highlights (hex) */
  accent: string;
  /** Background color (hex) */
  background: string;
  /** Surface color for cards/panels (hex) */
  surface: string;
  /** Primary text color (hex) */
  text: string;
  /** Secondary text color (hex) */
  text_secondary: string;
}

/**
 * Grid display settings
 */
export interface GridSettings {
  /** Grid display style */
  style: GridStyle;
  /** Thumbnail size */
  thumb: ThumbSize;
  /** Spacing between items */
  spacing: GridSpacing;
  /** Navigation style */
  nav: NavStyle;
}

/**
 * Cover/hero section design settings
 */
export interface CoverSettings {
  /** Cover layout style */
  style: CoverStyle;
  /** Cover design variant */
  variant: CoverVariant;
}

/**
 * Typography settings
 */
export interface TypographySettings {
  /** Typography preset */
  preset: TypographyStyle;
}

/**
 * Color palette settings
 */
export interface ColorSettings {
  /** Color scheme/palette */
  palette: ColorScheme;
}

/**
 * App-level settings
 */
export interface AppSettings {
  /** UI density */
  density: AppDensity;
  /** Header style */
  header: HeaderStyle;
}

/**
 * Comprehensive design configuration
 */
export interface DesignConfig {
  /** Cover/hero section settings */
  cover: CoverSettings;
  /** Typography settings */
  typography: TypographySettings;
  /** Color palette settings */
  color: ColorSettings;
  /** Grid layout settings */
  grid: GridSettings;
  /** App-level settings */
  app: AppSettings;
}

/**
 * Store text content
 */
export interface StoreTexts {
  /** Hero section title */
  hero_title: string;
  /** Hero section subtitle */
  hero_subtitle: string;
  /** Footer text */
  footer_text: string;
  /** Contact email address */
  contact_email?: string;
  /** Contact phone number */
  contact_phone?: string;
  /** Terms of service URL */
  terms_url?: string;
  /** Privacy policy URL */
  privacy_url?: string;
}

/**
 * Payment method configuration
 */
export interface PaymentMethod {
  /** Payment method identifier */
  id: string;
  /** Display name */
  name: string;
  /** Whether this method is enabled */
  enabled: boolean;
  /** Description of payment method */
  description?: string;
  /** Icon name (Lucide icon) */
  icon?: string;
}

/**
 * Store feature flags
 */
export interface StoreFeatures {
  /** Allow extras/additional items only (no base packages) */
  allowExtrasOnly?: boolean;
  /** Show FAQ section */
  showFAQ?: boolean;
  /** Show product badges */
  showBadges?: boolean;
}

/**
 * Theme customization options
 */
export interface ThemeCustomization {
  /** Custom CSS to inject */
  custom_css?: string;
  /** Header style override */
  header_style?: string;
  /** Gallery layout style */
  gallery_layout?: string;
  /** Photo aspect ratio */
  photo_aspect_ratio?: string;
  /** Show photo numbers */
  show_photo_numbers?: boolean;
  /** Enable zoom functionality */
  enable_zoom?: boolean;
  /** Enable fullscreen mode */
  enable_fullscreen?: boolean;
  /** Number of columns on mobile */
  mobile_columns?: number;
  /** Number of columns on desktop */
  desktop_columns?: number;
  /** Template variant override */
  template_variant?: string;
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

/**
 * Product type classification
 */
export type ProductType = 'physical' | 'digital';

/**
 * Product quality level
 */
export type ProductQuality = 'standard' | 'premium';

/**
 * Product size options
 */
export interface ProductOptions {
  /** Available sizes (e.g., ["10x15", "13x18"]) */
  sizes?: string[];
  /** Available formats (e.g., ["jpg", "png"]) */
  formats?: string[];
  /** Quality level */
  quality?: ProductQuality;
}

/**
 * Store product definition
 */
export interface StoreProduct {
  /** Unique product identifier */
  id: string;
  /** Product name */
  name: string;
  /** Product type */
  type: ProductType;
  /** Whether product is enabled */
  enabled: boolean;
  /** Price in cents (centavos) */
  price: number;
  /** Product description */
  description?: string;
  /** Product options and variants */
  options?: ProductOptions;
}

// ============================================================================
// MAIN STORE CONFIGURATION
// ============================================================================

/**
 * Complete store configuration
 * Matches the store_settings database table structure
 */
export interface StoreConfig {
  /** Unique identifier */
  id: string;
  /** Tenant ID (multi-tenant isolation) */
  tenant_id: string;
  /** Associated event ID (optional) */
  event_id?: string | null;
  /** Associated folder ID (optional) */
  folder_id?: string | null;

  // Core Settings
  /** Whether the store is enabled */
  enabled: boolean;
  /** Template to use */
  template: TemplateType;
  /** Currency code (ISO 4217) */
  currency: string;

  // Visual Branding
  /** Logo URL */
  logo_url?: string | null;
  /** Banner image URL */
  banner_url?: string | null;
  /** Brand color configuration */
  colors?: BrandColors | null;
  /** Design system configuration */
  design?: DesignConfig;

  // Content
  /** Store text content */
  texts?: StoreTexts | null;

  // Products & Commerce
  /** Product catalog */
  products?: StoreProduct[] | null;
  /** Payment methods */
  payment_methods?: PaymentMethod[] | null;

  // Advanced Settings
  /** Feature flags */
  features?: StoreFeatures | null;
  /** Theme customization */
  theme_customization?: ThemeCustomization | null;

  // Timestamps
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

// ============================================================================
// PARTIAL & UTILITY TYPES
// ============================================================================

/**
 * Type for creating new store configuration
 * Omits auto-generated fields
 */
export type NewStoreConfig = Omit<StoreConfig, 'id' | 'created_at' | 'updated_at'> & {
  tenant_id: string; // Required
};

/**
 * Type for updating store configuration
 * All fields optional except ID
 */
export type UpdateStoreConfig = Partial<Omit<StoreConfig, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>> & {
  id: string; // Required for updates
};

/**
 * Type for partial store updates (PATCH operations)
 * Allows updating any subset of fields
 */
export type PatchStoreConfig = Partial<Omit<StoreConfig, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a valid TemplateType
 */
export function isTemplateType(value: unknown): value is TemplateType {
  const validTemplates: TemplateType[] = [
    'pixieset', 'premium-store', 'modern-minimal', 'studio-dark',
    'editorial', 'minimal', 'bold-vibrant', 'premium-photography',
    'classic-gallery', 'fashion-editorial', 'modern', 'classic'
  ];
  return typeof value === 'string' && validTemplates.includes(value as TemplateType);
}

/**
 * Type guard to check if a value is a valid ProductType
 */
export function isProductType(value: unknown): value is ProductType {
  return value === 'physical' || value === 'digital';
}

/**
 * Type guard to check if a value is a valid StoreProduct
 */
export function isStoreProduct(value: unknown): value is StoreProduct {
  if (!value || typeof value !== 'object') return false;
  const product = value as Record<string, unknown>;
  return (
    typeof product.id === 'string' &&
    typeof product.name === 'string' &&
    isProductType(product.type) &&
    typeof product.enabled === 'boolean' &&
    typeof product.price === 'number'
  );
}

/**
 * Type guard to check if a value is a valid StoreConfig
 */
export function isStoreConfig(value: unknown): value is StoreConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Record<string, unknown>;
  return (
    typeof config.id === 'string' &&
    typeof config.tenant_id === 'string' &&
    typeof config.enabled === 'boolean' &&
    isTemplateType(config.template)
  );
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default brand colors
 */
export const DEFAULT_BRAND_COLORS: BrandColors = {
  primary: '#1f2937',
  secondary: '#6b7280',
  accent: '#3b82f6',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  text_secondary: '#6b7280'
};

/**
 * Default store texts
 */
export const DEFAULT_STORE_TEXTS: StoreTexts = {
  hero_title: 'Galería Fotográfica',
  hero_subtitle: 'Encuentra tus mejores momentos escolares',
  footer_text: '© 2024 LookEscolar - Fotografía Escolar',
  contact_email: '',
  contact_phone: '',
  terms_url: '',
  privacy_url: ''
};

/**
 * Default grid settings
 */
export const DEFAULT_GRID_SETTINGS: GridSettings = {
  style: 'vertical',
  thumb: 'regular',
  spacing: 'regular',
  nav: 'classic'
};

/**
 * Default features
 */
export const DEFAULT_FEATURES: StoreFeatures = {
  allowExtrasOnly: true,
  showFAQ: true,
  showBadges: true
};

/**
 * Supported currencies
 */
export const SUPPORTED_CURRENCIES = [
  'ARS', // Argentine Peso
  'USD', // US Dollar
  'EUR', // Euro
  'BRL', // Brazilian Real
  'CLP', // Chilean Peso
  'PEN', // Peruvian Sol
  'COP', // Colombian Peso
  'MXN'  // Mexican Peso
] as const;

/**
 * Currency type based on supported currencies
 */
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];
