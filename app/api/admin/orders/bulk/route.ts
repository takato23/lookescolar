import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  enhancedOrderService,
  type UpdateOrderRequest,
} from '@/lib/services/enhanced-order.service';

// Validation schema for bulk operations
const BulkUpdateSchema = z.object({
  order_ids: z.array(z.string().uuid()).min(1).max(100),
  updates: z.object({
    status: z
      .enum(['pending', 'approved', 'delivered', 'failed', 'cancelled'])
      .optional(),
    admin_notes: z.string().max(1000).optional(),
    priority_level: z.number().min(1).max(5).optional(),
    estimated_delivery_date: z.string().datetime().optional(),
    delivery_method: z
      .enum(['pickup', 'email', 'postal', 'hand_delivery'])
      .optional(),
    tracking_number: z.string().max(100).optional(),
  }),
});

/**
 * POST /api/admin/orders/bulk
 * Bulk update multiple orders
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = BulkUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid bulk update data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { order_ids, updates } = validation.data;

    // Extract admin context for audit trail
    const adminId = request.headers.get('x-admin-id') || undefined;

    console.log(
      `[Admin Bulk Update] Starting bulk update of ${order_ids.length} orders`,
      {
        updates: Object.keys(updates),
        admin_id: adminId,
      }
    );

    // Perform bulk update
    const result = await enhancedOrderService.bulkUpdateOrders(
      order_ids,
      updates,
      adminId
    );

    const duration = Date.now() - startTime;

    console.log(`[Admin Bulk Update] Completed in ${duration}ms`, {
      success: result.success,
      failed: result.failed,
      duration,
    });

    return NextResponse.json({
      success: true,
      result: {
        total_orders: order_ids.length,
        successful_updates: result.success,
        failed_updates: result.failed,
        errors: result.errors,
      },
      updates_applied: updates,
      performance: {
        total_time_ms: duration,
        avg_time_per_order_ms: Math.round(duration / order_ids.length),
      },
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Admin Bulk Update] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      {
        error: 'Failed to perform bulk update',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/orders/bulk
 * Bulk cancel multiple orders
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse order IDs from request body
    const body = await request.json();
    const { order_ids, reason = 'Bulk cancellation' } = body;

    if (
      !Array.isArray(order_ids) ||
      order_ids.length === 0 ||
      order_ids.length > 100
    ) {
      return NextResponse.json(
        { error: 'Invalid order_ids array (must be 1-100 items)' },
        { status: 400 }
      );
    }

    // Validate all IDs are UUIDs
    for (const id of order_ids) {
      if (
        typeof id !== 'string' ||
        !id.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        )
      ) {
        return NextResponse.json(
          { error: `Invalid order ID format: ${id}` },
          { status: 400 }
        );
      }
    }

    // Extract admin context
    const adminId = request.headers.get('x-admin-id') || undefined;

    console.log(
      `[Admin Bulk Cancel] Starting bulk cancellation of ${order_ids.length} orders`,
      {
        reason,
        admin_id: adminId,
      }
    );

    // Perform bulk cancellation
    const result = await enhancedOrderService.bulkUpdateOrders(
      order_ids,
      {
        status: 'cancelled',
        admin_notes: reason,
      },
      adminId
    );

    const duration = Date.now() - startTime;

    console.log(`[Admin Bulk Cancel] Completed in ${duration}ms`, {
      success: result.success,
      failed: result.failed,
      duration,
    });

    return NextResponse.json({
      success: true,
      message: 'Bulk cancellation completed',
      result: {
        total_orders: order_ids.length,
        successful_cancellations: result.success,
        failed_cancellations: result.failed,
        errors: result.errors,
      },
      cancellation_reason: reason,
      performance: {
        total_time_ms: duration,
        avg_time_per_order_ms: Math.round(duration / order_ids.length),
      },
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Admin Bulk Cancel] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      {
        error: 'Failed to perform bulk cancellation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
