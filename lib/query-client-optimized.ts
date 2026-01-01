/**
 * Optimized React Query Client Configuration
 *
 * Production-level caching and performance optimizations for:
 * - Store data
 * - Photo galleries
 * - Product catalogs
 * - Cart/checkout
 *
 * Performance targets:
 * - Minimize network requests
 * - Optimize cache hit rate
 * - Fast refresh cycles (<30s)
 * - Efficient memory usage
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';
import { CACHE_CONFIG } from './performance/optimizations';

/**
 * Default query options for all queries
 */
const defaultQueryOptions: DefaultOptions = {
  queries: {
    // Cache management
    staleTime: 30 * 1000, // 30 seconds default
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime)

    // Refetch behavior
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,

    // Retry logic
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Network mode
    networkMode: 'online',

    // Structural sharing for efficient re-renders
    structuralSharing: true,
  },

  mutations: {
    // Retry for mutations
    retry: 0,

    // Network mode
    networkMode: 'online',
  },
};

/**
 * Create optimized query client
 */
export function createOptimizedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
  });
}

/**
 * Query keys for different data types
 * Organized by feature for better cache management
 */
export const queryKeys = {
  // Store configuration
  store: {
    all: ['store'] as const,
    config: (token: string) => ['store', 'config', token] as const,
    settings: (token: string) => ['store', 'settings', token] as const,
    availability: (token: string) => ['store', 'availability', token] as const,
  },

  // Photos
  photos: {
    all: ['photos'] as const,
    list: (token: string, filters?: any) => ['photos', 'list', token, filters] as const,
    detail: (photoId: string) => ['photos', 'detail', photoId] as const,
    page: (token: string, page: number) => ['photos', 'page', token, page] as const,
  },

  // Products
  products: {
    all: ['products'] as const,
    list: (token: string) => ['products', 'list', token] as const,
    detail: (productId: string) => ['products', 'detail', productId] as const,
    pricing: (token: string) => ['products', 'pricing', token] as const,
  },

  // Cart
  cart: {
    all: ['cart'] as const,
    items: (sessionId?: string) => ['cart', 'items', sessionId] as const,
    total: (sessionId?: string) => ['cart', 'total', sessionId] as const,
  },

  // Orders
  orders: {
    all: ['orders'] as const,
    list: (userId?: string) => ['orders', 'list', userId] as const,
    detail: (orderId: string) => ['orders', 'detail', orderId] as const,
  },
} as const;

/**
 * Get optimized cache configuration for specific data type
 */
export function getCacheConfig(dataType: keyof typeof CACHE_CONFIG) {
  return CACHE_CONFIG[dataType];
}

/**
 * Prefetch store data for faster initial load
 */
export async function prefetchStoreData(
  queryClient: QueryClient,
  token: string
) {
  const storeConfig = getCacheConfig('store');

  await Promise.all([
    // Prefetch store configuration
    queryClient.prefetchQuery({
      queryKey: queryKeys.store.config(token),
      staleTime: storeConfig.staleTime,
      gcTime: storeConfig.cacheTime,
    }),

    // Prefetch product list
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.list(token),
      staleTime: getCacheConfig('products').staleTime,
      gcTime: getCacheConfig('products').cacheTime,
    }),
  ]);
}

/**
 * Invalidate cache for specific data type
 */
export function invalidateCache(
  queryClient: QueryClient,
  type: 'store' | 'photos' | 'products' | 'cart' | 'orders',
  specific?: string
) {
  if (specific) {
    queryClient.invalidateQueries({ queryKey: [type, specific] });
  } else {
    queryClient.invalidateQueries({ queryKey: [type] });
  }
}

/**
 * Clear all cache
 */
export function clearAllCache(queryClient: QueryClient) {
  queryClient.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(queryClient: QueryClient) {
  const queryCache = queryClient.getQueryCache();
  const queries = queryCache.getAll();

  const stats = {
    totalQueries: queries.length,
    staleQueries: queries.filter((q) => q.isStale()).length,
    activeQueries: queries.filter((q) => q.getObserversCount() > 0).length,
    inactiveQueries: queries.filter((q) => q.getObserversCount() === 0).length,
    byType: {} as Record<string, number>,
  };

  // Count queries by type
  queries.forEach((query) => {
    const type = query.queryKey[0] as string;
    stats.byType[type] = (stats.byType[type] || 0) + 1;
  });

  return stats;
}

/**
 * Optimize cache memory usage
 * Removes inactive queries and old data
 */
export function optimizeCacheMemory(queryClient: QueryClient) {
  const queryCache = queryClient.getQueryCache();
  const queries = queryCache.getAll();

  let removed = 0;

  queries.forEach((query) => {
    // Remove inactive queries that are stale
    if (query.getObserversCount() === 0 && query.isStale()) {
      queryCache.remove(query);
      removed++;
    }
  });

  console.log(`[Cache Optimization] Removed ${removed} inactive queries`);

  return removed;
}

/**
 * Setup automatic cache cleanup
 * Runs every 5 minutes to optimize memory
 */
export function setupAutoCacheCleanup(queryClient: QueryClient) {
  if (typeof window === 'undefined') return;

  const interval = setInterval(() => {
    optimizeCacheMemory(queryClient);
  }, 5 * 60 * 1000); // Every 5 minutes

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(interval);
  });

  return () => clearInterval(interval);
}
