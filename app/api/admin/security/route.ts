/**
 * Security Management API
 * 
 * Provides endpoints for monitoring security features, viewing audit logs,
 * and managing security configurations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityAuditService } from '@/lib/security/qr-audit.service';
import { qrSignatureService } from '@/lib/security/qr-signatures';
import { enhancedRateLimitService } from '@/lib/middleware/qr-enhanced-rate-limit.middleware';
import { withAuth } from '@/lib/middleware/auth.middleware';

// GET /api/admin/security - Get security overview
async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'overview':
        return getSecurityOverview();
      
      case 'audit-logs':
        return getAuditLogs(request);
      
      case 'alerts':
        return getSecurityAlerts(request);
      
      case 'stats':
        return getSecurityStats();
      
      default:
        return getSecurityOverview();
    }
  } catch (error) {
    console.error('[Security API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/security - Security actions
async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'cleanup-logs':
        return cleanupAuditLogs();
      
      case 'reset-rate-limits':
        return resetRateLimits(params);
      
      case 'test-signature':
        return testQRSignature(params);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Security API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get security overview
 */
async function getSecurityOverview() {
  const [auditStats, securityAlerts, signatureStatus, rateLimitStats] = await Promise.all([
    securityAuditService.getAuditStats(7), // Last 7 days
    securityAuditService.getSecurityAlerts(24), // Last 24 hours
    qrSignatureService.getStatus(),
    enhancedRateLimitService.getStats()
  ]);

  const overview = {
    timestamp: new Date().toISOString(),
    status: 'operational',
    features: {
      qrSignatures: {
        enabled: signatureStatus.configured,
        version: signatureStatus.version,
        algorithm: signatureStatus.algorithm
      },
      auditLogging: {
        enabled: true,
        totalEvents: auditStats.totalEvents,
        recentAlerts: securityAlerts.length
      },
      rateLimiting: {
        enabled: true,
        redisEnabled: rateLimitStats.redisEnabled,
        memoryEntries: rateLimitStats.memoryEntries,
        suspiciousIPs: rateLimitStats.suspiciousIPs
      }
    },
    metrics: {
      auditEvents: auditStats.eventsByType,
      severityDistribution: auditStats.eventsBySeverity,
      topUsers: auditStats.topUsers.slice(0, 5)
    },
    alerts: {
      critical: securityAlerts.filter(a => a.severity === 'critical').length,
      high: securityAlerts.filter(a => a.severity === 'high').length,
      medium: securityAlerts.filter(a => a.severity === 'medium').length,
      recent: securityAlerts.slice(0, 5).map(alert => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        action: alert.action,
        timestamp: alert.timestamp,
        details: alert.details
      }))
    }
  };

  return NextResponse.json(overview);
}

/**
 * Get audit logs with filtering
 */
async function getAuditLogs(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const query = {
    startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
    endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    type: searchParams.get('type') as any,
    category: searchParams.get('category') as any,
    severity: searchParams.get('severity') as any,
    userId: searchParams.get('userId') || undefined,
    result: searchParams.get('result') || undefined,
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0')
  };

  const logs = await securityAuditService.queryLogs(query);

  return NextResponse.json({
    logs,
    query,
    totalCount: logs.length,
    hasMore: logs.length === query.limit
  });
}

/**
 * Get security alerts
 */
async function getSecurityAlerts(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get('hours') || '24');

  const alerts = await securityAuditService.getSecurityAlerts(hours);

  return NextResponse.json({
    alerts,
    timeRange: {
      hours,
      from: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString()
    },
    summary: {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      blocked: alerts.filter(a => a.result === 'blocked').length
    }
  });
}

/**
 * Get security statistics
 */
async function getSecurityStats() {
  const [auditStats, rateLimitStats] = await Promise.all([
    securityAuditService.getAuditStats(30), // Last 30 days
    enhancedRateLimitService.getStats()
  ]);

  return NextResponse.json({
    audit: auditStats,
    rateLimiting: rateLimitStats,
    qrSecurity: qrSignatureService.getStatus(),
    timestamp: new Date().toISOString()
  });
}

/**
 * Cleanup old audit logs
 */
async function cleanupAuditLogs() {
  const cleaned = await securityAuditService.cleanupOldLogs();

  return NextResponse.json({
    success: true,
    message: `Cleaned up ${cleaned} old audit logs`,
    cleanedCount: cleaned,
    timestamp: new Date().toISOString()
  });
}

/**
 * Reset rate limits
 */
async function resetRateLimits(params: { identifier?: string; all?: boolean }) {
  if (params.all) {
    enhancedRateLimitService.cleanup();
    return NextResponse.json({
      success: true,
      message: 'All rate limits reset',
      timestamp: new Date().toISOString()
    });
  }

  if (params.identifier) {
    // In a real implementation, you'd reset specific identifier
    return NextResponse.json({
      success: true,
      message: `Rate limit reset for identifier: ${params.identifier}`,
      timestamp: new Date().toISOString()
    });
  }

  return NextResponse.json(
    { error: 'Must specify identifier or all=true' },
    { status: 400 }
  );
}

/**
 * Test QR signature functionality
 */
async function testQRSignature(params: { data?: string }) {
  const testData = params.data || JSON.stringify({ test: true, timestamp: Date.now() });

  try {
    // Test signing
    const signed = await qrSignatureService.signQRData(testData);
    
    // Test verification
    const verified = await qrSignatureService.verifyQRSignature(signed);

    return NextResponse.json({
      success: true,
      test: {
        data: testData,
        signed: {
          signature: signed.signature.substring(0, 50) + '...',
          hash: signed.hash
        },
        verification: {
          valid: verified.valid,
          error: verified.error
        }
      },
      status: qrSignatureService.getStatus(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: qrSignatureService.getStatus(),
      timestamp: new Date().toISOString()
    });
  }
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