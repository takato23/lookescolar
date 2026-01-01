import { NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { preferenceClient, MP_CONFIG } from '@/lib/mercadopago/client';

const CheckoutSchema = z.object({
  token: z.string(),
  cart: z.array(z.object({
    id: z.string(),
    packageId: z.string(),
    packageName: z.string(),
    price: z.number(),
    quantity: z.number(),
    contents: z.any(),
    selectedPhotos: z.object({
      individual: z.array(z.string()),
      group: z.array(z.string()),
    }).optional(),
  })),
  customer: z.object({
    guardianName: z.string(),
    guardianEmail: z.string().email(),
    guardianPhone: z.string(),
    studentName: z.string(),
    studentGrade: z.string().optional(),
    deliveryPreference: z.string().optional(),
    notes: z.string().optional(),
  }),
  paymentMethod: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = CheckoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.format() },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();
    const { token, cart, customer, paymentMethod } = validation.data;

    if (!cart || cart.length === 0) {
      return NextResponse.json({ error: 'Carrito vacío' }, { status: 400 });
    }

    // 1) Resolve token context (folder/share/subject tokens)
    let eventId: string | null = null;
    let folderId: string | null = null;
    let shareTokenId: string | null = null;
    let subjectId: string | null = null;

    const now = new Date();
    const isHex64 = /^[a-f0-9]{64}$/i.test(token);

    if (isHex64) {
      const { data: shareToken } = await supabase
        .from('share_tokens')
        .select('id, event_id, folder_id, subject_id, expires_at, is_active')
        .eq('token', token)
        .maybeSingle();

      if (
        shareToken &&
        shareToken.is_active !== false &&
        (!shareToken.expires_at || new Date(shareToken.expires_at) >= now)
      ) {
        shareTokenId = shareToken.id;
        eventId = shareToken.event_id;
        folderId = shareToken.folder_id ?? null;
        subjectId = shareToken.subject_id ?? null;
      }
    }

    if (!eventId && token && token.length >= 8) {
      const { data: folder } = await supabase
        .from('folders')
        .select('id, event_id, share_token, is_published')
        .eq('share_token', token)
        .eq('is_published', true)
        .maybeSingle();

      if (folder) {
        folderId = folder.id;
        eventId = folder.event_id;

        const { data: st } = await supabase
          .from('share_tokens')
          .select('id')
          .eq('folder_id', folder.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (st) {
          shareTokenId = st.id;
        }
      }
    }

    if (!eventId) {
      const { data: subject } = await supabase
        .from('subjects')
        .select('id, event_id, token_expires_at')
        .eq('access_token', token)
        .maybeSingle();

      if (subject && new Date(subject.token_expires_at) >= now) {
        subjectId = subject.id;
        eventId = subject.event_id;
      }
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'Sesión expirada o inválida' },
        { status: 401 }
      );
    }

    // 2) Calculate totals (prices are in cents)
    const calculatedTotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    if (!Number.isFinite(calculatedTotal) || calculatedTotal <= 0) {
      return NextResponse.json(
        { error: 'Total inválido' },
        { status: 400 }
      );
    }

    // Aggregate selected photos across cart items (asset ids)
    const selectedIndividual = new Set<string>();
    const selectedGroup = new Set<string>();
    for (const item of cart) {
      const selected = item.selectedPhotos;
      if (selected?.individual) {
        selected.individual.forEach((id) => selectedIndividual.add(id));
      }
      if (selected?.group) {
        selected.group.forEach((id) => selectedGroup.add(id));
      }
    }

    const primaryItem = cart[0];

    // 3) Create unified order (store-unified compatible)
    const orderId = crypto.randomUUID();
    const orderNumber = `ORD-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;

    const normalizedPaymentMethod = (paymentMethod ?? '').toLowerCase();
    const isMercadoPago =
      normalizedPaymentMethod === 'mercadopago' ||
      normalizedPaymentMethod.includes('mercado') ||
      normalizedPaymentMethod.includes('mp');

    // Prepare metadata / contact info
    const metadata = {
      cart,
      customer,
      delivery_preference: customer.deliveryPreference,
      notes: customer.notes,
      source: 'family_checkout',
      token_used: token,
      subject_id: subjectId,
      folder_id: folderId,
      share_token_id: shareTokenId,
      order_number: orderNumber,
    };

    const selectedPhotos = {
      individual: Array.from(selectedIndividual),
      group: Array.from(selectedGroup),
    };

    const { error: unifiedOrderError } = await supabase
      .from('unified_orders')
      .insert({
        id: orderId,
        event_id: eventId,
        share_token_id: shareTokenId,
        token,
        // `unified_orders.status` is constrained in DB. Keep a compatible status.
        status: 'pending_payment',
        payment_method: paymentMethod,
        currency: 'ARS',
        base_package: {
          id: primaryItem.packageId,
          name: primaryItem.packageName,
          price: primaryItem.price,
          quantity: primaryItem.quantity,
          cart,
        },
        base_price: calculatedTotal,
        additional_copies: [],
        additions_price: 0,
        shipping_cost: 0,
        total_price: calculatedTotal,
        contact_info: {
          name: customer.guardianName,
          email: customer.guardianEmail,
          phone: customer.guardianPhone,
          address: {
            street: '',
            city: '',
            state: '',
          },
          studentName: customer.studentName,
          studentGrade: customer.studentGrade,
          deliveryPreference: customer.deliveryPreference,
          notes: customer.notes,
        },
        selected_photos: selectedPhotos,
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

    if (unifiedOrderError) {
      console.error('Error creating unified order:', unifiedOrderError);
      return NextResponse.json(
        { error: 'Error al crear la orden' },
        { status: 500 }
      );
    }

    // 4) Handle payment
    let redirectUrl: string | null = null;
    let preferenceId: string | null = null;

    if (isMercadoPago) {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.NEXT_PUBLIC_SITE_URL ||
          'http://localhost:3000';

        const preference = {
          items: cart.map((item) => ({
            id: item.packageId,
            title: item.packageName,
            description: `Paquete para ${customer.studentName}`,
            quantity: item.quantity,
            unit_price: item.price / 100, // Convert cents to currency unit
            currency_id: 'ARS',
          })),
          payer: {
            name: customer.guardianName,
            email: customer.guardianEmail,
            phone: {
              area_code: '',
              number: customer.guardianPhone
            }
          },
          back_urls: {
            success: `${baseUrl}/store-unified/${token}`,
            failure: `${baseUrl}/store-unified/${token}`,
            pending: `${baseUrl}/store-unified/${token}`,
          },
          auto_return: 'approved' as const,
          external_reference: orderId,
          notification_url: MP_CONFIG.notificationUrl,
          statement_descriptor: 'LookEscolar',
          expires: true,
          expiration_date_from: new Date().toISOString(),
          expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };

        const mpResponse = await preferenceClient.create({ body: preference });

        if (mpResponse.id) {
          preferenceId = mpResponse.id;
          redirectUrl = (MP_CONFIG.sandbox ? mpResponse.sandbox_init_point : mpResponse.init_point) as string;

          // Persist preference on unified order
          await supabase
            .from('unified_orders')
            .update({
              mercadopago_preference_id: preferenceId,
              mercadopago_status: 'pending',
              updated_at: new Date().toISOString(),
            } as any)
            .eq('id', orderId);
        }
      } catch (mpError) {
        console.error('MercadoPago Error:', mpError);
        // No frenamos la creación del pedido. En dev, devolvemos un callback simulado.
        if (process.env.NODE_ENV !== 'production') {
          preferenceId = `dev_${orderId}`;
          redirectUrl = `/store-unified/${token}?external_reference=${orderId}&status=approved&preference_id=${preferenceId}`;
          await supabase
            .from('unified_orders')
            .update({
              mercadopago_preference_id: preferenceId,
              mercadopago_status: 'dev',
              updated_at: new Date().toISOString(),
            } as any)
            .eq('id', orderId);
        }
      }
    } else if (paymentMethod === 'whatsapp') {
      // Generate WhatsApp link
      const message = `Hola! Acabo de realizar el pedido #${orderNumber} para ${customer.studentName}. Me gustaría coordinar el pago y la entrega.`;
      const waLink = `https://wa.me/5491112345678?text=${encodeURIComponent(message)}`; // Replace with real number from settings
      redirectUrl = waLink;
    }

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber,
      redirectUrl,
      preferenceId,
    });

  } catch (error) {
    console.error('Checkout API Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
