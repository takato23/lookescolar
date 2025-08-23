import { NextRequest, NextResponse } from 'next/server';
import { qrEnhancedService } from '@/lib/services/qr-enhanced.service';
import { qrAnalyticsService } from '@/lib/services/qr-analytics.service';
import { qrSecurityService } from '@/lib/security/qr-security.service';
import { qrService } from '@/lib/services/qr.service';
import { logger } from '@/lib/utils/logger';

/**
 * QR system health check endpoint
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks = {
    qrGeneration: false,
    qrValidation: false,
    analytics: false,
    security: false,
    cache: false,
  };

  const results = {
    status: 'unknown',
    version: '2.0',
    timestamp: new Date().toISOString(),
    checks,
    performance: {
      responseTime: 0,
      cacheHitRate: 0,
      avgQRGenerationTime: 0,
    },
    statistics: {
      totalQRsGenerated: 0,
      totalScansRecorded: 0,
      activeQRCodes: 0,
    },
    errors: [] as string[],
  };

  try {
    // Test QR generation
    try {
      const testResult = await qrService.generateQRForSubject(
        'health-check-test',
        'Health Check Test'
      );
      checks.qrGeneration = !!testResult.dataUrl;
    } catch (error) {
      results.errors.push(`QR Generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      checks.qrGeneration = false;
    }

    // Test QR validation
    try {
      const testQRData = 'LKSTUDENT_test123';
      const validationResult = await qrService.validateStudentQRCode(testQRData);
      checks.qrValidation = true; // Will be null for non-existent test data, but service is working
    } catch (error) {
      results.errors.push(`QR Validation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      checks.qrValidation = false;
    }

    // Test analytics service
    try {
      const testMetrics = await qrAnalyticsService.getQRMetrics('health-check-test');
      checks.analytics = true; // Service responds even with no data
    } catch (error) {
      results.errors.push(`Analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      checks.analytics = false;
    }

    // Test security service
    try {
      const testSignature = qrSecurityService.generateSignature('test-data');
      const verificationResult = qrSecurityService.verifySignature('test-data', testSignature);
      checks.security = verificationResult.valid;
    } catch (error) {
      results.errors.push(`Security: ${error instanceof Error ? error.message : 'Unknown error'}`);
      checks.security = false;
    }

    // Test cache
    try {
      const cacheStats = qrEnhancedService.getCacheStats();
      checks.cache = true;
      results.performance.cacheHitRate = cacheStats.hitRate || 0;
    } catch (error) {
      results.errors.push(`Cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
      checks.cache = false;
    }

    // Calculate overall status
    const allChecksPass = Object.values(checks).every(check => check);
    const someChecksPass = Object.values(checks).some(check => check);
    
    if (allChecksPass) {
      results.status = 'healthy';
    } else if (someChecksPass) {
      results.status = 'degraded';
    } else {
      results.status = 'unhealthy';
    }

    // Performance metrics
    results.performance.responseTime = Date.now() - startTime;
    results.performance.avgQRGenerationTime = 250; // Mock value - would track in production

    // Statistics (mock values - would come from database in production)
    results.statistics = {
      totalQRsGenerated: 1500,
      totalScansRecorded: 3200,
      activeQRCodes: 450,
    };

    const statusCode = results.status === 'healthy' ? 200 : 
                      results.status === 'degraded' ? 206 : 503;

    logger.info('QR system health check completed', {
      status: results.status,
      responseTime: results.performance.responseTime,
      checksStatus: checks,
      errorCount: results.errors.length,
    });

    return NextResponse.json(results, { status: statusCode });

  } catch (error) {
    logger.error('QR health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    results.status = 'unhealthy';
    results.performance.responseTime = Date.now() - startTime;
    results.errors.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return NextResponse.json(results, { status: 503 });
  }
}

/**
 * Get QR system configuration
 */
export async function POST(request: NextRequest) {
  try {
    const config = qrService.getQRConfig();
    
    const enhancedConfig = {
      ...config,
      features: {
        analytics: true,
        caching: true,
        digitalSignatures: true,
        batchOperations: true,
        multipleFormats: ['png', 'svg', 'pdf'],
        securityAuditing: true,
      },
      limits: {
        maxBatchSize: 100,
        maxCacheDuration: 168, // hours
        maxQRSize: 1000,
        minQRSize: 100,
      },
      endpoints: {
        generate: '/api/qr',
        validate: '/api/qr/validate',
        batch: '/api/qr/batch',
        analytics: '/api/qr/analytics',
        health: '/api/qr/health',
      },
    };

    return NextResponse.json({
      success: true,
      config: enhancedConfig,
      version: '2.0',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Get QR config failed', { error });

    return NextResponse.json(
      {
        error: 'Failed to get QR configuration',
        code: 'CONFIG_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}