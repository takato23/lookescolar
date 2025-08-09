import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import {
  createPaymentPreference,
  validateSinglePendingOrder,
  CreatePreferenceParams,
} from '@/lib/mercadopago/mercadopago.service';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiting: 10 req/min por IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
});

// Schema de validación
const CreatePreferenceSchema = z.object({
  token: z.string().min(20, 'Token inválido'),
  contactInfo: z.object({
    name: z.string().min(2, 'Nombre requerido'),
    email: z.string().email('Email inválido'),
    phone: z.string().optional(),
  }),
  cartItems: z
    .array(
      z.object({
        photoId: z.string(),
        priceListItemId: z.string(),
        quantity: z.number().min(1).max(10),
      })
    )
    .min(1, 'Carrito vacío'),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      console.warn(`[${requestId}] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
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
    const validation = CreatePreferenceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { token, contactInfo, cartItems } = validation.data;
    const supabase = await createServerSupabaseServiceClient();

    // Verificar token válido y obtener subject
    const { data: tokenData } = await supabase
      .from('subject_tokens')
      .select(
        `
        subject_id,
        expires_at,
        subjects:subject_id (
          id,
          event_id,
          first_name,
          last_name,
          type
        )
      `
      )
      .eq('token', token)
      .single();

    if (!tokenData || new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      );
    }

    const subject = tokenData.subjects as any;
    if (!subject) {
      return NextResponse.json(
        { error: 'Sujeto no encontrado' },
        { status: 404 }
      );
    }

    // Validar que solo haya un pedido pendiente por sujeto
    const canCreateOrder = await validateSinglePendingOrder(subject.id);
    if (!canCreateOrder) {
      return NextResponse.json(
        {
          error:
            'Ya tienes un pedido pendiente. Completa el pago anterior o cancélalo.',
        },
        { status: 409 }
      );
    }

    // Validar fotos pertenecen al sujeto
    const photoIds = cartItems.map((item) => item.photoId);
    const { data: photos } = await supabase
      .from('photos')
      .select('id, subject_id')
      .eq('subject_id', subject.id)
      .in('id', photoIds);

    if (!photos || photos.length !== photoIds.length) {
      return NextResponse.json(
        { error: 'Algunas fotos no pertenecen a este sujeto' },
        { status: 403 }
      );
    }

    // Obtener precios actuales
    const priceListItemIds = cartItems.map((item) => item.priceListItemId);
    const { data: priceItems } = await supabase
      .from('price_list_items')
      .select(
        `
        id,
        label,
        price_cents,
        price_lists:price_list_id (
          event_id
        )
      `
      )
      .in('id', priceListItemIds);

    if (!priceItems || priceItems.length !== priceListItemIds.length) {
      return NextResponse.json(
        { error: 'Items de precio inválidos' },
        { status: 400 }
      );
    }

    // Validar que precios corresponden al evento del sujeto
    const invalidPriceItems = priceItems.filter(
      (item) => (item.price_lists as any)?.event_id !== subject.event_id
    );

    if (invalidPriceItems.length > 0) {
      return NextResponse.json(
        { error: 'Precios no corresponden al evento' },
        { status: 400 }
      );
    }

    // Crear orden en BD
    const orderId = crypto.randomUUID();
    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      subject_id: subject.id,
      contact_name: contactInfo.name,
      contact_email: contactInfo.email,
      contact_phone: contactInfo.phone || null,
      status: 'pending',
    });

    if (orderError) {
      console.error(`[${requestId}] Error creando orden:`, orderError);
      return NextResponse.json(
        { error: 'Error creando pedido' },
        { status: 500 }
      );
    }

    // Crear items de la orden
    const orderItems = cartItems.map((cartItem) => {
      const priceItem = priceItems.find(
        (p) => p.id === cartItem.priceListItemId
      )!;
      return {
        order_id: orderId,
        photo_id: cartItem.photoId,
        price_list_item_id: cartItem.priceListItemId,
        quantity: cartItem.quantity,
      };
    });

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error(`[${requestId}] Error creando items de orden:`, itemsError);
      // Rollback: eliminar orden creada
      await supabase.from('orders').delete().eq('id', orderId);

      return NextResponse.json(
        { error: 'Error creando items del pedido' },
        { status: 500 }
      );
    }

    // Preparar items para MP
    const mpItems = cartItems.map((cartItem) => {
      const priceItem = priceItems.find(
        (p) => p.id === cartItem.priceListItemId
      )!;
      return {
        title: `${priceItem.label} - Foto`,
        quantity: cartItem.quantity,
        unit_price: priceItem.price_cents / 100, // MP espera precio en pesos, no centavos
      };
    });

    // Crear preferencia en MP
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

    // Actualizar orden con preference_id
    const { error: updateError } = await supabase
      .from('orders')
      .update({ mp_preference_id: preference.id })
      .eq('id', orderId);

    if (updateError) {
      console.error(
        `[${requestId}] Error actualizando preference_id:`,
        updateError
      );
    }

    const duration = Date.now() - startTime;
    console.info(`[${requestId}] Preferencia creada exitosamente`, {
      orderId,
      preferenceId: preference.id,
      itemsCount: mpItems.length,
      duration,
    });

    return NextResponse.json({
      orderId,
      preferenceId: preference.id,
      initPoint:
        process.env.NODE_ENV === 'production'
          ? preference.init_point
          : preference.sandbox_init_point,
      items: mpItems,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error en preference API:`, error);

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
