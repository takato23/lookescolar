import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/admin/orders - Obtener todas las órdenes unificadas
export const GET = withAdminAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
  const offset = parseInt(searchParams.get('offset') || '0');
  const status = searchParams.get('status');
  const eventId = searchParams.get('event_id');

  try {
    const supabase = await createServerSupabaseServiceClient();

    // Construir query con filtros opcionales
    let query = supabase
      .from('unified_orders')
      .select(`
        *,
        events:event_id (
          id,
          name,
          date
        )
      `)
      .order('created_at', { ascending: false });

    // Aplicar filtros si se proporcionan
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    // Aplicar paginación
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // Transformar datos para que sean compatibles con la UI
    const transformedOrders = orders?.map(order => ({
      ...order,
      event_name: order.events?.name || 'Sin evento',
      event_date: order.events?.date || null,
    })) || [];

    // Calcular estadísticas básicas
    const stats = {
      total: count || orders?.length || 0,
      pending_payment: orders?.filter(o => o.status === 'pending_payment').length || 0,
      paid: orders?.filter(o => o.status === 'paid').length || 0,
      in_production: orders?.filter(o => o.status === 'in_production').length || 0,
      shipped: orders?.filter(o => o.status === 'shipped').length || 0,
      delivered: orders?.filter(o => o.status === 'delivered').length || 0,
      cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
    };

    const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_price || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      orders: transformedOrders,
      pagination: {
        limit,
        offset,
        total: count || orders?.length || 0,
        hasMore: (count || orders?.length || 0) > offset + limit
      },
      stats: {
        ...stats,
        total_revenue: totalRevenue
      }
    });
  } catch (error) {
    console.error('Error in admin orders API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});