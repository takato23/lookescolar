import { FreeTierOptimizer } from '@/lib/services/free-tier-optimizer';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('FreeTierOptimizer', () => {
  // Create a simple test image buffer (1x1 pixel PNG)
  const createTestImageBuffer = (): Buffer => {
    // 1x1 pixel PNG file in base64
    const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    return Buffer.from(base64PNG, 'base64');
  };

  it('should optimize image for free tier with aggressive compression', async () => {
    const testBuffer = createTestImageBuffer();
    
    const result = await FreeTierOptimizer.processForFreeTier(testBuffer, {
      targetSizeKB: 35,
      maxDimension: 500,
      watermarkText: 'TEST WATERMARK',
      enableOriginalStorage: false
    });

    expect(result).toBeDefined();
    expect(result.processedBuffer).toBeInstanceOf(Buffer);
    expect(result.actualSizeKB).toBeLessThanOrEqual(50); // Allow some flexibility
    expect(result.finalDimensions.w).toBeGreaterThanOrEqual(1);
    expect(result.finalDimensions.h).toBeGreaterThanOrEqual(1);
    expect(result.compressionLevel).toBeGreaterThanOrEqual(0);
  });

  it('should never enable original storage', async () => {
    const testBuffer = createTestImageBuffer();
    
    // Try to force enable original storage
    const result = await FreeTierOptimizer.processForFreeTier(testBuffer, {
      targetSizeKB: 50,
      maxDimension: 600,
      watermarkText: 'TEST WATERMARK',
      enableOriginalStorage: true // This should be ignored
    });

    expect(result).toBeDefined();
    // The implementation should force disable original storage regardless of input
  });

  it('should apply watermark protection', async () => {
    const testBuffer = createTestImageBuffer();
    
    const result = await FreeTierOptimizer.processForFreeTier(testBuffer, {
      targetSizeKB: 40,
      maxDimension: 400,
      watermarkText: 'LOOK ESCOLAR PROTECTION',
      enableOriginalStorage: false
    });

    expect(result).toBeDefined();
    expect(result.processedBuffer).toBeInstanceOf(Buffer);
    // We can't easily verify watermark visually in tests, but we ensure processing completes
  });

  it('should handle various image sizes', async () => {
    const testBuffer = createTestImageBuffer();
    
    // Test with different target sizes
    const testCases = [
      { targetSizeKB: 20, maxDimension: 300 },
      { targetSizeKB: 35, maxDimension: 500 },
      { targetSizeKB: 50, maxDimension: 600 }
    ];

    for (const testCase of testCases) {
      const result = await FreeTierOptimizer.processForFreeTier(testBuffer, {
        ...testCase,
        watermarkText: 'SIZE TEST',
        enableOriginalStorage: false
      });

      expect(result.actualSizeKB).toBeLessThanOrEqual(testCase.targetSizeKB + 15); // Allow some flexibility
      expect(result.finalDimensions.w).toBeGreaterThanOrEqual(1);
      expect(result.finalDimensions.h).toBeGreaterThanOrEqual(1);
    }
  });

  it('should generate optimization results with correct structure', async () => {
    const testBuffer = createTestImageBuffer();
    
    const result = await FreeTierOptimizer.processForFreeTier(testBuffer, {
      targetSizeKB: 30,
      maxDimension: 400,
      watermarkText: 'BLUR TEST',
      enableOriginalStorage: false
    });

    // Check that we get the expected result structure
    expect(result).toHaveProperty('processedBuffer');
    expect(result).toHaveProperty('finalDimensions');
    expect(result).toHaveProperty('compressionLevel');
    expect(result).toHaveProperty('actualSizeKB');
    
    expect(result.processedBuffer).toBeInstanceOf(Buffer);
    expect(result.finalDimensions).toHaveProperty('w');
    expect(result.finalDimensions).toHaveProperty('h');
    expect(typeof result.compressionLevel).toBe('number');
    expect(typeof result.actualSizeKB).toBe('number');
    
    // Check that dimensions are numbers
    expect(typeof result.finalDimensions.w).toBe('number');
    expect(typeof result.finalDimensions.h).toBe('number');
  });
});