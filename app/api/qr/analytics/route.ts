/**
 * QR Analytics API
 *
 * Provides endpoints for QR code analytics, usage metrics, and performance tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { qrAnalyticsService } from '@/lib/services/qr-analytics.service';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { logger } from '@/lib/utils/logger';

// GET /api/qr/analytics - Get QR analytics data
async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const qrCodeId = searchParams.get('qrCodeId');
    const eventId = searchParams.get('eventId');

    switch (action) {
      case 'metrics':
        if (!qrCodeId) {
          return NextResponse.json(
            { error: 'qrCodeId is required for metrics action' },
            { status: 400 }
          );
        }
        return getQRMetrics(qrCodeId);

      case 'event-metrics':
        if (!eventId) {
          return NextResponse.json(
            { error: 'eventId is required for event-metrics action' },
            { status: 400 }
          );
        }
        return getEventMetrics(eventId);

      case 'top-codes':
        const limit = parseInt(searchParams.get('limit') || '10');
        if (!eventId) {
          return NextResponse.json(
            { error: 'eventId is required for top-codes action' },
            { status: 400 }
          );
        }
        return getTopQRCodes(eventId, limit);

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use metrics, event-metrics, or top-codes' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('qr_analytics_api_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/qr/analytics - Record QR scan events
async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract IP address
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Record the scan event
    await qrAnalyticsService.recordScan({
      qrCodeId: body.qrCodeId,
      eventId: body.eventId,
      scannedAt: new Date(),
      deviceType: body.deviceType || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress,
      location: body.location,
      scanDuration: body.scanDuration,
      success: body.success !== undefined ? body.success : true,
      errorMessage: body.errorMessage,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('qr_analytics_record_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Failed to record scan event' },
      { status: 500 }
    );
  }
}

/**
 * Get metrics for a specific QR code
 */
async function getQRMetrics(qrCodeId: string) {
  try {
    // Parse time range if provided
    const timeRange = undefined; // In a real implementation, you would parse this from query params

    const metrics = await qrAnalyticsService.getQRMetrics(qrCodeId, timeRange);

    return NextResponse.json({
      qrCodeId,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('qr_metrics_failed', {
      qrCodeId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to get QR metrics' },
      { status: 500 }
    );
  }
}

/**
 * Get metrics for all QR codes in an event
 */
async function getEventMetrics(eventId: string) {
  try {
    const metrics = await qrAnalyticsService.getEventQRMetrics(eventId);

    return NextResponse.json({
      eventId,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('event_metrics_failed', {
      eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to get event metrics' },
      { status: 500 }
    );
  }
}

/**
 * Get top performing QR codes for an event
 */
async function getTopQRCodes(eventId: string, limit: number) {
  try {
    const topCodes = await qrAnalyticsService.getTopQRCodes(eventId, limit);

    return NextResponse.json({
      eventId,
      topCodes,
      limit,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('top_codes_failed', {
      eventId,
      limit,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to get top QR codes' },
      { status: 500 }
    );
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
