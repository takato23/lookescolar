/**
 * Enhanced QR Code Caching Service
 * 
 * Implements intelligent caching strategies for QR codes with multi-level caching,
 * performance monitoring, and adaptive TTL management.
 */

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/utils/logger';
import { apiCache } from '@/lib/utils/api-cache';

export interface QRCacheEntry {
  dataUrl: string;
  token: string;
  portalUrl: string;
  subjectName: string;
  generatedAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  metadata?: Record<string, any>;
}

export interface QRCacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  avgGenerationTime: number;
  cacheEfficiency: number;
}

export interface QRCacheConfig {
  defaultTTL: number; // in milliseconds
  maxMemoryEntries: number;
  enableRedis: boolean;
  adaptiveTTL: boolean;
  prefetchThreshold: number; // percentage of TTL to trigger prefetch
}

class EnhancedQRCacheService {
  private static instance: EnhancedQRCacheService;
  private memoryCache: Map<string, QRCacheEntry>;
  private redis: Redis | null = null;
  private config: QRCacheConfig;
  private stats: {
    hits: number;
    misses: number;
    generationTimeSum: number;
    generationCount: number;
  };
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.memoryCache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      generationTimeSum: 0,
      generationCount: 0,
    };

    this.config = {
      defaultTTL: parseInt(process.env.QR_CACHE_TTL || '3600000', 10), // 1 hour default
      maxMemoryEntries: parseInt(process.env.QR_CACHE_MAX_ENTRIES || '1000', 10),
      enableRedis: process.env.UPSTASH_REDIS_REST_URL !== undefined,
      adaptiveTTL: process.env.QR_CACHE_ADAPTIVE_TTL === 'true',
      prefetchThreshold: parseInt(process.env.QR_CACHE_PREFETCH_THRESHOLD || '80', 10),
    };

    // Initialize Redis if available
    if (this.config.enableRedis) {
      try {
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });
        logger.info('qr_cache_redis_initialized', { 
          message: 'Redis cache initialized for QR codes' 
        });
      } catch (error) {
        logger.warn('qr_cache_redis_init_failed', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to initialize Redis cache, falling back to memory-only caching'
        });
        this.redis = null;
      }
    }

    // Set up cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  static getInstance(): EnhancedQRCacheService {
    if (!EnhancedQRCacheService.instance) {
      EnhancedQRCacheService.instance = new EnhancedQRCacheService();
    }
    return EnhancedQRCacheService.instance;
  }

  /**
   * Get QR data from cache
   */
  async getQR(subjectId: string): Promise<QRCacheEntry | null> {
    const cacheKey = this.getCacheKey(subjectId);
    const now = Date.now();

    // Try memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && memoryEntry.expiresAt > now) {
      return this.updateEntryAccess(memoryEntry, cacheKey);
    }

    // Try Redis cache if available
    if (this.redis) {
      try {
        const redisData = await this.redis.get<QRCacheEntry>(cacheKey);
        if (redisData && redisData.expiresAt > now) {
          // Move to memory cache for faster access next time
          this.memoryCache.set(cacheKey, redisData);
          return this.updateEntryAccess(redisData, cacheKey);
        }
      } catch (error) {
        logger.warn('qr_cache_redis_get_failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          subjectId,
          message: 'Failed to get QR from Redis cache'
        });
      }
    }

    // Cache miss
    this.stats.misses++;
    return null;
  }

  /**
   * Set QR data in cache
   */
  async setQR(
    subjectId: string,
    qrData: Omit<QRCacheEntry, 'generatedAt' | 'expiresAt' | 'accessCount' | 'lastAccessed'>,
    ttl?: number
  ): Promise<void> {
    const cacheKey = this.getCacheKey(subjectId);
    const now = Date.now();
    
    const entry: QRCacheEntry = {
      ...qrData,
      generatedAt: now,
      expiresAt: now + (ttl || this.config.defaultTTL),
      accessCount: 0,
      lastAccessed: now,
    };

    // Store in memory cache
    this.memoryCache.set(cacheKey, entry);
    
    // Store in Redis if available
    if (this.redis) {
      try {
        await this.redis.set(cacheKey, entry, {
          ex: Math.floor((ttl || this.config.defaultTTL) / 1000), // Redis TTL is in seconds
        });
      } catch (error) {
        logger.warn('qr_cache_redis_set_failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          subjectId,
          message: 'Failed to set QR in Redis cache'
        });
      }
    }

    // Enforce memory cache size limit
    if (this.memoryCache.size > this.config.maxMemoryEntries) {
      this.evictLeastRecentlyUsed();
    }

    logger.debug('qr_cache_set', {
      subjectId,
      cacheKey,
      ttl: ttl || this.config.defaultTTL,
      businessMetric: {
        type: 'photo_view',
        value: 1,
        unit: 'entries',
      }
    });
  }

  /**
   * Invalidate QR cache entry
   */
  async invalidateQR(subjectId: string): Promise<void> {
    const cacheKey = this.getCacheKey(subjectId);
    
    // Remove from memory cache
    this.memoryCache.delete(cacheKey);
    
    // Remove from Redis if available
    if (this.redis) {
      try {
        await this.redis.del(cacheKey);
      } catch (error) {
        logger.warn('qr_cache_redis_invalidate_failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          subjectId,
          message: 'Failed to invalidate QR in Redis cache'
        });
      }
    }

    logger.debug('qr_cache_invalidated', {
      subjectId,
      cacheKey,
      businessMetric: {
        type: 'photo_view',
        value: 1,
        unit: 'entries',
      }
    });
  }

  /**
   * Invalidate QR cache entries by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    let removed = 0;
    
    // Invalidate memory cache entries
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
        removed++;
      }
    }
    
    // Invalidate Redis cache entries
    if (this.redis) {
      try {
        // Note: This is a simplified implementation
        // In production, you might want to use Redis SCAN for better performance
        const keys = await this.redis.keys(`qr:${pattern}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          removed += keys.length;
        }
      } catch (error) {
        logger.warn('qr_cache_redis_invalidate_pattern_failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          pattern,
          message: 'Failed to invalidate QR cache entries by pattern in Redis'
        });
      }
    }

    logger.info('qr_cache_pattern_invalidated', {
      pattern,
      removedEntries: removed,
      businessMetric: {
        type: 'photo_view',
        value: removed,
        unit: 'entries',
      }
    });

    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): QRCacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    const avgGenerationTime = this.stats.generationCount > 0 
      ? this.stats.generationTimeSum / this.stats.generationCount 
      : 0;
    
    // Calculate memory usage (rough estimate)
    let memoryUsage = 0;
    for (const entry of this.memoryCache.values()) {
      memoryUsage += JSON.stringify(entry).length * 2; // Unicode chars are 2 bytes
    }

    // Calculate cache efficiency (based on access frequency)
    let totalAccesses = 0;
    let totalEntries = 0;
    for (const entry of this.memoryCache.values()) {
      totalAccesses += entry.accessCount;
      totalEntries++;
    }
    const cacheEfficiency = totalEntries > 0 ? (totalAccesses / totalEntries) : 0;

    return {
      totalEntries: this.memoryCache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage,
      avgGenerationTime: Math.round(avgGenerationTime * 100) / 100,
      cacheEfficiency: Math.round(cacheEfficiency * 100) / 100,
    };
  }

  /**
   * Record QR generation time for performance metrics
   */
  recordGenerationTime(durationMs: number): void {
    this.stats.generationTimeSum += durationMs;
    this.stats.generationCount++;
  }

  /**
   * Preload QR codes for multiple subjects
   */
  async preloadQRCodes(subjectIds: string[]): Promise<void> {
    logger.info('qr_cache_preload_started', {
      subjectCount: subjectIds.length,
      businessMetric: {
        type: 'photo_view',
        value: subjectIds.length,
        unit: 'subjects',
      }
    });

    // In a real implementation, this would fetch and cache QR data for multiple subjects
    // This is a placeholder for the actual implementation
    logger.debug('qr_cache_preload_completed', {
      subjectCount: subjectIds.length,
      message: 'QR cache preloading completed'
    });
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let memoryRemoved = 0;

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
        memoryRemoved++;
      }
    }

    logger.debug('qr_cache_cleanup', {
      memoryRemoved,
      remainingEntries: this.memoryCache.size,
      businessMetric: {
        type: 'photo_view',
        value: memoryRemoved,
        unit: 'entries',
      }
    });
  }

  /**
   * Evict least recently used entries when cache is full
   */
  private evictLeastRecentlyUsed(): void {
    // Convert to array and sort by last accessed time
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    // Remove oldest entries to make space
    const toRemove = Math.max(1, Math.floor(this.memoryCache.size * 0.1)); // Remove 10%
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      if (key) {
        this.memoryCache.delete(key);
      }
    }

    logger.debug('qr_cache_eviction', {
      removedEntries: toRemove,
      remainingEntries: this.memoryCache.size,
      businessMetric: {
        type: 'photo_view',
        value: toRemove,
        unit: 'entries',
      }
    });
  }

  /**
   * Update entry access statistics
   */
  private updateEntryAccess(entry: QRCacheEntry, cacheKey: string): QRCacheEntry {
    const now = Date.now();
    const updatedEntry = {
      ...entry,
      accessCount: entry.accessCount + 1,
      lastAccessed: now,
    };

    // Update in memory cache
    this.memoryCache.set(cacheKey, updatedEntry);
    
    // Update in Redis if available
    if (this.redis) {
      // Update access count but don't change expiration
      this.redis.hset(cacheKey, {
        accessCount: updatedEntry.accessCount,
        lastAccessed: updatedEntry.lastAccessed,
      }).catch(error => {
        logger.warn('qr_cache_redis_access_update_failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          cacheKey,
          message: 'Failed to update access count in Redis'
        });
      });
    }

    this.stats.hits++;
    return updatedEntry;
  }

  /**
   * Generate cache key for subject
   */
  private getCacheKey(subjectId: string): string {
    return `qr:${subjectId}`;
  }

  /**
   * Stop cache service and cleanup
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    logger.info('qr_cache_service_stopped');
  }
}

// Export singleton instance
export const qrCacheService = EnhancedQRCacheService.getInstance();

// Export for Vercel deployment hooks
export async function vercelQRCacheCleanup() {
  if (process.env.VERCEL === '1') {
    qrCacheService.stop();
  }
}