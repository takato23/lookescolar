import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

interface UrlRequest {
  photoId: string;
  storagePath: string;
  previewPath?: string;
  usePreview?: boolean;
  expiryMinutes?: number;
}

interface UrlResponse {
  photoId: string;
  signedUrl: string;
  expiresAt: string;
  error?: string;
}

interface BatchUrlRequest {
  requests: UrlRequest[];
  concurrencyLimit?: number;
  expiryMinutes?: number;
}

interface CacheEntry {
  signedUrl: string;
  expiresAt: Date;
}

class UrlBatchingService {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_EXPIRY_MINUTES = 60;
  private readonly MAX_CONCURRENT_REQUESTS = 10;
  private readonly CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly BATCH_SIZE = 50;

  constructor() {
    // Cleanup expired cache entries periodically
    setInterval(() => {
      this.cleanupExpiredCache();
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  /**
   * Generate signed URLs for multiple photos with batching and caching
   */
  async batchGenerateUrls(options: BatchUrlRequest): Promise<{
    success: boolean;
    urls: UrlResponse[];
    errors: string[];
  }> {
    const {
      requests,
      concurrencyLimit = this.MAX_CONCURRENT_REQUESTS,
      expiryMinutes = this.DEFAULT_EXPIRY_MINUTES,
    } = options;

    const results: UrlResponse[] = [];
    const errors: string[] = [];

    if (requests.length === 0) {
      return { success: true, urls: [], errors: [] };
    }

    if (requests.length > 1000) {
      return {
        success: false,
        urls: [],
        errors: ['Cannot process more than 1000 URLs at once'],
      };
    }

    try {
      // Split requests into batches to avoid overwhelming the system
      const batches = this.splitIntoBatches(requests, this.BATCH_SIZE);

      for (const batch of batches) {
        const batchResults = await this.processBatch(
          batch,
          concurrencyLimit,
          expiryMinutes
        );
        results.push(...batchResults.urls);
        errors.push(...batchResults.errors);
      }

      logger.info('Batch URL generation completed', {
        totalRequests: requests.length,
        successCount: results.length,
        errorCount: errors.length,
        cacheHits: this.getCacheHitCount(requests),
      });

      return {
        success: errors.length === 0,
        urls: results,
        errors,
      };
    } catch (error) {
      logger.error('Failed to batch generate URLs', {
        requestCount: requests.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        urls: results,
        errors: [
          `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Process a single batch of URL requests with concurrency limiting
   */
  private async processBatch(
    requests: UrlRequest[],
    concurrencyLimit: number,
    expiryMinutes: number
  ): Promise<{ urls: UrlResponse[]; errors: string[] }> {
    const urls: UrlResponse[] = [];
    const errors: string[] = [];

    // Separate cached and uncached requests
    const { cached, uncached } = this.separateCachedRequests(
      requests,
      expiryMinutes
    );

    // Add cached results
    urls.push(...cached);

    if (uncached.length === 0) {
      return { urls, errors };
    }

    const supabase = await createServerSupabaseServiceClient();

    // Process uncached requests with concurrency limiting
    const semaphore = new Semaphore(concurrencyLimit);

    const promises = uncached.map(async (request) => {
      return semaphore.acquire(async () => {
        try {
          const path = this.selectPath(request);
          const expirySeconds = expiryMinutes * 60;

          const ORIGINAL_BUCKET =
            process.env['STORAGE_BUCKET_ORIGINAL'] ||
            process.env['STORAGE_BUCKET'] ||
            'photo-private';
          const PREVIEW_BUCKET = process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';
          const pickBucket = (key: string) =>
            /(^|\/)previews\//.test(key) || /watermark/i.test(key)
              ? PREVIEW_BUCKET
              : ORIGINAL_BUCKET;
          let bucket = pickBucket(path);
          let { data: signedUrlData, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, expirySeconds);

          // Fallback to opposite bucket if object not found
          const isMissing =
            error &&
            ((error as any)?.status === 404 ||
              (error as any)?.statusCode === '404' ||
              String((error as any)?.message || '')
                .toLowerCase()
                .includes('not found'));
          if (isMissing) {
            const fallbackBucket = bucket === ORIGINAL_BUCKET ? PREVIEW_BUCKET : ORIGINAL_BUCKET;
            const attempt = await supabase.storage
              .from(fallbackBucket)
              .createSignedUrl(path, expirySeconds);
            if (!attempt.error && attempt.data?.signedUrl) {
              signedUrlData = attempt.data;
              error = undefined as any;
              bucket = fallbackBucket;
            }
          }

          if (error) {
            logger.warn('Failed to generate signed URL', {
              photoId: request.photoId,
              path,
              error: error.message,
            });
            errors.push(
              `Failed to generate URL for photo ${request.photoId}: ${error.message}`
            );
            return null;
          }

          if (!signedUrlData) {
            errors.push(
              `No signed URL data returned for photo ${request.photoId}`
            );
            return null;
          }

          const expiresAt = new Date(Date.now() + expirySeconds * 1000);
          const result: UrlResponse = {
            photoId: request.photoId,
            signedUrl: signedUrlData.signedUrl,
            expiresAt: expiresAt.toISOString(),
          };

          // Cache the result
          this.cacheUrl(request, signedUrlData.signedUrl, expiresAt);

          return result;
        } catch (error) {
          logger.warn('Error generating signed URL', {
            photoId: request.photoId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          errors.push(
            `Error generating URL for photo ${request.photoId}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          return null;
        }
      });
    });

    const results = await Promise.all(promises);

    // Filter out null results and add to urls
    results.forEach((result) => {
      if (result) {
        urls.push(result);
      }
    });

    return { urls, errors };
  }

  /**
   * Separate requests into cached and uncached
   */
  private separateCachedRequests(
    requests: UrlRequest[],
    expiryMinutes: number
  ): { cached: UrlResponse[]; uncached: UrlRequest[] } {
    const cached: UrlResponse[] = [];
    const uncached: UrlRequest[] = [];

    requests.forEach((request) => {
      const cacheKey = this.getCacheKey(request);
      const cachedEntry = this.cache.get(cacheKey);

      if (cachedEntry && this.isCacheValid(cachedEntry, expiryMinutes)) {
        cached.push({
          photoId: request.photoId,
          signedUrl: cachedEntry.signedUrl,
          expiresAt: cachedEntry.expiresAt.toISOString(),
        });
      } else {
        uncached.push(request);
      }
    });

    return { cached, uncached };
  }

  /**
   * Select the appropriate path (preview or original)
   */
  private selectPath(request: UrlRequest): string {
    return request.usePreview && request.previewPath
      ? request.previewPath
      : request.storagePath;
  }

  /**
   * Generate cache key for a request
   */
  private getCacheKey(request: UrlRequest): string {
    const path = this.selectPath(request);
    return `${request.photoId}:${path}`;
  }

  /**
   * Cache a URL result
   */
  private cacheUrl(
    request: UrlRequest,
    signedUrl: string,
    expiresAt: Date
  ): void {
    const cacheKey = this.getCacheKey(request);
    this.cache.set(cacheKey, {
      signedUrl,
      expiresAt,
    });
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(
    entry: CacheEntry,
    requestedExpiryMinutes: number
  ): boolean {
    const now = new Date();
    const timeUntilExpiry = entry.expiresAt.getTime() - now.getTime();
    const requiredMinutes = requestedExpiryMinutes * 60 * 1000;

    // Cache is valid if it has at least the requested expiry time remaining
    return timeUntilExpiry >= requiredMinutes;
  }

  /**
   * Split requests into batches
   */
  private splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Count cache hits for logging
   */
  private getCacheHitCount(requests: UrlRequest[]): number {
    let hits = 0;
    requests.forEach((request) => {
      const cacheKey = this.getCacheKey(request);
      if (this.cache.has(cacheKey)) {
        hits++;
      }
    });
    return hits;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = new Date();
    let cleanedCount = 0;

    this.cache.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      logger.debug('Cleaned up expired URL cache entries', {
        cleanedCount,
        remainingCount: this.cache.size,
      });
    }
  }

  /**
   * Clear all cache entries (useful for testing or manual cleanup)
   */
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('URL cache cleared', { clearedCount: size });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ key: string; expiresAt: string; isExpired: boolean }>;
  } {
    const now = new Date();
    const entries: Array<{
      key: string;
      expiresAt: string;
      isExpired: boolean;
    }> = [];

    this.cache.forEach((entry, key) => {
      entries.push({
        key,
        expiresAt: entry.expiresAt.toISOString(),
        isExpired: entry.expiresAt <= now,
      });
    });

    return {
      size: this.cache.size,
      entries,
    };
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.permits > 0) {
        this.permits--;
        this.executeTask(task, resolve, reject);
      } else {
        this.queue.push(() => {
          this.permits--;
          this.executeTask(task, resolve, reject);
        });
      }
    });
  }

  private async executeTask<T>(
    task: () => Promise<T>,
    resolve: (value: T) => void,
    reject: (reason: any) => void
  ): Promise<void> {
    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.permits++;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) {
          next();
        }
      }
    }
  }
}

// Export singleton instance
export const urlBatchingService = new UrlBatchingService();
