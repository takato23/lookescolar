import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { preferenceClient, MP_CONFIG } from '@/lib/mercadopago/client';
import { nanoid } from 'nanoid';
import { z } from 'zod';

// Schema para validar el request de checkout público
export const PublicCheckoutSchema = z.object({
  eventId: z.string().uuid(),
  photoIds: z.array(z.string().uuid()).min(1).max(50), // Máximo 50 fotos por orden
  contactInfo: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  package: z.string().optional().default('Selección personalizada'),
});

export type PublicCheckoutRequest = z.infer<typeof PublicCheckoutSchema>;

export interface PublicCheckoutResponse {
  orderId: string;
  preferenceId: string;
  redirectUrl: string;
}

export class PublicCheckoutService {
  /**
   * Método principal para procesar el checkout público
   */
  async processCheckout(request: PublicCheckoutRequest): Promise<PublicCheckoutResponse> {
    const supabase = await createServerSupabaseServiceClient();
    
    try {
      // 1. Validar evento
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name, status, price_per_photo')
        .eq('id', request.eventId)
        .eq('status', 'active')
        .single();

      if (eventError || !event) {
        throw new Error('Evento no encontrado o inactivo');
      }

      // 2. Validar fotos
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('id, original_filename, approved')
        .eq('event_id', request.eventId)
        .eq('approved', true)
        .in('id', request.photoIds);

      if (photosError || !photos || photos.length !== request.photoIds.length) {
        throw new Error('Algunas fotos no están disponibles o no están aprobadas');
      }

      // 3. Resolver subject público (crear o encontrar existente)
      let subjectId: string;
      
      const { data: existingSubject } = await supabase
        .from('subjects')
        .select('id')
        .eq('event_id', request.eventId)
        .eq('email', request.contactInfo.email)
        .eq('name', request.contactInfo.name)
        .single();

      if (existingSubject) {
        subjectId = existingSubject.id;
      } else {
        // Crear nuevo subject público temporal
        const accessToken = `pub_${nanoid(20)}`;
        const { data: newSubject, error: subjectError } = await supabase
          .from('subjects')
          .insert({
            event_id: request.eventId,
            name: request.contactInfo.name,
            email: request.contactInfo.email,
            phone: request.contactInfo.phone || null,
            access_token: accessToken,
            token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
            metadata: { type: 'public', created_for: 'checkout' },
          })
          .select('id')
          .single();

        if (subjectError || !newSubject) {
          throw new Error('Error creando subject público');
        }
        subjectId = newSubject.id;
      }

      // 4. Calcular precios
      const pricePerPhoto = event.price_per_photo || 1000; // 1000 centavos = $10 ARS
      const totalAmount = pricePerPhoto * photos.length;

      // 5. Crear orden
      const orderId = crypto.randomUUID();
      const orderNumber = `PUB-${Date.now()}-${nanoid(6)}`;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          event_id: request.eventId,
          subject_id: subjectId,
          order_number: orderNumber,
          status: 'pending',
          total_amount: totalAmount,
          contact_name: request.contactInfo.name,
          contact_email: request.contactInfo.email,
          contact_phone: request.contactInfo.phone || null,
          payment_method: 'mercadopago',
          metadata: {
            type: 'public_checkout',
            package: request.package,
            photo_count: photos.length,
          },
        })
        .select()
        .single();

      if (orderError || !order) {
        throw new Error('Error creando la orden');
      }

      // 6. Crear items de la orden
      const orderItems = request.photoIds.map((photoId) => ({
        order_id: orderId,
        photo_id: photoId,
        quantity: 1,
        unit_price: pricePerPhoto,
        subtotal: pricePerPhoto,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        // Rollback: eliminar la orden si fallan los items
        await supabase.from('orders').delete().eq('id', orderId);
        throw new Error('Error creando los items de la orden');
      }

      // 7. Crear preferencia de MercadoPago
      const preference: any = {
        items: [
          {
            id: order.id,
            title: `${request.package} (${photos.length} fotos)`,
            quantity: 1,
            unit_price: totalAmount / 100, // Convertir centavos a pesos
            currency_id: 'ARS',
          },
        ],
        payer: {
          name: request.contactInfo.name,
          email: request.contactInfo.email,
          ...(request.contactInfo.phone && {
            phone: {
              area_code: '',
              number: request.contactInfo.phone,
            },
          }),
        },
        back_urls: {
          success: `${MP_CONFIG.successUrl}/public/payment-success?order=${order.id}`,
          failure: `${MP_CONFIG.failureUrl}/public/payment-failure?order=${order.id}`,
          pending: `${MP_CONFIG.pendingUrl}/public/payment-pending?order=${order.id}`,
        },
        auto_return: 'approved' as const,
        external_reference: order.id,
        notification_url: MP_CONFIG.notificationUrl,
        statement_descriptor: 'LookEscolar Fotos',
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
      };

      const mpResponse = await preferenceClient.create({ body: preference });

      if (!mpResponse.id) {
        throw new Error('Error creando preferencia de MercadoPago');
      }

      // 8. Actualizar la orden con el preference_id
      await supabase
        .from('orders')
        .update({
          mp_preference_id: mpResponse.id,
          mp_external_reference: order.id,
        })
        .eq('id', order.id);

      return {
        orderId: order.id,
        preferenceId: mpResponse.id,
        redirectUrl: MP_CONFIG.sandbox
          ? mpResponse.sandbox_init_point || ''
          : mpResponse.init_point || '',
      };
    } catch (error) {
      console.error('PublicCheckoutService error:', error);
      throw error;
    }
  }
}

// Instancia singleton del servicio
export const publicCheckoutService = new PublicCheckoutService();
