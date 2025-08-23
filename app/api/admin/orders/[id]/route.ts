import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEnhancedOrderService, type UpdateOrderRequest } from '@/lib/services/enhanced-order.service';

// Validation schema for order updates
const UpdateOrderSchema = z.object({
  status: z.enum(['pending', 'approved', 'delivered', 'failed', 'cancelled']).optional(),
  admin_notes: z.string().max(1000).optional(),
  priority_level: z.number().min(1).max(5).optional(),
  estimated_delivery_date: z.string().datetime().optional(),
  delivery_method: z.enum(['pickup', 'email', 'postal', 'hand_delivery']).optional(),
  tracking_number: z.string().max(100).optional(),
});

/**
 * GET /api/admin/orders/[id]
 * Get detailed order information with audit trail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Get order with full details and audit information
    const enhancedOrderService = getEnhancedOrderService();
    const order = await enhancedOrderService.getOrderById(id);

    // Get audit trail
    const auditTrail = await enhancedOrderService.getOrderAuditTrail(id);

    const duration = Date.now() - startTime;

    console.log(`[Admin Order Detail] Order ${id} retrieved in ${duration}ms`);

    return NextResponse.json({
      order,
      audit_trail: auditTrail,
      performance: {
        query_time_ms: duration,
        optimized: true
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Admin Order Detail] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      order_id: params.id,
      duration
    });

    if (error instanceof Error && error.message === 'Order not found') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch order details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/orders/[id]
 * Update order with audit trail
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Extract admin context for audit trail
    const adminId = request.headers.get('x-admin-id') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.ip;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Update the order
    const enhancedOrderService = getEnhancedOrderService();
    const updatedOrder = await enhancedOrderService.updateOrder(
      id,
      updates,
      adminId,
      ipAddress,
      userAgent
    );

    const duration = Date.now() - startTime;

    console.log(`[Admin Order Update] Order ${id} updated in ${duration}ms`, {
      updates: Object.keys(updates),
      admin_id: adminId,
      duration
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      updated_fields: Object.keys(updates),
      performance: {
        update_time_ms: duration,
        audit_logged: true
      },
      updated_at: new Date().toISOString(),
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Admin Order Update] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      order_id: params.id,
      duration
    });

    if (error instanceof Error && error.message === 'Order not found') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/orders/[id]
 * Cancel order (soft delete with audit trail)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Get cancellation reason from query params
    const reason = request.nextUrl.searchParams.get('reason') || 'Admin cancellation';

    // Extract admin context
    const adminId = request.headers.get('x-admin-id') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.ip;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Cancel the order (update status to cancelled)
    const enhancedOrderService = getEnhancedOrderService();
    const cancelledOrder = await enhancedOrderService.updateOrder(
      id,
      { 
        status: 'cancelled', 
        admin_notes: reason 
      },
      adminId,
      ipAddress,
      userAgent
    );

    const duration = Date.now() - startTime;

    console.log(`[Admin Order Cancel] Order ${id} cancelled in ${duration}ms`, {
      reason,
      admin_id: adminId,
      duration
    });

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      order: cancelledOrder,
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Admin Order Cancel] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      order_id: params.id,
      duration
    });

    if (error instanceof Error && error.message === 'Order not found') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to cancel order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}