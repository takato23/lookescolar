/**
 * Canvas-based Image Processing Service
 *
 * Sharp-free alternative for Vercel production environments
 * Uses Canvas API for image processing without native dependencies
 *
 * Features:
 * - Resizing and compression using Canvas API
 * - Text watermarking without complex SVG compositing
 * - WebP output support through Canvas toBlob
 * - Memory-efficient processing for serverless environments
 */

interface CanvasProcessingOptions {
  targetSizeKB: number;
  maxDimension: number;
  watermarkText: string;
  quality: number;
}

interface CanvasProcessingResult {
  processedBuffer: Buffer;
  finalDimensions: { width: number; height: number };
  compressionLevel: number;
  actualSizeKB: number;
  method: 'canvas' | 'fallback';
}

export class CanvasImageProcessor {
  private static readonly DEFAULT_OPTIONS: CanvasProcessingOptions = {
    targetSizeKB: 35,
    maxDimension: 512,
    watermarkText: 'LOOK ESCOLAR',
    quality: 0.6, // Canvas quality 0-1
  };

  /**
   * Process image using Canvas API (Sharp-free)
   * Works in all environments including Vercel
   */
  static async processWithCanvas(
    inputBuffer: Buffer,
    options: Partial<CanvasProcessingOptions> = {}
  ): Promise<CanvasProcessingResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const targetBytes = config.targetSizeKB * 1024;

