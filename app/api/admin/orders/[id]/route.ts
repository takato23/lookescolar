import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Schema para actualizar pedido
const UpdateOrderSchema = z.object({
  status: z.enum(['delivered']), // Solo permitimos marcar como entregado
  notes: z.string().optional(),
});

// PUT - Actualizar estado de pedido (solo para admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const { id: orderId } = await params;

  try {
    // Verificar autenticación admin
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Validar UUID del pedido
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return NextResponse.json(
        { error: 'ID de pedido inválido' },
        { status: 400 }
      );
    }

    // Parsear y validar request body
    const body = await request.json();
    const validation = UpdateOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { status, notes } = validation.data;
    const supabase = createServiceClient();

    // Verificar que el pedido existe y está en estado approved
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, contact_name')
      .eq('id', orderId)
      .single();

    if (fetchError || !existingOrder) {
      console.error(`[${requestId}] Pedido no encontrado:`, fetchError);
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    // Validar transición de estado
    if (status === 'delivered' && existingOrder.status !== 'approved') {
      return NextResponse.json(
        {
          error:
            'Solo se pueden marcar como entregados los pedidos pagados (approved)',
        },
        { status: 400 }
      );
    }

    if (existingOrder.status === 'delivered') {
      return NextResponse.json(
        { error: 'El pedido ya está marcado como entregado' },
        { status: 409 }
      );
    }

    // Actualizar pedido
    const updateData: any = {
      status,
      ...(notes ? { notes } : {}),
      ...(status === 'delivered'
        ? { delivered_at: new Date().toISOString() }
        : {}),
    };

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('id, status, delivered_at')
      .single();

    if (updateError) {
      console.error(`[${requestId}] Error actualizando pedido:`, updateError);
      return NextResponse.json(
        { error: 'Error actualizando pedido' },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.info(`[${requestId}] Pedido actualizado`, {
      orderId: `ord_***${orderId.slice(-4)}`,
      customerName: existingOrder.contact_name,
      newStatus: status,
      duration,
    });

    return NextResponse.json({
      message: 'Pedido actualizado exitosamente',
      order: updatedOrder,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error actualizando pedido:`, error);

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Obtener detalles de un pedido específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: orderId } = await params;

  try {
    // Verificar autenticación admin
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Validar UUID del pedido
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return NextResponse.json(
        { error: 'ID de pedido inválido' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Obtener pedido con relaciones completas
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        subjects:subject_id (
          id,
          first_name,
          last_name,
          type,
          events:event_id (
            id,
            name,
            school,
            date
          )
        ),
        order_items (
          id,
          quantity,
          photos:photo_id (
            id,
            storage_path
          ),
          price_list_items:price_list_item_id (
            id,
            label,
            price_cents
          )
        )
      `
      )
      .eq('id', orderId)
      .single();

    if (error || !order) {
      console.warn(`[${requestId}] Pedido no encontrado: ${orderId}`);
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    console.info(`[${requestId}] Detalles de pedido obtenidos`, {
      orderId: `ord_***${orderId.slice(-4)}`,
      status: order.status,
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error(
      `[${requestId}] Error obteniendo detalles del pedido:`,
      error
    );

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
