import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import {
  createPaymentPreference,
  CreatePreferenceParams,
} from '@/lib/mercadopago/mercadopago.service';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';

// Rate limiting: 5 req/min por IP para checkout público
const hasRedisEnv = Boolean(process.env['UPSTASH_REDIS_REST_URL']);
const ratelimit = hasRedisEnv
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
    })
  : null;

// Schema de validación para checkout público
const PublicCheckoutSchema = z.object({
  eventId: z.string().uuid('Event ID inválido'),
  contactInfo: z.object({
    name: z.string().min(2, 'Nombre requerido'),
    email: z.string().email('Email inválido'),
    phone: z
      .string()
      .min(8, 'Teléfono requerido para galería pública')
      .optional(),
  }),
  items: z
    .array(
      z.object({
        photoId: z.string().uuid('ID de foto inválido'),
        quantity: z.number().min(1).max(10),
        priceType: z.string().default('base'),
      })
    )
    .min(1, 'Carrito vacío')
    .max(50, 'Máximo 50 fotos por orden'),
});

// type PublicCheckoutRequest = z.infer<typeof PublicCheckoutSchema>;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Rate limiting
    const ip =
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for') ||
      'unknown';
    if (ratelimit) {
      const { success, limit, reset, remaining } = await ratelimit.limit(ip);

      if (!success) {
        console.warn(`[${requestId}] Public checkout rate limit exceeded`, {
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
    }

    // Parsear y validar request
    const body = await request.json();
    const validation = PublicCheckoutSchema.safeParse(body);

    if (!validation.success) {
      console.warn(`[${requestId}] Public checkout validation failed`, {
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

    const { eventId, contactInfo, items: requestedItems } = validation.data;
    const supabase = await createServiceClient();

    console.info(`[${requestId}] Public checkout started`, {
      eventId,
      email: contactInfo.email.replace(/(.{2}).*@/, '$1***@'),
      itemsCount: requestedItems.length,
      totalQuantity: requestedItems.reduce((sum, item) => sum + item.quantity, 0),
    });

    // 1. Verificar evento válido (tolerante a esquemas antiguos)
    let event: any = null;
    {
      const res = await supabase
        .from('events')
        .select('id, name, school_name, status, public_gallery_enabled')
        .eq('id', eventId)
        .maybeSingle();
      if (!res.error && res.data) {
        event = res.data;
      } else {
        const res2 = await supabase
          .from('events')
          .select('id, name, status, school')
          .eq('id', eventId)
          .maybeSingle();
        if (!res2.error && res2.data) {
          event = {
            ...(res2.data as any),
            school_name: (res2.data as any).school,
            public_gallery_enabled: true, // compat: si no existe la columna, permitir
          };
        }
      }
    }

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status && event.status !== 'active') {
      return NextResponse.json(
        { error: 'Event is not active for purchases' },
        { status: 403 }
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(event, 'public_gallery_enabled') &&
      event.public_gallery_enabled === false
    ) {
      return NextResponse.json(
        { error: 'Public gallery is not enabled for this event' },
        { status: 403 }
      );
    }

    // 2. Verificar que no hay más de 1 pedido pendiente por email en este evento (anti-spam)
    const { data: pendingOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('contact_email', contactInfo.email)
      .eq('status', 'pending')
      .limit(2); // Limitar consulta

    if (pendingOrders && pendingOrders.length > 0) {
      return NextResponse.json(
        {
          error:
            'You already have a pending order with this email. Please complete or wait for the previous payment to process.',
        },
        { status: 409 }
      );
    }

    // 3. Validar que todas las fotos pertenecen al evento y están aprobadas
    const photoIds = requestedItems.map((item) => item.photoId);
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id, storage_path, event_id, approved')
      .in('id', photoIds)
      .eq('event_id', eventId);

    if (photosError) {
      console.error(`[${requestId}] Error fetching photos for checkout:`, photosError);
      return NextResponse.json(
        { error: 'Error validating photos' },
        { status: 500 }
      );
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: 'No valid items for this event' },
        { status: 400 }
      );
    }

    const validPhotoIds = (photos as any[]).map((p) => p.id);
    const items = requestedItems.filter((it) => validPhotoIds.includes(it.photoId));
    if (items.length === 0) {
      return NextResponse.json(
        { error: 'Cart items do not belong to this event' },
        { status: 400 }
      );
    }

    const notApproved = (photos as any[]).filter((p) => (p as any).approved === false);
    if (notApproved.length > 0) {
      return NextResponse.json(
        { error: 'Some photos are not approved yet' },
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
      .eq('event_id', eventId)
      .single();

    // Crear mapa de precios por tipo
    const priceMap = new Map<string, { id: string | number | null; label: string; price_cents: number }>();
    if (priceList?.price_list_items?.length) {
      priceList.price_list_items.forEach((item: any) => {
        priceMap.set(item.type || 'base', {
          id: item.id,
          label: item.label,
          price_cents: Number(item.price_cents) || 0,
        });
      });
    }

    // Fallback a events.price_per_photo si existe
    let eventBasePriceCents: number | null = null;
    try {
      const { data: eventPrice } = await supabase
        .from('events')
        .select('price_per_photo')
        .eq('id', eventId)
        .maybeSingle();
      if (eventPrice && typeof (eventPrice as any).price_per_photo === 'number') {
        eventBasePriceCents = Number((eventPrice as any).price_per_photo) || null;
      }
    } catch {
      // ignorar, puede no existir la columna
    }

    // Fallback a env NEXT_PUBLIC_BASE_PRICE (pesos)
    const envBasePesos = Number(process.env['NEXT_PUBLIC_BASE_PRICE'] || NaN);
    const envBaseCents = Number.isFinite(envBasePesos)
      ? Math.round(envBasePesos * 100)
      : null;

    // 5. Validar tipos de precio y calcular total
    let totalCents = 0;
    const validatedItems: Array<{
      photoId: string;
      quantity: number;
      unitPriceCents: number;
      subtotalCents: number;
      label: string;
      priceListItemId: string | number | null;
    }> = [];

    for (const item of items) {
      const priceInfo = priceMap.get(item.priceType || 'base');
      const unitFromList = priceInfo?.price_cents ?? null;
      const unitPriceCents =
        (typeof unitFromList === 'number' && unitFromList > 0)
          ? unitFromList
          : (eventBasePriceCents && eventBasePriceCents > 0)
            ? eventBasePriceCents
            : (envBaseCents && envBaseCents > 0)
              ? envBaseCents
              : 1000; // último fallback: $10.00

      const subtotalCents = unitPriceCents * item.quantity;
      totalCents += subtotalCents;

      validatedItems.push({
        photoId: item.photoId,
        quantity: item.quantity,
        unitPriceCents,
        subtotalCents,
        label: priceInfo?.label || 'Foto',
        priceListItemId: priceInfo?.id ?? null,
      });
    }

    // 6. Upsert de sujeto público por (event_id, email)
    let subjectId: string | null = null;
    {
      const { data: existing, error: existingErr } = await supabase
        .from('subjects')
        .select('id')
        .eq('event_id', eventId)
        .eq('email', contactInfo.email)
        .maybeSingle();

      if (existingErr) {
        console.error(`[${requestId}] Error buscando sujeto público:`, existingErr);
        return NextResponse.json(
          { error: 'Error interno buscando sujeto' },
          { status: 500 }
        );
      }

      if (existing?.id) {
        subjectId = existing.id as string;
      } else {
        // Intento A: columnas que existen (name, email, phone, access_token)
        const accessToken = `pub_${crypto.randomUUID().replace(/-/g, '')}${Math.random()
          .toString(36)
          .slice(2)}`.slice(0, 40);
        
        const insertPayloadA = {
          event_id: eventId,
          name: contactInfo.name ?? 'Comprador',
          email: contactInfo.email,
          phone: contactInfo.phone || null,
          access_token: accessToken,
          token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        } as Record<string, unknown>;

        const insertedA = await supabase
          .from('subjects')
          .insert(insertPayloadA as any)
          .select('id')
          .single();

        if (!insertedA.error && insertedA.data?.id) {
          subjectId = insertedA.data.id as string;
        } else {
          console.error(
            `[${requestId}] Error creando sujeto público:`,
            insertedA.error
          );
          return NextResponse.json(
            { error: 'No se pudo crear el sujeto' },
            { status: 500 }
          );
        }
      }
    }

    // 7. Crear orden en base de datos con subject_id obligatorio
    const orderId = crypto.randomUUID();
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const orderBase = {
      id: orderId,
      event_id: eventId,
      subject_id: subjectId!,
      status: 'pending',
      payment_method: 'mercadopago',
      total_amount: totalCents,
    } as Record<string, unknown>;

    const orderVariations: Array<Record<string, unknown>> = [
      { ...orderBase, order_number: orderNumber, contact_name: contactInfo.name, contact_email: contactInfo.email, contact_phone: contactInfo.phone || null },
      { ...orderBase, order_number: orderNumber },
      { ...orderBase },
    ];

    let orderCreated = false;
    let lastOrderError: unknown = null;
    for (const variation of orderVariations) {
      const { error: varErr } = await supabase.from('orders').insert(variation as any);
      if (!varErr) {
        orderCreated = true;
        break;
      }
      lastOrderError = varErr;
    }

    if (!orderCreated) {
      console.error(`[${requestId}] Error creating public order:`, lastOrderError);
      return NextResponse.json(
        { error: 'Failed to create order', details: (lastOrderError as any)?.message || (lastOrderError as any)?.hint || (lastOrderError as any)?.code || 'unknown' },
        { status: 500 }
      );
    }

    // 8. Crear items de la orden
    const orderItems = validatedItems.map((item) => ({
      order_id: orderId,
      photo_id: item.photoId,
      quantity: item.quantity,
      unit_price: item.unitPriceCents,
      subtotal: item.subtotalCents,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems as any);

    if (itemsError) {
      console.error(
        `[${requestId}] Error creating public order items:`,
        itemsError
      );

      // Rollback: eliminar orden creada
      await supabase.from('orders').delete().eq('id', orderId);

      return NextResponse.json(
        { error: 'Failed to create order items', details: (itemsError as any)?.message || (itemsError as any)?.hint || (itemsError as any)?.code || 'unknown' },
        { status: 500 }
      );
    }

    // 9. Asegurar total_amount actualizado (idempotente)
    const { error: updateTotalErr } = await supabase
      .from('orders')
      .update({ total_cents: totalCents } as any)
      .eq('id', orderId);
    if (updateTotalErr) {
      console.error(`[${requestId}] Error updating order total_amount:`, updateTotalErr);
    }

    // 10. Crear preferencia en Mercado Pago
    const mpItems = validatedItems.map((item) => {
      const photo = (photos || []).find((p) => p.id === item.photoId) as any;
      const displayName =
        (photo?.storage_path ? photo.storage_path.split('/').pop() : null) ||
        'Foto';
      return {
        title: `${item.label} - ${displayName} (${event.name})`,
        quantity: item.quantity,
        unit_price: Math.round(item.unitPriceCents / 100), // pesos
      };
    });

    const payer: { name: string; email: string; phone?: string } = {
      name: contactInfo.name,
      email: contactInfo.email,
    };
    if (contactInfo.phone) {
      payer.phone = contactInfo.phone;
    }

    const preferenceParams: CreatePreferenceParams = {
      orderId,
      items: mpItems,
      payer,
    };

    console.log('[DEBUG] Creando preferencia MP con:', preferenceParams);
    const preference = await createPaymentPreference(preferenceParams);

    // 11. Actualizar orden con preference_id (si existe la columna)
    const { error: updateError } = await supabase
      .from('orders')
      .update({ mp_preference_id: preference.id } as any)
      .eq('id', orderId);

    if (updateError) {
      console.error(
        `[${requestId}] Error updating preference_id for public order:`,
        updateError
      );
      // No es crítico, el webhook puede funcionar sin esto
    }

    const duration = Date.now() - startTime;

    console.info(`[${requestId}] Public checkout completed successfully`, {
      orderId,
      preferenceId: preference.id,
      eventId,
      totalCents,
      totalPesos: Math.round(totalCents / 100),
      itemsCount: validatedItems.length,
      email: contactInfo.email.replace(/(.{2}).*@/, '$1***@'),
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
        id: eventId,
        name: event.name,
        school: event.school_name,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Public checkout error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      duration,
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
