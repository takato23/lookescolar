/**
 * Image Optimization Service
 * 
 * Optimizes images for minimal storage usage while maintaining quality
 * Implements WebP compression, multiple resolutions, and external storage integration
 */

interface ImageResolution {
  name: string;
  width: number;
  height?: number;
  quality: number;
  format: 'webp' | 'jpeg';
  usage: 'thumbnail' | 'preview' | 'watermark' | 'print';
}

interface OptimizationResult {
  success: boolean;
  original: {
    size: number;
    format: string;
    dimensions: { width: number; height: number };
  };
  optimized: {
    thumbnail: { url: string; size: number };
    preview: { url: string; size: number };
    watermark: { url: string; size: number };
    print?: { url: string; size: number; external?: boolean };
  };
  totalSavings: number;
  compressionRatio: number;
}

export class ImageOptimizationService {
  // Standard resolutions for different use cases
  private static readonly RESOLUTIONS: ImageResolution[] = [
    {
      name: 'thumbnail',
      width: 300,
      height: 300,
      quality: 60,
      format: 'webp',
      usage: 'thumbnail',
    },
    {
      name: 'preview',
      width: 800,
      height: 600,
      quality: 75,
      format: 'webp',
      usage: 'preview',
    },
    {
      name: 'watermark',
      width: 1200,
      height: 900,
      quality: 80,
      format: 'webp',
      usage: 'watermark',
    },
    {
      name: 'print',
      width: 3000,
      height: 2400,
      quality: 95,
      format: 'jpeg',
      usage: 'print',
    },
  ];

  // Storage thresholds (in bytes)
  private static readonly STORAGE_LIMITS = {
    SUPABASE_MAX: 1024 * 1024 * 1024, // 1GB
    LARGE_FILE_THRESHOLD: 5 * 1024 * 1024, // 5MB
    EXTERNAL_STORAGE_THRESHOLD: 10 * 1024 * 1024, // 10MB
  };

