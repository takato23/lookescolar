/**
 * Performance optimization utilities and configurations
 *
 * Production-level optimizations for:
 * - Image loading
 * - Code splitting
 * - Caching
 * - Bundle size
 * - Core Web Vitals
 */

/**
 * Image optimization configuration
 */
export const IMAGE_CONFIG = {
  // Responsive breakpoints for srcset
  breakpoints: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],

  // Quality settings
  quality: {
    thumbnail: 60,
    preview: 75,
    hero: 90,
    print: 95,
  },

  // Sizes for different contexts
  sizes: {
    thumbnail: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    hero: '100vw',
    grid: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
    fullscreen: '100vw',
  },

  // Preload priorities
  preload: {
    hero: true,
    aboveFold: true,
    belowFold: false,
  },

  // Format preferences
  formats: ['image/webp', 'image/jpeg'],
} as const;

/**
 * Cache configuration for React Query
 */
export const CACHE_CONFIG = {
  // Store data cache (frequently accessed)
  store: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },

  // Photos cache (static content)
  photos: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },

  // Products cache (rarely changes)
  products: {
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },

  // Cart/user data (frequently updates)
  cart: {
    staleTime: 0, // Always fresh
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },
} as const;

/**
 * Virtual scrolling configuration
 */
export const VIRTUAL_SCROLL_CONFIG = {
  // Item size estimation
  itemSize: 300,

  // Overscan items (render extra items for smooth scrolling)
  overscan: 5,

  // Threshold to enable virtualization
  threshold: 50, // Enable for >50 items

  // Gap between items
  gap: 16,
} as const;

/**
 * Code splitting configuration
 */
export const CODE_SPLIT_CONFIG = {
  // Templates to lazy load
  templates: [
    'PixiesetTemplate',
    'PremiumStoreTemplate',
    'ModernMinimalTemplate',
    'StudioDarkTemplate',
  ],

  // Heavy dependencies to defer
  deferredModules: [
    'framer-motion',
    '@react-three/fiber',
    '@react-three/drei',
    'three',
  ],

  // Critical modules (don't split)
  criticalModules: [
    'react',
    'react-dom',
    'next',
  ],
} as const;

/**
 * Performance budgets
 */
export const PERFORMANCE_BUDGETS = {
  // Core Web Vitals targets
  vitals: {
    LCP: { good: 2500, poor: 4000 }, // ms
    CLS: { good: 0.1, poor: 0.25 }, // score
    TTFB: { good: 800, poor: 1800 }, // ms
    FCP: { good: 1800, poor: 3000 }, // ms
    INP: { good: 200, poor: 500 }, // ms
  },

  // Bundle size limits
  bundles: {
    main: 200 * 1024, // 200 KB
    vendor: 500 * 1024, // 500 KB
    template: 150 * 1024, // 150 KB per template
    total: 1000 * 1024, // 1 MB total
  },

  // Image size limits
  images: {
    thumbnail: 50 * 1024, // 50 KB
    preview: 200 * 1024, // 200 KB
    hero: 500 * 1024, // 500 KB
  },
} as const;

/**
 * Mobile optimization settings
 */
export const MOBILE_CONFIG = {
  // Touch interaction delays
  touchDelay: 0,

  // Passive event listeners
  passiveEvents: ['scroll', 'touchstart', 'touchmove'],

  // Reduce motion
  respectsMotionPreference: true,

  // Network-aware loading
  saveData: {
    reducedQuality: true,
    deferNonCritical: true,
    limitPreloading: true,
  },
} as const;

/**
 * Check if device prefers reduced data
 */
export function prefersReducedData(): boolean {
  if (typeof navigator === 'undefined') return false;

  // Check for Data Saver mode
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection?.saveData) return true;

    // Check for slow connection
    const effectiveType = connection?.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return true;
  }

  return false;
}

/**
 * Check if device prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

/**
 * Get optimal image quality based on network conditions
 */
export function getOptimalImageQuality(): number {
  if (prefersReducedData()) {
    return IMAGE_CONFIG.quality.thumbnail;
  }

  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    const effectiveType = connection?.effectiveType;

    switch (effectiveType) {
      case '4g':
        return IMAGE_CONFIG.quality.hero;
      case '3g':
        return IMAGE_CONFIG.quality.preview;
      case '2g':
      case 'slow-2g':
        return IMAGE_CONFIG.quality.thumbnail;
      default:
        return IMAGE_CONFIG.quality.preview;
    }
  }

  return IMAGE_CONFIG.quality.preview;
}

/**
 * Debounce utility for performance
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle utility for scroll/resize events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Request idle callback polyfill
 */
export const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (callback: IdleRequestCallback) => setTimeout(callback, 1);

/**
 * Cancel idle callback polyfill
 */
export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : (id: number) => clearTimeout(id);

/**
 * Lazy load component with timeout
 */
export function lazyWithTimeout<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  timeout: number = 5000
): React.LazyExoticComponent<T> {
  return React.lazy(() => {
    return Promise.race([
      importFunc(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Component load timeout')), timeout)
      ),
    ]);
  });
}

// Export as namespace for easier importing
export const Performance = {
  IMAGE_CONFIG,
  CACHE_CONFIG,
  VIRTUAL_SCROLL_CONFIG,
  CODE_SPLIT_CONFIG,
  PERFORMANCE_BUDGETS,
  MOBILE_CONFIG,
  prefersReducedData,
  prefersReducedMotion,
  getOptimalImageQuality,
  debounce,
  throttle,
  requestIdleCallback,
  cancelIdleCallback,
  lazyWithTimeout,
} as const;
