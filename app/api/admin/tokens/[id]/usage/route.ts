/**
 * ADMIN TOKEN USAGE API - /api/admin/tokens/[id]/usage
 *
 * Detailed usage statistics and access logs for tokens
 * Features: Usage analytics, access logs, performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { accessTokenService } from '../../../../../../lib/services/access-token.service';
import { adminAuthMiddleware } from '../../../../../../lib/security/admin-auth';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

const usageQuerySchema = z.object({
  includeLogs: z.string().optional().default('true'),
  logLimit: z.string().optional().default('50'),
  logPage: z.string().optional().default('1'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  action: z
    .enum(['list_folders', 'list_assets', 'download', 'view'])
    .optional(),
});

// GET /api/admin/tokens/[id]/usage - Get detailed usage statistics
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Admin authentication
    const authResult = await adminAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      );
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const query = usageQuerySchema.parse({
      includeLogs: searchParams.get('includeLogs'),
      logLimit: searchParams.get('logLimit'),
      logPage: searchParams.get('logPage'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      action: searchParams.get('action'),
    });

    // Verify token exists
    const token = await accessTokenService.getToken(id);
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Get usage statistics
    const usageStats = await accessTokenService.getTokenStats(id);

    const response: any = {
      tokenId: id,
      tokenPrefix: token.tokenPrefix,
      usageStats,
    };

    // Include detailed logs if requested
    if (query.includeLogs === 'true') {
      const limit = Math.min(parseInt(query.logLimit), 500); // Max 500 logs
      const page = parseInt(query.logPage);
      const offset = (page - 1) * limit;

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Build logs query
      let logsQuery = supabase
        .from('token_access_logs')
        .select('*')
        .eq('access_token_id', id)
        .order('occurred_at', { ascending: false });

      // Apply date filters
      if (query.dateFrom) {
        logsQuery = logsQuery.gte('occurred_at', query.dateFrom);
      }
      if (query.dateTo) {
        logsQuery = logsQuery.lte('occurred_at', query.dateTo);
      }

      // Apply action filter
      if (query.action) {
        logsQuery = logsQuery.eq('action', query.action);
      }

      // Apply pagination
      logsQuery = logsQuery.range(offset, offset + limit - 1);

      const { data: logs, error: logsError, count } = await logsQuery;

      if (logsError) {
        console.error('Logs query error:', logsError);
        return NextResponse.json(
          { error: 'Failed to fetch logs', details: logsError.message },
          { status: 500 }
        );
      }

      // Process logs for response
      const processedLogs = (logs || []).map((log) => ({
        id: log.id,
        occurredAt: log.occurred_at,
        ip: log.ip,
        userAgent: log.user_agent,
        path: log.path,
        action: log.action,
        ok: log.ok,
        responseTimeMs: log.response_time_ms,
        notes: log.notes,
      }));

      // Generate analytics from logs
      const analytics = generateAnalytics(logs || []);

      response.accessLogs = {
        logs: processedLogs,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: offset + limit < (count || 0),
          hasPrev: page > 1,
        },
        analytics,
      };
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Token usage GET error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Server error', message: error.message },
      { status: 500 }
    );
  }
}

// Generate analytics from access logs
function generateAnalytics(logs: any[]) {
  if (logs.length === 0) {
    return {
      totalRequests: 0,
      successRate: 0,
      averageResponseTime: 0,
      actionBreakdown: {},
      hourlyUsage: [],
      topIPs: [],
      errorSummary: [],
    };
  }

  const totalRequests = logs.length;
  const successfulRequests = logs.filter((log) => log.ok).length;
  const successRate = (successfulRequests / totalRequests) * 100;

  // Response time analytics (only for successful requests with timing)
  const timedLogs = logs.filter((log) => log.ok && log.response_time_ms);
  const averageResponseTime =
    timedLogs.length > 0
      ? timedLogs.reduce((sum, log) => sum + log.response_time_ms, 0) /
        timedLogs.length
      : 0;

  // Action breakdown
  const actionBreakdown: Record<string, number> = {};
  logs.forEach((log) => {
    actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
  });

  // Hourly usage (last 24 hours)
  const now = new Date();
  const hourlyUsage = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
    hour.setMinutes(0, 0, 0);
    const nextHour = new Date(hour.getTime() + 60 * 60 * 1000);

    const requestsInHour = logs.filter((log) => {
      const logTime = new Date(log.occurred_at);
      return logTime >= hour && logTime < nextHour;
    }).length;

    return {
      hour: hour.toISOString(),
      requests: requestsInHour,
    };
  });

  // Top IPs
  const ipCounts: Record<string, number> = {};
  logs.forEach((log) => {
    if (log.ip && log.ip !== 'unknown') {
      ipCounts[log.ip] = (ipCounts[log.ip] || 0) + 1;
    }
  });

  const topIPs = Object.entries(ipCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, requests: count }));

  // Error summary
  const errors = logs.filter((log) => !log.ok);
  const errorSummary = errors.reduce((acc: Record<string, number>, log) => {
    const errorKey = log.notes || 'Unknown error';
    acc[errorKey] = (acc[errorKey] || 0) + 1;
    return acc;
  }, {});

  return {
    totalRequests,
    successRate: Math.round(successRate * 100) / 100,
    averageResponseTime: Math.round(averageResponseTime),
    actionBreakdown,
    hourlyUsage,
    topIPs,
    errorSummary: Object.entries(errorSummary)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([error, count]) => ({ error, count })),
  };
}
