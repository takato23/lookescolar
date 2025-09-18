import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createOrderSchema = z.object({
  order: z.object({
    id: z.string(),
    token: z.string(),
    basePackage: z.object({
      id: z.string(),
      name: z.string(),
      basePrice: z.number(),
    }),
    selectedPhotos: z.object({
      individual: z.array(z.string()),
      group: z.array(z.string()),
    }),
    additionalCopies: z.array(z.object({
      id: z.string(),
      productId: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      totalPrice: z.number(),
    })),
    contactInfo: z.object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string(),
      address: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        country: z.string(),
      }),
    }),
    totalPrice: z.number(),
    paymentMethod: z.string().min(1),
    customerNotes: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📦 Create order request:', {
      token: body?.order?.token?.slice(0, 8),
      hasOrder: !!body?.order,
      orderKeys: body?.order ? Object.keys(body.order) : [],
      hasCustomerNotes: 'customerNotes' in (body?.order || {})
    });

    // Add customerNotes if missing (frontend sends it conditionally)
    if (body?.order && !('customerNotes' in body.order)) {
      body.order.customerNotes = '';
    }

    let order;
    try {
      const parsed = createOrderSchema.parse(body);
      order = parsed.order;
    } catch (zodError: any) {
      console.error('❌ Validation error:', zodError.errors);
      console.error('❌ Received data structure:', JSON.stringify(body, null, 2));
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: zodError.errors
        },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();
    
    // Get token details and resolve event_id
    let shareTokenId: string | null = null;
    let eventId: string | null = null;
    
    try {
      // Try share_tokens first (64-char hex tokens)
      const is64 = /^[a-f0-9]{64}$/i.test(order.token);
      if (is64) {
        const { data: tokenData } = await supabase
          .from('share_tokens')
          .select('id, event_id')
          .eq('token', order.token)
          .eq('is_active', true)
          .single();

        if (tokenData) {
          shareTokenId = tokenData.id;
          eventId = tokenData.event_id;
        }
      } else if (order.token && order.token.length >= 16) {
        // Try folder tokens (16-char alphanumeric)
        const { data: folderData } = await supabase
          .from('folders')
          .select('id, event_id')
          .eq('share_token', order.token)
          .single();
        
        if (folderData) {
          eventId = folderData.event_id;
          
          // Try to find corresponding share_token
          const { data: st } = await supabase
            .from('share_tokens')
            .select('id')
            .eq('folder_id', folderData.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (st) shareTokenId = st.id;
        }
      }
    } catch (tokenError) {
      console.error('Error resolving token:', tokenError);
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      );
    }
    
    if (!eventId) {
      console.error('❌ No event_id found for token:', order.token.slice(0, 8));
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      );
    }

    console.log('✅ Token validated, event_id:', eventId, 'shareTokenId:', shareTokenId);
    
    // Calculate price breakdown
    const basePrice = Number(order.basePackage.basePrice || 0);
    const additionsPrice = order.additionalCopies.reduce((sum, copy) => sum + Number(copy.totalPrice || 0), 0);
    const shippingCost = 0; // Free shipping for manual methods for ahora
    const totalPrice = basePrice + additionsPrice + shippingCost;

    // Map payment method to unified format
    const rawPaymentMethod = order.paymentMethod.toLowerCase();
    let unifiedPaymentMethod = 'otros';
    let unifiedStatus: 'pending_payment' | 'paid' | 'draft' = 'pending_payment';
    let legacyStatus = 'pending';

    if (rawPaymentMethod.includes('transfer') || rawPaymentMethod.includes('banco') || rawPaymentMethod.includes('deposit')) {
      unifiedPaymentMethod = 'transferencia';
      legacyStatus = 'pending';
    } else if (rawPaymentMethod.includes('cash') || rawPaymentMethod.includes('efectivo')) {
      unifiedPaymentMethod = 'efectivo';
      legacyStatus = 'pending';
    } else if (rawPaymentMethod.includes('mercado') || rawPaymentMethod.includes('mp')) {
      unifiedPaymentMethod = 'mercadopago';
    } else if (rawPaymentMethod.includes('card') || rawPaymentMethod.includes('tarjeta')) {
      unifiedPaymentMethod = 'tarjeta';
    } else if (rawPaymentMethod.includes('whatsapp')) {
      unifiedPaymentMethod = 'coordinacion_manual';
    }

    const metadata: Record<string, unknown> = {
      source: 'store-checkout',
      raw_payment_method: order.paymentMethod,
    };

    if (order.customerNotes && order.customerNotes.trim().length > 0) {
      metadata.customer_notes = order.customerNotes.trim();
    }

    const paymentDetails: Record<string, unknown> = {
      raw_method: order.paymentMethod,
    };

    let responseMessage = 'Pedido creado. Te contactaremos para coordinar el pago.';
    if (unifiedPaymentMethod === 'transferencia') {
      responseMessage = 'Pedido creado. Realizá la transferencia para confirmarlo.';
    } else if (unifiedPaymentMethod === 'mercadopago') {
      responseMessage = 'Pedido creado. Te enviaremos el enlace de Mercado Pago.';
    } else if (unifiedPaymentMethod === 'tarjeta') {
      responseMessage = 'Pedido creado. Procesaremos el pago con tarjeta y te avisaremos.';
    } else if (unifiedPaymentMethod === 'efectivo') {
      responseMessage = 'Pedido creado. Te contactaremos para coordinar el pago en efectivo.';
    } else if (unifiedPaymentMethod === 'coordinacion_manual') {
      responseMessage = 'Pedido creado. Coordinaremos el pago por WhatsApp.';
    }

    console.log(`[Create Order] Creating unified order: ${order.id}`, {
      rawPaymentMethod: order.paymentMethod,
      unifiedPaymentMethod,
      status: unifiedStatus,
      basePrice,
      additionsPrice,
      totalPrice
    });
    
    // Create order in unified_orders first (PRIORITY)
    const { data: orderData, error: orderError } = await supabase
      .from('unified_orders')
      .insert({
        id: order.id,
        token: order.token,
        event_id: eventId,
        share_token_id: shareTokenId,
        status: unifiedStatus,
        payment_method: unifiedPaymentMethod,
        payment_details: paymentDetails,
        base_package: order.basePackage, // This is JSONB, store the whole object
        selected_photos: order.selectedPhotos,
        additional_copies: order.additionalCopies,
        contact_info: order.contactInfo,
        base_price: basePrice,
        additions_price: additionsPrice,
        shipping_cost: shippingCost,
        total_price: totalPrice,
        currency: 'ARS',
        metadata: {
          ...metadata,
          external_id: order.id, // Store external_id in metadata
          payment_status: 'pending', // Store payment_status in metadata
          delivery_info: {
            address: order.contactInfo.address,
            method: 'shipping'
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (orderError) {
      console.error('Error creating unified order:', orderError);
      return NextResponse.json(
        { error: 'Error al crear el pedido' },
        { status: 500 }
      );
    }
    
    console.log(`[Create Order] Successfully created unified order: ${order.id}`);

    const legacyMetadata: Record<string, unknown> = {
      source: 'store-checkout',
      basePackage: order.basePackage,
      selectedPhotos: order.selectedPhotos,
      additionalCopies: order.additionalCopies,
      raw_payment_method: order.paymentMethod,
    };

    if (order.customerNotes && order.customerNotes.trim().length > 0) {
      legacyMetadata.customer_notes = order.customerNotes.trim();
    }
    
    // Also create in legacy orders table for compatibility (non-critical)
    try {
      await supabase
        .from('orders')
        .insert({
          external_id: order.id,
          event_id: eventId,
          token_id: shareTokenId,
          status: legacyStatus,
          payment_method: order.paymentMethod,
          total_amount: order.totalPrice,
          customer_info: order.contactInfo,
          metadata: legacyMetadata,
        });
      console.log(`[Create Order] Legacy order created for compatibility: ${order.id}`);
    } catch (legacyError) {
      console.warn(`[Create Order] Legacy order creation failed (non-critical): ${order.id}`, legacyError);
    }
    
    // Create order items in legacy table for compatibility (non-critical)
    try {
      const orderItems = [];
      
      // Add base package as an item
      if (order.basePackage.basePrice > 0) {
        orderItems.push({
          order_id: orderData.id,
          product_id: order.basePackage.id,
          product_name: order.basePackage.name,
          quantity: 1,
          unit_price: order.basePackage.basePrice,
          total_price: order.basePackage.basePrice,
          metadata: {
            type: 'base_package',
            selectedPhotos: order.selectedPhotos,
          },
        });
      }
      
      // Add additional copies
      for (const copy of order.additionalCopies) {
        orderItems.push({
          order_id: orderData.id,
          product_id: copy.productId,
          product_name: `Copia adicional`,
          quantity: copy.quantity,
          unit_price: copy.unitPrice,
          total_price: copy.totalPrice,
          metadata: {
            type: 'additional_copy',
            copyId: copy.id,
          },
        });
      }
      
      if (orderItems.length > 0) {
        await supabase
          .from('order_items')
          .insert(orderItems);
        console.log(`[Create Order] Legacy order items created: ${orderItems.length}`);
      }
    } catch (itemsError) {
      console.warn('Error creating legacy order items (non-critical):', itemsError);
    }
    
    // Send notification email (optional - implement if needed)
    // await sendOrderConfirmationEmail(order.contactInfo.email, orderData);
    
    console.log(`[Create Order] Order creation completed successfully: ${order.id}`);
    
    return NextResponse.json({
      success: true,
      orderId: orderData.id,
      externalId: order.id,
      unifiedOrderId: orderData.id,
      message: responseMessage,
      paymentMethod: unifiedPaymentMethod,
      status: unifiedStatus,
      totalPrice: totalPrice,
    });
    
  } catch (error) {
    console.error('Error processing order:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al procesar el pedido' },
      { status: 500 }
    );
  }
}