import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([]);
}

export async function PUT(request: NextRequest) {
  try {
    await request.json();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get all orders with related data
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        subjects (
          id,
          name,
          type,
          events (
            id,
            name,
            school,
            date
          )
        ),
        order_items (
          id,
          quantity,
          unit_price,
          subtotal,
          photos (
            id,
            original_filename,
            storage_path
          )
        ),
        payments (
          id,
          mp_payment_id,
          mp_status,
          mp_status_detail,
          mp_payment_type,
          amount_cents,
          processed_at
        )
      `)
      .order('created_at', { ascending: false });
      
    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }
    
    // Calculate stats
    const stats = {
      total: orders?.length || 0,
      by_status: {
        pending: 0,
        approved: 0,
        delivered: 0,
        failed: 0,
        cancelled: 0,
        rejected: 0
      },
      total_revenue_cents: 0
    };
    
    // Process orders and calculate stats
    const processedOrders = (orders || []).map(order => {
      // Update stats
      const status = order.status as keyof typeof stats.by_status;
      if (status in stats.by_status) {
        stats.by_status[status]++;
      }
      
      // Calculate revenue (only for approved and delivered orders)
      if (order.status === 'approved' || order.status === 'delivered') {
        stats.total_revenue_cents += order.total_amount_cents || 0;
      }
      
      // Format order for frontend
      const totalItems = order.order_items?.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0
      ) || 0;
      
      return {
        id: order.id,
        contact_name: order.contact_name,
        contact_email: order.contact_email,
        contact_phone: order.contact_phone,
        status: order.status,
        mp_payment_id: order.mp_payment_id,
        mp_status: order.payments?.[0]?.mp_status || order.mp_status,
        notes: order.notes,
        created_at: order.created_at,
        delivered_at: order.delivery_date,
        approved_at: order.approved_at,
        total_amount_cents: order.total_amount_cents || 0,
        total_items: totalItems,
        event: order.subjects?.events ? {
          id: order.subjects.events.id,
          name: order.subjects.events.name,
          school: order.subjects.events.school,
          date: order.subjects.events.date
        } : null,
        subject: order.subjects ? {
          id: order.subjects.id,
          name: order.subjects.name,
          type: order.subjects.type
        } : null,
        items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          price_cents: item.unit_price,
          label: item.photos?.original_filename || 'Foto',
          photo: item.photos ? {
            id: item.photos.id,
            storage_path: item.photos.storage_path
          } : null
        })),
        payment: order.payments?.[0] || null
      };
    });
    
    return NextResponse.json({
      orders: processedOrders,
      stats
    });
    
  } catch (error) {
    console.error('Error in orders API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export orders as CSV
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    
    if (format !== 'csv') {
      return NextResponse.json(
        { error: 'Only CSV export is supported' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // Get all orders for export
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        subjects (name, type, events (name, school)),
        order_items (quantity),
        payments (mp_payment_id, mp_status, processed_at)
      `)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching orders for export:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }
    
    // Generate CSV
    const headers = [
      'ID Pedido',
      'Fecha',
      'Estado',
      'Cliente',
      'Email',
      'Teléfono',
      'Evento',
      'Colegio',
      'Sujeto',
      'Tipo',
      'Cantidad Items',
      'Total',
      'ID Pago MP',
      'Estado MP',
      'Fecha Pago',
      'Fecha Entrega'
    ];
    
    const rows = (orders || []).map(order => {
      const totalItems = order.order_items?.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0
      ) || 0;
      
      return [
        order.id,
        new Date(order.created_at).toLocaleDateString('es-AR'),
        order.status,
        order.contact_name || '',
        order.contact_email || '',
        order.contact_phone || '',
        order.subjects?.events?.name || '',
        order.subjects?.events?.school || '',
        order.subjects?.name || '',
        order.subjects?.type || '',
        totalItems,
        (order.total_amount_cents / 100).toFixed(2),
        order.payments?.[0]?.mp_payment_id || '',
        order.payments?.[0]?.mp_status || '',
        order.payments?.[0]?.processed_at 
          ? new Date(order.payments[0].processed_at).toLocaleDateString('es-AR')
          : '',
        order.delivery_date
          ? new Date(order.delivery_date).toLocaleDateString('es-AR')
          : ''
      ];
    });
    
    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => 
          typeof cell === 'string' && cell.includes(',')
            ? `"${cell.replace(/"/g, '""')}"`
            : cell
        ).join(',')
      )
    ].join('\n');
    
    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
    
  } catch (error) {
    console.error('Error exporting orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}