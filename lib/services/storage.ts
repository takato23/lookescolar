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

// Use only preview bucket for free tier optimization
const STORAGE_BUCKET = process.env.STORAGE_BUCKET_PREVIEW || 'photos';
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
 * Sube una imagen procesada optimizada al storage de Supabase
 * Only stores optimized previews, no originals for free tier compliance
 */
export async function uploadToStorage(
  processedImage: { buffer: Buffer; filename: string },
  eventId: string
): Promise<UploadResult> {
  // Only store optimized previews in the preview bucket
  const containerPrefix = `events/${eventId}`;
  const path = `${containerPrefix}/previews/${processedImage.filename}`;

  try {
    // Subir al bucket de previews (público)
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, processedImage.buffer, {
        contentType: 'image/webp', // Always WebP for optimized images
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

    logger.info('Optimized preview uploaded successfully', {
      path: path.substring(0, 20) + '***',
      size: processedImage.buffer.length,
    });

    return {
      path: data.path,
      size: processedImage.buffer.length,
    };
  } catch (error) {
    logger.error('Failed to upload optimized preview to storage', {
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
   * Configura el bucket como público para previews optimizadas
   */
  async configureBucketPublic(): Promise<void> {
    try {
      // Verificar si el bucket existe
      const { data: buckets, error: listError } =
        await supabase.storage.listBuckets();

      if (listError) {
        throw new Error(`Error listing buckets: ${listError.message}`);
      }

      const bucketExists = buckets?.some((b) => b.name === STORAGE_BUCKET);

      if (!bucketExists) {
        // Crear bucket público para previews
        const { error: createError } = await supabase.storage.createBucket(
          STORAGE_BUCKET,
          {
            public: true, // Público para previews optimizadas
            allowedMimeTypes: ['image/webp'], // Solo WebP para optimización
            fileSizeLimit: 10 * 1024 * 1024, // 10MB
          }
        );

        if (createError) {
          throw new Error(`Error creating bucket: ${createError.message}`);
        }

        logger.info('Public preview bucket created successfully', {
          bucket: STORAGE_BUCKET,
        });
      } else {
        // Verificar que sea público
        const { data: bucket } =
          await supabase.storage.getBucket(STORAGE_BUCKET);
        if (!bucket?.public) {
          logger.warn('Bucket should be public for optimized previews', {
            bucket: STORAGE_BUCKET,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to configure preview bucket', {
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
      // SECURITY: Sanitize path to prevent path traversal attacks
      const sanitizedPath = this.sanitizePath(path);
      
      // Verificar cache primero
      const cacheKey = `${sanitizedPath}:${JSON.stringify(options)}`;
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
        .createSignedUrl(sanitizedPath, expiresIn, {
          download: options.download,
          transform: options.transform,
        });

      if (error) {
        logger.error('Failed to create signed URL', {
          requestId,
          path: this.maskPath(sanitizedPath),
          error: error.message,
        });
        throw new Error(`Signed URL generation failed: ${error.message}`);
      }

      // Cache URL for performance
      this.urlCache.set(cacheKey, {
        url: data.signedUrl,
        expiresAt: Date.now() + (expiresIn * 1000) - 5000, // 5 seconds buffer
      });

      // Track egress for new URL generation
      if (egressData) {
        await egressService.trackEgress({
          ...egressData,
          requests: 1,
          bytes: 0, // Will be updated when actually served
        });
      }

      logger.debug('Generated new signed URL', {
        requestId,
        path: this.maskPath(sanitizedPath),
        expiresAt: new Date(Date.now() + (expiresIn * 1000)).toISOString(),
        cacheHit: false,
      });

      return data.signedUrl;
    } catch (error) {
      logger.error('Error in createSignedUrl', {
        requestId,
        path: this.maskPath(path),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Genera URLs firmadas en batch para mejor performance
   */
  async createBatchSignedUrls(
    requests: BatchSignedUrlRequest[],
    egressData?: EgressData
  ): Promise<Array<{ path: string; url: string; error?: string }>> {
    const results: Array<{ path: string; url: string; error?: string }> = [];

    // Process in batches to avoid overwhelming the API
    const batchSize = 50;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (req) => {
          try {
            const url = await this.createSignedUrl(req.path, req.options, egressData);
            return { path: req.path, url };
          } catch (error) {
            return {
              path: req.path,
              url: '',
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Limpia entradas expiradas del cache
   */
  cleanExpiredCache(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, value] of this.urlCache.entries()) {
      if (value.expiresAt <= now) {
        this.urlCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.debug('Cleaned expired cache entries', { removedCount });
    }

    return removedCount;
  }

  /**
   * Sanitiza paths para prevenir ataques de path traversal
   */
  private sanitizePath(path: string): string {
    // Remove null bytes
    let sanitized = path.replace(/\0/g, '');
    
    // Prevent directory traversal
    sanitized = sanitized.replace(/(\.\.[/\\])+/, '');
    
    // Normalize path separators
    sanitized = sanitized.replace(/[/\\]+/g, '/');
    
    // Remove leading/trailing slashes
    sanitized = sanitized.replace(/^\/+|\/+$/g, '');
    
    return sanitized;
  }

  /**
   * Enmascara paths para logging seguro
   */
  private maskPath(path: string): string {
    return path.substring(0, 20) + '***';
  }

  /**
   * Obtiene estadísticas del cache para monitoreo
   */
  getCacheStats() {
    return {
      size: this.urlCache.size,
      maxSize: 1000, // Configurable limit
    };
  }
}

// Export singleton instance
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
  storageService.configureBucketPublic().catch((error) => {
    logger.error('Failed to configure bucket on startup', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });
}
