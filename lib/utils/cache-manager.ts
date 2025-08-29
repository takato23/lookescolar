/**
 * Apple-Grade Cache Management System for Vercel Deployments
 *
 * Automatically cleans cache on deployment to prevent storage bloat
 * Monitors and optimizes cache usage for optimal performance
 */

import { logger } from '@/lib/utils/logger';
import { apiCache } from '@/lib/utils/api-cache';
import { storageService } from '@/lib/services/storage';

interface CacheCleanupConfig {
  autoCleanupOnDeploy: boolean;
  cleanupIntervalMinutes: number;
  maxCacheAgeHours: number;
  enableVercelCleanup: boolean;
}

interface CleanupMetrics {
  entriesRemoved: number;
  storageFreedMB: number;
  executionTimeMs: number;
  cacheHitRate: number;
}

class AppleGradeCacheManager {
  private static instance: AppleGradeCacheManager;
  private config: CacheCleanupConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isCleanupRunning = false;

  private constructor() {
    this.config = {
      autoCleanupOnDeploy: process.env.CACHE_AUTO_CLEANUP_ON_DEPLOY === 'true',
      cleanupIntervalMinutes: parseInt(
        process.env.CACHE_CLEANUP_INTERVAL_MINUTES || '30',
        10
      ),
      maxCacheAgeHours: parseInt(process.env.CACHE_MAX_AGE_HOURS || '24', 10),
      enableVercelCleanup:
        process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined,
    };

    this.initialize();
  }

  static getInstance(): AppleGradeCacheManager {
    if (!AppleGradeCacheManager.instance) {
      AppleGradeCacheManager.instance = new AppleGradeCacheManager();
    }
    return AppleGradeCacheManager.instance;
  }

  private initialize() {
    // Set up automatic cleanup interval
    if (this.config.cleanupIntervalMinutes > 0) {
      this.cleanupInterval = setInterval(
        () => this.performSmartCleanup(),
        this.config.cleanupIntervalMinutes * 60 * 1000
      );

      logger.info('cache_manager_initialized', {
        config: this.config,
        businessMetric: {
          type: 'cache_management',
          value: this.config.cleanupIntervalMinutes,
          unit: 'minutes',
        },
      });
    }

    // Auto-cleanup on Vercel deployments
    if (this.config.autoCleanupOnDeploy && this.config.enableVercelCleanup) {
      this.performDeploymentCleanup();
    }
  }

