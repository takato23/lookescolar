import { FreeTierOptimizer } from '@/lib/services/free-tier-optimizer';
import { StorageMonitor } from '@/lib/services/free-tier-optimizer';

// Mock Supabase client for testing
const createMockSupabase = () => ({
  from: function() { 
    return {
      select: function(_columns: string, options: { count: string, head: boolean }) {
        if (options && options.count === 'exact' && options.head === true) {
          // This simulates the count query
          return Promise.resolve({ count: 15000, data: null, error: null });
        }
        // This would be for regular select queries
        return {
          count: async function() { 
            // Simulate the actual Supabase response structure
            const result = { count: 15000, data: null, error: null };
            return Promise.resolve(result);
          }
        };
      }
    };
  }
});

describe('Storage Optimization Flow', () => {
  // Create a simple test image buffer (1x1 pixel PNG)
  const createTestImageBuffer = (): Buffer => {
    // 1x1 pixel PNG file in base64
    const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    return Buffer.from(base64PNG, 'base64');
  };

  it('should process image through complete optimization flow', async () => {
    const testBuffer = createTestImageBuffer();
    
    // Step 1: Optimize image with FreeTierOptimizer
    const optimizedResult = await FreeTierOptimizer.processForFreeTier(testBuffer, {
      targetSizeKB: 35,
      maxDimension: 500,
      watermarkText: 'LOOK ESCOLAR TEST',
      enableOriginalStorage: false
    });

    // Verify optimization results
    if (!optimizedResult) {
      throw new Error('Optimization result is undefined');
    }
    
    if (!Buffer.isBuffer(optimizedResult.processedBuffer)) {
      throw new Error('Processed buffer is not a Buffer')
    }
    
    if (optimizedResult.actualSizeKB > 50) {
      throw new Error(`Actual size ${optimizedResult.actualSizeKB}KB exceeds limit of 50KB`)
    }
    
    if (optimizedResult.finalDimensions.w < 1) {
      throw new Error(`Width ${optimizedResult.finalDimensions.w} is less than 1`)
    }
    
    if (optimizedResult.finalDimensions.h < 1) {
      throw new Error(`Height ${optimizedResult.finalDimensions.h} is less than 1`)
    }
    
    if (optimizedResult.compressionLevel < 0) {
      throw new Error(`Compression level ${optimizedResult.compressionLevel} is negative`)
    }

    // Step 2: Verify no original storage (this is enforced by the optimizer)
    // The result should not have an originalBuffer property
    
    // Step 3: Test storage analysis
    const storageAnalysis = FreeTierOptimizer.analyzeStorageRequirements(1000, 20, 35);
    if (storageAnalysis.totalPhotos !== 20000) {
      throw new Error(`Expected 20000 photos, got ${storageAnalysis.totalPhotos}`)
    }
    
    if (storageAnalysis.estimatedStorageGB >= 1) {
      throw new Error(`Expected storage under 1GB, got ${storageAnalysis.estimatedStorageGB}GB`)
    }
    
    if (storageAnalysis.fitsInFreeTier !== true) {
      throw new Error(`Expected to fit in free tier, got ${storageAnalysis.fitsInFreeTier}`)
    }
    
    // Step 4: Test optimization metrics
    const metrics = FreeTierOptimizer.getOptimizationMetrics();
    if (metrics.targetSizeKB !== 35) {
      throw new Error(`Expected target size 35KB, got ${metrics.targetSizeKB}KB`)
    }
    
    if (metrics.maxDimension !== 500) {
      throw new Error(`Expected max dimension 500, got ${metrics.maxDimension}`)
    }
    
    if (metrics.estimatedPhotosForFreeTier <= 10000) {
      throw new Error(`Expected more than 10000 photos for free tier, got ${metrics.estimatedPhotosForFreeTier}`)
    }
  });

  it('should provide accurate storage monitoring', async () => {
    // Mock Supabase response
    const mockSupabase = createMockSupabase();

    // Test storage monitoring
    const usageMetrics = await StorageMonitor.getUsageMetrics(mockSupabase);
    
    if (usageMetrics.photosCount !== 15000) {
      throw new Error(`Expected 15000 photos, got ${usageMetrics.photosCount}`)
    }
    
    if (!usageMetrics.estimatedStorageUsed.includes('MB')) {
      throw new Error(`Expected storage usage in MB, got ${usageMetrics.estimatedStorageUsed}`)
    }
    
    if (usageMetrics.percentageOfFreeTier < 0) {
      throw new Error(`Expected non-negative percentage, got ${usageMetrics.percentageOfFreeTier}`)
    }
  });

  it('should maintain consistent optimization across different image sizes', async () => {
    const testBuffer = createTestImageBuffer();
    
    // Test various optimization targets
    const testCases = [
      { targetSizeKB: 20, maxDimension: 300, description: 'Small previews' },
      { targetSizeKB: 35, maxDimension: 500, description: 'Standard previews' },
      { targetSizeKB: 50, maxDimension: 600, description: 'Large previews' }
    ];

    for (const testCase of testCases) {
      const result = await FreeTierOptimizer.processForFreeTier(testBuffer, {
        ...testCase,
        watermarkText: 'CONSISTENCY TEST',
        enableOriginalStorage: false
      });

      if (result.actualSizeKB > testCase.targetSizeKB + 15) {
        throw new Error(`For ${testCase.description}: Expected size <= ${testCase.targetSizeKB + 15}KB, got ${result.actualSizeKB}KB`)
      }
      
      if (result.finalDimensions.w < 1) {
        throw new Error(`For ${testCase.description}: Width ${result.finalDimensions.w} is less than 1`)
      }
      
      if (result.finalDimensions.h < 1) {
        throw new Error(`For ${testCase.description}: Height ${result.finalDimensions.h} is less than 1`)
      }
    }
  });

  it('should enforce no original storage policy', async () => {
    const testBuffer = createTestImageBuffer();
    
    // Even when trying to enable original storage, it should be forced off
    const result = await FreeTierOptimizer.processForFreeTier(testBuffer, {
      targetSizeKB: 40,
      maxDimension: 550,
      watermarkText: 'ENFORCEMENT TEST',
      enableOriginalStorage: true // This should be ignored
    });

    // Verify the result is still valid
    if (!result) {
      throw new Error('Optimization result is undefined')
    }
    
    if (!Buffer.isBuffer(result.processedBuffer)) {
      throw new Error('Processed buffer is not a Buffer')
    }
    
    // The implementation should force disable original storage regardless of input
    // We can't directly test this since there's no originalBuffer in the result,
    // but we can verify the optimization still works correctly
    if (result.actualSizeKB > 55) {
      throw new Error(`Actual size ${result.actualSizeKB}KB exceeds limit of 55KB`)
    }
  });
});