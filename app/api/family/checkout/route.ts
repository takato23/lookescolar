import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { featureFlags } from '@/lib/feature-flags';
import { SecurityLogger, generateRequestId } from '@/lib/middleware/auth.middleware';

// Schema de validación
const CheckoutSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  contactInfo: z.object({
    name: z.string().min(2, 'Nombre requerido'),
    email: z.string().email('Email inválido'),
    phone: z.string().min(8, 'Teléfono requerido'),
    street: z.string().min(5, 'Dirección requerida'),
    city: z.string().min(2, 'Ciudad requerida'),
    state: z.string().min(2, 'Provincia requerida'),
    zipCode: z.string().min(4, 'Código postal requerido'),
  }),
  items: z
    .array(
      z.object({
        photoId: z.string().min(1, 'ID de foto requerido'),
        quantity: z.number().min(1, 'Cantidad mínima 1'),
        price: z.number().min(0, 'Precio inválido'),
      })
    )
    .min(1, 'Al menos un item requerido'),
});

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Gate this checkout when unified store is the only allowed checkout
    if ((featureFlags as any).UNIFIED_STORE_CHECKOUT_ONLY === true || process.env.FF_UNIFIED_STORE_CHECKOUT_ONLY === 'true') {
      SecurityLogger.logSecurityEvent(
        'family_purchase_disabled',
        { requestId },
        'warning'
      );
      return NextResponse.json(
        {
          error: 'Checkout deshabilitado',
          message:
            'Este flujo fue deshabilitado. Usá /store-unified/[token] para realizar compras.',
        },
        { status: 410 }
      );
    }

    const body = await request.json();

    // Validar request
    const validatedData = CheckoutSchema.parse(body);
    const { token, contactInfo, items } = validatedData;

    const requestedTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    SecurityLogger.logSecurityEvent(
      'family_purchase_request',
      {
        requestId,
        token,
        itemsCount: items.length,
        requestedTotal,
        contactEmail: contactInfo.email,
      },
      'info'
    );

    const supabase = await createServerSupabaseServiceClient();

    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select(
        `
        id,
        name,
        share_token,
        is_published,
        event_id
      `
      )
      .eq('share_token', token)
      .eq('is_published', true)
      .single();

    if (folderError || !folder) {
      SecurityLogger.logSecurityEvent(
        'family_purchase_token_invalid',
        {
          requestId,
          token,
          error: folderError?.message,
        },
        'warning'
      );
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      );
    }

    // Obtener información del evento si existe
    let eventInfo = null;
    if (folder.event_id) {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name')
        .eq('id', folder.event_id)
        .single();

      if (!eventError && event) {
        eventInfo = event;
      }
    }

    // En desarrollo, no necesitamos subjects
    console.log('👤 [CHECKOUT] Modo desarrollo - sin subjects');

    // 2. Validar que las fotos existen y pertenecen a la carpeta
    const photoIds = items.map((item) => item.photoId);
    const { data: photos, error: photosError } = await supabase
      .from('assets')
      .select('id, filename, folder_id')
      .in('id', photoIds)
      .eq('folder_id', folder.id)
      .eq('status', 'ready');

    if (photosError || !photos || photos.length !== items.length) {
      console.error('❌ [CHECKOUT] Fotos no encontradas o inválidas');
      return NextResponse.json(
        { error: 'Una o más fotos no están disponibles' },
        { status: 400 }
      );
    }

    console.log('✅ [CHECKOUT] Fotos validadas:', photos.length);

    // 3. Calcular total
    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // 4. Crear orden en la base de datos
    console.log('📝 [CHECKOUT] Creando orden con datos:', {
      folder_id: folder.id,
      customer_name: contactInfo.name,
      total_amount: total,
      items_count: items.length,
    });

    // ADAPTAR A LA ESTRUCTURA REAL DE LA TABLA ORDERS
    const orderData = {
      folder_id: folder.id,
      event_id: folder.event_id, // Columna requerida
      subject_id: null, // En desarrollo, no requerido
      order_number: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      status: 'pending',
      total_amount: total,
      contact_name: contactInfo.name, // Columna existente
      contact_email: contactInfo.email, // Columna existente
      contact_phone: contactInfo.phone, // Columna existente
      payment_method: 'mercadopago',
      metadata: {
        token,
        event_name: eventInfo?.name || 'Sin nombre',
        address: `${contactInfo.street}, ${contactInfo.city}, ${contactInfo.state} ${contactInfo.zipCode}`,
        items: items.map((item) => ({
          photo_id: item.photoId,
          quantity: item.quantity,
          price: item.price,
        })),
        original_request: {
          name: contactInfo.name,
          email: contactInfo.email,
          phone: contactInfo.phone,
          street: contactInfo.street,
          city: contactInfo.city,
          state: contactInfo.state,
          zipCode: contactInfo.zipCode,
        },
      },
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      SecurityLogger.logSecurityEvent(
        'family_purchase_error',
        {
          requestId,
          token,
          folderId: folder.id,
          itemsCount: items.length,
          total,
          error: orderError.message,
        },
        'error'
      );
      return NextResponse.json(
        { error: 'Error creando la orden' },
        { status: 500 }
      );
    }

    SecurityLogger.logSecurityEvent(
      'family_purchase_created',
      {
        requestId,
        token,
        folderId: folder.id,
        eventId: folder.event_id,
        orderId: order.id,
        itemsCount: items.length,
        total,
        duration: Date.now() - startTime,
      },
      'info'
    );

    // 5. Incrementar contador de vistas
    await supabase
      .from('folders')
      .update({
        view_count: folder.view_count + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', folder.id);

    // 6. Aquí iría la integración con MercadoPago
    // Por ahora, simulamos la respuesta exitosa

    // Crear URLs de retorno sin parámetros para validación de MercadoPago
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const backUrls = {
      success: `${baseUrl}/store/${token}/success`,
      failure: `${baseUrl}/store/${token}/failure`,
      pending: `${baseUrl}/store/${token}/pending`,
    };

    const mercadopagoData = {
      external_reference: order.id,
      items: items.map((item) => ({
        id: item.photoId,
        title: `Foto - ${photos.find((p) => p.id === item.photoId)?.filename || 'Sin nombre'}`,
        quantity: item.quantity,
        unit_price: item.price / 100, // Convertir de centavos a pesos
        currency_id: 'ARS',
        category_id: 'art',
        description: `Impresión física de foto del evento ${folder.event?.name || 'Sin nombre'}`,
      })),
      payer: {
        name: contactInfo.name,
        email: contactInfo.email,
        phone: {
          number: contactInfo.phone,
        },
        address: {
          street_name: contactInfo.street,
          city: contactInfo.city,
          state: contactInfo.state,
          zip_code: contactInfo.zipCode,
        },
      },
      back_urls: backUrls,
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      statement_descriptor: 'LOOKESCOLAR',
      // Campos adicionales para sandbox
      expires: true,
      expiration_date_to: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(), // 24 horas
      binary_mode: true, // Solo éxito o fallo
    };

    console.log('💰 [CHECKOUT] Datos MercadoPago preparados');
    console.log(
      '📋 [CHECKOUT] Datos completos a enviar:',
      JSON.stringify(mercadopagoData, null, 2)
    );

    // Crear preferencia real en MercadoPago
    console.log('💰 [CHECKOUT] Creando preferencia en MercadoPago...');

    try {
      const response = await fetch(
        'https://api.mercadopago.com/checkout/preferences',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mercadopagoData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [CHECKOUT] Error MercadoPago:', errorData);
        throw new Error(
          `MercadoPago error: ${errorData.message || 'Unknown error'}`
        );
      }

      const preference = await response.json();
      console.log('✅ [CHECKOUT] Preferencia creada:', preference.id);

      // Actualizar orden con preference_id
      await supabase
        .from('orders')
        .update({ mp_preference_id: preference.id })
        .eq('id', order.id);

      // Usar URL real de MercadoPago
      const redirectUrl =
        process.env.NODE_ENV === 'production'
          ? preference.init_point
          : preference.sandbox_init_point;

      return NextResponse.json({
        success: true,
        order_id: order.id,
        redirectUrl: redirectUrl,
        message: 'Orden creada exitosamente. Redirigiendo a MercadoPago...',
      });
    } catch (mpError) {
      SecurityLogger.logSecurityEvent(
        'family_purchase_mp_error',
        {
          requestId,
          orderId: order.id,
          error:
            mpError instanceof Error ? mpError.message : String(mpError),
        },
        'warning'
      );

      // Fallback: simular URL (para desarrollo)
      const fallbackUrl = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=dev_${order.id}`;

      return NextResponse.json({
        success: true,
        order_id: order.id,
        redirectUrl: fallbackUrl,
        message:
          'Orden creada. Error en MercadoPago, usando URL de desarrollo.',
        warning: 'MercadoPago no disponible, usando modo desarrollo',
      });
    }
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'family_purchase_error',
      {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      },
      'error'
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
