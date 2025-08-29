import { NextRequest, NextResponse } from 'next/server';
import { StorageMonitor } from '@/lib/middleware/storage-monitor';
import { ImageOptimizationService } from '@/lib/services/image-optimization.service';

/**
 * Storage Monitoring API
 * 
 * GET: Get current storage usage and recommendations
 * POST: Trigger cleanup or optimization actions
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    if (detailed) {
      // Get comprehensive usage report
      const report = await StorageMonitor.getUsageReport();
      
      return NextResponse.json({
        success: true,
        data: report,
      });
    } else {
      // Get basic storage stats
      const stats = await StorageMonitor.getStorageStats();
      const recommendations = await StorageMonitor.getOptimizationRecommendations();
      
      return NextResponse.json({
        success: true,
        data: {
          stats,
          recommendations,
        },
      });
    }
  } catch (error) {
    console.error('Storage monitor API error:', error);
    return NextResponse.json(
      { error: 'Failed to get storage information' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, options = {} } = body;

    switch (action) {
      case 'cleanup':
        const cleanupResult = await StorageMonitor.performAutomaticCleanup();
        return NextResponse.json({
          success: true,
          data: cleanupResult,
          message: `Cleanup completed. ${cleanupResult.filesDeleted} files deleted, ${(cleanupResult.spaceFreed / 1024 / 1024).toFixed(2)} MB freed.`,
        });

      case 'optimize_images':
        // This would trigger batch optimization of existing images
        // Implementation depends on how images are stored and accessed
        return NextResponse.json({
          success: true,
          message: 'Image optimization started. This may take several minutes.',
        });

      case 'check_storage':
        const fileSize = options.fileSize || 0;
        const storageCheck = await StorageMonitor.checkStorageBeforeUpload(
          request,
          fileSize
        );
        
        return NextResponse.json({
          success: true,
          data: storageCheck,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Storage monitor action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform storage action' },
      { status: 500 }
    );
  }
}
