/**
 * Template Component Type Definitions
 *
 * TypeScript types for store template components.
 * Defines props interfaces for all template variations.
 *
 * @module types/template
 */

import type { StoreConfig } from './store-config';
import type { PhotoProduct, ComboPackage } from './product';

// Import existing photo and subject types from database
type Photo = {
  id: string;
  filename: string;
  watermark_url?: string | null;
  preview_url?: string | null;
  original_path: string;
  file_size?: number;
  width?: number | null;
  height?: number | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  folder_id: string;
  tenant_id: string;
};

type Subject = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  grade?: string | null;
  section?: string | null;
  qr_code?: string | null;
  access_token: string;
  token_expires_at: string;
  event_id: string;
  tenant_id: string;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// BASE TEMPLATE PROPS
// ============================================================================

/**
 * Base props required by all template components
 */
export interface BaseTemplateProps {
  /** Store configuration */
  config: StoreConfig;
  /** Photos to display in the gallery */
  photos: Photo[];
  /** Subject/student information */
  subject: Subject;
  /** Access token for this store session */
  token: string;
  /** Available products for purchase */
  products: (PhotoProduct | ComboPackage)[];
  /** Optional back navigation handler */
  onBack?: () => void;
}

// ============================================================================
// TEMPLATE-SPECIFIC PROPS
// ============================================================================

/**
 * Props for Pixieset-style template
 */
export interface PixiesetTemplateProps extends BaseTemplateProps {
  /** Template identifier */
  template: 'pixieset';
  /** Enable package selection mode */
  packageMode?: boolean;
  /** Show photo count in header */
  showPhotoCount?: boolean;
}

/**
 * Props for Premium Store template
 */
export interface PremiumStoreTemplateProps extends BaseTemplateProps {
  /** Template identifier */
  template: 'premium-store';
  /** Enable luxury presentation mode */
  luxuryMode?: boolean;
  /** Show product recommendations */
  showRecommendations?: boolean;
}

/**
 * Props for Modern Minimal template
 */
export interface ModernMinimalTemplateProps extends BaseTemplateProps {
  /** Template identifier */
  template: 'modern-minimal';
  /** Minimal UI mode (hide extra elements) */
  minimalUI?: boolean;
  /** Grid density */
  gridDensity?: 'compact' | 'comfortable' | 'spacious';
}

/**
 * Props for Studio Dark template
 */
export interface StudioDarkTemplateProps extends BaseTemplateProps {
  /** Template identifier */
  template: 'studio-dark';
  /** Enable dark mode optimizations */
  darkOptimized?: boolean;
  /** Accent color for highlights */
  accentColor?: string;
}

/**
 * Union type of all template-specific props
 */
export type TemplateSpecificProps =
  | PixiesetTemplateProps
  | PremiumStoreTemplateProps
  | ModernMinimalTemplateProps
  | StudioDarkTemplateProps;

// ============================================================================
// TEMPLATE COMPONENT TYPES
// ============================================================================

/**
 * Generic template component function signature
 */
export interface TemplateComponent<T extends BaseTemplateProps = BaseTemplateProps> {
  (props: T): JSX.Element;
}

/**
 * Template registry entry
 */
export interface TemplateRegistryEntry {
  /** Template unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Template description */
  description: string;
  /** Preview image URL */
  previewUrl?: string;
  /** Template component */
  component: TemplateComponent;
  /** Whether this template is premium/paid */
  isPremium?: boolean;
  /** Supported features */
  features?: string[];
}

// ============================================================================
// TEMPLATE CONTEXT TYPES
// ============================================================================

/**
 * Template context data passed to child components
 */
export interface TemplateContext {
  /** Current store configuration */
  config: StoreConfig;
  /** Current subject */
  subject: Subject;
  /** Access token */
  token: string;
  /** Available products */
  products: (PhotoProduct | ComboPackage)[];
  /** Template-specific settings */
  settings?: Record<string, any>;
}

/**
 * Gallery display mode
 */
export type GalleryMode = 'grid' | 'masonry' | 'carousel' | 'list';

/**
 * Gallery view options
 */
export interface GalleryOptions {
  /** Display mode */
  mode: GalleryMode;
  /** Number of columns (for grid mode) */
  columns?: number;
  /** Enable photo selection */
  selectable?: boolean;
  /** Show photo metadata */
  showMetadata?: boolean;
  /** Enable lightbox/fullscreen */
  enableLightbox?: boolean;
  /** Enable infinite scroll */
  infiniteScroll?: boolean;
}

// ============================================================================
// PRODUCT SELECTION TYPES
// ============================================================================

/**
 * Selected photo for purchase
 */
export interface SelectedPhoto {
  /** Photo ID */
  photoId: string;
  /** Selected product ID (if specific product chosen) */
  productId?: string;
  /** Selected combo ID (if combo package chosen) */
  comboId?: string;
  /** Quantity */
  quantity: number;
  /** Custom options (e.g., size, finish) */
  options?: Record<string, any>;
}

/**
 * Shopping cart state
 */
export interface TemplateCartState {
  /** Selected photos */
  selections: SelectedPhoto[];
  /** Base package selected (if any) */
  basePackage?: ComboPackage;
  /** Additional items */
  additionalItems?: SelectedPhoto[];
  /** Total price in cents */
  totalPrice: number;
  /** Item count */
  itemCount: number;
}

