import { createClient } from '@supabase/supabase-js';
import { egressService } from './egress.service';
import { logger } from '@/lib/utils/logger';
import 'server-only';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Default to 'photos' to match current environment and setup route
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'photos';
const DEFAULT_URL_EXPIRY = 60 * 60; // 1 hora en segundos

export interface SignedUrlOptions {
  expiresIn?: number;
  download?: boolean;
  transform?: {
    width?: number;
    height?: number;
    resize?: 'cover' | 'contain' | 'fill';
  };
}

export interface BatchSignedUrlRequest {
  path: string;
  options?: SignedUrlOptions;
}

export interface EgressData {
  eventId?: string;
  bytes: number;
  requests: number;
}

export interface UploadResult {
  path: string;
  size: number;
  url?: string;
}

/**
 * Sube una imagen procesada al storage de Supabase
 */
export async function uploadToStorage(
  processedImage: { buffer: Buffer; filename: string },
  eventId: string
): Promise<UploadResult> {
  const path = `events/${eventId}/${processedImage.filename}`;

  try {
    // Subir al bucket privado
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, processedImage.buffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false, // No sobrescribir si existe
      });

    if (error) {
      // Si el archivo ya existe, es un error esperado
      if (error.message?.includes('already exists')) {
        logger.warn('File already exists in storage', { path });
        return {
          path,
          size: processedImage.buffer.length,
        };
      }
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    logger.info('File uploaded successfully', {
      path: path.substring(0, 20) + '***',
      size: processedImage.buffer.length,
    });

    return {
      path: data.path,
      size: processedImage.buffer.length,
    };
  } catch (error) {
    logger.error('Failed to upload to storage', {
      eventId,
      filename: processedImage.filename,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

class StorageService {
  private urlCache = new Map<string, { url: string; expiresAt: number }>();
  private trustedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'https://*.lookescolar.com',
  ];

  /**
   * Configura el bucket como privado en Supabase
   */
  async configureBucketPrivate(): Promise<void> {
    try {
      // Verificar si el bucket existe
      const { data: buckets, error: listError } =
        await supabase.storage.listBuckets();

      if (listError) {
        throw new Error(`Error listing buckets: ${listError.message}`);
      }

      const bucketExists = buckets?.some((b) => b.name === STORAGE_BUCKET);

      if (!bucketExists) {
        // Crear bucket privado
        const { error: createError } = await supabase.storage.createBucket(
          STORAGE_BUCKET,
          {
            public: false,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
            fileSizeLimit: 10 * 1024 * 1024, // 10MB
          }
        );

        if (createError) {
          throw new Error(`Error creating bucket: ${createError.message}`);
        }

        logger.info('Private bucket created successfully', {
          bucket: STORAGE_BUCKET,
        });
      } else {
        // Verificar que sea privado
        const { data: bucket } =
          await supabase.storage.getBucket(STORAGE_BUCKET);
        if (bucket?.public) {
          logger.warn('Bucket is public, should be private for security', {
            bucket: STORAGE_BUCKET,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to configure bucket', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bucket: STORAGE_BUCKET,
      });
      throw error;
    }
  }

  /**
   * Genera URL firmada con opciones de seguridad
   */
  async createSignedUrl(
    path: string,
    options: SignedUrlOptions = {},
    egressData?: EgressData
  ): Promise<string> {
    const requestId = crypto.randomUUID();

    try {
      // Verificar cache primero
      const cacheKey = `${path}:${JSON.stringify(options)}`;
      const cached = this.urlCache.get(cacheKey);

      if (cached && cached.expiresAt > Date.now()) {
        logger.debug('Returning cached signed URL', {
          requestId,
          path: this.maskPath(path),
          cacheHit: true,
        });

        // Track egress para URL cached
        if (egressData) {
          await egressService.trackEgress({
            ...egressData,
            requests: 1,
            bytes: 0, // No se transfieren bytes para cache hit
          });
        }

        return cached.url;
      }

      const expiresIn = options.expiresIn || DEFAULT_URL_EXPIRY;

      // Generar URL firmada
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(path, expiresIn, {
          download: options.download,
          transform: options.transform,
        });

      if (error) {
        throw new Error(`Error creating signed URL: ${error.message}`);
      }

      if (!data?.signedUrl) {
        throw new Error('No signed URL returned from Supabase');
      }

      // Cachear URL
      const expiresAt = Date.now() + expiresIn * 1000 - 5 * 60 * 1000; // 5 min buffer
      this.urlCache.set(cacheKey, {
        url: data.signedUrl,
        expiresAt,
      });

      // Track egress
      if (egressData) {
        await egressService.trackEgress({
          ...egressData,
          requests: 1,
        });
      }

      logger.info('Signed URL created successfully', {
        requestId,
        path: this.maskPath(path),
        expiresIn,
        cached: false,
      });

      return data.signedUrl;
    } catch (error) {
      logger.error('Failed to create signed URL', {
        requestId,
        path: this.maskPath(path),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Genera múltiples URLs firmadas en lote (optimizado)
   */
  async createBatchSignedUrls(
    requests: BatchSignedUrlRequest[],
    egressData?: EgressData
  ): Promise<{ path: string; url: string | null; error?: string }[]> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Procesar en lotes de 10 para evitar sobrecargar Supabase
      const batchSize = 10;
      const batches = [];

      for (let i = 0; i < requests.length; i += batchSize) {
        batches.push(requests.slice(i, i + batchSize));
      }

      const results: { path: string; url: string | null; error?: string }[] =
        [];

      for (const batch of batches) {
        const batchPromises = batch.map(async (request) => {
          try {
            const url = await this.createSignedUrl(
              request.path,
              request.options,
              egressData
            );
            return { path: request.path, url };
          } catch (error) {
            return {
              path: request.path,
              url: null,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const duration = Date.now() - startTime;
      const successCount = results.filter((r) => r.url).length;

      logger.info('Batch signed URLs created', {
        requestId,
        totalRequests: requests.length,
        successCount,
        failureCount: requests.length - successCount,
        duration,
        batchSize,
      });

      return results;
    } catch (error) {
      logger.error('Failed to create batch signed URLs', {
        requestId,
        totalRequests: requests.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Valida referer para anti-hotlinking
   */
  validateReferer(referer?: string | null): boolean {
    if (!referer) {
      return false;
    }

    try {
      const refererUrl = new URL(referer);

      return this.trustedOrigins.some((origin) => {
        if (origin.includes('*')) {
          // Soporte para wildcards como *.lookescolar.com
          const pattern = origin.replace('*', '[^.]*');
          const regex = new RegExp(`^${pattern}$`, 'i');
          return regex.test(refererUrl.hostname);
        }

        const originUrl = new URL(origin);
        return refererUrl.hostname === originUrl.hostname;
      });
    } catch {
      return false;
    }
  }

  /**
   * Invalida cache de URLs
   */
  invalidateCache(pathPattern?: string): void {
    if (!pathPattern) {
      this.urlCache.clear();
      logger.info('All URL cache cleared');
      return;
    }

    const regex = new RegExp(pathPattern);
    const keysToDelete: string[] = [];

    for (const [key] of this.urlCache) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.urlCache.delete(key));

    logger.info('Cache invalidated for pattern', {
      pattern: pathPattern,
      keysDeleted: keysToDelete.length,
    });
  }

  /**
   * Limpieza automática de archivos viejos
   */
  async cleanupOldFiles(olderThanDays: number = 90): Promise<{
    deletedCount: number;
    totalSizeBytes: number;
  }> {
    const requestId = crypto.randomUUID();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Listar archivos
      const { data: files, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list('previews/', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'asc' },
        });

      if (error) {
        throw new Error(`Error listing files: ${error.message}`);
      }

      if (!files || files.length === 0) {
        return { deletedCount: 0, totalSizeBytes: 0 };
      }

      // Filtrar archivos viejos
      const oldFiles = files.filter((file) => {
        if (!file.created_at) return false;
        const fileDate = new Date(file.created_at);
        return fileDate < cutoffDate;
      });

      if (oldFiles.length === 0) {
        logger.info('No old files found for cleanup', {
          requestId,
          olderThanDays,
        });
        return { deletedCount: 0, totalSizeBytes: 0 };
      }

      // Calcular tamaño total
      const totalSizeBytes = oldFiles.reduce(
        (sum, file) => sum + (file.metadata?.size || 0),
        0
      );

      // Eliminar archivos en lotes
      const pathsToDelete = oldFiles.map((file) => `previews/${file.name}`);
      const batchSize = 100;
      let deletedCount = 0;

      for (let i = 0; i < pathsToDelete.length; i += batchSize) {
        const batch = pathsToDelete.slice(i, i + batchSize);

        const { error: deleteError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(batch);

        if (deleteError) {
          logger.warn('Failed to delete batch', {
            requestId,
            batchStart: i,
            batchSize: batch.length,
            error: deleteError.message,
          });
        } else {
          deletedCount += batch.length;
        }
      }

      // Invalidar cache para archivos eliminados
      this.invalidateCache('previews/');

      logger.info('Old files cleanup completed', {
        requestId,
        olderThanDays,
        deletedCount,
        totalSizeBytes,
        totalSizeMB: Math.round(totalSizeBytes / 1024 / 1024),
      });

      return { deletedCount, totalSizeBytes };
    } catch (error) {
      logger.error('Failed to cleanup old files', {
        requestId,
        olderThanDays,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del storage
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSizeBytes: number;
    cacheSize: number;
  }> {
    try {
      const { data: files, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list('', { limit: 1000 });

      if (error) {
        throw new Error(`Error getting storage stats: ${error.message}`);
      }

      const totalFiles = files?.length || 0;
      const totalSizeBytes =
        files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;
      const cacheSize = this.urlCache.size;

      return {
        totalFiles,
        totalSizeBytes,
        cacheSize,
      };
    } catch (error) {
      logger.error('Failed to get storage stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Enmascara paths para logging seguro
   */
  private maskPath(path: string): string {
    if (path.length <= 10) {
      return '*'.repeat(path.length);
    }

    const start = path.substring(0, 3);
    const end = path.substring(path.length - 3);
    const middle = '*'.repeat(Math.max(0, path.length - 6));

    return `${start}${middle}${end}`;
  }

  /**
   * Limpieza periódica del cache
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, value] of this.urlCache) {
      if (value.expiresAt <= now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.urlCache.delete(key));

    if (expiredKeys.length > 0) {
      logger.debug('Expired cache entries removed', {
        count: expiredKeys.length,
      });
    }
  }
}

// Instancia singleton
export const storageService = new StorageService();

// Limpieza periódica del cache cada 15 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      (storageService as any).cleanExpiredCache();
    },
    15 * 60 * 1000
  );
}

// Auto-configurar bucket en inicialización
if (process.env.NODE_ENV !== 'test') {
  storageService.configureBucketPrivate().catch((error) => {
    logger.error('Failed to configure bucket on startup', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });
}
