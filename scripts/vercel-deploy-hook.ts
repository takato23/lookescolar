/**
 * Vercel Deployment Hook for Cache Management
 *
 * This file is automatically executed during Vercel deployments
 * to clean up cache and optimize storage usage
 */

import { vercelDeploymentCacheCleanup } from '@/lib/utils/cache-manager';
import { logger } from '@/lib/utils/logger';

async function runDeploymentCleanup() {
  try {
    console.log('🚀 Starting Vercel deployment cache cleanup...');

    // Perform cache cleanup
    const metrics = await vercelDeploymentCacheCleanup();

    console.log('✅ Vercel deployment cache cleanup completed successfully!');
    console.log(`📊 Cleanup Results:
      - Entries Removed: ${metrics.entriesRemoved}
      - Storage Freed: ${metrics.storageFreedMB} MB
      - Execution Time: ${metrics.executionTimeMs} ms
      - Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);

    // Log to structured logger
    logger.info('vercel_deployment_hook_completed', {
      metrics,
      deployment: {
        environment: process.env.VERCEL_ENV,
        region: process.env.NOW_REGION,
        buildId: process.env.VERCEL_BUILD_ID,
      },
    });
  } catch (error) {
    console.error('❌ Vercel deployment cache cleanup failed:', error);
    logger.error('vercel_deployment_hook_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Don't fail the deployment for cache cleanup errors
    process.exit(0);
  }
}

// Only run during Vercel builds
if (process.env.VERCEL === '1') {
  runDeploymentCleanup().catch((error) => {
    console.error('Unhandled error in deployment cleanup:', error);
    process.exit(0);
  });
}
