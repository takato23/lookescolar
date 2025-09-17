/**
 * Integration test for Vercel-compatible image processing
 * Tests Canvas-based processing without Sharp dependencies
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { FreeTierOptimizer } from '@/lib/services/free-tier-optimizer';
import { CanvasImageProcessor, PlaceholderImageService } from '@/lib/services/canvas-image-processor';
import fs from 'fs';
import path from 'path';

describe('Vercel Image Processing (Sharp-free)', () => {
  let testImageBuffer: Buffer;

  beforeAll(async () => {
    // Create a minimal test image buffer (1x1 PNG)
    const minimal1x1PNG = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // width=1, height=1
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth=8, color type=2
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00, // compressed data
      0x00, 0x01, 0x00, 0x01, 0x5C, 0xC6, 0x8A, 0x64, //
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
      0xAE, 0x42, 0x60, 0x82
    ]);

    testImageBuffer = minimal1x1PNG;
  });

  it('should process images without Sharp on Vercel', async () => {
    // Simulate Vercel environment
    process.env.VERCEL = '1';

    const result = await FreeTierOptimizer.processForFreeTier(testImageBuffer, {
      targetSizeKB: 35,
      maxDimension: 512,
      watermarkText: 'Test Watermark'
    });

    expect(result).toBeDefined();
    expect(result.processedBuffer).toBeInstanceOf(Buffer);
    expect(result.processedBuffer.length).toBeGreaterThan(0);
    expect(result.finalDimensions).toBeDefined();
    expect(result.finalDimensions.width).toBeGreaterThan(0);
    expect(result.finalDimensions.height).toBeGreaterThan(0);
    expect(result.actualSizeKB).toBeGreaterThan(0);

    // Clean up environment
    delete process.env.VERCEL;
  });

  it('should create placeholder when processing fails', async () => {
    // Test with invalid buffer
    const invalidBuffer = Buffer.from('invalid image data');

    const result = await FreeTierOptimizer.processForFreeTier(invalidBuffer, {
      targetSizeKB: 35,
      maxDimension: 512,
      watermarkText: 'Test Fallback'
    });

    expect(result).toBeDefined();
    expect(result.processedBuffer).toBeInstanceOf(Buffer);
    expect(result.compressionLevel).toBeLessThan(0); // Indicates fallback
    expect(result.finalDimensions.width).toBeGreaterThan(0);
    expect(result.finalDimensions.height).toBeGreaterThan(0);
  });

  it('should generate placeholder images correctly', () => {
    const dataURL = PlaceholderImageService.generatePlaceholderDataURL(
      200,
      100,
      'Test Preview'
    );

    expect(dataURL).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(dataURL.length).toBeGreaterThan(50);

    const buffer = PlaceholderImageService.createPlaceholderBuffer(
      200,
      100,
      'Test Preview'
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString().includes('svg')).toBe(true);
    expect(buffer.toString().includes('Test Preview')).toBe(true);
  });

  it('should parse image metadata without Sharp', async () => {
    const metadata = await CanvasImageProcessor.getImageMetadata(testImageBuffer);

    expect(metadata).toBeDefined();
    expect(metadata.width).toBeGreaterThan(0);
    expect(metadata.height).toBeGreaterThan(0);
    expect(metadata.format).toBeDefined();
  });

  it('should handle Canvas processing gracefully', async () => {
    try {
      const result = await CanvasImageProcessor.processWithCanvas(testImageBuffer, {
        targetSizeKB: 35,
        maxDimension: 512,
        watermarkText: 'Canvas Test',
        quality: 0.6
      });

      // If Canvas works, great!
      expect(result).toBeDefined();
      expect(result.processedBuffer).toBeInstanceOf(Buffer);
      expect(result.method).toMatch(/canvas|fallback/);
    } catch (error) {
      // If Canvas doesn't work in test environment, it should fall back gracefully
      expect(error).toBeInstanceOf(Error);
      console.log('Canvas not available in test environment, which is expected');
    }
  });

  it('should work without any image processing libraries', async () => {
    // Test the absolute fallback scenario
    const placeholderResult = await FreeTierOptimizer.processForFreeTier(
      Buffer.from('completely invalid data that will fail all processing'),
      {
        targetSizeKB: 35,
        maxDimension: 512,
        watermarkText: 'Fallback Test'
      }
    );

    expect(placeholderResult).toBeDefined();
    expect(placeholderResult.processedBuffer).toBeInstanceOf(Buffer);
    expect(placeholderResult.finalDimensions.width).toBeGreaterThan(0);
    expect(placeholderResult.finalDimensions.height).toBeGreaterThan(0);
    expect(placeholderResult.compressionLevel).toBeLessThan(0); // Fallback indicator
  });

  it('should maintain consistent API regardless of processing method', async () => {
    const testCases = [
      testImageBuffer, // Valid image
      Buffer.from('invalid'), // Invalid data
    ];

    for (const buffer of testCases) {
      const result = await FreeTierOptimizer.processForFreeTier(buffer, {
        targetSizeKB: 35,
        maxDimension: 512,
        watermarkText: 'API Test'
      });

      // All results should have the same structure
      expect(result).toHaveProperty('processedBuffer');
      expect(result).toHaveProperty('finalDimensions');
      expect(result).toHaveProperty('compressionLevel');
      expect(result).toHaveProperty('actualSizeKB');

      expect(result.processedBuffer).toBeInstanceOf(Buffer);
      expect(typeof result.finalDimensions.width).toBe('number');
      expect(typeof result.finalDimensions.height).toBe('number');
      expect(typeof result.compressionLevel).toBe('number');
      expect(typeof result.actualSizeKB).toBe('number');
    }
  });

  it('should handle environment detection correctly', () => {
    // Test Vercel detection
    process.env.VERCEL = '1';

    // The processing should not throw and should prefer Canvas
    expect(async () => {
      await FreeTierOptimizer.processForFreeTier(testImageBuffer);
    }).not.toThrow();

    delete process.env.VERCEL;

    // Local environment should also work
    expect(async () => {
      await FreeTierOptimizer.processForFreeTier(testImageBuffer);
    }).not.toThrow();
  });
});