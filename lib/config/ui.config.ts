/**
 * UI Configuration Constants
 * Centralized configuration for UI components and layout
 */

export const UI_CONFIG = {
  // Grid and Layout
  GRID_ITEM_HEIGHT: 200,
  GRID_GAP: 16,
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,

  // Photo Grid
  PHOTO_GRID_COLUMNS: {
    mobile: 2,
    tablet: 3,
    desktop: 4,
    wide: 6,
  },

  // Upload Limits
  MAX_FILES_PER_UPLOAD: 20,
  MAX_FILE_SIZE_MB: 10,
  SUPPORTED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ] as const,

  // Performance
  VIRTUAL_SCROLL_ITEM_HEIGHT: 220,
  DEBOUNCE_SEARCH_MS: 300,
  THROTTLE_SCROLL_MS: 16,

  // Animation Timing
  ANIMATION_DURATION_MS: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  // Breakpoints (matching Tailwind CSS)
  BREAKPOINTS: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },

  // Z-index layers
  Z_INDEX: {
    dropdown: 1000,
    sticky: 1010,
    fixed: 1020,
    modal: 1030,
    popover: 1040,
    tooltip: 1050,
    toast: 1060,
  },

  // Loading states
  SKELETON_ITEMS: 12,
  MIN_LOADING_TIME_MS: 500, // Prevent flash of loading state
} as const;

/**
 * Component-specific configurations
 */
export const COMPONENT_CONFIG = {
  PHOTO_GRID: {
    COLUMNS: {
      RESPONSIVE: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
      MOBILE: 2,
      TABLET: 3,
      DESKTOP: 4,
      WIDE: 6,
    },
    ITEM_HEIGHT: UI_CONFIG.GRID_ITEM_HEIGHT,
    GAP: UI_CONFIG.GRID_GAP,
    VIRTUAL_SCROLL_THRESHOLD: 100, // Start virtualization after this many items
  },

  UPLOAD_QUEUE: {
    MAX_VISIBLE_ITEMS: 5,
    MAX_HEIGHT: 80, // h-80 in Tailwind
    AUTO_CLEAR_COMPLETED: true,
    RETRY_ATTEMPTS: 3,
  },

  IMAGE_UPLOADER: {
    MAX_FILES: UI_CONFIG.MAX_FILES_PER_UPLOAD,
    MAX_SIZE_MB: UI_CONFIG.MAX_FILE_SIZE_MB,
    ACCEPTED_TYPES: UI_CONFIG.SUPPORTED_IMAGE_TYPES,
    PREVIEW_SIZE: 120,
  },

  SEARCH_INPUT: {
    DEBOUNCE_MS: UI_CONFIG.DEBOUNCE_SEARCH_MS,
    MIN_QUERY_LENGTH: 2,
    MAX_QUERY_LENGTH: 100,
  },

  PAGINATION: {
    DEFAULT_PAGE_SIZE: UI_CONFIG.DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE: UI_CONFIG.MAX_PAGE_SIZE,
    SIBLING_PAGES: 2, // Pages to show on each side of current page
  },

  MODAL: {
    CLOSE_ON_ESCAPE: true,
    CLOSE_ON_BACKDROP: true,
    ANIMATION_DURATION: UI_CONFIG.ANIMATION_DURATION_MS.normal,
  },
} as const;

/**
 * CSS class name constants for consistency
 */
export const CSS_CLASSES = {
  // Layout
  container: 'container mx-auto px-4',
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',

  // Spacing
  section: 'py-8 md:py-12',
  card: 'bg-white rounded-lg shadow-sm border p-6',

  // Interactive elements
  button: {
    base: 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
    secondary:
      'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500',
    ghost: 'hover:bg-gray-100 focus-visible:ring-gray-500',
  },

  // Status indicators
  status: {
    success: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    error: 'text-red-600 bg-red-50 border-red-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
  },
} as const;

/**
 * Type helpers for configuration
 */
export type UIConfigKey = keyof typeof UI_CONFIG;
export type ComponentConfigKey = keyof typeof COMPONENT_CONFIG;
export type CSSClassKey = keyof typeof CSS_CLASSES;
