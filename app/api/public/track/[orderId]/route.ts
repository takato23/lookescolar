import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

/**
 * GET /api/public/track/[orderId]
 * Public endpoint to get order tracking information
 * No authentication required - limited data exposure
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const { orderId } = params;

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    // Support both full UUID and short code
    const searchId = orderId.length === 8 ? orderId.toLowerCase() : orderId;

    const supabase = await createServerSupabaseServiceClient();

    // Search in unified_orders
    let query = supabase
      .from('unified_orders')
      .select(`
        id,
        status,
        payment_status,
        created_at,
        updated_at,
        delivered_at,
        shipped_at,
        tracking_number,
        package_type,
        total_price,
        currency,
        contact_info,
        delivery_info,
        events:event_id (
          name
        )
      `);

    // Search by ID or short code prefix
    if (orderId.length === 8) {
      query = query.ilike('id', `${searchId}%`);
    } else {
      query = query.eq('id', orderId);
    }

    const { data: order, error } = await query.maybeSingle();

    if (error) {
      console.error('[Track Order] Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!order) {
      // Try legacy orders table
      const { data: legacyOrder, error: legacyError } = await supabase
        .from('orders')
        .select('id, status, created_at, updated_at, total_amount, metadata')
        .or(`id.ilike.${searchId}%,order_number.ilike.${searchId}%`)
        .maybeSingle();

      if (legacyError || !legacyOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Transform legacy order to unified format
      const metadata = legacyOrder.metadata as Record<string, any> || {};
      return NextResponse.json({
        order: {
          id: legacyOrder.id,
          status: mapLegacyStatus(legacyOrder.status),
          payment_status: legacyOrder.status === 'approved' ? 'paid' : 'pending',
          created_at: legacyOrder.created_at,
          updated_at: legacyOrder.updated_at,
          delivered_at: null,
          shipped_at: null,
          tracking_number: null,
          event_name: metadata.event_name || null,
          package_type: metadata.package_type || 'Basico',
          total_price: (legacyOrder.total_amount || 0) * 100,
          currency: 'ARS',
          contact_info: {
            name: metadata.original_request?.name || 'Cliente',
            email: metadata.original_request?.email || '',
            phone: metadata.original_request?.phone,
          },
          delivery_info: null,
        },
        source: 'legacy',
      });
    }

    // Extract contact info safely with limited exposure
    const contactInfo = order.contact_info as Record<string, any> || {};
    const deliveryInfo = order.delivery_info as Record<string, any> || {};

    // Mask sensitive data for public view
    const maskedPhone = contactInfo.phone
      ? maskPhone(contactInfo.phone)
      : null;
    const maskedEmail = contactInfo.email
      ? maskEmail(contactInfo.email)
      : null;

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        delivered_at: order.delivered_at,
        shipped_at: order.shipped_at,
        tracking_number: order.tracking_number,
        event_name: order.events?.name || null,
        package_type: order.package_type,
        total_price: order.total_price,
        currency: order.currency,
        contact_info: {
          name: contactInfo.name || 'Cliente',
          email: maskedEmail,
          phone: maskedPhone,
        },
        delivery_info: {
          pickup_location: deliveryInfo.pickup_location,
          pickup_instructions: deliveryInfo.pickup_instructions,
        },
      },
      source: 'unified',
    });

  } catch (error) {
    console.error('[Track Order] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function mapLegacyStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'pending_payment',
    approved: 'paid',
    delivered: 'delivered',
    failed: 'cancelled',
    cancelled: 'cancelled',
  };
  return statusMap[status] || 'pending_payment';
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;

  const maskedLocal = local.length > 2
    ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
    : local;

  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return phone;

  const lastFour = digits.slice(-4);
  const maskedPart = '*'.repeat(digits.length - 4);

  return `${maskedPart}${lastFour}`;
}
