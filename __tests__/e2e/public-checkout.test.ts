import { test, expect } from '@playwright/test';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Test E2E mínimo para el checkout público
test.describe('Public Checkout E2E', () => {
  let eventId: string;
  let photoIds: string[] = [];

  test.beforeAll(async () => {
    // Setup: crear evento y fotos de prueba
    const supabase = await createServerSupabaseServiceClient();

    // Crear evento de prueba
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: 'Evento Test E2E',
        location: 'Test Location',
        date: new Date().toISOString().split('T')[0],
        status: 'active',
        price_per_photo: 1500, // $15 ARS
      } as any)
      .select()
      .single();

    if (eventError || !event) {
      throw new Error('Failed to create test event');
    }
    eventId = event.id;

    // Crear 2 fotos de prueba aprobadas
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .insert([
        {
          event_id: eventId,
          original_filename: 'test-photo-1.jpg',
          storage_path: 'test/photo1.jpg',
          watermark_path: 'test/watermark1.jpg',
          approved: true,
          file_size: 1024000,
          width: 1920,
          height: 1080,
        },
        {
          event_id: eventId,
          original_filename: 'test-photo-2.jpg',
          storage_path: 'test/photo2.jpg',
          watermark_path: 'test/watermark2.jpg',
          approved: true,
          file_size: 1024000,
          width: 1920,
          height: 1080,
        },
      ] as any)
      .select();

    if (photosError || !photos) {
      throw new Error('Failed to create test photos');
    }
    photoIds = photos.map(p => p.id);
  });

  test.afterAll(async () => {
    // Cleanup: eliminar datos de prueba
    const supabase = await createServerSupabaseServiceClient();
    
    // Eliminar fotos (cascade eliminará order_items)
    await supabase.from('photos').delete().in('id', photoIds);
    
    // Eliminar evento (cascade eliminará orders y subjects)
    await supabase.from('events').delete().eq('id', eventId);
  });

  test('should complete public checkout flow', async ({ request }) => {
    // 1. Agregar 2 fotos al carrito público
    const checkoutPayload = {
      eventId,
      photoIds,
      contactInfo: {
        name: 'Juan Test',
        email: 'juan.test@example.com',
        phone: '+5491123456789',
      },
      package: 'Paquete E2E Test',
    };

    // 2. POST /api/gallery/checkout → redirectUrl presente
    const checkoutResponse = await request.post('/api/gallery/checkout', {
      data: checkoutPayload,
    });

    expect(checkoutResponse.ok()).toBeTruthy();
    const checkoutData = await checkoutResponse.json();

    // Verificar estructura de respuesta
    expect(checkoutData).toHaveProperty('data');
    expect(checkoutData.data).toHaveProperty('orderId');
    expect(checkoutData.data).toHaveProperty('preferenceId');
    expect(checkoutData.data).toHaveProperty('redirectUrl');
    expect(checkoutData.data).toHaveProperty('totalAmount');
    expect(checkoutData.data).toHaveProperty('photoCount');

    // Verificar valores
    expect(checkoutData.data.photoCount).toBe(2);
    expect(checkoutData.data.totalAmount).toBe(30); // 2 fotos * $15 = $30
    expect(checkoutData.data.redirectUrl).toContain('mercadopago.com');

    const { orderId, preferenceId } = checkoutData.data;

    // 3. Verificar que la orden se creó correctamente en la BD
    const supabase = await createServerSupabaseServiceClient();
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*), subjects(*)')
      .eq('id', orderId)
      .single();

    expect(orderError).toBeNull();
    expect(order).toBeTruthy();
    expect(order.status).toBe('pending');
    expect(order.total_amount).toBe(3000); // En centavos
    expect(order.contact_name).toBe('Juan Test');
    expect(order.contact_email).toBe('juan.test@example.com');
    expect(order.mp_preference_id).toBe(preferenceId);

    // Verificar que se creó el subject público
    expect(order.subjects).toBeTruthy();
    expect(order.subjects.name).toBe('Juan Test');
    expect(order.subjects.email).toBe('juan.test@example.com');
    expect(order.subjects.metadata.type).toBe('public');

    // Verificar que se crearon los order_items
    expect(order.order_items).toHaveLength(2);
    expect(order.order_items[0].quantity).toBe(1);
    expect(order.order_items[0].unit_price).toBe(1500);
    expect(order.order_items[0].subtotal).toBe(1500);

    // 4. Simular webhook de MercadoPago (sandbox)
    const webhookPayload = {
      type: 'payment',
      action: 'payment.updated',
      data: {
        id: `test_payment_${Date.now()}`,
      },
    };

    // Mock del payment de MercadoPago
    const mockPayment = {
      id: webhookPayload.data.id,
      status: 'approved',
      status_detail: 'accredited',
      external_reference: orderId,
      transaction_amount: 30,
      payment_type_id: 'credit_card',
      payment_method_id: 'visa',
      date_created: new Date().toISOString(),
      date_approved: new Date().toISOString(),
      payer: {
        email: 'juan.test@example.com',
      },
    };

    // Simular el webhook (en un test real, esto vendría de MercadoPago)
    // Por ahora, actualizamos directamente la orden para simular el webhook
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'approved',
        mp_payment_id: mockPayment.id,
        mp_status: 'approved',
        payment_date: new Date().toISOString(),
      } as any)
      .eq('id', orderId);

    expect(updateError).toBeNull();

    // 5. Verificar que la orden se actualizó a "approved"
    const { data: updatedOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status, mp_payment_id, payment_date')
      .eq('id', orderId)
      .single();

    expect(fetchError).toBeNull();
    expect(updatedOrder.status).toBe('approved');
    expect(updatedOrder.mp_payment_id).toBe(mockPayment.id);
    expect(updatedOrder.payment_date).toBeTruthy();

    console.log('✅ Public checkout E2E test completed successfully');
  });

  test('should handle validation errors', async ({ request }) => {
    // Test con datos inválidos
    const invalidPayload = {
      eventId: 'invalid-uuid',
      photoIds: [],
      contactInfo: {
        name: 'A', // Muy corto
        email: 'invalid-email',
        phone: '+5491123456789',
      },
    };

    const response = await request.post('/api/gallery/checkout', {
      data: invalidPayload,
    });

    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData).toHaveProperty('error');
    expect(errorData.error).toContain('inválidos');
  });

  test('should handle non-existent event', async ({ request }) => {
    const payload = {
      eventId: '00000000-0000-0000-0000-000000000000',
      photoIds: ['00000000-0000-0000-0000-000000000001'],
      contactInfo: {
        name: 'Juan Test',
        email: 'juan.test@example.com',
      },
    };

    const response = await request.post('/api/gallery/checkout', {
      data: payload,
    });

    expect(response.status()).toBe(404);
    const errorData = await response.json();
    expect(errorData.error).toContain('Evento no encontrado');
  });

  test('should handle non-approved photos', async ({ request }) => {
    // Crear foto no aprobada
    const supabase = await createServerSupabaseServiceClient();
    const { data: unapprovedPhoto } = await supabase
      .from('photos')
      .insert({
        event_id: eventId,
        original_filename: 'unapproved-photo.jpg',
        storage_path: 'test/unapproved.jpg',
        approved: false, // No aprobada
        file_size: 1024000,
        width: 1920,
        height: 1080,
      } as any)
      .select()
      .single();

    const payload = {
      eventId,
      photoIds: [unapprovedPhoto!.id],
      contactInfo: {
        name: 'Juan Test',
        email: 'juan.test@example.com',
      },
    };

    const response = await request.post('/api/gallery/checkout', {
      data: payload,
    });

    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData.error).toContain('Fotos no válidas');

    // Cleanup
    await supabase.from('photos').delete().eq('id', unapprovedPhoto!.id);
  });
});
