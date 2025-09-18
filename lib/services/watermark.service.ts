import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

// Dynamic import of Sharp to avoid Vercel issues
let sharp: any = null;
try {
  sharp = require('sharp');
} catch (error) {
  console.log('[WatermarkService] Sharp not available, will use fallback processing');
}

export interface WatermarkOptions {
  text: string;
  position: 'center' | 'bottom-right' | 'bottom-center' | 'top-right';
  opacity: number; // 0.0 to 1.0
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
}

export interface ProcessingOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 1-100
  format: 'jpeg' | 'webp' | 'png';
  watermark: WatermarkOptions;
}

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class WatermarkService {
  private readonly DEFAULT_WATERMARK_OPTIONS: WatermarkOptions = {
    text: 'MUESTRA - NO VÁLIDA PARA VENTA',
    position: 'center',
    opacity: 0.3,
    fontSize: 48,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: 'bold',
  };

  private readonly DEFAULT_PROCESSING_OPTIONS: Omit<
    ProcessingOptions,
    'watermark'
  > = {
    maxWidth: 800,
    maxHeight: 600,
    quality: 70,
    format: 'jpeg',
  };

  private async getSupabase() {
    return await createServerSupabaseServiceClient();
  }

  /**
   * Generate a watermarked preview image from the original photo
   */
  async generateWatermarkedPreview(
    photoId: string,
    originalImageBuffer: Buffer,
    options?: Partial<ProcessingOptions>
  ): Promise<
    ServiceResult<{
      previewBuffer: Buffer;
      previewPath: string;
      metadata: {
        width: number;
        height: number;
        format: string;
        size: number;
      };
    }>
  > {
    try {
      const processingOptions: ProcessingOptions = {
        ...this.DEFAULT_PROCESSING_OPTIONS,
        watermark: this.DEFAULT_WATERMARK_OPTIONS,
        ...options,
      };

      logger.info('Starting watermark preview generation', {
        photoId,
        originalSize: originalImageBuffer.length,
        processingOptions,
      });

      // Check if Sharp is available
      if (!sharp) {
        // Return original image if Sharp is not available
        console.log('[WatermarkService] Sharp not available, returning original image');
        return {
          success: true,
          data: originalImageBuffer,
          contentType: `image/${processingOptions.format}`
        };
      }

      // Get original image metadata
      const originalMetadata = await sharp(originalImageBuffer).metadata();

      if (!originalMetadata.width || !originalMetadata.height) {
        return { success: false, error: 'Could not read image dimensions' };
      }

      // Calculate preview dimensions while maintaining aspect ratio
      const { width: previewWidth, height: previewHeight } =
        this.calculatePreviewDimensions(
          originalMetadata.width,
          originalMetadata.height,
          processingOptions.maxWidth,
          processingOptions.maxHeight
        );

      // Create the watermark SVG
      const watermarkSvg = this.createWatermarkSvg(
        previewWidth,
        previewHeight,
        processingOptions.watermark
      );

      // Process the image
      const sharpInstance = sharp(originalImageBuffer)
        .resize(previewWidth, previewHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .composite([
          {
            input: Buffer.from(watermarkSvg),
            gravity: 'center',
          },
        ]);

      // Apply format-specific options
      let processedImage: sharp.Sharp;
      switch (processingOptions.format) {
        case 'jpeg':
          processedImage = sharpInstance.jpeg({
            quality: processingOptions.quality,
            progressive: true,
          });
          break;
        case 'webp':
          processedImage = sharpInstance.webp({
            quality: processingOptions.quality,
          });
          break;
        case 'png':
          processedImage = sharpInstance.png({
            compressionLevel: Math.floor(
              (100 - processingOptions.quality) / 10
            ),
          });
          break;
        default:
          return {
            success: false,
            error: `Unsupported format: ${processingOptions.format}`,
          };
      }

      const previewBuffer = await processedImage.toBuffer();
      const finalMetadata = await sharp(previewBuffer).metadata();

      // Generate storage path for preview
      const timestamp = Date.now();
      const previewPath = `previews/${photoId}/${timestamp}_preview.${processingOptions.format}`;

      logger.info('Successfully generated watermarked preview', {
        photoId,
        originalSize: originalImageBuffer.length,
        previewSize: previewBuffer.length,
        originalDimensions: `${originalMetadata.width}x${originalMetadata.height}`,
        previewDimensions: `${finalMetadata.width}x${finalMetadata.height}`,
        compressionRatio:
          Math.round(
            (previewBuffer.length / originalImageBuffer.length) * 100
          ) / 100,
      });

      return {
        success: true,
        data: {
          previewBuffer,
          previewPath,
          metadata: {
            width: finalMetadata.width || previewWidth,
            height: finalMetadata.height || previewHeight,
            format: finalMetadata.format || processingOptions.format,
            size: previewBuffer.length,
          },
        },
      };
    } catch (error) {
      logger.error('Failed to generate watermarked preview', {
        photoId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to generate preview',
      };
    }
  }

  /**
   * Upload watermarked preview to storage and update database
   */
  async uploadAndSavePreview(
    photoId: string,
    previewBuffer: Buffer,
    previewPath: string,
    metadata: { width: number; height: number; format: string; size: number }
  ): Promise<ServiceResult<{ previewUrl: string }>> {
    try {
      const supabase = await this.getSupabase();

      // Upload preview to storage
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(previewPath, previewBuffer, {
          contentType: `image/${metadata.format}`,
          cacheControl: '86400', // 24h cache for watermarked previews
          upsert: true,
        });

      if (uploadError) {
        logger.error('Failed to upload watermarked preview', {
          photoId,
          previewPath,
          error: uploadError.message,
        });
        return { success: false, error: uploadError.message };
      }

      // Update photo record with preview path
      const { error: updateError } = await supabase
        .from('photos')
        .update({
          watermark_path: previewPath,
          metadata: {
            preview: {
              width: metadata.width,
              height: metadata.height,
              format: metadata.format,
              size: metadata.size,
              generated_at: new Date().toISOString(),
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', photoId);

      if (updateError) {
        logger.error('Failed to update photo with preview path', {
          photoId,
          previewPath,
          error: updateError.message,
        });

        // Try to cleanup uploaded file
        await supabase.storage.from('photos').remove([previewPath]);

        return { success: false, error: updateError.message };
      }

      // Generate signed URL for immediate use
      const { data: urlData, error: urlError } = await supabase.storage
        .from('photos')
        .createSignedUrl(previewPath, 3600); // 1 hour

      const previewUrl = urlData?.signedUrl || '';

      logger.info('Successfully uploaded and saved watermarked preview', {
        photoId,
        previewPath,
        previewSize: metadata.size,
        previewUrl: previewUrl ? 'generated' : 'failed',
      });

      return {
        success: true,
        data: { previewUrl },
      };
    } catch (error) {
      logger.error('Unexpected error in uploadAndSavePreview', {
        photoId,
        previewPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to upload preview',
      };
    }
  }

  /**
   * Process a photo: generate watermarked preview and upload it
   */
  async processPhotoPreview(
    photoId: string,
    storagePath: string,
    options?: Partial<ProcessingOptions>
  ): Promise<ServiceResult<{ previewUrl: string; previewPath: string }>> {
    try {
      const supabase = await this.getSupabase();

      // Download original image
      const { data: imageData, error: downloadError } = await supabase.storage
        .from('photos')
        .download(storagePath);

      if (downloadError || !imageData) {
        return {
          success: false,
          error: downloadError?.message || 'Failed to download original image',
        };
      }

      const originalImageBuffer = Buffer.from(await imageData.arrayBuffer());

      // Generate watermarked preview
      const previewResult = await this.generateWatermarkedPreview(
        photoId,
        originalImageBuffer,
        options
      );

      if (!previewResult.success || !previewResult.data) {
        return { success: false, error: previewResult.error };
      }

      // Upload and save preview
      const uploadResult = await this.uploadAndSavePreview(
        photoId,
        previewResult.data.previewBuffer,
        previewResult.data.previewPath,
        previewResult.data.metadata
      );

      if (!uploadResult.success || !uploadResult.data) {
        return { success: false, error: uploadResult.error };
      }

      return {
        success: true,
        data: {
          previewUrl: uploadResult.data.previewUrl,
          previewPath: previewResult.data.previewPath,
        },
      };
    } catch (error) {
      logger.error('Unexpected error in processPhotoPreview', {
        photoId,
        storagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process photo preview',
      };
    }
  }

  /**
   * Calculate preview dimensions while maintaining aspect ratio
   */
  private calculatePreviewDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let width = Math.min(originalWidth, maxWidth);
    let height = Math.min(originalHeight, maxHeight);

    // Adjust to maintain aspect ratio
    if (width / height > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  /**
   * Create watermark SVG overlay
   */
  private createWatermarkSvg(
    width: number,
    height: number,
    options: WatermarkOptions
  ): string {
    const { text, position, opacity, fontSize, color, fontWeight } = options;

    // Calculate text position
    let x: string;
    let y: string;
    let textAnchor: string;

    switch (position) {
      case 'center':
        x = '50%';
        y = '50%';
        textAnchor = 'middle';
        break;
      case 'bottom-right':
        x = '95%';
        y = '95%';
        textAnchor = 'end';
        break;
      case 'bottom-center':
        x = '50%';
        y = '95%';
        textAnchor = 'middle';
        break;
      case 'top-right':
        x = '95%';
        y = '10%';
        textAnchor = 'end';
        break;
      default:
        x = '50%';
        y = '50%';
        textAnchor = 'middle';
    }

    // Calculate responsive font size based on image dimensions
    const responsiveFontSize = Math.max(
      Math.min(fontSize, width * 0.08, height * 0.08),
      16
    );

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.7)"/>
          </filter>
        </defs>
        <text 
          x="${x}" 
          y="${y}" 
          font-family="Arial, sans-serif"
          font-size="${responsiveFontSize}"
          font-weight="${fontWeight}"
          text-anchor="${textAnchor}"
          dominant-baseline="central"
          fill="${color}"
          opacity="${opacity}"
          filter="url(#shadow)"
        >${text}</text>
      </svg>
    `;
  }

  /**
   * Clean up old preview files for a photo
   */
  async cleanupOldPreviews(
    photoId: string
  ): Promise<ServiceResult<{ deletedCount: number }>> {
    try {
      const supabase = await this.getSupabase();

      // List all files in the preview folder for this photo
      const { data: files, error: listError } = await supabase.storage
        .from('photos')
        .list(`previews/${photoId}`, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (listError) {
        return { success: false, error: listError.message };
      }

      if (!files || files.length <= 1) {
        // Keep at least one file or no files to delete
        return { success: true, data: { deletedCount: 0 } };
      }

      // Keep the newest file, delete the rest
      const filesToDelete = files
        .slice(1)
        .map((file) => `previews/${photoId}/${file.name}`);

      const { error: deleteError } = await supabase.storage
        .from('photos')
        .remove(filesToDelete);

      if (deleteError) {
        logger.warn('Failed to cleanup some preview files', {
          photoId,
          filesToDelete: filesToDelete.length,
          error: deleteError.message,
        });
      }

      logger.info('Cleaned up old preview files', {
        photoId,
        deletedCount: filesToDelete.length,
      });

      return {
        success: true,
        data: { deletedCount: filesToDelete.length },
      };
    } catch (error) {
      logger.error('Unexpected error in cleanupOldPreviews', {
        photoId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to cleanup previews',
      };
    }
  }
}

// Export singleton instance
export const watermarkService = new WatermarkService();
