import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Calculate bundle sizes by analyzing the .next directory
    const nextDir = path.join(process.cwd(), '.next');
    const staticDir = path.join(nextDir, 'static');

    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;
    let imageSize = 0;

    function calculateDirectorySize(
      dirPath: string,
      extensions: string[] = []
    ): number {
      if (!fs.existsSync(dirPath)) return 0;

      let size = 0;
      const items = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          size += calculateDirectorySize(itemPath, extensions);
        } else if (item.isFile()) {
          const ext = path.extname(item.name);
          if (extensions.length === 0 || extensions.includes(ext)) {
            const stats = fs.statSync(itemPath);
            size += stats.size;
          }
        }
      }

      return size;
    }

    if (fs.existsSync(staticDir)) {
      // Calculate JS bundle size
      jsSize = calculateDirectorySize(staticDir, ['.js']);

      // Calculate CSS bundle size
      cssSize = calculateDirectorySize(staticDir, ['.css']);

      // Calculate total static size
      totalSize = calculateDirectorySize(staticDir);
    }

    // Calculate public assets (images, etc.)
    const publicDir = path.join(process.cwd(), 'public');
    if (fs.existsSync(publicDir)) {
      imageSize = calculateDirectorySize(publicDir, [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.svg',
      ]);
    }

    // Add build artifacts
    const buildDir = path.join(nextDir, 'server');
    if (fs.existsSync(buildDir)) {
      totalSize += calculateDirectorySize(buildDir);
    }

    // Simulate load time based on bundle size and connection speed
    // Assuming average 3G connection (1.6 Mbps)
    const connectionSpeedBps = 1600000 / 8; // Convert to bytes per second
    const loadTime = Math.round((totalSize / connectionSpeedBps) * 100) / 100;

    const metrics = {
      totalSize,
      jsSize,
      cssSize,
      imageSize,
      loadTime,
      breakdown: {
        javascript: Math.round((jsSize / totalSize) * 100),
        css: Math.round((cssSize / totalSize) * 100),
        images: Math.round((imageSize / totalSize) * 100),
        other: Math.round(
          ((totalSize - jsSize - cssSize - imageSize) / totalSize) * 100
        ),
      },
      recommendations: [],
    };

    // Add performance recommendations
    if (jsSize > 500 * 1024) {
      // > 500KB
      metrics.recommendations.push(
        'Consider code splitting to reduce JavaScript bundle size'
      );
    }

    if (cssSize > 100 * 1024) {
      // > 100KB
      metrics.recommendations.push(
        'Optimize CSS bundle size by removing unused styles'
      );
    }

    if (imageSize > 2 * 1024 * 1024) {
      // > 2MB
      metrics.recommendations.push(
        'Optimize images using WebP format and compression'
      );
    }

    if (loadTime > 3) {
      metrics.recommendations.push(
        'Bundle size is too large for mobile connections'
      );
    }

    logger.info('Bundle metrics calculated', {
      totalSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
      jsSizeMB: Math.round((jsSize / 1024 / 1024) * 100) / 100,
      cssSizeMB: Math.round((cssSize / 1024 / 1024) * 100) / 100,
      loadTime: metrics.loadTime,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error('Bundle metrics API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

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
    });
  }
}
