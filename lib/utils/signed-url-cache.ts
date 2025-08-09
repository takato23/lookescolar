import React from 'react';
/**
 * Client-side cache for signed URLs following CLAUDE.md requirements
 * - URLs expire after 1 hour
 * - Stored in sessionStorage for security
 * - Never logs URLs or tokens
 * - Automatic cleanup of expired entries
 */

interface CachedUrl {
  url: string;
  expires: number;
  photoId: string;
  cachedAt: number;
}

interface CacheStats {
  totalEntries: number;
  hitRate: number;
  averageAge: number;
  nextExpiry: number;
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour as per CLAUDE.md
const STORAGE_KEY = 'photo_url_cache';
const STATS_KEY = 'photo_url_cache_stats';

const memoryCache = new Map<string, CachedUrl>();
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Initialize cache from sessionStorage
 */
export function initializeUrlCache(): void {
  try {
    if (typeof window === 'undefined') return;

    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, CachedUrl>;
      const now = Date.now();

      // Filter out expired entries during initialization
      Object.entries(parsed).forEach(([key, value]) => {
        if (value.expires > now) {
          memoryCache.set(key, value);
        }
      });
    }

    // Load stats
    const statsData = sessionStorage.getItem(STATS_KEY);
    if (statsData) {
      const stats = JSON.parse(statsData);
      cacheHits = stats.hits || 0;
      cacheMisses = stats.misses || 0;
    }

    // Set up periodic cleanup
    setInterval(cleanupExpiredEntries, 5 * 60 * 1000); // Every 5 minutes
  } catch (error) {
    console.warn('Error initializing URL cache:', error);
    memoryCache.clear();
  }
}

/**
 * Get cached URL for a photo ID
 */
export function getCachedUrl(photoId: string): string | null {
  const cached = memoryCache.get(photoId);
  const now = Date.now();

  if (cached && cached.expires > now) {
    cacheHits++;
    updateStats();
    return cached.url;
  }

  if (cached) {
    // Remove expired entry
    memoryCache.delete(photoId);
    persistCache();
  }

  cacheMisses++;
  updateStats();
  return null;
}

/**
 * Cache a signed URL for a photo
 */
export function setCachedUrl(photoId: string, url: string): void {
  const now = Date.now();
  const cached: CachedUrl = {
    url,
    expires: now + CACHE_DURATION,
    photoId,
    cachedAt: now,
  };

  memoryCache.set(photoId, cached);
  persistCache();
}

/**
 * Remove a specific URL from cache
 */
export function removeCachedUrl(photoId: string): void {
  memoryCache.delete(photoId);
  persistCache();
}

/**
 * Clear entire cache
 */
export function clearUrlCache(): void {
  memoryCache.clear();
  cacheHits = 0;
  cacheMisses = 0;

  try {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STATS_KEY);
    }
  } catch (error) {
    console.warn('Error clearing URL cache:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  const entries = Array.from(memoryCache.values());
  const now = Date.now();

  const totalRequests = cacheHits + cacheMisses;
  const hitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

  const ages = entries.map((entry) => now - entry.cachedAt);
  const averageAge =
    ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 0;

  const nextExpiry =
    entries.length > 0 ? Math.min(...entries.map((entry) => entry.expires)) : 0;

  return {
    totalEntries: entries.length,
    hitRate: Math.round(hitRate * 100) / 100,
    averageAge: Math.round(averageAge / 1000), // Convert to seconds
    nextExpiry,
  };
}

/**
 * Clean up expired entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, value] of memoryCache.entries()) {
    if (value.expires <= now) {
      memoryCache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    persistCache();
    console.debug(`URL cache cleanup: removed ${cleaned} expired entries`);
  }
}

/**
 * Persist cache to sessionStorage
 */
function persistCache(): void {
  try {
    if (typeof window === 'undefined') return;

    const cacheObject: Record<string, CachedUrl> = {};
    memoryCache.forEach((value, key) => {
      cacheObject[key] = value;
    });

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cacheObject));
  } catch (error) {
    // Handle quota exceeded or other storage errors
    console.warn('Error persisting URL cache, clearing oldest entries:', error);

    // Clear oldest half of entries
    const entries = Array.from(memoryCache.entries()).sort(
      ([, a], [, b]) => a.cachedAt - b.cachedAt
    );

    const toRemove = Math.floor(entries.length / 2);
    for (let i = 0; i < toRemove; i++) {
      memoryCache.delete(entries[i][0]);
    }

    // Try persisting again
    try {
      const cacheObject: Record<string, CachedUrl> = {};
      memoryCache.forEach((value, key) => {
        cacheObject[key] = value;
      });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cacheObject));
    } catch (finalError) {
      console.warn('Final cache persist failed, clearing cache');
      clearUrlCache();
    }
  }
}

/**
 * Update cache statistics
 */
function updateStats(): void {
  try {
    if (typeof window === 'undefined') return;

    const stats = {
      hits: cacheHits,
      misses: cacheMisses,
      lastUpdate: Date.now(),
    };

    sessionStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    // Ignore stats update errors
  }
}

/**
 * Preload URLs for multiple photos (batch request)
 */
export async function preloadPhotoUrls(
  photoIds: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const uncachedIds: string[] = [];

  // Check what's already cached
  for (const photoId of photoIds) {
    const cached = getCachedUrl(photoId);
    if (cached) {
      results.set(photoId, cached);
    } else {
      uncachedIds.push(photoId);
    }
  }

  // Batch fetch uncached URLs
  if (uncachedIds.length > 0) {
    try {
      const response = await fetch('/api/admin/storage/batch-signed-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: uncachedIds }),
      });

      if (response.ok) {
        const { signedUrls } = (await response.json()) as {
          signedUrls?: Record<string, string>;
        };

        // Cache the results
        Object.entries(signedUrls ?? {}).forEach(([photoId, url]) => {
          setCachedUrl(photoId, url as string);
          results.set(photoId, url as string);
        });
      }
    } catch (error) {
      console.error('Error preloading photo URLs:', error);
    }
  }

  return results;
}

/**
 * Hook to use signed URL with caching
 */
export function useSignedUrl(photoId: string, storagePath: string) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function fetchUrl() {
      // Check cache first
      const cached = getCachedUrl(photoId);
      if (cached) {
        if (isMounted) {
          setUrl(cached);
          setLoading(false);
        }
        return;
      }

      // Fetch from server
      try {
        const response = await fetch('/api/admin/storage/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoId, storagePath }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const { signedUrl } = await response.json();

        // Cache the URL
        setCachedUrl(photoId, signedUrl);

        if (isMounted) {
          setUrl(signedUrl);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    }

    fetchUrl();

    return () => {
      isMounted = false;
    };
  }, [photoId, storagePath]);

  return { url, loading, error };
}

// Initialize cache when module loads (client-side only)
if (typeof window !== 'undefined') {
  initializeUrlCache();
}