  /**
   * Perform smart cache cleanup based on usage patterns and age
   */
  async performSmartCleanup(): Promise<CleanupMetrics> {
    if (this.isCleanupRunning) {
      logger.debug('cache_cleanup_skipped', { reason: 'already_running' });
      return {
        entriesRemoved: 0,
        storageFreedMB: 0,
        executionTimeMs: 0,
        cacheHitRate: apiCache.getStats().hitRate,
      };
    }

    this.isCleanupRunning = true;
    const startTime = Date.now();

    try {
      // Clean API cache entries
      const apiEntriesRemoved = apiCache.cleanup();

      // Clean storage service cache
      const storageEntriesRemoved = storageService['cleanExpiredCache']
        ? storageService['cleanExpiredCache']()
        : 0;

      // Clean old signed URLs
      const signedUrlEntriesRemoved = this.cleanupExpiredSignedUrls();

      // Clean browser cache if in browser environment
      if (typeof window !== 'undefined') {
        await this.cleanupBrowserCache();
      }

      const executionTimeMs = Date.now() - startTime;
      const totalEntriesRemoved =
        apiEntriesRemoved + storageEntriesRemoved + signedUrlEntriesRemoved;

      const metrics: CleanupMetrics = {
        entriesRemoved: totalEntriesRemoved,
        storageFreedMB: Math.round(totalEntriesRemoved * 0.1 * 100) / 100, // Estimate 0.1MB per entry
        executionTimeMs,
        cacheHitRate: apiCache.getStats().hitRate,
      };

      logger.info('cache_cleanup_completed', {
        metrics,
        businessMetric: {
          type: 'cache_cleanup',
          value: totalEntriesRemoved,
          unit: 'entries',
        },
      });

      return metrics;
    } catch (error) {
      logger.error('cache_cleanup_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    } finally {
      this.isCleanupRunning = false;
    }
  }

  /**
   * Cleanup specifically for Vercel deployments
   */
  async performDeploymentCleanup(): Promise<CleanupMetrics> {
    logger.info('vercel_deployment_cache_cleanup_started', {
      environment: process.env.VERCEL_ENV || 'unknown',
      region: process.env.NOW_REGION || 'unknown',
    });

    // Force cleanup of all caches
    const metrics = await this.performSmartCleanup();

    // Additional Vercel-specific cleanup
    await this.cleanupVercelSpecificCaches();

    logger.info('vercel_deployment_cache_cleanup_completed', {
      metrics,
      businessMetric: {
        type: 'deployment_cleanup',
        value: metrics.entriesRemoved,
        unit: 'entries',
      },
    });

    return metrics;
  }

  /**
   * Cleanup expired signed URLs
   */
  private cleanupExpiredSignedUrls(): number {
    try {
      // This would interact with your storage service to clean expired signed URLs
      // Implementation depends on your specific storage setup
      return 0;
    } catch (error) {
      logger.warn('signed_url_cleanup_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Cleanup browser cache (client-side)
   */
  private async cleanupBrowserCache(): Promise<void> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          // Only clean old caches, keep current version
          if (
            cacheName.includes('lookescolar') &&
            !cacheName.includes(process.env.BUILD_VERSION || '')
          ) {
            await caches.delete(cacheName);
            logger.debug('browser_cache_deleted', { cacheName });
          }
        }
      }
    } catch (error) {
      logger.warn('browser_cache_cleanup_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Vercel-specific cache cleanup
   */
  private async cleanupVercelSpecificCaches(): Promise<void> {
    try {
      // Clean up any Vercel-specific cache directories or files
      // This is more of a conceptual implementation since we're in a Next.js app

      // In a real implementation, you might want to:
      // 1. Clean up temporary files in /tmp directory
      // 2. Clear any build artifacts that might be cached
      // 3. Reset any Vercel-specific environment caches

      logger.debug('vercel_specific_cache_cleanup_completed');
    } catch (error) {
      logger.warn('vercel_specific_cache_cleanup_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get current cache status and metrics
   */
  getCacheStatus(): {
    apiCacheEntries: number;
    storageCacheEntries: number;
    hitRate: number;
    lastCleanup: Date | null;
    config: CacheCleanupConfig;
  } {
    const apiStats = apiCache.getStats();

    return {
      apiCacheEntries: apiStats.totalEntries,
      storageCacheEntries: storageService['urlCache']
        ? storageService['urlCache'].size
        : 0,
      hitRate: apiStats.hitRate,
      lastCleanup: null, // Would need to track this
      config: this.config,
    };
  }

  /**
   * Manual cleanup trigger
   */
  async triggerManualCleanup(): Promise<CleanupMetrics> {
    logger.info('manual_cache_cleanup_triggered');
    return this.performSmartCleanup();
  }

  /**
   * Stop automatic cleanup (for cleanup on app shutdown)
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    logger.info('cache_manager_stopped');
  }
}

// Initialize on server start
if (typeof window === 'undefined') {
  // Server-side initialization
  AppleGradeCacheManager.getInstance();
}

export const cacheManager = AppleGradeCacheManager.getInstance();

// Export for Vercel deployment hooks
export async function vercelDeploymentCacheCleanup() {
  if (process.env.VERCEL === '1') {
    return cacheManager.performDeploymentCleanup();
  }
  return {
    entriesRemoved: 0,
    storageFreedMB: 0,
    executionTimeMs: 0,
    cacheHitRate: 0,
  };
}
