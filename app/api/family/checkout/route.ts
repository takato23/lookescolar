import { NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { tokenService } from '@/lib/services/token.service';
import { fetchStoreConfig } from '@/lib/services/store-config.service';
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

    const { token, cart, customer, paymentMethod } = validation.data;

    // 1. Validate Token & Context
    const { isValid, subject, tokenInfo } = await tokenService.validateToken(token);

    if (!isValid || !subject) {
      return NextResponse.json(
        { error: 'Sesión expirada o inválida' },
        { status: 401 }
      );
    }

    const eventId = subject.event_id;
    if (!eventId) {
      return NextResponse.json(
        { error: 'Evento no asociado' },
        { status: 400 }
      );
    }

    // 2. Fetch Store Settings & Validate Prices
    const storeConfig = await fetchStoreConfig(eventId);
    let calculatedTotal = 0;
    const validCartItems: z.infer<typeof CheckoutSchema>['cart'] = [];

    for (const item of cart) {
      // Find product in settings (handling both array and object structure if necessary, 
      // but storeConfig.products is typed as array in service)
      const product = storeConfig.products.find(p => p.id === item.packageId);

      if (!product || !product.enabled) {
        console.warn(`Product ${item.packageId} not found or disabled`);
        // We might continue or error out. For now, error out to prevent invalid orders.
        return NextResponse.json(
          { error: `El producto ${item.packageName} ya no está disponible` },
          { status: 400 }
        );
      }

      // Verify price (allow some leeway? No, strict check)
      // Note: item.price is in cents, product.price is in cents
      if (item.price !== product.price) {
        console.warn(`Price mismatch for ${item.packageId}: ${item.price} vs ${product.price}`);
        // In a real app, we might update the cart or fail. 
        // For now, we trust the server price.
        item.price = product.price;
      }

      calculatedTotal += item.price * item.quantity;
      validCartItems.push(item);
    }

    // 3. Create Order
    const supabase = await createServerSupabaseServiceClient();
    const orderId = crypto.randomUUID();
    const orderNumber = `ORD-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;

    // Prepare metadata
    const metadata = {
      cart: validCartItems,
      customer,
      delivery_preference: customer.deliveryPreference,
      notes: customer.notes,
      source: 'family_checkout',
      token_used: token
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        event_id: eventId,
        subject_id: subject.id,
        order_number: orderNumber,
        status: 'pending',
        total_amount: calculatedTotal, // Assuming DB column is total_amount (cents)
        contact_name: customer.guardianName,
        contact_email: customer.guardianEmail,
        contact_phone: customer.guardianPhone,
        payment_method: paymentMethod,
        metadata
      } as any)
      .select()
      .single();

    if (orderError || !order) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Error al crear la orden' },
        { status: 500 }
      );
    }

    // 4. Create Order Items
    // We need to flatten the cart into order items.
    // Strategy: Create one order_item per selected photo.
    // If a package has no photos selected (e.g. digital download of all?), we might need a placeholder.
    // But for now, we assume packages have selected photos.

    const orderItemsToInsert: any[] = [];

    for (const item of validCartItems) {
      const allSelectedPhotos = [
        ...(item.selectedPhotos?.individual || []),
        ...(item.selectedPhotos?.group || [])
      ];

      if (allSelectedPhotos.length > 0) {
        // Distribute price among photos or assign to first?
        // Assigning to first is easier for now, effectively treating the first photo as the "package carrier"
        // But for quantity > 1, we need to repeat.

        for (let q = 0; q < item.quantity; q++) {
          // For each unit of the package
          allSelectedPhotos.forEach((photoId, index) => {
            orderItemsToInsert.push({
              order_id: orderId,
              photo_id: photoId,
              quantity: 1,
              unit_price: index === 0 ? item.price : 0, // Assign price to first photo of the package unit
              subtotal: index === 0 ? item.price : 0,
              metadata: {
                packageId: item.packageId,
                packageName: item.packageName,
                cartItemId: item.id,
                isPackageItem: true
              }
            });
          });
        }
      } else {
        // No photos selected? Maybe a "print all" package?
        // If we can't link to a photo, we might skip order_items or insert with null photo_id if allowed.
        // Checking schema... PublicCheckoutService implies photo_id is required.
        // If no photos, we rely on order metadata.
        console.warn(`Cart item ${item.id} has no selected photos.`);
      }
    }

    if (orderItemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert as any);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        // Rollback order?
        await supabase.from('orders').delete().eq('id', orderId);
        return NextResponse.json(
          { error: 'Error al procesar los items del pedido' },
          { status: 500 }
        );
      }
    }

    // 5. Handle Payment
    let redirectUrl = `/order-confirmation?id=${orderId}`; // Default success page
    let preferenceId: string | null = null;

    if (paymentMethod === 'mercadopago' || paymentMethod.includes('mercado')) {
      try {
        const preference = {
          items: validCartItems.map(item => ({
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
            success: `${MP_CONFIG.successUrl}/order-confirmation?id=${orderId}&status=success`,
            failure: `${MP_CONFIG.failureUrl}/order-confirmation?id=${orderId}&status=failure`,
            pending: `${MP_CONFIG.pendingUrl}/order-confirmation?id=${orderId}&status=pending`,
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

          // Update order with preference
          await (supabase
            .from('orders') as any)
            .update({
              mp_preference_id: preferenceId,
              mp_external_reference: orderId
            })
            .eq('id', orderId);
        }
      } catch (mpError) {
        console.error('MercadoPago Error:', mpError);
        // Don't fail the order creation, but return error or fallback
        // Maybe return success but with a warning/flag to retry payment
        // For now, we'll return the order but no redirect URL for MP
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
      preferenceId
    });

  } catch (error) {
    console.error('Checkout API Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
