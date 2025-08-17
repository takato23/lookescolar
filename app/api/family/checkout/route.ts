import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import {
  createPaymentPreference,
  validateSinglePendingOrder,
  CreatePreferenceParams,
} from '@/lib/mercadopago/mercadopago.service';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiting: 5 req/min por IP para checkout
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
});

// Schema de validación para checkout
const CheckoutSchema = z.object({
  token: z.string().min(20, 'Token inválido'),
  contactInfo: z.object({
    name: z.string().min(2, 'Nombre requerido'),
    email: z.string().email('Email inválido'),
    phone: z.string().optional(),
  }),
  items: z
    .array(
      z.object({
        photoId: z.string().uuid('ID de foto inválido'),
        quantity: z.number().min(1).max(10),
        priceType: z.string().default('base'), // 'base', 'premium', etc.
      })
    )
    .min(1, 'Carrito vacío')
    .max(50, 'Máximo 50 fotos por orden'),
});

type CheckoutRequest = z.infer<typeof CheckoutSchema>;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Rate limiting
    const ip =
      request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      console.warn(`[${requestId}] Checkout rate limit exceeded`, {
        ip: ip.replace(/\d+$/, '***'),
        limit,
        remaining,
      });

      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before trying again.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(reset).toISOString(),
          },
        }
      );
    }

    // Parsear y validar request
    const body = await request.json();
    const validation = CheckoutSchema.safeParse(body);

    if (!validation.success) {
      console.warn(`[${requestId}] Validation failed`, {
        errors: validation.error.issues.map(
          (e) => `${e.path.join('.')}: ${e.message}`
        ),
      });

      return NextResponse.json(
        {
          error: 'Invalid checkout data',
          details: validation.error.issues.map(
            (e) => `${e.path.join('.')}: ${e.message}`
          ),
        },
        { status: 400 }
      );
    }

    const { token, contactInfo, items } = validation.data;
    const supabase = await createServiceClient();

    console.info(`[${requestId}] Checkout started`, {
      token: 'tok_***',
      itemsCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    });

    // 1. Verificar token válido y obtener sujeto
    const { data: tokenData } = await supabase
      .from('subject_tokens')
      .select(`subject_id, expires_at, subjects:subject_id ( id, event_id, first_name, last_name, type, events:event_id ( id, name, school, status ) )`)
      .eq('token', token)
      .single();

    if (!tokenData || new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const subject = tokenData.subjects as any;
    const event = subject?.events as any;

    if (!subject || !event) {
      return NextResponse.json(
        { error: 'Subject or event not found' },
        { status: 404 }
      );
    }

    if (event.status !== 'active') {
      return NextResponse.json(
        { error: 'Event is not active for purchases' },
        { status: 403 }
      );
    }

    // 2. Validar que solo haya un pedido pendiente por sujeto
    const canCreateOrder = await validateSinglePendingOrder(subject.id);
    if (!canCreateOrder) {
      return NextResponse.json(
        {
          error:
            'You already have a pending order. Please complete or cancel the previous payment.',
        },
        { status: 409 }
      );
    }

    // 3. Validar que todas las fotos pertenecen al sujeto
    const photoIds = items.map((item) => item.photoId);
    const { data: photos } = await supabase
      .from('photos')
      .select('id, filename')
      .eq('subject_id', subject.id)
      .in('id', photoIds);

    if (!photos || photos.length !== photoIds.length) {
      const foundIds = photos?.map((p) => p.id) || [];
      const invalidIds = photoIds.filter((id) => !foundIds.includes(id));

      console.warn(`[${requestId}] Invalid photo IDs`, {
        requestedIds: photoIds.length,
        foundIds: foundIds.length,
        invalidIds,
      });

      return NextResponse.json(
        { error: 'Some photos do not belong to this subject' },
        { status: 403 }
      );
    }

    // 4. Obtener precios del evento
    const { data: priceList } = await supabase
      .from('price_lists')
      .select(
        `
        id,
        price_list_items (
          id,
          label,
          type,
          price_cents
        )
      `
      )
      .eq('event_id', event.id)
      .single();

    if (!priceList?.price_list_items?.length) {
      return NextResponse.json(
        { error: 'No pricing available for this event' },
        { status: 400 }
      );
    }

    // Crear mapa de precios por tipo
    const priceMap = new Map();
    priceList.price_list_items.forEach((item: any) => {
      priceMap.set(item.type || 'base', {
        id: item.id,
        label: item.label,
        price_cents: item.price_cents,
      });
    });

    // 5. Validar tipos de precio y calcular total
    let totalCents = 0;
    const validatedItems = [];

    for (const item of items) {
      const priceInfo = priceMap.get(item.priceType);
      if (!priceInfo) {
        return NextResponse.json(
          { error: `Invalid price type: ${item.priceType}` },
          { status: 400 }
        );
      }

      const itemTotal = priceInfo.price_cents * item.quantity;
      totalCents += itemTotal;

      validatedItems.push({
        ...item,
        priceListItemId: priceInfo.id,
        unitPrice: priceInfo.price_cents,
        totalPrice: itemTotal,
        label: priceInfo.label,
      });
    }

    // 6. Crear orden en base de datos
    const orderId = crypto.randomUUID();
    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      subject_id: subject.id,
      contact_name: contactInfo.name,
      contact_email: contactInfo.email,
      contact_phone: contactInfo.phone || null,
      total_amount_cents: totalCents,
      status: 'pending',
      created_by: 'family_checkout',
    });

    if (orderError) {
      console.error(`[${requestId}] Error creating order:`, orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // 7. Crear items de la orden
    const orderItems = validatedItems.map((item) => ({
      order_id: orderId,
      photo_id: item.photoId,
      price_list_item_id: item.priceListItemId,
      quantity: item.quantity,
      unit_price_cents: item.unitPrice,
      total_price_cents: item.totalPrice,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error(`[${requestId}] Error creating order items:`, itemsError);

      // Rollback: eliminar orden creada
      await supabase.from('orders').delete().eq('id', orderId);

      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    // 8. Crear preferencia en Mercado Pago
    const mpItems = validatedItems.map((item) => {
      const photo = photos.find((p) => p.id === item.photoId);
      return {
        title: `${item.label} - ${photo?.filename || 'Photo'}`,
        quantity: item.quantity,
        unit_price: Math.round(item.unitPrice / 100), // Convertir centavos a pesos
      };
    });

    const preferenceParams: CreatePreferenceParams = {
      orderId,
      items: mpItems,
      payer: {
        name: contactInfo.name,
        email: contactInfo.email,
        phone: contactInfo.phone,
      },
    };

    const preference = await createPaymentPreference(preferenceParams);

    // 9. Actualizar orden con preference_id
    const { error: updateError } = await supabase
      .from('orders')
      .update({ mp_preference_id: preference.id })
      .eq('id', orderId);

    if (updateError) {
      console.error(
        `[${requestId}] Error updating preference_id:`,
        updateError
      );
      // No es crítico, el webhook puede funcionar sin esto
    }

    const duration = Date.now() - startTime;

    console.info(`[${requestId}] Checkout completed successfully`, {
      orderId,
      preferenceId: preference.id,
      totalCents,
      totalPesos: Math.round(totalCents / 100),
      itemsCount: validatedItems.length,
      duration,
    });

    return NextResponse.json({
      success: true,
      orderId,
      preferenceId: preference.id,
      redirectUrl:
        process.env.NODE_ENV === 'production'
          ? preference.init_point
          : preference.sandbox_init_point,
      total: Math.round(totalCents / 100), // Total en pesos
      currency: 'ARS',
      items: mpItems.map((item) => ({
        ...item,
        unit_price_formatted: `$${item.unit_price}`,
      })),
      event: {
        name: event.name,
        school: event.school,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Checkout error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
