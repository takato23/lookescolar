import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { preferenceClient, MP_CONFIG } from '@/lib/mercadopago/client';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const CreatePreferenceSchema = z.object({
  subjectId: z.string().uuid(),
  token: z.string().min(20),
  items: z.array(z.object({
    photoId: z.string().uuid(),
    quantity: z.number().positive().int(),
    unitPrice: z.number().positive()
  })).min(1),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = CreatePreferenceSchema.parse(body);
    
    const supabase = createClient();
    
    // Verify token and get subject
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('*, events(name, school, price_per_photo)')
      .eq('id', validatedData.subjectId)
      .eq('access_token', validatedData.token)
      .single();
      
    if (subjectError || !subject) {
      return NextResponse.json(
        { error: 'Invalid token or subject not found' },
        { status: 401 }
      );
    }
    
    // Check token expiration
    if (new Date(subject.token_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 401 }
      );
    }
    
    // Verify all photos belong to the subject
    const photoIds = validatedData.items.map(item => item.photoId);
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id, original_filename')
      .eq('subject_id', validatedData.subjectId)
      .in('id', photoIds);
      
    if (photosError || photos?.length !== photoIds.length) {
      return NextResponse.json(
        { error: 'Invalid photos selection' },
        { status: 400 }
      );
    }
    
    // Calculate total amount
    const totalAmount = validatedData.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
    
    // Create order in database
    const orderNumber = `ORD-${Date.now()}-${nanoid(6)}`;
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        subject_id: validatedData.subjectId,
        order_number: orderNumber,
        status: 'pending',
        total_amount_cents: Math.round(totalAmount * 100),
        contact_name: validatedData.contactName,
        contact_email: validatedData.contactEmail,
        contact_phone: validatedData.contactPhone || null,
        payment_method: 'mercadopago'
      })
      .select()
      .single();
      
    if (orderError || !order) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }
    
    // Create order items
    const orderItems = validatedData.items.map(item => ({
      order_id: order.id,
      photo_id: item.photoId,
      quantity: item.quantity,
      unit_price: Math.round(item.unitPrice * 100),
      subtotal: Math.round(item.quantity * item.unitPrice * 100)
    }));
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
      
    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback order creation
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }
    
    // Create Mercado Pago preference
    const preference = {
      items: validatedData.items.map((item, index) => {
        const photo = photos.find(p => p.id === item.photoId);
        return {
          id: item.photoId,
          title: photo?.original_filename || `Foto ${index + 1}`,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          currency_id: 'ARS'
        };
      }),
      payer: {
        name: validatedData.contactName,
        email: validatedData.contactEmail,
        phone: validatedData.contactPhone ? {
          area_code: '',
          number: validatedData.contactPhone
        } : undefined
      },
      back_urls: {
        success: `${MP_CONFIG.successUrl}/${validatedData.token}/payment-success?order=${order.id}`,
        failure: `${MP_CONFIG.failureUrl}/${validatedData.token}/payment-failure?order=${order.id}`,
        pending: `${MP_CONFIG.pendingUrl}/${validatedData.token}/payment-pending?order=${order.id}`
      },
      auto_return: 'approved',
      external_reference: order.id,
      notification_url: MP_CONFIG.notificationUrl,
      statement_descriptor: 'LookEscolar Fotos',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
    
    const mpResponse = await preferenceClient.create({ body: preference });
    
    if (!mpResponse.id) {
      throw new Error('Failed to create Mercado Pago preference');
    }
    
    // Update order with MP preference ID
    await supabase
      .from('orders')
      .update({ 
        mp_preference_id: mpResponse.id,
        mp_external_reference: order.id
      })
      .eq('id', order.id);
    
    return NextResponse.json({
      preferenceId: mpResponse.id,
      orderId: order.id,
      initPoint: MP_CONFIG.sandbox ? mpResponse.sandbox_init_point : mpResponse.init_point,
      publicKey: MP_CONFIG.publicKey
    });
    
  } catch (error) {
    console.error('Error creating preference:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}