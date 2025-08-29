import { getAppSettings } from '@/lib/settings';

export interface UploadLimits {
  maxSizeMb: number;
  maxConcurrent: number;
  quality: number;
  maxResolution: number;
}

interface UploadConfig {
  maxFileSize: number;
  maxFiles: number;
  allowedTypes: string[];
  quality: number;
  maxResolution: number;
}

/**
 * Gets current upload limits from settings with fallbacks
 */
export async function getUploadLimits(): Promise<UploadLimits> {
  try {
    const settings = await getAppSettings();
    
    return {
      maxSizeMb: settings.uploadMaxSizeMb,
      maxConcurrent: settings.uploadMaxConcurrent,
      quality: settings.uploadQuality,
      maxResolution: settings.uploadMaxResolution,
    };
  } catch (error) {
    console.error('Failed to get upload limits from settings, using defaults:', error);
    
    // Fallback to safe defaults
    return {
      maxSizeMb: 10,
      maxConcurrent: 3,
      quality: 70,
      maxResolution: 1920,
    };
  }
}

/**
 * Validates file size against current upload limits
 */
export async function validateFileSize(fileSizeBytes: number): Promise<{ valid: boolean; error?: string }> {
  const limits = await getUploadLimits();
  const maxSizeBytes = limits.maxSizeMb * 1024 * 1024;
  
  if (fileSizeBytes > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB) exceeds limit of ${limits.maxSizeMb}MB`
    };
  }
  
  return { valid: true };
}

/**
 * Gets upload validation middleware configuration
 */
export async function getUploadConfig(): Promise<UploadConfig> {
  const limits = await getUploadLimits();
  
  return {
    maxFileSize: limits.maxSizeMb * 1024 * 1024,
    maxFiles: limits.maxConcurrent,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    quality: limits.quality,
    maxResolution: limits.maxResolution,
  };
}