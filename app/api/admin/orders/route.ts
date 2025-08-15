import { NextRequest, NextResponse } from 'next/server';
import type { Tables } from '@/types/database';
import type { OrderWithDetails, OrdersResponse } from '@/types/admin-api';

type RawOrder = Tables<'orders'> & {
	subjects?: {
		id: string;
		name: string;
		type?: 'student' | 'couple' | 'family';
		events?: {
			id: string;
			name: string;
			school: string;
			date: string;
		} | null;
	} | null;
	order_items?: Array<{
		id: string;
		quantity: number | null;
		photos?: {
			id: string;
			original_filename?: string | null;
			storage_path: string;
		} | null;
		price_list_items?: {
			id: string;
			name?: string | null;
			price_cents: number;
		} | null;
	}>;
	payments?: Array<{
		id: string;
		mp_payment_id: string;
		mp_status: string;
		mp_status_detail?: string | null;
		mp_payment_type?: string | null;
		amount_cents?: number | null;
		processed_at?: string | null;
	}>;
};

export async function GET(request: NextRequest) {
  try {
    const hasService = Boolean(process.env['SUPABASE_SERVICE_ROLE_KEY']);
    const hasAnon = Boolean(
      process.env['NEXT_PUBLIC_SUPABASE_URL'] &&
        process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
    );

    // Fallback de desarrollo si no hay credenciales
    if (!hasService && !hasAnon) {
      console.error(
        '[Service] Orders API sin credenciales de Supabase. Devolviendo lista vacía.'
      );
      const stats: OrdersResponse['stats'] = {
        total: 0,
        by_status: { pending: 0, approved: 0, delivered: 0, failed: 0 },
        total_revenue_cents: 0,
        filtered_by: {
          event_id: request.nextUrl.searchParams.get('event') || null,
          status: request.nextUrl.searchParams.get('status'),
        },
      };
      return NextResponse.json<OrdersResponse>({
        orders: [],
        stats,
        generated_at: new Date().toISOString(),
      });
    }

    const supabase = hasService
      ? await createServiceClient()
      : await createClient();

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(
        'id, created_at, status, customer_name, customer_email, customer_phone, mp_payment_id, notes, total_cents, subject_id, event_id'
      )
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('[Service] Error obteniendo pedidos:', ordersError);
      const safeStats: OrdersResponse['stats'] = {
        total: 0,
        by_status: { pending: 0, approved: 0, delivered: 0, failed: 0 },
        total_revenue_cents: 0,
        filtered_by: {
          event_id: request.nextUrl.searchParams.get('event') || null,
          status: request.nextUrl.searchParams.get('status'),
        },
      };
      return NextResponse.json<OrdersResponse>({
        orders: [],
        stats: safeStats,
        generated_at: new Date().toISOString(),
      });
    }

    // Si no hay pedidos, responder rápido
    if (!orders || orders.length === 0) {
      const emptyStats: OrdersResponse['stats'] = {
        total: 0,
        by_status: { pending: 0, approved: 0, delivered: 0, failed: 0 },
        total_revenue_cents: 0,
        filtered_by: {
          event_id: request.nextUrl.searchParams.get('event') || null,
          status: request.nextUrl.searchParams.get('status'),
        },
      };
      return NextResponse.json<OrdersResponse>({
        orders: [],
        stats: emptyStats,
        generated_at: new Date().toISOString(),
      });
    }

    const orderIds = (orders ?? []).map((o) => o.id);
    const subjectIds = Array.from(
      new Set((orders ?? []).map((o) => o.subject_id).filter(Boolean))
    ) as string[];
    const eventIds = Array.from(
      new Set((orders ?? []).map((o) => o.event_id).filter(Boolean))
    ) as string[];

    // Cargar subjects
    const subjectById = new Map<string, { id: string; name: string }>();
    if (subjectIds.length > 0) {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds);
      (subjects ?? []).forEach((s) => subjectById.set(s.id, s));
    }

    // Cargar events
    const eventById = new Map<string, { id: string; school: string; date: string }>();
    if (eventIds.length > 0) {
      const { data: events } = await supabase
        .from('events')
        .select('id, school, date')
        .in('id', eventIds);
      (events ?? []).forEach((e) => eventById.set(e.id, e));
    }

    // Cargar items
    let items: Array<{ id: string; order_id: string; quantity: number | null; photo_id: string; price_list_item_id: string }> = [];
    if (orderIds.length > 0) {
      const res = await supabase
        .from('order_items')
        .select('id, order_id, quantity, photo_id, price_list_item_id')
        .in('order_id', orderIds);
      items = res.data ?? [];
    }

    const photoIds = Array.from(new Set((items ?? []).map((it) => it.photo_id))).filter(Boolean) as string[];
    const priceItemIds = Array.from(
      new Set((items ?? []).map((it) => it.price_list_item_id))
    ).filter(Boolean) as string[];

    const photoById = new Map<string, { id: string; storage_path: string }>();
    if (photoIds.length > 0) {
      const { data: photos } = await supabase
        .from('photos')
        .select('id, storage_path')
        .in('id', photoIds);
      (photos ?? []).forEach((p) => photoById.set(p.id, p));
    }

    const priceItemById = new Map<string, { id: string; name: string | null; price_cents: number }>();
    if (priceItemIds.length > 0) {
      const { data: priceItems } = await supabase
        .from('price_list_items')
        .select('id, name, price_cents')
        .in('id', priceItemIds);
      (priceItems ?? []).forEach((pi) => priceItemById.set(pi.id, pi));
    }

    const stats: OrdersResponse['stats'] = {
      total: orders?.length ?? 0,
      by_status: {
        pending: 0,
        approved: 0,
        delivered: 0,
        failed: 0,
      },
      total_revenue_cents: 0,
      filtered_by: {
        event_id: request.nextUrl.searchParams.get('event') || null,
        status: request.nextUrl.searchParams.get('status'),
      },
    };

    const processedOrders: OrderWithDetails[] = (orders ?? []).map((order) => {
      const totalItems = (items ?? [])
        .filter((it) => it.order_id === order.id)
        .reduce((sum, it) => sum + (it.quantity ?? 0), 0);

      if (order.status === 'approved' || order.status === 'delivered') {
        stats.total_revenue_cents += order.total_cents ?? 0;
      }
      const statusKey = (order.status ?? 'pending') as keyof typeof stats.by_status;
      if (statusKey in stats.by_status) stats.by_status[statusKey]++;

      const orderItems: OrderWithDetails['items'] = (items ?? [])
        .filter((it) => it.order_id === order.id)
        .map((it) => {
          const priceItem = priceItemById.get(it.price_list_item_id);
          const photo = photoById.get(it.photo_id);
          return {
            id: it.id,
            quantity: it.quantity ?? 0,
            price_cents: priceItem?.price_cents ?? 0,
            label: priceItem?.name ?? 'Foto',
            photo: photo ? { id: photo.id, storage_path: photo.storage_path } : null,
          };
        });

      const s = order.subject_id ? subjectById.get(order.subject_id) : undefined;
      const e = order.event_id ? eventById.get(order.event_id) : undefined;

      return {
        id: order.id,
        contact_name: order.customer_name ?? '',
        contact_email: order.customer_email ?? '',
        contact_phone: order.customer_phone ?? null,
        status: (order.status as OrderWithDetails['status']) ?? 'pending',
        mp_payment_id: order.mp_payment_id ?? null,
        mp_status: null,
        notes: order.notes ?? null,
        created_at: order.created_at ?? new Date(0).toISOString(),
        delivered_at: null,
        total_amount_cents: order.total_cents ?? 0,
        total_items: totalItems,
        event: e
          ? {
              id: e.id,
              name: e.school, // fallback
              school: e.school,
              date: e.date,
            }
          : null,
        subject: s
          ? {
              id: s.id,
              name: s.name,
              type: 'student',
            }
          : null,
        items: orderItems,
      };
    });

    return NextResponse.json<OrdersResponse>({
      orders: processedOrders,
      stats,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Service] Error en Orders API:', error);
    const stats: OrdersResponse['stats'] = {
      total: 0,
      by_status: { pending: 0, approved: 0, delivered: 0, failed: 0 },
      total_revenue_cents: 0,
      filtered_by: {
        event_id: request.nextUrl.searchParams.get('event') || null,
        status: request.nextUrl.searchParams.get('status'),
      },
    };
    return NextResponse.json<OrdersResponse>({
      orders: [],
      stats,
      generated_at: new Date().toISOString(),
    });
  }
}