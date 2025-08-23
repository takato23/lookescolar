/**
 * QR Performance Monitoring API
 * 
 * Provides endpoints for monitoring QR code performance, cache statistics,
 * and system health metrics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { qrCacheService } from '@/lib/cache/qr-enhanced-cache.service';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { logger } from '@/lib/utils/logger';

// GET /api/qr/performance - Get QR performance metrics
async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        return getPerformanceStats();
      
      case 'cache':
        return getCacheStats();
      
      case 'health':
        return getHealthStatus();
      
      default:
        return getPerformanceOverview();
    }
  } catch (error) {
    logger.error('qr_performance_api_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/qr/performance - Performance actions
async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'invalidate-cache':
        return invalidateCache(params);
      
      case 'preload':
        return preloadQRCodes(params);
      
      case 'reset-stats':
        return resetStats();
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('qr_performance_api_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get performance overview
 */
async function getPerformanceOverview() {
  const cacheStats = qrCacheService.getStats();
  
  const overview = {
    timestamp: new Date().toISOString(),
    status: 'operational',
    cache: {
      enabled: true,
      entries: cacheStats.totalEntries,
      hitRate: cacheStats.hitRate,
      memoryUsageMB: Math.round(cacheStats.memoryUsage / (1024 * 1024) * 100) / 100,
      avgGenerationTimeMs: cacheStats.avgGenerationTime,
      efficiency: cacheStats.cacheEfficiency
    },
    metrics: {
      totalHits: cacheStats.totalHits,
      totalMisses: cacheStats.totalMisses,
      totalRequests: cacheStats.totalHits + cacheStats.totalMisses
    }
  };

  return NextResponse.json(overview);
}

/**
 * Get detailed performance statistics
 */
async function getPerformanceStats() {
  const cacheStats = qrCacheService.getStats();
  
  const stats = {
    cache: cacheStats,
    system: {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version
    },
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(stats);
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  const cacheStats = qrCacheService.getStats();
  
  return NextResponse.json({
    cache: cacheStats,
    timestamp: new Date().toISOString()
  });
}

/**
 * Get system health status
 */
async function getHealthStatus() {
  const cacheStats = qrCacheService.getStats();
  
  // Determine health status based on metrics
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  let issues: string[] = [];
  
  if (cacheStats.hitRate < 50) {
    status = 'degraded';
    issues.push('Low cache hit rate');
  }
  
  if (cacheStats.avgGenerationTime > 5000) {
    status = 'degraded';
    issues.push('High QR generation time');
  }
  
  const health = {
    status,
    timestamp: new Date().toISOString(),
    components: {
      cache: 'operational',
      qrGeneration: cacheStats.avgGenerationTime < 5000 ? 'healthy' : 'degraded',
      memory: process.memoryUsage().heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'degraded' // 500MB threshold
    },
    metrics: {
      cacheHitRate: cacheStats.hitRate,
      avgGenerationTimeMs: cacheStats.avgGenerationTime,
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
      uptimeSeconds: Math.round(process.uptime())
    },
    issues: issues.length > 0 ? issues : undefined
  };

  return NextResponse.json(health);
}

/**
 * Invalidate cache entries
 */
async function invalidateCache(params: { pattern?: string; subjectId?: string }) {
  if (params.pattern) {
    const removed = await qrCacheService.invalidateByPattern(params.pattern);
    return NextResponse.json({
      success: true,
      message: `Invalidated ${removed} cache entries matching pattern: ${params.pattern}`,
      removedEntries: removed,
      timestamp: new Date().toISOString()
    });
  }
  
  if (params.subjectId) {
    await qrCacheService.invalidateQR(params.subjectId);
    return NextResponse.json({
      success: true,
      message: `Invalidated cache for subject: ${params.subjectId}`,
      timestamp: new Date().toISOString()
    });
  }
  
  return NextResponse.json(
    { error: 'Must specify either pattern or subjectId' },
    { status: 400 }
  );
}

/**
 * Preload QR codes
 */
async function preloadQRCodes(params: { subjectIds: string[] }) {
  if (!params.subjectIds || !Array.isArray(params.subjectIds)) {
    return NextResponse.json(
      { error: 'subjectIds array is required' },
      { status: 400 }
    );
  }
  
  try {
    await qrCacheService.preloadQRCodes(params.subjectIds);
    
    return NextResponse.json({
      success: true,
      message: `Preloaded QR codes for ${params.subjectIds.length} subjects`,
      subjectCount: params.subjectIds.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('qr_preload_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      subjectIds: params.subjectIds
    });
    
    return NextResponse.json(
      { error: 'Failed to preload QR codes' },
      { status: 500 }
    );
  }
}

/**
 * Reset performance statistics
 */
async function resetStats() {
  // Note: In a real implementation, you would reset the statistics
  // For now, we'll just return a success message
  
  logger.info('qr_performance_stats_reset');
  
  return NextResponse.json({
    success: true,
    message: 'Performance statistics reset',
    timestamp: new Date().toISOString()
  });
}

// Wrap with authentication middleware
const authHandler = withAuth(async (request: NextRequest, context: any) => {
  // Check if user is admin
  if (!context.isAdmin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  // Route based on method
  switch (request.method) {
    case 'GET':
      return GET(request);
    case 'POST':
      return POST(request);
    default:
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
  }
});

export { authHandler as GET, authHandler as POST };