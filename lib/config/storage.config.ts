/**
 * Storage Configuration Constants
 * Centralized configuration for file storage, URLs, and caching
 */

export const STORAGE_CONFIG = {
  // URL Expiry Times (in seconds)
  DEFAULT_URL_EXPIRY_SECONDS: 3600, // 1 hour
  PREVIEW_URL_EXPIRY_SECONDS: 7200, // 2 hours  
  ORIGINAL_URL_EXPIRY_SECONDS: 1800, // 30 minutes
  QR_CODE_URL_EXPIRY_SECONDS: 86400, // 24 hours
  
  // File Size Limits
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_ORIGINAL_SIZE_BYTES: 25 * 1024 * 1024, // 25MB for originals
  MIN_FILE_SIZE_BYTES: 1024, // 1KB minimum
  
  // Image Processing
  PREVIEW_MAX_WIDTH: 800,
  PREVIEW_MAX_HEIGHT: 600,
  THUMBNAIL_SIZE: 200,
  WATERMARK_OPACITY: 0.7,
  COMPRESSION_QUALITY: 0.85,
  
  // Batch Processing
  MAX_BATCH_SIZE: 50,
  BATCH_TIMEOUT_MS: 30000, // 30 seconds
  CONCURRENT_UPLOADS: 3,
  
  // Cache Settings
  URL_CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  METADATA_CACHE_TTL_MS: 10 * 60 * 1000, // 10 minutes
  MAX_CACHE_ENTRIES: 1000,
  
  // Retry Configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  RETRY_BACKOFF_MULTIPLIER: 2,
  
  // Bucket Names (from environment or defaults)
  BUCKETS: {
    ORIGINALS: process.env.STORAGE_BUCKET_ORIGINAL || 'photo-private',
    PREVIEWS: process.env.STORAGE_BUCKET_PREVIEW || 'photos',
    THUMBNAILS: process.env.STORAGE_BUCKET_THUMBNAILS || 'thumbnails',
    QR_CODES: process.env.STORAGE_BUCKET_QR || 'qr-codes',
  },
  
  // Path Patterns
  PATHS: {
    ORIGINALS: 'originals/{eventId}/{photoId}',
    PREVIEWS: 'previews/{eventId}/{photoId}',
    THUMBNAILS: 'thumbnails/{eventId}/{photoId}',
    QR_CODES: 'qr/{subjectId}',
    WATERMARKS: 'watermarks/{eventId}',
  },
  
  // File Types
  SUPPORTED_FORMATS: {
    INPUT: ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const,
    OUTPUT: ['jpg', 'webp'] as const,
    QR_OUTPUT: 'png' as const,
  },
  
  // Egress Monitoring
  EGRESS_LIMITS: {
    DAILY_GB: 100,
    MONTHLY_GB: 2000,
    WARNING_THRESHOLD: 0.8, // 80% of limit
    CRITICAL_THRESHOLD: 0.95, // 95% of limit
  },
  
} as const;

/**
 * Storage service configuration
 */
export const STORAGE_SERVICE_CONFIG = {
  // URL Generation
  generatePreviewUrl: {
    expiry: STORAGE_CONFIG.PREVIEW_URL_EXPIRY_SECONDS,
    bucket: STORAGE_CONFIG.BUCKETS.PREVIEWS,
  },
  
  generateOriginalUrl: {
    expiry: STORAGE_CONFIG.ORIGINAL_URL_EXPIRY_SECONDS,
    bucket: STORAGE_CONFIG.BUCKETS.ORIGINALS,
  },
  
  generateThumbnailUrl: {
    expiry: STORAGE_CONFIG.DEFAULT_URL_EXPIRY_SECONDS,
    bucket: STORAGE_CONFIG.BUCKETS.THUMBNAILS,
  },
  
  // Processing Pipeline
  imageProcessing: {
    maxWidth: STORAGE_CONFIG.PREVIEW_MAX_WIDTH,
    maxHeight: STORAGE_CONFIG.PREVIEW_MAX_HEIGHT,
    quality: STORAGE_CONFIG.COMPRESSION_QUALITY,
    format: 'webp' as const,
  },
  
  // Watermark Settings
  watermark: {
    opacity: STORAGE_CONFIG.WATERMARK_OPACITY,
    position: 'center' as const,
    scale: 0.3, // 30% of image width
  },
  
} as const;

/**
 * Environment-specific overrides
 */
export const getStorageConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    ...STORAGE_CONFIG,
    
    // Development overrides
    ...(isDevelopment && {
      URL_CACHE_TTL_MS: 1000, // 1 second for development
      MAX_RETRY_ATTEMPTS: 1,
      EGRESS_LIMITS: {
        ...STORAGE_CONFIG.EGRESS_LIMITS,
        DAILY_GB: 10, // Lower limits for dev
        MONTHLY_GB: 200,
      },
    }),
    
    // Production optimizations
    ...(isProduction && {
      URL_CACHE_TTL_MS: 10 * 60 * 1000, // 10 minutes for production
      CONCURRENT_UPLOADS: 5, // Higher concurrency in prod
    }),
  };
};

/**
 * Type helpers
 */
export type StorageConfigKey = keyof typeof STORAGE_CONFIG;
export type SupportedInputFormat = typeof STORAGE_CONFIG.SUPPORTED_FORMATS.INPUT[number];
export type SupportedOutputFormat = typeof STORAGE_CONFIG.SUPPORTED_FORMATS.OUTPUT[number];