    try {
      // Check if we're in a browser-like environment with Canvas support
      if (typeof window !== 'undefined' && window.OffscreenCanvas) {
        return await this.processWithOffscreenCanvas(inputBuffer, config, targetBytes);
      }

      // Try node-canvas fallback for Node.js environments
      return await this.processWithNodeCanvas(inputBuffer, config, targetBytes);
    } catch (canvasError) {
      console.warn('[CanvasImageProcessor] Canvas processing failed, using minimal fallback:', canvasError);
      return await this.createMinimalFallback(config);
    }
  }

  /**
   * Process image using OffscreenCanvas (modern browsers/Edge Runtime)
   */
  private static async processWithOffscreenCanvas(
    inputBuffer: Buffer,
    config: CanvasProcessingOptions,
    targetBytes: number
  ): Promise<CanvasProcessingResult> {
    // Create image from buffer
    const imageBlob = new Blob([inputBuffer]);
    const imageBitmap = await createImageBitmap(imageBlob);

    const { width: originalWidth, height: originalHeight } = imageBitmap;

    // Calculate target dimensions
    const maxSide = Math.max(originalWidth, originalHeight);
    const scale = Math.min(1, config.maxDimension / maxSide);
    const targetWidth = Math.round(originalWidth * scale);
    const targetHeight = Math.round(originalHeight * scale);

    // Create offscreen canvas
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get 2D context from OffscreenCanvas');
    }

    // Draw and resize image
    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

    // Add watermark
    this.addCanvasWatermark(ctx, targetWidth, targetHeight, config.watermarkText);

    // Convert to WebP blob with compression
    const blob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: config.quality,
    });

    const arrayBuffer = await blob.arrayBuffer();
    const processedBuffer = Buffer.from(arrayBuffer);

    // Cleanup
    imageBitmap.close();

    return {
      processedBuffer,
      finalDimensions: { width: targetWidth, height: targetHeight },
      compressionLevel: 0,
      actualSizeKB: Math.round(processedBuffer.length / 1024),
      method: 'canvas',
    };
  }

  /**
   * Process image using node-canvas (Node.js environments)
   * Only works if canvas package is available
   */
  private static async processWithNodeCanvas(
    inputBuffer: Buffer,
    config: CanvasProcessingOptions,
    targetBytes: number
  ): Promise<CanvasProcessingResult> {
    try {
      // Dynamic import to avoid bundling issues
      const { createCanvas, loadImage } = await import('canvas');

      // Load image from buffer
      const image = await loadImage(inputBuffer);

      const { width: originalWidth, height: originalHeight } = image;

      // Calculate target dimensions
      const maxSide = Math.max(originalWidth, originalHeight);
      const scale = Math.min(1, config.maxDimension / maxSide);
      const targetWidth = Math.round(originalWidth * scale);
      const targetHeight = Math.round(originalHeight * scale);

      // Create canvas
      const canvas = createCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext('2d');

      // Draw and resize image
      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

      // Add watermark
      this.addCanvasWatermark(ctx, targetWidth, targetHeight, config.watermarkText);

      // Convert to WebP buffer
      const processedBuffer = canvas.toBuffer('image/webp', { quality: config.quality });

      return {
        processedBuffer,
        finalDimensions: { width: targetWidth, height: targetHeight },
        compressionLevel: 0,
        actualSizeKB: Math.round(processedBuffer.length / 1024),
        method: 'canvas',
      };
    } catch (nodeCanvasError) {
      console.warn('[CanvasImageProcessor] node-canvas not available:', nodeCanvasError);
      throw new Error('node-canvas not available in this environment');
    }
  }

  /**
   * Add text watermark to canvas context
   */
  private static addCanvasWatermark(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    width: number,
    height: number,
    text: string
  ): void {
    // Calculate font size based on canvas dimensions
    const fontSize = Math.max(12, Math.floor(Math.min(width, height) / 20));

    // Set font properties
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add semi-transparent watermark in center
    ctx.save();

    // Rotate for diagonal watermark
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 6); // -30 degrees

    // Text shadow/outline effect
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeText(`MUESTRA - ${text}`, 0, 0);

    // Main text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(`MUESTRA - ${text}`, 0, 0);

    ctx.restore();

    // Add corner watermarks
    ctx.save();
    ctx.font = `${Math.floor(fontSize * 0.8)}px Arial, sans-serif`;

    // Bottom right
    ctx.textAlign = 'end';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeText(text, width - 10, height - 10);
    ctx.fillText(text, width - 10, height - 10);

    // Top left
    ctx.textAlign = 'start';
    ctx.textBaseline = 'top';
    ctx.strokeText('LookEscolar.com', 10, 10);
    ctx.fillText('LookEscolar.com', 10, 10);

    ctx.restore();
  }

  /**
   * Create minimal fallback image when all processing fails
   */
  private static async createMinimalFallback(
    config: CanvasProcessingOptions
  ): Promise<CanvasProcessingResult> {
    try {
      // Try to create a basic placeholder image
      if (typeof window !== 'undefined' && window.OffscreenCanvas) {
        const canvas = new OffscreenCanvas(200, 100);
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // Red error background
          ctx.fillStyle = '#dc3545';
          ctx.fillRect(0, 0, 200, 100);

          // Error text
          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Preview Error', 100, 30);
          ctx.fillText(config.watermarkText, 100, 50);
          ctx.fillText('Contact Support', 100, 70);

          const blob = await canvas.convertToBlob({
            type: 'image/webp',
            quality: 0.5,
          });

          const arrayBuffer = await blob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          return {
            processedBuffer: buffer,
            finalDimensions: { width: 200, height: 100 },
            compressionLevel: -1,
            actualSizeKB: Math.round(buffer.length / 1024),
            method: 'fallback',
          };
        }
      }

      // Absolute fallback - create a minimal valid WebP buffer
      const hardcodedWebP = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x26, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
        0x56, 0x50, 0x38, 0x20, 0x1A, 0x00, 0x00, 0x00, 0x30, 0x01, 0x00, 0x9D,
        0x01, 0x2A, 0x01, 0x00, 0x01, 0x00, 0x02, 0x00, 0x34, 0x25, 0xA4, 0x00,
        0x03, 0x70, 0x00, 0xFE, 0xFB, 0xFD, 0x50, 0x00
      ]);

      return {
        processedBuffer: hardcodedWebP,
        finalDimensions: { width: 1, height: 1 },
        compressionLevel: -2,
        actualSizeKB: 1,
        method: 'fallback',
      };
    } catch (fallbackError) {
      console.error('[CanvasImageProcessor] Even minimal fallback failed:', fallbackError);
      throw new Error('Complete image processing failure');
    }
  }

  /**
   * Get basic image metadata from buffer
   */
  static async getImageMetadata(buffer: Buffer): Promise<{ width: number; height: number; format: string }> {
    try {
      // Try to read basic metadata from image headers
      const signature = buffer.slice(0, 4);

      if (signature[0] === 0xFF && signature[1] === 0xD8) {
        // JPEG format
        return this.parseJPEGMetadata(buffer);
      } else if (signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4E && signature[3] === 0x47) {
        // PNG format
        return this.parsePNGMetadata(buffer);
      } else if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') {
        // WebP format
        return this.parseWebPMetadata(buffer);
      }

      // Default fallback
      return { width: 800, height: 600, format: 'unknown' };
    } catch (error) {
      console.warn('[CanvasImageProcessor] Failed to parse metadata:', error);
      return { width: 800, height: 600, format: 'unknown' };
    }
  }

  private static parseJPEGMetadata(buffer: Buffer): { width: number; height: number; format: string } {
    // Basic JPEG metadata parsing (simplified)
    let offset = 2;
    while (offset < buffer.length) {
      const marker = buffer.readUInt16BE(offset);
      if (marker >= 0xFFC0 && marker <= 0xFFC3) {
        // SOF marker found
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height, format: 'jpeg' };
      }
      const length = buffer.readUInt16BE(offset + 2);
      offset += length + 2;
    }
    return { width: 800, height: 600, format: 'jpeg' };
  }

  private static parsePNGMetadata(buffer: Buffer): { width: number; height: number; format: string } {
    // PNG IHDR chunk is at offset 16
    if (buffer.length > 24) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height, format: 'png' };
    }
    return { width: 800, height: 600, format: 'png' };
  }

  private static parseWebPMetadata(buffer: Buffer): { width: number; height: number; format: string } {
    // Basic WebP metadata parsing (simplified)
    if (buffer.length > 30) {
      // Look for VP8 chunk
      const vp8Index = buffer.indexOf('VP8');
      if (vp8Index > 0 && vp8Index < buffer.length - 10) {
        const width = buffer.readUInt16LE(vp8Index + 14) & 0x3FFF;
        const height = buffer.readUInt16LE(vp8Index + 16) & 0x3FFF;
        return { width, height, format: 'webp' };
      }
    }
    return { width: 800, height: 600, format: 'webp' };
  }
}

