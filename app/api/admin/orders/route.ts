import { NextRequest, NextResponse } from 'next/server';
import type { Tables } from '@/types/database';
import type { OrderWithDetails, OrdersResponse } from '@/types/admin-api';
import {
  createServerSupabaseClient,
  createServerSupabaseServiceClient,
} from '@/lib/supabase/server';
import {
  getEnhancedOrderService,
  type OrderFilters,
} from '@/lib/services/enhanced-order.service';
import { z } from 'zod';

// Validation schema for query parameters
const QueryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  status: z
    .enum(['pending', 'approved', 'delivered', 'failed', 'cancelled', 'all'])
    .default('all'),
  event_id: z.string().uuid().optional(),
  priority_level: z.coerce.number().min(1).max(5).optional(),
  delivery_method: z
    .enum(['pickup', 'email', 'postal', 'hand_delivery'])
    .optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  overdue_only: z.coerce.boolean().default(false),
  search: z.string().max(100).optional(),
});

// Fallback function to get orders directly from tables if view fails
async function getOrdersFallback(
  filters: OrderFilters,
  page: number,
  limit: number
) {
  const supabase = await createServerSupabaseServiceClient();

  const offset = (page - 1) * limit;

  // Build base query
  let query = supabase.from('orders').select(`
      *,
      event:events(name, school, school_name, date),
      subject:subjects(name, email, phone)
    `);

  // Apply filters
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.event_id) {
    query = query.eq('event_id', filters.event_id);
  }

  // Get total count
  const countQuery = query;
  const { count } = await countQuery.select('*', {
    count: 'exact',
    head: true,
  });
  // Some Supabase setups may return null count for complex policies; fallback to page size
  const total = typeof count === 'number' ? count : 0;

  // Get paginated results
  const { data: orders, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  // Transform data to match OrderWithDetails structure
  const transformedOrders = orders.map((order) => ({
    ...order,
    event_name: order.event?.name || null,
    event_school: (order.event?.school ?? order.event?.school_name) || null,
    event_date: order.event?.date || null,
    subject_name: order.subject?.name || null,
    subject_email: order.subject?.email || null,
    subject_phone: order.subject?.phone || null,
    // Add default values for missing fields
    audit_log_count: 0,
    recent_audit_events: null,
    enhanced_status: order.status,
    hours_since_created: null,
    hours_since_status_change: null,
  }));

  // Simple stats calculation
  const stats = {
    total: total,
    by_status: {
      pending: orders.filter((o) => o.status === 'pending').length,
      approved: orders.filter((o) => o.status === 'approved').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      failed: orders.filter((o) => o.status === 'failed').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    },
    total_revenue_cents: orders
      .filter((o) => o.status === 'approved' || o.status === 'delivered')
      .reduce((sum, order) => sum + (order.total_amount || 0), 0),
    overdue_pending: 0,
    overdue_delivery: 0,
    avg_processing_time_hours: 0,
    priority_distribution: {},
  };

  // If count is unavailable (0) but we fetched items, approximate total using current page context
  const effectiveTotal = total === 0 && transformedOrders.length > 0
    ? page * limit - (limit - transformedOrders.length)
    : total;

  return {
    orders: transformedOrders,
    stats,
    pagination: {
      page,
      limit,
      total: effectiveTotal,
      total_pages: Math.ceil(effectiveTotal / limit),
      has_more: effectiveTotal > page * limit,
    },
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check permissions
    const hasService = Boolean(process.env['SUPABASE_SERVICE_ROLE_KEY']);
    const hasAnon = Boolean(
      process.env['NEXT_PUBLIC_SUPABASE_URL'] &&
        process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
    );

    if (!hasService || !hasAnon) {
      console.error('[Admin Orders API] Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      );
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());

    const validation = QueryParamsSchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const params = validation.data;
    const useEnhancedOverride = url.searchParams.get('enhanced') === 'true';

    // Build filters object
    const filters: OrderFilters = {
      status: params.status,
      event_id: params.event_id,
      priority_level: params.priority_level,
      delivery_method: params.delivery_method,
      created_after: params.created_after,
      created_before: params.created_before,
      overdue_only: params.overdue_only,
      search_query: params.search,
    };

    try {
      // Try to use enhanced order service first, only if available
      const service = getEnhancedOrderService();
      if (useEnhancedOverride || (await service.isAvailable())) {
        const result = await service.getOrders(
          filters,
          params.page,
          params.limit
        );

      const duration = Date.now() - startTime;

      console.log(`[Admin Orders API] Query completed in ${duration}ms`, {
        filters: Object.keys(filters).filter(
          (key) => filters[key as keyof OrderFilters] !== undefined
        ),
        total_orders: result.orders.length,
        total_count: result.pagination.total,
        page: params.page,
        duration,
      });

        return NextResponse.json({
          orders: result.orders,
          stats: result.stats,
          pagination: result.pagination,
          performance: {
            query_time_ms: duration,
            cache_used: false,
            optimized: true,
          },
          generated_at: new Date().toISOString(),
        } satisfies OrdersResponse & { pagination: any; performance: any });
      }
      throw new Error('ENHANCED_ORDERS_DISABLED');
    } catch (serviceError: any) {
      if (String(serviceError?.message || serviceError).includes('ENHANCED_ORDERS_DISABLED')) {
        // Silent fallback when enhanced service is intentionally disabled or unavailable
      } else {
        console.warn(
          '[Admin Orders API] Enhanced service failed, using fallback:',
          serviceError
        );
      }

      // Fallback to direct table query
      const result = await getOrdersFallback(
        filters,
        params.page,
        params.limit
      );

      const duration = Date.now() - startTime;

      console.log(
        `[Admin Orders API] Fallback query completed in ${duration}ms`,
        {
          filters: Object.keys(filters).filter(
            (key) => filters[key as keyof OrderFilters] !== undefined
          ),
          total_orders: result.orders.length,
          total_count: result.pagination.total,
          page: params.page,
          duration,
        }
      );

      return NextResponse.json({
        orders: result.orders,
        stats: result.stats,
        pagination: result.pagination,
        performance: {
          query_time_ms: duration,
          cache_used: false,
          optimized: false,
          fallback_used: true,
        },
        generated_at: new Date().toISOString(),
      } satisfies OrdersResponse & { pagination: any; performance: any });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Admin Orders API] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Legacy implementation removed - now uses enhancedOrderService for optimal performance
// See Phase 2 of the admin orders enhancement plan
