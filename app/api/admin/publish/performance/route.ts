import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { publishPerformanceMonitor } from '@/lib/services/publish-performance-monitor';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

const querySchema = z.object({
  timeRange: z
    .string()
    .optional()
    .default('1h')
    .transform((val) => {
      switch (val) {
        case '15m':
          return 15 * 60 * 1000;
        case '1h':
          return 60 * 60 * 1000;
        case '24h':
          return 24 * 60 * 60 * 1000;
        case '7d':
          return 7 * 24 * 60 * 60 * 1000;
        default:
          return 60 * 60 * 1000; // Default to 1 hour
      }
    }),
  action: z
    .enum(['report', 'stats', 'cleanup', 'database-stats'])
    .optional()
    .default('report'),
});

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const requestStart = Date.now();

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const rawParams = {
      timeRange: searchParams.get('timeRange') || undefined,
      action: searchParams.get('action') || undefined,
    };

    const { timeRange, action } = querySchema.parse(rawParams);

    let result;

    switch (action) {
      case 'stats':
        result = {
          performance: publishPerformanceMonitor.getStats(timeRange),
          timeRangeMs: timeRange,
          generatedAt: new Date().toISOString(),
        };
        break;

      case 'cleanup':
        const removedCount = publishPerformanceMonitor.cleanup();
        result = {
          message: `Cleaned up ${removedCount} old metrics`,
          removedCount,
          timestamp: new Date().toISOString(),
        };
        break;

      case 'database-stats':
        result = await getDatabasePerformanceStats();
        break;

      case 'report':
      default:
        result = {
          ...publishPerformanceMonitor.generateReport(timeRange),
          timeRangeMs: timeRange,
          timeRangeLabel: getTimeRangeLabel(timeRange),
          generatedAt: new Date().toISOString(),
        };
        break;
    }

    const executionTime = Date.now() - requestStart;

    return NextResponse.json(result, {
      headers: {
        'X-Response-Time': `${executionTime}ms`,
        'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
      },
    });
  } catch (error) {
    const executionTime = Date.now() - requestStart;
    console.error('[API] Performance monitoring error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function getDatabasePerformanceStats() {
  try {
    const supabase = await createServerSupabaseServiceClient();

    // Get database performance metrics
    const { data: dbStats, error } = await supabase.rpc(
      'get_folder_publish_stats'
    );

    if (error) {
      throw error;
    }

    // Get query performance from pg_stat_statements if available
    const { data: queryStats } = await supabase
      .from('pg_stat_statements')
      .select('query, calls, total_time, mean_time, rows')
      .ilike('query', '%folders%')
      .order('total_time', { ascending: false })
      .limit(10)
      .single();

    return {
      database: dbStats,
      slowQueries: queryStats || [],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('[API] Database stats unavailable:', error);
    return {
      database: null,
      slowQueries: [],
      error: 'Database performance stats unavailable',
      timestamp: new Date().toISOString(),
    };
  }
}

function getTimeRangeLabel(timeRangeMs: number): string {
  const hours = timeRangeMs / (60 * 60 * 1000);

  if (hours < 1) {
    return `${Math.round(timeRangeMs / (60 * 1000))} minutes`;
  } else if (hours < 24) {
    return `${Math.round(hours)} hour${hours !== 1 ? 's' : ''}`;
  } else {
    const days = Math.round(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
}

// POST endpoint for clearing metrics or triggering operations
async function handlePOST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action;

    let result;

    switch (action) {
      case 'cleanup':
        const olderThanMs = body.olderThanMs || 24 * 60 * 60 * 1000; // 24 hours
        const removedCount = publishPerformanceMonitor.cleanup(olderThanMs);
        result = {
          message: `Cleaned up ${removedCount} metrics older than ${olderThanMs}ms`,
          removedCount,
          timestamp: new Date().toISOString(),
        };
        break;

      case 'optimize-database':
        // Trigger database optimization
        const supabase = await createServerSupabaseServiceClient();

        // Run ANALYZE on key tables
        await supabase.rpc('analyze_folder_tables');

        result = {
          message: 'Database optimization triggered',
          timestamp: new Date().toISOString(),
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Performance monitoring POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Export handlers with admin authentication
export const GET = withAdminAuth(handleGET);
export const POST = withAdminAuth(handlePOST);