  /**
   * Optimize image for multiple use cases
   */
  static async optimizeImage(
    imageBuffer: Buffer,
    originalFilename: string,
    options: {
      generateThumbnail?: boolean;
      generatePreview?: boolean;
      generateWatermark?: boolean;
      generatePrint?: boolean;
      useExternalStorage?: boolean;
    } = {}
  ): Promise<OptimizationResult> {
    const {
      generateThumbnail = true,
      generatePreview = true,
      generateWatermark = true,
      generatePrint = false,
      useExternalStorage = false,
    } = options;

    try {
      // Get original image info
      const sharp = (await import('sharp')).default;
      const originalImage = sharp(imageBuffer);
      const metadata = await originalImage.metadata();
      
      const originalSize = imageBuffer.length;
      const originalFormat = metadata.format || 'unknown';
      const originalDimensions = {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };

      const optimized: OptimizationResult['optimized'] = {
        thumbnail: { url: '', size: 0 },
        preview: { url: '', size: 0 },
        watermark: { url: '', size: 0 },
      };

      let totalOptimizedSize = 0;

      // Generate thumbnail
      if (generateThumbnail) {
        const thumbnailRes = this.RESOLUTIONS.find(r => r.name === 'thumbnail')!;
        const thumbnailBuffer = await this.resizeAndCompress(
          originalImage,
          thumbnailRes
        );
        
        optimized.thumbnail = {
          url: await this.uploadToStorage(thumbnailBuffer, `thumb_${originalFilename}`, 'supabase'),
          size: thumbnailBuffer.length,
        };
        totalOptimizedSize += thumbnailBuffer.length;
      }

      // Generate preview
      if (generatePreview) {
        const previewRes = this.RESOLUTIONS.find(r => r.name === 'preview')!;
        const previewBuffer = await this.resizeAndCompress(
          originalImage,
          previewRes
        );
        
        optimized.preview = {
          url: await this.uploadToStorage(previewBuffer, `prev_${originalFilename}`, 'supabase'),
          size: previewBuffer.length,
        };
        totalOptimizedSize += previewBuffer.length;
      }

      // Generate watermark version
      if (generateWatermark) {
        const watermarkRes = this.RESOLUTIONS.find(r => r.name === 'watermark')!;
        const watermarkBuffer = await this.resizeAndCompress(
          originalImage,
          watermarkRes
        );
        
        optimized.watermark = {
          url: await this.uploadToStorage(watermarkBuffer, `wm_${originalFilename}`, 'supabase'),
          size: watermarkBuffer.length,
        };
        totalOptimizedSize += watermarkBuffer.length;
      }

      // Generate print version (conditionally external)
      if (generatePrint) {
        const printRes = this.RESOLUTIONS.find(r => r.name === 'print')!;
        const printBuffer = await this.resizeAndCompress(
          originalImage,
          printRes
        );
        
        // Use external storage for large print files
        const useExternal = useExternalStorage || 
          printBuffer.length > this.STORAGE_LIMITS.EXTERNAL_STORAGE_THRESHOLD;
        
        optimized.print = {
          url: await this.uploadToStorage(
            printBuffer, 
            `print_${originalFilename}`, 
            useExternal ? 'external' : 'supabase'
          ),
          size: printBuffer.length,
          external: useExternal,
        };
        
        if (!useExternal) {
          totalOptimizedSize += printBuffer.length;
        }
      }

      const totalSavings = originalSize - totalOptimizedSize;
      const compressionRatio = totalOptimizedSize / originalSize;

      return {
        success: true,
        original: {
          size: originalSize,
          format: originalFormat,
          dimensions: originalDimensions,
        },
        optimized,
        totalSavings,
        compressionRatio,
      };

    } catch (error) {
      console.error('Image optimization failed:', error);
      throw new Error(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resize and compress image to specified resolution
   */
  private static async resizeAndCompress(
    sharpImage: any, // sharp instance
    resolution: ImageResolution
  ): Promise<Buffer> {
    let pipeline = sharpImage
      .resize(resolution.width, resolution.height, {
        fit: 'inside',
        withoutEnlargement: true,
      });

    if (resolution.format === 'webp') {
      pipeline = pipeline.webp({
        quality: resolution.quality,
        effort: 6, // Higher compression effort
      });
    } else if (resolution.format === 'jpeg') {
      pipeline = pipeline.jpeg({
        quality: resolution.quality,
        progressive: true,
        mozjpeg: true, // Better compression
      });
    }

    return pipeline.toBuffer();
  }

  /**
   * Upload optimized image to storage
   */
  private static async uploadToStorage(
    buffer: Buffer,
    filename: string,
    storageType: 'supabase' | 'external'
  ): Promise<string> {
    if (storageType === 'external') {
      // Upload to external storage (Cloudinary, AWS S3, etc.)
      return this.uploadToExternalStorage(buffer, filename);
    } else {
      // Upload to Supabase storage
      return this.uploadToSupabaseStorage(buffer, filename);
    }
  }

  /**
   * Upload to Supabase storage
   */
  private static async uploadToSupabaseStorage(buffer: Buffer, filename: string): Promise<string> {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.storage
      .from('optimized-photos')
      .upload(filename, buffer, {
        contentType: this.getContentType(filename),
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    return data.path;
  }

  /**
   * Upload to external storage (Cloudinary example)
   */
  private static async uploadToExternalStorage(buffer: Buffer, filename: string): Promise<string> {
    // Example with Cloudinary
    if (process.env.CLOUDINARY_URL) {
      try {
        const cloudinary = (await import('cloudinary')).v2;
        
        return new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              public_id: filename.replace(/\.[^/.]+$/, ''), // Remove extension
              quality: 'auto',
              fetch_format: 'auto',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result?.secure_url || '');
            }
          ).end(buffer);
        });
      } catch (error) {
        console.error('Cloudinary upload failed:', error);
        // Fallback to Supabase
        return this.uploadToSupabaseStorage(buffer, filename);
      }
    }

    // Fallback to Supabase if no external storage configured
    return this.uploadToSupabaseStorage(buffer, filename);
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageUsage(): Promise<{
    totalUsed: number;
    totalAvailable: number;
    usagePercentage: number;
    recommendation: string;
  }> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Get storage usage (this would need to be implemented based on Supabase's storage API)
      // For now, we'll return placeholder data
      const totalUsed = 0; // Get actual usage from Supabase
      const totalAvailable = this.STORAGE_LIMITS.SUPABASE_MAX;
      const usagePercentage = (totalUsed / totalAvailable) * 100;

      let recommendation = '';
      if (usagePercentage > 90) {
        recommendation = 'Critically high usage. Enable external storage immediately.';
      } else if (usagePercentage > 75) {
        recommendation = 'High usage. Consider enabling external storage for new uploads.';
      } else if (usagePercentage > 50) {
        recommendation = 'Moderate usage. Monitor and consider cleanup of old files.';
      } else {
        recommendation = 'Storage usage is healthy.';
      }

      return {
        totalUsed,
        totalAvailable,
        usagePercentage,
        recommendation,
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      throw error;
    }
  }

  /**
   * Clean up old or unused images
   */
  static async cleanupOldImages(daysOld: number = 30): Promise<{
    filesDeleted: number;
    spaceFreed: number;
  }> {
    // Implementation would identify and delete old, unused images
    // This is a placeholder for the actual implementation
    return {
      filesDeleted: 0,
      spaceFreed: 0,
    };
  }

  /**
   * Get content type from filename
   */
  private static getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'webp':
        return 'image/webp';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Batch optimization for multiple images
   */
  static async batchOptimize(
    images: Array<{ buffer: Buffer; filename: string }>,
    options: {
      maxConcurrent?: number;
      useExternalStorage?: boolean;
    } = {}
  ): Promise<OptimizationResult[]> {
    const { maxConcurrent = 3, useExternalStorage = false } = options;
    const results: OptimizationResult[] = [];
    
    // Process images in batches to avoid overwhelming the system
    for (let i = 0; i < images.length; i += maxConcurrent) {
      const batch = images.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(({ buffer, filename }) =>
        this.optimizeImage(buffer, filename, { useExternalStorage })
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
    }
    
    return results;
  }
}
