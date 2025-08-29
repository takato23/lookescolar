import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { preferenceClient } from '@/lib/mercadopago/client';
import { nanoid } from 'nanoid';
import {
  createErrorResponse,
  createSuccessResponse,
  logDevRequest,
} from '@/lib/utils/api-response';

// Schema para validar el request de checkout público
const PublicCheckoutSchema = z.object({
  eventId: z.string().uuid(),
  photoIds: z.array(z.string().uuid()).min(1).max(50), // Máximo 50 fotos por orden
  contactInfo: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  package: z.string().optional().default('Selección personalizada'),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Validar el body de la request
    const body = await request.json();
    const validatedData = PublicCheckoutSchema.parse(body);

    const supabase = await createServerSupabaseServiceClient();

    // 1. Validar evento
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, status, price_per_photo')
      .eq('id', validatedData.eventId)
      .eq('status', 'active')
      .single();

    if (eventError || !event) {
      logDevRequest(
        requestId,
        'POST',
        '/api/gallery/checkout',
        Date.now() - startTime,
        404
      );
      return createErrorResponse(
        'Evento no encontrado o inactivo',
        'El evento especificado no existe o no está disponible',
        404,
        requestId
      );
    }

    // 2. Validar fotos (deben estar aprobadas y pertenecer al evento)
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id, original_filename, approved')
      .eq('event_id', validatedData.eventId)
      .eq('approved', true)
      .in('id', validatedData.photoIds);

    if (
      photosError ||
      !photos ||
      photos.length !== validatedData.photoIds.length
    ) {
      logDevRequest(
        requestId,
        'POST',
        '/api/gallery/checkout',
        Date.now() - startTime,
        400
      );
      return createErrorResponse(
        'Fotos no válidas',
        'Algunas fotos no están disponibles o no están aprobadas',
        400,
        requestId
      );
    }

    // 3. Resolver subject público (crear o encontrar existente por email)
    let subjectId: string;

    const { data: existingSubject } = await supabase
      .from('subjects')
      .select('id')
      .eq('event_id', validatedData.eventId)
      .eq('email', validatedData.contactInfo.email)
      .eq('name', validatedData.contactInfo.name)
      .single();

    if (existingSubject) {
      subjectId = existingSubject.id;
    } else {
      // Crear nuevo subject público temporal
      const accessToken = `pub_${nanoid(20)}`;
      const { data: newSubject, error: subjectError } = await supabase
        .from('subjects')
        .insert({
          event_id: validatedData.eventId,
          name: validatedData.contactInfo.name,
          email: validatedData.contactInfo.email,
          phone: validatedData.contactInfo.phone || null,
          access_token: accessToken,
          token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
          metadata: { type: 'public', created_for: 'checkout' },
        } as any)
        .select('id')
        .single();

      if (subjectError || !newSubject) {
        logDevRequest(
          requestId,
          'POST',
          '/api/gallery/checkout',
          Date.now() - startTime,
          500
        );
        return createErrorResponse(
          'Error creando subject público',
          subjectError?.message || 'No se pudo crear el subject',
          500,
          requestId
        );
      }
      subjectId = newSubject.id;
    }

    // 4. Calcular precios usando price_list del evento o fallback
    const pricePerPhoto = (event as any).price_per_photo || 1000; // 1000 centavos = $10 ARS
    // total en centavos
    const totalAmount = pricePerPhoto * photos.length;

    // 5. Crear orden
    const orderId = crypto.randomUUID();
    const orderNumber = `PUB-${Date.now()}-${nanoid(6)}`;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        event_id: validatedData.eventId,
        subject_id: subjectId,
        order_number: orderNumber,
        status: 'pending',
        total_cents: totalAmount,
        total_amount_cents: totalAmount,
        total_items: photos.length,
        contact_name: validatedData.contactInfo.name,
        contact_email: validatedData.contactInfo.email,
        contact_phone: validatedData.contactInfo.phone || null,
        payment_method: 'mercadopago',
        metadata: {
          type: 'public_checkout',
          package: validatedData.package,
          photo_count: photos.length,
        },
      } as any)
      .select()
      .single();

    if (orderError || !order) {
      logDevRequest(
        requestId,
        'POST',
        '/api/gallery/checkout',
        Date.now() - startTime,
        500
      );
      return createErrorResponse(
        'Error creando la orden',
        orderError?.message || 'No se pudo crear la orden',
        500,
        requestId
      );
    }

    // 6. Crear items de la orden
    const unitPriceCents = pricePerPhoto;
    const unitPrice = unitPriceCents / 100;
    const orderItems = validatedData.photoIds.map((photoId) => ({
      order_id: orderId,
      photo_id: photoId,
      quantity: 1,
      unit_price: unitPrice,
      subtotal: unitPrice,
      unit_price_cents: unitPriceCents,
      subtotal_cents: unitPriceCents,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems as any);

    if (itemsError) {
      // Rollback: eliminar la orden si fallan los items
      await supabase.from('orders').delete().eq('id', orderId);
      logDevRequest(
        requestId,
        'POST',
        '/api/gallery/checkout',
        Date.now() - startTime,
        500
      );
      return createErrorResponse(
        'Error creando los items de la orden',
        itemsError.message,
        500,
        requestId
      );
    }

    // 7. Crear preferencia de MercadoPago (URLs basadas en APP_URL)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const preferenceBody: any = {
      items: [
        {
          id: order.id,
          title: `${validatedData.package} (${photos.length} fotos)`,
          quantity: 1,
          unit_price: totalAmount / 100, // pesos
          currency_id: 'ARS',
        },
      ],
      payer: {
        name: validatedData.contactInfo.name,
        email: validatedData.contactInfo.email,
        ...(validatedData.contactInfo.phone && {
          phone: { area_code: '', number: validatedData.contactInfo.phone },
        }),
      },
      back_urls: {
        success: `${appUrl}/public/payment-success?order=${order.id}`,
        failure: `${appUrl}/public/payment-failure?order=${order.id}`,
        pending: `${appUrl}/public/payment-pending?order=${order.id}`,
      },
      external_reference: order.id,
      notification_url: `${appUrl}/api/payments/webhook`,
      statement_descriptor: 'LookEscolar Fotos',
    };

    let mpResponse: any;
    try {
      mpResponse = await preferenceClient.create({ body: preferenceBody });
    } catch (mpErr: any) {
      console.error('MercadoPago preference error:', mpErr?.message || mpErr);
      // Rollback order and items to avoid orphans
      try {
        await supabase.from('order_items').delete().eq('order_id', orderId);
        await supabase.from('orders').delete().eq('id', orderId);
      } catch (rollbackErr) {
        console.error('Rollback after MP failure failed:', rollbackErr);
      }
      return createErrorResponse(
        'Error creando preferencia de MercadoPago',
        mpErr?.message || 'MP error',
        500,
        requestId
      );
    }

    if (!mpResponse.id) {
      logDevRequest(
        requestId,
        'POST',
        '/api/gallery/checkout',
        Date.now() - startTime,
        500
      );
      return createErrorResponse(
        'Error creando preferencia de MercadoPago',
        'No se pudo crear la preferencia de pago',
        500,
        requestId
      );
    }

    // 8. Actualizar la orden con el preference_id
    await supabase
      .from('orders')
      .update({
        mp_preference_id: mpResponse.id,
        mp_external_reference: order.id,
      } as any)
      .eq('id', order.id);

    const duration = Date.now() - startTime;
    logDevRequest(requestId, 'POST', '/api/gallery/checkout', duration, 200);

    return createSuccessResponse(
      {
        orderId: order.id,
        preferenceId: mpResponse.id,
        redirectUrl:
          mpResponse.sandbox_init_point || mpResponse.init_point || '',
        totalAmount: totalAmount / 100, // En pesos para el frontend
        photoCount: photos.length,
        package: validatedData.package,
      },
      undefined,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    logDevRequest(
      requestId,
      'POST',
      '/api/gallery/checkout',
      duration,
      'error'
    );

    if (error instanceof z.ZodError) {
      return createErrorResponse(
        'Datos de entrada inválidos',
        error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        400,
        requestId
      );
    }

    console.error('Public checkout error:', error);
    return createErrorResponse(
      'Error interno del servidor',
      error instanceof Error ? error.message : 'Error desconocido',
      500,
      requestId
    );
  }
}
