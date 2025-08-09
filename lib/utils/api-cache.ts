/**
 * API Response Caching System
 * Implements intelligent caching with performance optimization
 */

import { logger } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hits: number;
  key: string;
  tags?: string[];
}

interface CacheOptions {
  ttl?: number;
  tags?: string[];
  revalidate?: boolean;
  staleWhileRevalidate?: boolean;
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  topKeys: Array<{
    key: string;
    hits: number;
    data: any;
  }>;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
  };

  // Default TTL values in milliseconds
  private static readonly DEFAULT_TTL = {
    // API responses
    events: 5 * 60 * 1000, // 5 minutes
    photos: 10 * 60 * 1000, // 10 minutes
    subjects: 15 * 60 * 1000, // 15 minutes
    gallery: 3 * 60 * 1000, // 3 minutes
    orders: 2 * 60 * 1000, // 2 minutes
    stats: 1 * 60 * 1000, // 1 minute
    // Long-lived data
    user_profile: 30 * 60 * 1000, // 30 minutes
    settings: 60 * 60 * 1000, // 1 hour
    // Short-lived data
    signed_urls: 55 * 60 * 1000, // 55 minutes (URLs expire at 60min)
    temp_data: 30 * 1000, // 30 seconds
  };

  private static instance: APICache;

  static getInstance(): APICache {
    if (!APICache.instance) {
      APICache.instance = new APICache();
    }
    return APICache.instance;
  }

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry is expired
    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count and stats
    entry.hits++;
    this.stats.hits++;

    logger.debug(
      'cache_hit',
      {
        requestId: 'cache',
        cacheHit: true,
        performance: {
          totalTime: 0, // Cache hits are instant
        },
      },
      `Cache hit: ${key}`
    );

    return entry.data;
  }

  /**
   * Set cached value
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.getDefaultTTL(key);

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      key,
      tags: options.tags,
    };

    this.cache.set(key, entry);

    logger.debug(
      'cache_set',
      {
        requestId: 'cache',
        performance: {
          totalTime: ttl,
        },
      },
      `Cache set: ${key} (TTL: ${ttl}ms)`
    );
  }

  /**
   * Cache wrapper for API functions
   */
  async wrap<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const startTime = performance.now();

    // Check cache first
    const cached = this.get<T>(key);
    if (cached && !options.revalidate) {
      return cached;
    }

    // If stale-while-revalidate and we have stale data, return it and update in background
    if (options.staleWhileRevalidate && cached) {
      // Return stale data immediately
      setImmediate(() => {
        this.fetchAndCache(key, fetchFn, options);
      });
      return cached;
    }

    // Fetch fresh data
    return this.fetchAndCache(key, fetchFn, options);
  }

  /**
   * Fetch and cache data
   */
  private async fetchAndCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const data = await fetchFn();
      this.set(key, data, options);

      const duration = performance.now() - startTime;
      logger.debug(
        'cache_miss',
        {
          requestId: 'cache',
          cacheHit: false,
          performance: {
            totalTime: duration,
          },
        },
        `Cache miss: ${key} (${duration.toFixed(2)}ms)`
      );

      return data;
    } catch (error) {
      logger.error(
        'cache_fetch_error',
        {
          requestId: 'cache',
          errorCode: (error as Error).name,
          errorContext: {
            key,
            error: (error as Error).message,
          },
        },
        `Failed to fetch data for cache key: ${key}`
      );
      throw error;
    }
  }

  /**
   * Invalidate cached entries by key or tags
   */
  invalidate(keyOrTag: string, isTag = false): number {
    let removed = 0;

    if (isTag) {
      // Invalidate by tag
      for (const [key, entry] of this.cache.entries()) {
        if (entry.tags?.includes(keyOrTag)) {
          this.cache.delete(key);
          removed++;
        }
      }
    } else {
      // Invalidate by exact key
      if (this.cache.delete(keyOrTag)) {
        removed = 1;
      }
    }

    logger.info(
      'cache_invalidate',
      {
        requestId: 'cache',
        businessMetric: {
          type: 'photo_view',
          value: removed,
          unit: 'entries',
        },
      },
      `Invalidated ${removed} cache entries for ${isTag ? 'tag' : 'key'}: ${keyOrTag}`
    );

    return removed;
  }

  /**
   * Get default TTL for a cache key
   */
  private getDefaultTTL(key: string): number {
    // Match key patterns to appropriate TTL
    const patterns = {
      'events:': APICache.DEFAULT_TTL.events,
      'photos:': APICache.DEFAULT_TTL.photos,
      'gallery:': APICache.DEFAULT_TTL.gallery,
      'subjects:': APICache.DEFAULT_TTL.subjects,
      'orders:': APICache.DEFAULT_TTL.orders,
      'stats:': APICache.DEFAULT_TTL.stats,
      'signed_url:': APICache.DEFAULT_TTL.signed_urls,
      'user:': APICache.DEFAULT_TTL.user_profile,
      'settings:': APICache.DEFAULT_TTL.settings,
    };

    for (const [pattern, ttl] of Object.entries(patterns)) {
      if (key.startsWith(pattern)) {
        return ttl;
      }
    }

    // Default fallback
    return 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug(
        'cache_cleanup',
        {
          requestId: 'cache',
          businessMetric: {
            type: 'photo_view',
            value: removed,
            unit: 'entries',
          },
        },
        `Cleaned up ${removed} expired cache entries`
      );
    }

    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate =
      totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    // Calculate memory usage (rough estimate)
    let memoryUsage = 0;
    const topKeys: Array<{ key: string; hits: number; data: any }> = [];

    for (const [key, entry] of this.cache.entries()) {
      // Rough memory calculation
      memoryUsage += JSON.stringify(entry).length * 2; // Unicode chars are 2 bytes
      topKeys.push({
        key,
        hits: entry.hits,
        data: typeof entry.data,
      });
    }

    // Sort by hits
    topKeys.sort((a, b) => b.hits - a.hits);

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage,
      topKeys: topKeys.slice(0, 10),
    };
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;

    logger.info(
      'cache_clear',
      {
        requestId: 'cache',
        businessMetric: {
          type: 'photo_view',
          value: count,
          unit: 'entries',
        },
      },
      `Cleared all cache entries (${count} items)`
    );
  }

  /**
   * Preload cache with data
   */
  async preload(
    entries: Array<{
      key: string;
      fetchFn: () => Promise<any>;
      options?: CacheOptions;
    }>
  ): Promise<void> {
    const startTime = performance.now();

    await Promise.allSettled(
      entries.map(({ key, fetchFn, options }) =>
        this.wrap(key, fetchFn, options)
      )
    );

    const duration = performance.now() - startTime;
    logger.info(
      'cache_preload',
      {
        requestId: 'cache',
        performance: {
          totalTime: duration,
        },
        businessMetric: {
          type: 'photo_view',
          value: entries.length,
          unit: 'entries',
        },
      },
      `Preloaded ${entries.length} cache entries in ${duration.toFixed(2)}ms`
    );
  }
}

