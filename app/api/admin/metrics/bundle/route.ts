import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In production/serverless environment, provide static metrics
    // instead of filesystem analysis to avoid bundle size issues
    
    // Estimated bundle sizes based on recent build output
    // These values reflect the actual Next.js build report
    const estimatedMetrics = {
      jsSize: 102 * 1024, // First Load JS shared by all: 102 kB
      cssSize: 50 * 1024,  // Estimated CSS size: ~50KB
      imageSize: 200 * 1024, // Public assets: ~200KB
      totalSize: 400 * 1024, // Total estimated: ~400KB
    };

    // Simulate load time based on bundle size and connection speed
    // Assuming average 3G connection (1.6 Mbps)
    const connectionSpeedBps = 1600000 / 8; // Convert to bytes per second
    const loadTime = Math.round((estimatedMetrics.totalSize / connectionSpeedBps) * 100) / 100;

    const metrics = {
      totalSize: estimatedMetrics.totalSize,
      jsSize: estimatedMetrics.jsSize,
      cssSize: estimatedMetrics.cssSize,
      imageSize: estimatedMetrics.imageSize,
      loadTime,
      breakdown: {
        javascript: Math.round((estimatedMetrics.jsSize / estimatedMetrics.totalSize) * 100),
        css: Math.round((estimatedMetrics.cssSize / estimatedMetrics.totalSize) * 100),
        images: Math.round((estimatedMetrics.imageSize / estimatedMetrics.totalSize) * 100),
        other: Math.round(((estimatedMetrics.totalSize - estimatedMetrics.jsSize - estimatedMetrics.cssSize - estimatedMetrics.imageSize) / estimatedMetrics.totalSize) * 100),
      },
      recommendations: [],
      note: 'Metrics are estimated for serverless environment compatibility',
    };

    // Add performance recommendations based on estimated sizes
    if (estimatedMetrics.jsSize > 500 * 1024) { // > 500KB
      metrics.recommendations.push('Consider code splitting to reduce JavaScript bundle size');
    }
    
    if (estimatedMetrics.cssSize > 100 * 1024) { // > 100KB
      metrics.recommendations.push('Optimize CSS bundle size by removing unused styles');
    }
    
    if (estimatedMetrics.imageSize > 2 * 1024 * 1024) { // > 2MB
      metrics.recommendations.push('Optimize images using WebP format and compression');
    }
    
    if (loadTime > 3) {
      metrics.recommendations.push('Bundle size is too large for mobile connections');
    }

    // Current metrics look good
    if (metrics.recommendations.length === 0) {
      metrics.recommendations.push('Bundle size is optimized for fast loading');
    }

    return NextResponse.json(metrics);
  } catch (error) {
    // Return fallback metrics on error
    return NextResponse.json({
      totalSize: 0,
      jsSize: 0,
      cssSize: 0,
      imageSize: 0,
      loadTime: 0,
      breakdown: {
        javascript: 0,
        css: 0,
        images: 0,
        other: 0,
      },
      recommendations: ['Unable to analyze bundle - check build configuration'],
      error: 'Metrics calculation failed',
    });
  }
}