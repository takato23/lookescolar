import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('unified_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        token: order.token,
        status: order.status,
        production_status: order.production_status,
        base_package: order.base_package,
        selected_photos: order.selected_photos,
        additional_copies: order.additional_copies,
        contact_info: order.contact_info,
        base_price: order.base_price,
        additions_price: order.additions_price,
        shipping_cost: order.shipping_cost,
        total_price: order.total_price,
        currency: order.currency,
        mercadopago_preference_id: order.mercadopago_preference_id,
        mercadopago_payment_id: order.mercadopago_payment_id,
        mercadopago_status: order.mercadopago_status,
        payment_method: order.payment_method,
        payment_details: order.payment_details,
        tracking_number: order.tracking_number,
        shipped_at: order.shipped_at,
        delivered_at: order.delivered_at,
        created_at: order.created_at,
        updated_at: order.updated_at,
      },
    });

  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
