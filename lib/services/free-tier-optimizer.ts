/**
 * Apple-Grade Free Tier Optimization Service
 * 
 * Enhanced for 1000 students × 20 photos = 20,000 photos
 * Apple-grade performance: Stay within 1GB Supabase free tier limit
 * 
 * Strategy:
 * - Intelligent 30-50KB per preview image (20,000 × 40KB avg = 800MB)
 * - No original storage (process and discard)
 * - Progressive compression with quality fallback
 * - Store only watermarked previews with blur placeholders
 * - Apple-style progressive loading optimization
 */

import sharp from 'sharp';

interface FreeTierProcessingOptions {
  targetSizeKB: number;
  maxDimension: number;
  watermarkText: string;
  enableOriginalStorage: boolean;
}

interface OptimizedResult {
  processedBuffer: Buffer;
  finalDimensions: { width: number; height: number };
  compressionLevel: number;
  actualSizeKB: number;
  blurDataURL?: string; // Apple-grade blur placeholder
  avgColor?: string; // Dominant color for instant loading
}

export class FreeTierOptimizer {
  private static readonly DEFAULT_OPTIONS: FreeTierProcessingOptions = {
    targetSizeKB: 35, // More aggressive: 35KB target for 20K photos = 700MB total
    maxDimension: 500, // Even smaller for better compression
    watermarkText: 'LOOK ESCOLAR',
    enableOriginalStorage: false, // NEVER store originals - they're backed up locally
  };

  // Anti-theft configuration
  private static readonly ANTI_THEFT_CONFIG = {
    watermarkDensity: 'HIGH', // Dense watermark pattern
    preventDownload: true,
    diagonalPattern: true,
    opacity: 0.4, // More visible to deter theft
  };