/**
 * Cart action types
 */
export type CartAction =
  | { type: 'ADD_PHOTO'; payload: SelectedPhoto }
  | { type: 'REMOVE_PHOTO'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { photoId: string; quantity: number } }
  | { type: 'SET_BASE_PACKAGE'; payload: ComboPackage }
  | { type: 'CLEAR_CART' }
  | { type: 'RESTORE_CART'; payload: TemplateCartState };

// ============================================================================
// TEMPLATE CUSTOMIZATION TYPES
// ============================================================================

/**
 * Typography customization options
 */
export interface TypographyCustomization {
  /** Font family for headings */
  headingFont?: string;
  /** Font family for body text */
  bodyFont?: string;
  /** Base font size (px) */
  baseFontSize?: number;
  /** Font weight for headings */
  headingWeight?: number;
  /** Line height multiplier */
  lineHeight?: number;
}

/**
 * Layout customization options
 */
export interface LayoutCustomization {
  /** Maximum content width (px) */
  maxWidth?: number;
  /** Container padding (px) */
  containerPadding?: number;
  /** Section spacing (px) */
  sectionSpacing?: number;
  /** Enable sticky header */
  stickyHeader?: boolean;
  /** Enable sticky cart */
  stickyCart?: boolean;
}

/**
 * Animation customization options
 */
export interface AnimationCustomization {
  /** Enable transitions */
  enableTransitions?: boolean;
  /** Transition duration (ms) */
  transitionDuration?: number;
  /** Enable hover effects */
  enableHoverEffects?: boolean;
  /** Enable scroll animations */
  enableScrollAnimations?: boolean;
}

/**
 * Complete template customization
 */
export interface TemplateCustomization {
  /** Typography settings */
  typography?: TypographyCustomization;
  /** Layout settings */
  layout?: LayoutCustomization;
  /** Animation settings */
  animation?: AnimationCustomization;
  /** Custom CSS to inject */
  customCss?: string;
}

// ============================================================================
// RESPONSIVE BREAKPOINT TYPES
// ============================================================================

/**
 * Responsive breakpoint configuration
 */
export interface ResponsiveBreakpoints {
  /** Mobile breakpoint (px) */
  mobile: number;
  /** Tablet breakpoint (px) */
  tablet: number;
  /** Desktop breakpoint (px) */
  desktop: number;
  /** Large desktop breakpoint (px) */
  largeDesktop: number;
}

/**
 * Default breakpoints (matches Tailwind)
 */
export const DEFAULT_BREAKPOINTS: ResponsiveBreakpoints = {
  mobile: 640,    // sm
  tablet: 768,    // md
  desktop: 1024,  // lg
  largeDesktop: 1280, // xl
};

// ============================================================================
// TEMPLATE HOOKS TYPES
// ============================================================================

/**
 * Return type for useTemplateCart hook
 */
export interface UseTemplateCartReturn {
  /** Current cart state */
  cart: TemplateCartState;
  /** Add photo to cart */
  addPhoto: (photo: SelectedPhoto) => void;
  /** Remove photo from cart */
  removePhoto: (photoId: string) => void;
  /** Update photo quantity */
  updateQuantity: (photoId: string, quantity: number) => void;
  /** Set base package */
  setBasePackage: (pkg: ComboPackage) => void;
  /** Clear cart */
  clearCart: () => void;
  /** Check if photo is in cart */
  isInCart: (photoId: string) => boolean;
  /** Get photo quantity */
  getQuantity: (photoId: string) => number;
}

/**
 * Return type for useTemplateGallery hook
 */
export interface UseTemplateGalleryReturn {
  /** Current gallery options */
  options: GalleryOptions;
  /** Update gallery options */
  updateOptions: (options: Partial<GalleryOptions>) => void;
  /** Selected photo IDs */
  selectedPhotos: string[];
  /** Toggle photo selection */
  togglePhoto: (photoId: string) => void;
  /** Select all photos */
  selectAll: () => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Check if photo is selected */
  isSelected: (photoId: string) => boolean;
}

// ============================================================================
// TEMPLATE METADATA TYPES
// ============================================================================

/**
 * Template metadata for analytics and tracking
 */
export interface TemplateMetadata {
  /** Template ID */
  templateId: string;
  /** Template version */
  version: string;
  /** Render timestamp */
  renderedAt: string;
  /** Subject ID */
  subjectId: string;
  /** Event ID */
  eventId?: string;
  /** Session ID */
  sessionId?: string;
  /** User agent */
  userAgent?: string;
  /** Viewport dimensions */
  viewport?: {
    width: number;
    height: number;
  };
}

// ============================================================================
// TEMPLATE EVENTS TYPES
// ============================================================================

/**
 * Template event types for tracking
 */
export type TemplateEventType =
  | 'template_loaded'
  | 'photo_viewed'
  | 'photo_selected'
  | 'product_viewed'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_started'
  | 'checkout_completed'
  | 'error_occurred';

/**
 * Template event data
 */
export interface TemplateEvent {
  /** Event type */
  type: TemplateEventType;
  /** Event timestamp */
  timestamp: string;
  /** Event data */
  data?: Record<string, any>;
  /** Template metadata */
  metadata: TemplateMetadata;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  Photo,
  Subject,
};
