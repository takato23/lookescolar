import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Validation schema for unified order updates
const UpdateOrderSchema = z.object({
  status: z
    .enum(['pending_payment', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled'])
    .optional(),
  payment_status: z
    .enum(['pending', 'paid', 'failed', 'refunded'])
    .optional(),
  production_status: z
    .enum(['pending', 'printing', 'quality_check', 'packaging', 'ready', 'shipped'])
    .optional(),
  production_notes: z.string().max(1000).optional(),
  tracking_number: z.string().max(100).optional(),
  shipped_at: z.string().datetime().optional(),
  delivered_at: z.string().datetime().optional(),
});

/**
 * GET /api/admin/orders/[id]
 * Get detailed order information from unified_orders with fallback to legacy orders
 */
export const GET = withAdminAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const startTime = Date.now();

  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    console.log(`[Admin Order Detail] Searching for order: ${id}`);

    const supabase = await createServerSupabaseServiceClient();
    
    // First, try to get from unified_orders
    const { data: unifiedOrder, error: unifiedError } = await supabase
      .from('unified_orders')
      .select(`
        *,
        events:event_id (
          id,
          name,
          date
        )
      `)
      .eq('id', id)
      .single();

    if (unifiedOrder) {
      console.log(`[Admin Order Detail] Found in unified_orders: ${id}`);
      const transformedOrder = {
        ...unifiedOrder,
        event_name: unifiedOrder.events?.name || 'Sin evento',
        event_date: unifiedOrder.events?.date || null,
      };
      
      return NextResponse.json({
        success: true,
        order: transformedOrder,
        source: 'unified_orders',
        performance: {
          query_time_ms: Date.now() - startTime,
        },
        generated_at: new Date().toISOString(),
      });
    }

    console.log(`[Admin Order Detail] Not found in unified_orders, checking legacy orders...`);
    
    // If not found in unified_orders, try legacy orders table
    const { data: legacyOrder, error: legacyError } = await supabase
      .from('orders')
      .select('*')
      .or(`id.eq.${id},external_id.eq.${id},order_number.eq.${id}`)
      .single();

    if (!legacyOrder) {
      console.log(`[Admin Order Detail] Order not found in any table: ${id}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log(`[Admin Order Detail] Found in legacy orders, attempting migration: ${id}`);
    
    // Try to auto-migrate legacy order to unified_orders
    try {
      const migrationResult = await supabase
        .from('unified_orders')
        .insert({
          id: legacyOrder.id || `legacy_${Date.now()}`,
          external_id: legacyOrder.external_id || legacyOrder.id,
          token: legacyOrder.token || `token_${Date.now()}`,
          status: mapLegacyStatus(legacyOrder.status),
          payment_method: mapLegacyPaymentMethod(legacyOrder.payment_method),
          payment_status: legacyOrder.payment_status || 'pending',
          contact_info: legacyOrder.contact_info || {},
          delivery_info: legacyOrder.delivery_info || {},
          event_id: legacyOrder.event_id,
          package_type: legacyOrder.package_type || 'basic',
          selected_photos: legacyOrder.selected_photos || {},
          additional_copies: legacyOrder.additional_copies || [],
          base_price: Number(legacyOrder.base_price || 0),
          additions_price: Number(legacyOrder.additions_price || 0),
          shipping_cost: Number(legacyOrder.shipping_cost || 0),
          total_price: Number(legacyOrder.total_price || 0),
          currency: legacyOrder.currency || 'ARS',
          production_notes: legacyOrder.notes,
          created_at: legacyOrder.created_at,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (migrationResult.data) {
        console.log(`[Admin Order Detail] Successfully migrated legacy order: ${id}`);
        return NextResponse.json({
          success: true,
          order: {
            ...migrationResult.data,
            event_name: 'Sin evento', // Would need to fetch event separately
          },
          source: 'migrated_from_legacy',
          migration: 'success',
          performance: {
            query_time_ms: Date.now() - startTime,
          },
          generated_at: new Date().toISOString(),
        });
      }
    } catch (migrationError) {
      console.log(`[Admin Order Detail] Migration failed, returning legacy format: ${id}`, migrationError);
    }

    // Return legacy order in unified format
    const transformedLegacyOrder = {
      ...legacyOrder,
      status: mapLegacyStatus(legacyOrder.status),
      payment_method: mapLegacyPaymentMethod(legacyOrder.payment_method),
      event_name: 'Sin evento', // Would need to fetch event separately
    };

    return NextResponse.json({
      success: true,
      order: transformedLegacyOrder,
      source: 'legacy_orders',
      performance: {
        query_time_ms: Date.now() - startTime,
      },
      generated_at: new Date().toISOString(),
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Admin Order Detail] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      order_id: id,
      duration,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch order details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

// Helper functions for mapping legacy data
function mapLegacyStatus(legacyStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'pending_payment',
    'approved': 'paid',
    'delivered': 'delivered',
    'failed': 'cancelled',
    'cancelled': 'cancelled',
  };
  return statusMap[legacyStatus] || 'pending_payment';
}

function mapLegacyPaymentMethod(legacyMethod: string): string {
  const methodMap: Record<string, string> = {
    'mercadopago': 'mercadopago',
    'transfer': 'transferencia',
    'cash': 'efectivo',
  };
  return methodMap[legacyMethod] || 'efectivo';
}

/**
 * PUT /api/admin/orders/[id]
 * Update unified order with audit trail and fallback to legacy
 */
export const PUT = withAdminAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const startTime = Date.now();

  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const updates = {
      ...validation.data,
      updated_at: new Date().toISOString()
    };

    console.log(`[Admin Order Update] Updating order: ${id}`, updates);

    const supabase = await createServerSupabaseServiceClient();
    
    // Try to update in unified_orders first
    const { data: unifiedOrder, error: unifiedError } = await supabase
      .from('unified_orders')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        events:event_id (
          id,
          name,
          date
        )
      `)
      .single();

    if (unifiedOrder) {
      console.log(`[Admin Order Update] Successfully updated in unified_orders: ${id}`);
      return NextResponse.json({
        success: true,
        order: {
          ...unifiedOrder,
          event_name: unifiedOrder.events?.name || 'Sin evento',
        },
        updated_fields: Object.keys(updates),
        source: 'unified_orders',
        performance: {
          update_time_ms: Date.now() - startTime,
        },
        updated_at: new Date().toISOString(),
      });
    }

    console.log(`[Admin Order Update] Not found in unified_orders, trying legacy: ${id}`);
    
    // If not found in unified_orders, try legacy orders with mapped fields
    const legacyUpdates = {
      status: mapUnifiedToLegacyStatus(updates.status),
      payment_status: updates.payment_status,
      notes: updates.production_notes,
      tracking_number: updates.tracking_number,
      updated_at: updates.updated_at
    };

    const { data: legacyOrder, error: legacyError } = await supabase
      .from('orders')
      .update(legacyUpdates)
      .or(`id.eq.${id},external_id.eq.${id},order_number.eq.${id}`)
      .select()
      .single();

    if (!legacyOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log(`[Admin Order Update] Successfully updated in legacy orders: ${id}`);
    
    // Return in unified format
    const transformedOrder = {
      ...legacyOrder,
      status: mapLegacyStatus(legacyOrder.status),
      payment_method: mapLegacyPaymentMethod(legacyOrder.payment_method),
      event_name: 'Sin evento',
    };

    return NextResponse.json({
      success: true,
      order: transformedOrder,
      updated_fields: Object.keys(legacyUpdates),
      source: 'legacy_orders',
      performance: {
        update_time_ms: Date.now() - startTime,
      },
      updated_at: new Date().toISOString(),
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Admin Order Update] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      order_id: id,
      duration,
    });

    return NextResponse.json(
      {
        error: 'Failed to update order',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

// Helper function for mapping unified status back to legacy
function mapUnifiedToLegacyStatus(unifiedStatus?: string): string {
  if (!unifiedStatus) return 'pending';
  const statusMap: Record<string, string> = {
    'pending_payment': 'pending',
    'paid': 'approved',
    'in_production': 'approved',
    'shipped': 'approved',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
  };
  return statusMap[unifiedStatus] || 'pending';
}

/**
 * DELETE /api/admin/orders/[id]
 * Cancel unified order (soft delete with audit trail)
 */
export const DELETE = withAdminAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const startTime = Date.now();

  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    // Get cancellation reason from query params
    const reason = request.nextUrl.searchParams.get('reason') || 'Admin cancellation';
    
    console.log(`[Admin Order Cancel] Cancelling order: ${id}, reason: ${reason}`);

    const supabase = await createServerSupabaseServiceClient();
    
    // Try to cancel in unified_orders first
    const { data: cancelledOrder, error: cancelError } = await supabase
      .from('unified_orders')
      .update({
        status: 'cancelled',
        production_notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        events:event_id (
          id,
          name,
          date
        )
      `)
      .single();

    if (cancelledOrder) {
      console.log(`[Admin Order Cancel] Successfully cancelled in unified_orders: ${id}`);
      return NextResponse.json({
        success: true,
        message: 'Order cancelled successfully',
        order: {
          ...cancelledOrder,
          event_name: cancelledOrder.events?.name || 'Sin evento',
        },
        cancellation_reason: reason,
        source: 'unified_orders',
        cancelled_at: new Date().toISOString(),
      });
    }

    console.log(`[Admin Order Cancel] Not found in unified_orders, trying legacy: ${id}`);
    
    // If not found in unified_orders, try legacy orders
    const { data: legacyCancelledOrder, error: legacyError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        notes: reason,
        updated_at: new Date().toISOString(),
      })
      .or(`id.eq.${id},external_id.eq.${id},order_number.eq.${id}`)
      .select()
      .single();

    if (!legacyCancelledOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log(`[Admin Order Cancel] Successfully cancelled in legacy orders: ${id}`);
    
    // Return in unified format
    const transformedOrder = {
      ...legacyCancelledOrder,
      status: 'cancelled',
      payment_method: mapLegacyPaymentMethod(legacyCancelledOrder.payment_method),
      event_name: 'Sin evento',
    };

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      order: transformedOrder,
      cancellation_reason: reason,
      source: 'legacy_orders',
      cancelled_at: new Date().toISOString(),
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Admin Order Cancel] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      order_id: id,
      duration,
    });

    return NextResponse.json(
      {
        error: 'Failed to cancel order',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
