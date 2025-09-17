import { NextRequest, NextResponse } from 'next/server';
import { FreeTierOptimizer } from '@/lib/services/free-tier-optimizer';
import { CanvasImageProcessor, PlaceholderImageService } from '@/lib/services/canvas-image-processor';

export const runtime = 'nodejs';

/**
 * Test endpoint for verifying image processing works on Vercel
 * GET /api/test-image-processing
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[test-image-processing] Testing image processing capabilities');
    console.log('[test-image-processing] Environment:', {
      isVercel: !!process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV,
      runtime: process.env.VERCEL ? 'vercel-serverless' : 'local'
    });

    const results = {
      environment: {
        isVercel: !!process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV,
        runtime: process.env.VERCEL ? 'vercel-serverless' : 'local'
      },
      tests: {} as any
    };

    // Test 1: Placeholder generation (should always work)
    try {
      const placeholderDataURL = PlaceholderImageService.generatePlaceholderDataURL(200, 100, 'Test');
      const placeholderBuffer = PlaceholderImageService.createPlaceholderBuffer(200, 100, 'Test');

      results.tests.placeholder = {
        success: true,
        dataURL: placeholderDataURL.substring(0, 100) + '...',
        bufferSize: placeholderBuffer.length
      };
    } catch (error) {
      results.tests.placeholder = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Create a minimal test image
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

    // Test 3: Canvas image processing
    try {
      const canvasResult = await CanvasImageProcessor.processWithCanvas(minimal1x1PNG, {
        targetSizeKB: 35,
        maxDimension: 512,
        watermarkText: 'Test Canvas',
        quality: 0.6
      });

      results.tests.canvas = {
        success: true,
        method: canvasResult.method,
        sizeKB: canvasResult.actualSizeKB,
        dimensions: canvasResult.finalDimensions
      };
    } catch (error) {
      results.tests.canvas = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 4: FreeTierOptimizer (full pipeline)
    try {
      const optimizedResult = await FreeTierOptimizer.processForFreeTier(minimal1x1PNG, {
        targetSizeKB: 35,
        maxDimension: 512,
        watermarkText: 'Test Optimizer'
      });

      results.tests.optimizer = {
        success: true,
        sizeKB: optimizedResult.actualSizeKB,
        dimensions: optimizedResult.finalDimensions,
        compressionLevel: optimizedResult.compressionLevel,
        hasBlurDataURL: !!optimizedResult.blurDataURL,
        hasAvgColor: !!optimizedResult.avgColor
      };
    } catch (error) {
      results.tests.optimizer = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 5: Metadata parsing
    try {
      const metadata = await CanvasImageProcessor.getImageMetadata(minimal1x1PNG);

      results.tests.metadata = {
        success: true,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      };
    } catch (error) {
      results.tests.metadata = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 6: Test with invalid data (should fall back gracefully)
    try {
      const fallbackResult = await FreeTierOptimizer.processForFreeTier(
        Buffer.from('invalid image data'),
        {
          targetSizeKB: 35,
          maxDimension: 512,
          watermarkText: 'Test Fallback'
        }
      );

      results.tests.fallback = {
        success: true,
        sizeKB: fallbackResult.actualSizeKB,
        dimensions: fallbackResult.finalDimensions,
        compressionLevel: fallbackResult.compressionLevel // Should be negative for fallback
      };
    } catch (error) {
      results.tests.fallback = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Summary
    const testResults = Object.values(results.tests);
    const successCount = testResults.filter((test: any) => test.success).length;
    const totalCount = testResults.length;

    console.log(`[test-image-processing] Test results: ${successCount}/${totalCount} passed`);

    return NextResponse.json({
      success: successCount === totalCount,
      summary: `${successCount}/${totalCount} tests passed`,
      ...results,
      message: successCount === totalCount
        ? 'All image processing tests passed - ready for production!'
        : 'Some tests failed, but fallbacks should work'
    });

  } catch (error) {
    console.error('[test-image-processing] Test failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Image processing test failed'
    }, { status: 500 });
  }
}

/**
 * Test with actual file upload
 * POST /api/test-image-processing
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    console.log('[test-image-processing] Testing with uploaded file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await FreeTierOptimizer.processForFreeTier(buffer, {
      targetSizeKB: 35,
      maxDimension: 512,
      watermarkText: 'Upload Test'
    });

    return NextResponse.json({
      success: true,
      original: {
        name: file.name,
        size: file.size,
        type: file.type
      },
      processed: {
        sizeKB: result.actualSizeKB,
        dimensions: result.finalDimensions,
        compressionLevel: result.compressionLevel,
        method: result.compressionLevel >= 0 ? 'canvas' : 'fallback'
      },
      message: 'File processing test completed successfully'
    });

  } catch (error) {
    console.error('[test-image-processing] File test failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'File processing test failed'
    }, { status: 500 });
  }
}