import { Buffer } from 'buffer';
import { logger } from '@/lib/utils/logger';
import { qrService } from './qr.service';
import type { StudentQRData, QRDetectionResult } from './qr.service';
import 'server-only';

// Import QR detection libraries
const sharp = require('sharp');

interface QRDetectionOptions {
  maxWidth?: number;
  maxHeight?: number;
  enhanceContrast?: boolean;
  rotateDegrees?: number[];
  scanRegions?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  channels: number;
}

export class QRDetectionService {
  private readonly DEFAULT_OPTIONS: QRDetectionOptions = {
    maxWidth: 1920,
    maxHeight: 1080,
    enhanceContrast: true,
    rotateDegrees: [0, 90, 180, 270],
    scanRegions: [
      // Full image
      { x: 0, y: 0, width: 1, height: 1 },
      // Top quarter sections
      { x: 0, y: 0, width: 0.5, height: 0.5 },
      { x: 0.5, y: 0, width: 0.5, height: 0.5 },
      // Bottom quarter sections
      { x: 0, y: 0.5, width: 0.5, height: 0.5 },
      { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
    ],
  };

  /**
   * Detect QR codes in an image buffer
   */
  async detectQRCodesInImage(
    imageBuffer: Buffer,
    eventId?: string,
    options: QRDetectionOptions = {}
  ): Promise<QRDetectionResult[]> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Merge options with defaults
      const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };

      // Process image for QR detection
      const processedImages = await this.preprocessImageForQR(
        imageBuffer,
        finalOptions
      );

      const detectionResults: QRDetectionResult[] = [];

