import { NextRequest, NextResponse } from 'next/server';
import { orderSecurityService } from '@/lib/services/order-security.service';

/**
 * GET /api/admin/orders/security
 * Get security audit report and metrics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const period =
      (url.searchParams.get('period') as 'day' | 'week' | 'month') || 'day';

    console.log(
      `[Security API] Generating security report for period: ${period}`
    );

    // Generate security report
    const report = await orderSecurityService.generateSecurityReport(period);

    const duration = Date.now() - startTime;

    console.log(`[Security API] Security report generated in ${duration}ms`);

    return NextResponse.json({
      success: true,
      data: report,
      performance: {
        generation_time_ms: duration,
      },
      metadata: {
        generated_at: new Date().toISOString(),
        security_level: 'admin_only',
      },
    });
  } catch (error) {
    console.error('[Security API] Failed to generate security report:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate security report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/orders/security
 * Trigger security analysis
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const period = body.period || 'day';

    console.log(`[Security API] POST security action for period: ${period}`);

    // Generate enhanced security report
    const report = await orderSecurityService.generateSecurityReport(period);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Security analysis completed',
      data: report,
      performance: {
        analysis_time_ms: duration,
      },
      metadata: {
        triggered_at: new Date().toISOString(),
        trigger_method: 'manual_api_request',
      },
    });
  } catch (error) {
    console.error('[Security API] Security analysis failed:', error);
    return NextResponse.json(
      {
        error: 'Security analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