// Export singleton instance
export const apiCache = APICache.getInstance();

// Utility functions

/**
 * Generate cache key for API endpoints
 */
export function generateCacheKey(
  endpoint: string,
  params?: Record<string, any>
): string {
  const baseKey = endpoint.replace(/^\/api\//, '').replace(/\//g, ':');

  if (!params || Object.keys(params).length === 0) {
    return baseKey;
  }

  // Sort params for consistent keys
  const sortedParams = Object.keys(params)
    .sort()
    .reduce(
      (result, key) => {
        result[key] = params[key];
        return result;
      },
      {} as Record<string, any>
    );

  const paramString = JSON.stringify(sortedParams);
  const paramHash = Buffer.from(paramString).toString('base64').slice(0, 8);

  return `${baseKey}:${paramHash}`;
}

/**
 * Cache wrapper for API routes
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  return apiCache.wrap(key, fetchFn, options);
}

/**
 * Invalidate cache by pattern
 */
export function invalidateCache(pattern: string, isTag = false): number {
  return apiCache.invalidate(pattern, isTag);
}

/**
 * Common cache keys factory
 */
export const CacheKeys = {
  events: {
    list: () => 'events:list',
    detail: (id: string) => `events:detail:${id}`,
    stats: (id: string) => `events:stats:${id}`,
  },
  photos: {
    list: (eventId: string, page = 1) => `photos:list:${eventId}:${page}`,
    untagged: (eventId: string) => `photos:untagged:${eventId}`,
    tagged: (eventId: string, subjectId: string) =>
      `photos:tagged:${eventId}:${subjectId}`,
  },
  gallery: {
    family: (token: string) => `gallery:family:${token.substring(0, 8)}`,
    public: (eventId: string) => `gallery:public:${eventId}`,
  },
  subjects: {
    list: (eventId: string) => `subjects:list:${eventId}`,
    detail: (id: string) => `subjects:detail:${id}`,
  },
  orders: {
    list: (page = 1) => `orders:list:${page}`,
    stats: () => 'orders:stats',
    detail: (id: string) => `orders:detail:${id}`,
  },
  signedUrl: (photoId: string) => `signed_url:${photoId}`,
  adminStats: () => 'stats:admin',
};

// Start cleanup interval
if (typeof global !== 'undefined') {
  setInterval(
    () => {
      apiCache.cleanup();
    },
    5 * 60 * 1000
  ); // Clean up every 5 minutes
}
