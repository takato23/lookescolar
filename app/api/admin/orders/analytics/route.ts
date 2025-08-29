import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  orderAnalyticsService,
  type AnalyticsFilters,
} from '@/lib/services/order-analytics.service';

// Validation schema for analytics request
const AnalyticsRequestSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  event_id: z.string().uuid().optional(),
  status: z.array(z.string()).optional(),
  include_forecasting: z.boolean().default(true),
});

/**
 * GET /api/admin/orders/analytics
 * Get comprehensive order analytics and metrics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse query parameters
    const queryParams = {
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      event_id: searchParams.get('event_id') || undefined,
      status:
        searchParams.get('status')?.split(',').filter(Boolean) || undefined,
      include_forecasting: searchParams.get('include_forecasting') !== 'false',
    };

    // Validate parameters
    const validation = AnalyticsRequestSchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid analytics parameters',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const filters: AnalyticsFilters = validation.data;

    console.log(`[Order Analytics API] Generating analytics`, {
      filters: Object.keys(filters).filter(
        (key) => filters[key as keyof AnalyticsFilters] !== undefined
      ),
      include_forecasting: filters.include_forecasting,
    });

    // Get analytics data
    const metrics = await orderAnalyticsService.getOrderMetrics(filters);

    const duration = Date.now() - startTime;

    console.log(`[Order Analytics API] Analytics generated in ${duration}ms`, {
      total_orders: metrics.overview.total_orders,
      alerts_count: metrics.alerts.length,
      performance_ms: duration,
    });

    // Return analytics data
    return NextResponse.json({
      success: true,
      data: metrics,
      performance: {
        generation_time_ms: duration,
        cache_status: 'fresh',
      },
      metadata: {
        filters_applied: Object.keys(filters).filter(
          (key) => filters[key as keyof AnalyticsFilters] !== undefined
        ).length,
        generated_at: new Date().toISOString(),
        data_points: {
          daily_trends: metrics.trends.daily_orders.length,
          top_events: metrics.performance.top_events.length,
          peak_hours: metrics.performance.peak_hours.length,
          alerts: metrics.alerts.length,
        },
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Order Analytics API] Analytics generation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      {
        error: 'Analytics generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/orders/analytics
 * Get analytics with complex filters via POST body
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = AnalyticsRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid analytics parameters',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const filters: AnalyticsFilters = validation.data;

    console.log(`[Order Analytics API] POST analytics request`, {
      filters: Object.keys(filters).filter(
        (key) => filters[key as keyof AnalyticsFilters] !== undefined
      ),
      body_size: JSON.stringify(body).length,
    });

    // Get analytics data
    const metrics = await orderAnalyticsService.getOrderMetrics(filters);

    const duration = Date.now() - startTime;

    console.log(
      `[Order Analytics API] POST analytics completed in ${duration}ms`,
      {
        total_orders: metrics.overview.total_orders,
        revenue: metrics.overview.total_revenue_cents,
        alerts: metrics.alerts.length,
      }
    );

    // Return analytics data with additional metadata for POST requests
    return NextResponse.json({
      success: true,
      data: metrics,
      performance: {
        generation_time_ms: duration,
        cache_status: 'fresh',
        efficiency_score: Math.min(100, Math.max(0, 100 - duration / 100)), // Simple efficiency score
      },
      metadata: {
        request_method: 'POST',
        filters_applied: Object.keys(filters).filter(
          (key) => filters[key as keyof AnalyticsFilters] !== undefined
        ).length,
        generated_at: new Date().toISOString(),
        data_coverage: {
          date_range_days:
            filters.start_date && filters.end_date
              ? Math.ceil(
                  (new Date(filters.end_date).getTime() -
                    new Date(filters.start_date).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 30,
          forecasting_included: filters.include_forecasting,
        },
        insights: {
          conversion_rate: metrics.overview.conversion_rate,
          growth_trend:
            metrics.trends.monthly_summary.growth_rate > 0
              ? 'positive'
              : metrics.trends.monthly_summary.growth_rate < 0
                ? 'negative'
                : 'stable',
          peak_performance_hour: metrics.performance.peak_hours[0]?.hour || 12,
          top_performing_event:
            metrics.performance.top_events[0]?.event_name || 'N/A',
        },
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Order Analytics API] POST analytics failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      {
        error: 'Analytics generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