/**
 * Fallback service that serves static placeholder images
 * Used when all image processing fails
 */
export class PlaceholderImageService {
  /**
   * Generate a base64 encoded placeholder image
   */
  static generatePlaceholderDataURL(
    width: number = 200,
    height: number = 100,
    text: string = 'Preview Unavailable'
  ): string {
    // Create SVG placeholder
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8f9fa"/>
        <rect x="2" y="2" width="${width-4}" height="${height-4}" fill="none" stroke="#dee2e6" stroke-width="2"/>
        <text x="50%" y="40%" font-family="Arial, sans-serif" font-size="14" font-weight="bold"
              text-anchor="middle" fill="#6c757d">📷</text>
        <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="12"
              text-anchor="middle" fill="#6c757d">${text}</text>
        <text x="50%" y="80%" font-family="Arial, sans-serif" font-size="10"
              text-anchor="middle" fill="#adb5bd">LookEscolar.com</text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  /**
   * Create placeholder buffer
   */
  static createPlaceholderBuffer(
    width: number = 200,
    height: number = 100,
    text: string = 'Preview Unavailable'
  ): Buffer {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8f9fa"/>
        <rect x="2" y="2" width="${width-4}" height="${height-4}" fill="none" stroke="#dee2e6" stroke-width="2"/>
        <text x="50%" y="40%" font-family="Arial, sans-serif" font-size="14" font-weight="bold"
              text-anchor="middle" fill="#6c757d">📷</text>
        <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="12"
              text-anchor="middle" fill="#6c757d">${text}</text>
        <text x="50%" y="80%" font-family="Arial, sans-serif" font-size="10"
              text-anchor="middle" fill="#adb5bd">LookEscolar.com</text>
      </svg>
    `;

    return Buffer.from(svg);
  }
}