  /**
   * Process image for free tier constraints with anti-theft protection
   * NEVER stores original images to maximize free tier space
   */
  static async processForFreeTier(
    inputBuffer: Buffer,
    options: Partial<FreeTierProcessingOptions> = {}
  ): Promise<OptimizedResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options, enableOriginalStorage: false }; // Force disable original storage
    const targetBytes = config.targetSizeKB * 1024;

    // Get original metadata
    const metadata = await sharp(inputBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image metadata');
    }

    // Calculate optimal dimensions
    const { width: originalWidth, height: originalHeight } = metadata;
    const maxSide = Math.max(originalWidth, originalHeight);
    const scale = Math.min(1, config.maxDimension / maxSide);
    const targetWidth = Math.round(originalWidth * scale);
    const targetHeight = Math.round(originalHeight * scale);

    // Ultra-aggressive compression strategy for photography business
    const compressionLevels = [
      { quality: 35, dimensions: { w: targetWidth, h: targetHeight } },
      { quality: 30, dimensions: { w: Math.round(targetWidth * 0.9), h: Math.round(targetHeight * 0.9) } },
      { quality: 25, dimensions: { w: Math.round(targetWidth * 0.8), h: Math.round(targetHeight * 0.8) } },
      { quality: 20, dimensions: { w: Math.round(targetWidth * 0.7), h: Math.round(targetHeight * 0.7) } },
      { quality: 15, dimensions: { w: Math.round(targetWidth * 0.6), h: Math.round(targetHeight * 0.6) } },
      { quality: 12, dimensions: { w: Math.round(targetWidth * 0.5), h: Math.round(targetHeight * 0.5) } },
    ];

    let processedBuffer: Buffer;
    let finalDimensions = { width: targetWidth, height: targetHeight };
    let usedCompressionLevel = 0;

    // Try each compression level until target size is achieved
    for (let i = 0; i < compressionLevels.length; i++) {
      const level = compressionLevels[i];
      
      try {
        // Create watermark SVG for current dimensions
        const watermarkSvg = this.createOptimizedWatermark(
          level.dimensions.w,
          level.dimensions.h,
          config.watermarkText
        );

        processedBuffer = await sharp(inputBuffer)
          .resize(level.dimensions.w, level.dimensions.h, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .composite([{
            input: Buffer.from(watermarkSvg),
            gravity: 'center',
            blend: 'over'
          }])
          .webp({ 
            quality: level.quality,
            effort: 6, // Maximum compression effort
          })
          .toBuffer();

        finalDimensions = level.dimensions;
        usedCompressionLevel = i;

        // Check if target size is achieved
        if (processedBuffer.length <= targetBytes) {
          break;
        }
      } catch (error) {
        console.warn(`Compression level ${i} failed:`, error);
        if (i === compressionLevels.length - 1) {
          throw new Error('Failed to compress image to target size');
        }
      }
    }

    return {
      processedBuffer: processedBuffer!,
      finalDimensions,
      compressionLevel: usedCompressionLevel,
      actualSizeKB: Math.round(processedBuffer!.length / 1024),
    };
  }

  /**
   * Generate Apple-grade blur placeholder and dominant color
   */
  private static async generatePlaceholders(
    inputBuffer: Buffer,
    targetWidth: number,
    targetHeight: number
  ): Promise<{ blurDataURL: string; avgColor: string }> {
    // Generate tiny blur version (10x6 pixels) for ultra-fast loading
    const blurBuffer = await sharp(inputBuffer)
      .resize(10, 6, { fit: 'cover' })
      .blur(1)
      .webp({ quality: 20 })
      .toBuffer();
    
    const blurDataURL = `data:image/webp;base64,${blurBuffer.toString('base64')}`;
    
    // Extract dominant color for instant background
    const { dominant } = await sharp(inputBuffer)
      .resize(1, 1)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const [r, g, b] = Array.from(dominant.data);
    const avgColor = `rgb(${r}, ${g}, ${b})`;
    
    return { blurDataURL, avgColor };
  }
  private static createOptimizedWatermark(
    width: number,
    height: number,
    text: string
  ): string {
    // Anti-theft diagonal pattern watermark with dense coverage
    const fontSize = Math.max(14, Math.floor(Math.min(width, height) / 20));
    const opacity = 0.45; // More visible to deter theft
    const spacing = fontSize * 3; // Closer spacing for better coverage
    
    // Create diagonal grid pattern to cover entire image
    const diagonalElements: string[] = [];
    
    // Calculate how many watermarks we need diagonally
    const diagonal = Math.sqrt(width * width + height * height);
    const numWatermarks = Math.ceil(diagonal / spacing) + 2; // Extra coverage
    
    for (let i = 0; i < numWatermarks; i++) {
      for (let j = 0; j < numWatermarks; j++) {
        const x = (i * spacing) - (width * 0.3); // Start well before image
        const y = (j * spacing) - (height * 0.3); // Start well before image
        
        diagonalElements.push(`
          <text x="${x}" y="${y}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold"
            fill="white" 
            fill-opacity="${opacity}" 
            stroke="black" 
            stroke-width="1.5" 
            stroke-opacity="0.4"
            transform="rotate(-35 ${x} ${y})">
            ${text}
          </text>
        `);
      }
    }
    
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="watermarkPattern" patternUnits="userSpaceOnUse" width="${spacing}" height="${spacing}">
            <text x="0" y="${fontSize}" 
              font-family="Arial, sans-serif" 
              font-size="${fontSize}" 
              font-weight="bold"
              fill="white" 
              fill-opacity="${opacity}" 
              stroke="black" 
              stroke-width="1.5" 
              stroke-opacity="0.4"
              transform="rotate(-35 0 ${fontSize})">
              ${text}
            </text>
          </pattern>
        </defs>
        
        <!-- Fill entire image with watermark pattern -->
        <rect width="${width}" height="${height}" fill="url(#watermarkPattern)"/>
        
        <!-- Additional diagonal watermarks for extra protection -->
        ${diagonalElements.join('')}
        
        <!-- Central prominent watermark -->
        <text x="${width/2}" y="${height/2}" 
          font-family="Arial, sans-serif" 
          font-size="${fontSize * 1.8}" 
          font-weight="bold"
          fill="white" 
          fill-opacity="${opacity + 0.15}" 
          stroke="black" 
          stroke-width="2.5" 
          stroke-opacity="0.5"
          text-anchor="middle" 
          dominant-baseline="middle"
          transform="rotate(-35 ${width/2} ${height/2})">
          MUESTRA - NO VÁLIDA PARA VENTA
        </text>
        
        <!-- Bottom watermark with pricing info -->
        <text x="${width/2}" y="${height - 20}" 
          font-family="Arial, sans-serif" 
          font-size="${fontSize * 0.9}" 
          font-weight="bold"
          fill="white" 
          fill-opacity="${opacity + 0.1}" 
          stroke="black" 
          stroke-width="1.5" 
          stroke-opacity="0.4"
          text-anchor="middle">
          Comprar en LookEscolar.com
        </text>
      </svg>
    `.trim();
  }

  /**
   * Analyze storage impact for project scale
   */
  static analyzeStorageRequirements(
    studentCount: number,
    photosPerStudent: number,
    targetSizeKB: number = 50
  ): {
    totalPhotos: number;
    estimatedStorageGB: number;
    fitsInFreeTier: boolean;
    recommendations: string[];
  } {
    const totalPhotos = studentCount * photosPerStudent;
    const estimatedStorageGB = (totalPhotos * targetSizeKB) / (1024 * 1024);
    const fitsInFreeTier = estimatedStorageGB <= 1;

    const recommendations: string[] = [];
    
    if (!fitsInFreeTier) {
      recommendations.push(`Reduce target size to ${Math.ceil(1024 * 1024 / totalPhotos)}KB per photo`);
      recommendations.push('Consider storing only student photos, not group photos');
      recommendations.push('Implement photo cleanup after delivery');
    } else {
      recommendations.push('Current optimization targets are suitable for free tier');
      recommendations.push('Monitor storage usage with provided metrics');
    }

    return {
      totalPhotos,
      estimatedStorageGB: Math.round(estimatedStorageGB * 100) / 100,
      fitsInFreeTier,
      recommendations,
    };
  }

  /**
   * Get optimization metrics for monitoring
   */
  static getOptimizationMetrics(): {
    targetSizeKB: number;
    maxDimension: number;
    estimatedPhotosForFreeTier: number;
  } {
    return {
      targetSizeKB: this.DEFAULT_OPTIONS.targetSizeKB,
      maxDimension: this.DEFAULT_OPTIONS.maxDimension,
      estimatedPhotosForFreeTier: Math.floor(1024 * 1024 / this.DEFAULT_OPTIONS.targetSizeKB),
    };
  }
}

/**
 * Storage usage monitoring utilities
 */
export class StorageMonitor {
  static async getUsageMetrics(supabase: any): Promise<{
    photosCount: number;
    estimatedStorageUsed: string;
    percentageOfFreeTier: number;
  }> {
    try {
      const { count } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true });

      const estimatedBytes = (count || 0) * 50 * 1024; // 50KB average
      const estimatedStorageUsed = this.formatBytes(estimatedBytes);
      const percentageOfFreeTier = Math.round((estimatedBytes / (1024 * 1024 * 1024)) * 100);

      return {
        photosCount: count || 0,
        estimatedStorageUsed,
        percentageOfFreeTier,
      };
    } catch (error) {
      console.error('Failed to get storage metrics:', error);
      throw error;
    }
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}