      // Try detection on each processed image
      for (const processedImage of processedImages) {
        try {
          const results = await this.scanImageForQRCodes(
            processedImage,
            eventId,
            finalOptions
          );
          detectionResults.push(...results);
        } catch (error) {
          logger.warn('QR detection failed for processed image', {
            requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Remove duplicates based on QR code value
      const uniqueResults = this.deduplicateQRResults(detectionResults);

      const duration = Date.now() - startTime;

      logger.info('QR detection completed', {
        requestId,
        eventId,
        imageSize: imageBuffer.length,
        processedImages: processedImages.length,
        detectedQRs: uniqueResults.length,
        duration,
      });

      return uniqueResults;
    } catch (error) {
      logger.error('QR detection failed', {
        requestId,
        eventId,
        imageSize: imageBuffer.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Preprocess image for better QR detection
   */
  private async preprocessImageForQR(
    imageBuffer: Buffer,
    options: QRDetectionOptions
  ): Promise<ProcessedImage[]> {
    const processedImages: ProcessedImage[] = [];

    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      const { width = 1920, height = 1080 } = metadata;

      // Resize if too large
      let resizedBuffer = imageBuffer;
      let finalWidth = width;
      let finalHeight = height;

      if (width > options.maxWidth! || height > options.maxHeight!) {
        const resized = await sharp(imageBuffer)
          .resize(options.maxWidth, options.maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .png()
          .toBuffer({ resolveWithObject: true });

        resizedBuffer = resized.data;
        finalWidth = resized.info.width;
        finalHeight = resized.info.height;
      }

      // Base image (original or resized)
      processedImages.push({
        buffer: resizedBuffer,
        width: finalWidth,
        height: finalHeight,
        channels: 4, // RGBA
      });

      // Enhanced contrast version
      if (options.enhanceContrast) {
        try {
          const enhancedBuffer = await sharp(resizedBuffer)
            .normalize()
            .modulate({
              brightness: 1.1,
              saturation: 0.8,
            })
            .sharpen()
            .png()
            .toBuffer();

          processedImages.push({
            buffer: enhancedBuffer,
            width: finalWidth,
            height: finalHeight,
            channels: 4,
          });
        } catch (error) {
          logger.warn('Failed to enhance contrast', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Grayscale version
      try {
        const grayscaleBuffer = await sharp(resizedBuffer)
          .grayscale()
          .normalize()
          .png()
          .toBuffer();

        processedImages.push({
          buffer: grayscaleBuffer,
          width: finalWidth,
          height: finalHeight,
          channels: 1,
        });
      } catch (error) {
        logger.warn('Failed to create grayscale version', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return processedImages;
    } catch (error) {
      logger.error('Image preprocessing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Scan processed image for QR codes using multiple methods
   */
  private async scanImageForQRCodes(
    processedImage: ProcessedImage,
    eventId?: string,
    options: QRDetectionOptions = {}
  ): Promise<QRDetectionResult[]> {
    const results: QRDetectionResult[] = [];

    try {
      // Method 1: Try with jsQR (faster, simpler)
      const jsQRResults = await this.scanWithJsQR(
        processedImage,
        eventId,
        options
      );
      results.push(...jsQRResults);

      // Method 2: Try with zxing-wasm (more robust)
      const zxingResults = await this.scanWithZXing(
        processedImage,
        eventId,
        options
      );
      results.push(...zxingResults);

      return results;
    } catch (error) {
      logger.warn('QR scanning failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Scan using jsQR library
   */
  private async scanWithJsQR(
    processedImage: ProcessedImage,
    eventId?: string,
    options: QRDetectionOptions = {}
  ): Promise<QRDetectionResult[]> {
    try {
      // Dynamic import to handle potential module loading issues
      const jsQR = await import('jsqr').then((m) => m.default);

      // Convert image to ImageData format expected by jsQR
      const imageData = await this.convertToImageData(processedImage);

      if (!imageData) {
        return [];
      }

      const results: QRDetectionResult[] = [];

      // Scan different regions of the image
      for (const region of options.scanRegions ||
        this.DEFAULT_OPTIONS.scanRegions!) {
        try {
          const regionData = this.extractRegion(imageData, region);
          const qrCodeResult = jsQR(
            regionData.data,
            regionData.width,
            regionData.height
          );

          if (qrCodeResult && qrCodeResult.data) {
            // Validate if this is a student QR code
            const studentData = await qrService.validateStudentQRCode(
              qrCodeResult.data,
              eventId
            );

            if (studentData) {
              results.push({
                qrCode: qrCodeResult.data,
                data: studentData,
                confidence: this.calculateConfidence(qrCodeResult),
                position: qrCodeResult.location
                  ? {
                      x:
                        qrCodeResult.location.topLeftCorner.x +
                        region.x * processedImage.width,
                      y:
                        qrCodeResult.location.topLeftCorner.y +
                        region.y * processedImage.height,
                      width: Math.abs(
                        qrCodeResult.location.topRightCorner.x -
                          qrCodeResult.location.topLeftCorner.x
                      ),
                      height: Math.abs(
                        qrCodeResult.location.bottomLeftCorner.y -
                          qrCodeResult.location.topLeftCorner.y
                      ),
                    }
                  : undefined,
              });
            }
          }
        } catch (error) {
          // Continue to next region if this one fails
          logger.debug('jsQR region scan failed', {
            region,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return results;
    } catch (error) {
      logger.warn('jsQR scanning failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Scan using ZXing WASM library
   */
  private async scanWithZXing(
    processedImage: ProcessedImage,
    eventId?: string,
    options: QRDetectionOptions = {}
  ): Promise<QRDetectionResult[]> {
    try {
      // Dynamic import for ZXing WASM
      const { readBarcodes } = await import('zxing-wasm');

      // Convert processed image to format expected by ZXing
      const imageData = await this.convertToImageData(processedImage);

      if (!imageData) {
        return [];
      }

      const results: QRDetectionResult[] = [];

      // Try different rotation angles
      for (const rotation of options.rotateDegrees || [0]) {
        try {
          let currentImageData = imageData;

          // Rotate image if needed
          if (rotation !== 0) {
            currentImageData = await this.rotateImageData(imageData, rotation);
          }

          // Detect barcodes/QR codes
          const barcodes = readBarcodes(currentImageData);

          for (const barcode of barcodes) {
            if (barcode.format === 'QRCode' && barcode.text) {
              // Validate if this is a student QR code
              const studentData = await qrService.validateStudentQRCode(
                barcode.text,
                eventId
              );

              if (studentData) {
                results.push({
                  qrCode: barcode.text,
                  data: studentData,
                  confidence: 0.9, // ZXing doesn't provide confidence scores
                  position: barcode.position
                    ? {
                        x: barcode.position.topLeft.x,
                        y: barcode.position.topLeft.y,
                        width:
                          barcode.position.topRight.x -
                          barcode.position.topLeft.x,
                        height:
                          barcode.position.bottomLeft.y -
                          barcode.position.topLeft.y,
                      }
                    : undefined,
                });
              }
            }
          }
        } catch (error) {
          logger.debug('ZXing rotation scan failed', {
            rotation,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return results;
    } catch (error) {
      logger.warn('ZXing scanning failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Convert processed image to ImageData format
   */
  private async convertToImageData(
    processedImage: ProcessedImage
  ): Promise<ImageData | null> {
    try {
      // Ensure we have RGBA data
      let buffer = processedImage.buffer;

      if (processedImage.channels !== 4) {
        // Convert to RGBA
        buffer = await sharp(processedImage.buffer)
          .ensureAlpha()
          .raw()
          .toBuffer();
      } else {
        // Extract raw pixel data
        buffer = await sharp(processedImage.buffer).raw().toBuffer();
      }

      // Create ImageData compatible object
      return {
        data: new Uint8ClampedArray(buffer),
        width: processedImage.width,
        height: processedImage.height,
      } as ImageData;
    } catch (error) {
      logger.warn('Failed to convert to ImageData', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Extract a region from ImageData
   */
  private extractRegion(
    imageData: ImageData,
    region: { x: number; y: number; width: number; height: number }
  ): ImageData {
    const startX = Math.floor(region.x * imageData.width);
    const startY = Math.floor(region.y * imageData.height);
    const regionWidth = Math.floor(region.width * imageData.width);
    const regionHeight = Math.floor(region.height * imageData.height);

    const regionData = new Uint8ClampedArray(regionWidth * regionHeight * 4);

    for (let y = 0; y < regionHeight; y++) {
      for (let x = 0; x < regionWidth; x++) {
        const srcIndex = ((startY + y) * imageData.width + (startX + x)) * 4;
        const destIndex = (y * regionWidth + x) * 4;

        regionData[destIndex] = imageData.data[srcIndex]; // R
        regionData[destIndex + 1] = imageData.data[srcIndex + 1]; // G
        regionData[destIndex + 2] = imageData.data[srcIndex + 2]; // B
        regionData[destIndex + 3] = imageData.data[srcIndex + 3]; // A
      }
    }

    return {
      data: regionData,
      width: regionWidth,
      height: regionHeight,
    } as ImageData;
  }

  /**
   * Rotate ImageData by specified degrees
   */
  private async rotateImageData(
    imageData: ImageData,
    degrees: number
  ): Promise<ImageData> {
    // For now, return original - rotation implementation would be complex
    // In production, you might want to use canvas or image processing library
    return imageData;
  }

  /**
   * Calculate confidence score from jsQR result
   */
  private calculateConfidence(qrResult: any): number {
    // jsQR doesn't provide confidence scores, so we estimate based on available data
    let confidence = 0.7; // Base confidence

    // Check if location data is available (usually means better detection)
    if (qrResult.location) {
      confidence += 0.2;
    }

    // Check data length (longer codes are often more reliable)
    if (qrResult.data && qrResult.data.length > 20) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Remove duplicate QR detection results
   */
  private deduplicateQRResults(
    results: QRDetectionResult[]
  ): QRDetectionResult[] {
    const seen = new Set<string>();
    const uniqueResults: QRDetectionResult[] = [];

    for (const result of results) {
      if (!seen.has(result.qrCode)) {
        seen.add(result.qrCode);
        uniqueResults.push(result);
      }
    }

    // Sort by confidence (highest first)
    return uniqueResults.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Batch process multiple images for QR detection
   */
  async batchDetectQRCodes(
    images: Array<{ buffer: Buffer; filename: string; eventId?: string }>,
    options: QRDetectionOptions = {}
  ): Promise<
    Array<{ filename: string; qrCodes: QRDetectionResult[]; error?: string }>
  > {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      const results = [];

      // Process in batches to avoid memory issues
      const batchSize = 5;
      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);

        const batchPromises = batch.map(async (image) => {
          try {
            const qrCodes = await this.detectQRCodesInImage(
              image.buffer,
              image.eventId,
              options
            );
            return { filename: image.filename, qrCodes };
          } catch (error) {
            return {
              filename: image.filename,
              qrCodes: [],
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const duration = Date.now() - startTime;
      const successCount = results.filter((r) => !r.error).length;
      const totalQRs = results.reduce((sum, r) => sum + r.qrCodes.length, 0);

      logger.info('Batch QR detection completed', {
        requestId,
        totalImages: images.length,
        successCount,
        failureCount: images.length - successCount,
        totalQRsDetected: totalQRs,
        duration,
      });

      return results;
    } catch (error) {
      logger.error('Batch QR detection failed', {
        requestId,
        totalImages: images.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

// Singleton instance
export const qrDetectionService = new QRDetectionService();
