import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { emailService, type EmailType, type OrderEmailData } from '@/lib/services/email.service';
import { whatsappNotificationService, normalizePhoneNumber } from '@/lib/services/whatsapp-notification.service';

const SendNotificationSchema = z.object({
  type: z.enum(['email', 'whatsapp']),
  channel: z.enum([
    'order_confirmation',
    'order_ready',
    'download_ready',
    'order_shipped',
    'order_cancelled',
    'custom'
  ]).optional(),
  recipient: z.enum(['customer', 'photographer']).default('customer'),
  customMessage: z.string().max(1000).optional(),
});

/**
 * POST /api/admin/orders/[id]/send-notification
 * Send email or WhatsApp notification for an order
 */
export const POST = withAdminAuth(async (
  request: NextRequest,
  context: RouteContext<{ id: string }>
) => {
  const params = await context.params;
  const startTime = Date.now();

  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await request.json();
    const validation = SendNotificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { type, channel, recipient, customMessage } = validation.data;
    const supabase = await createServerSupabaseServiceClient();

    // Fetch order with event details
    const { data: order, error: orderError } = await supabase
      .from('unified_orders')
      .select(`
        *,
        events:event_id (
          id,
          name,
          date,
          tenant_id,
          photographer_name,
          photographer_email,
          photographer_phone
        )
      `)
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const contactInfo = order.contact_info as Record<string, any> || {};
    const tenantId = order.events?.tenant_id || 'default';
    const eventName = order.events?.name || 'Sin evento';

    // Determine recipient contact info
    let recipientEmail: string | null = null;
    let recipientPhone: string | null = null;
    let recipientName: string | null = null;

    if (recipient === 'customer') {
      recipientEmail = contactInfo.email;
      recipientPhone = contactInfo.phone;
      recipientName = contactInfo.name;
    } else {
      recipientEmail = order.events?.photographer_email;
      recipientPhone = order.events?.photographer_phone;
      recipientName = order.events?.photographer_name;
    }

    // Handle EMAIL notification
    if (type === 'email') {
      if (!recipientEmail) {
        return NextResponse.json(
          { error: 'No email address available for recipient' },
          { status: 400 }
        );
      }

      const emailType: EmailType = (channel as EmailType) || 'order_confirmation';

      // Build email data
      const selectedPhotos = order.selected_photos as Record<string, any> || {};
      const photoCount = Object.values(selectedPhotos).reduce((sum: number, arr) => {
        return sum + (Array.isArray(arr) ? arr.length : 0);
      }, 0);

      const emailData: OrderEmailData = {
        orderId: order.id,
        orderNumber: order.id.slice(0, 8).toUpperCase(),
        customerName: contactInfo.name || 'Cliente',
        customerEmail: contactInfo.email || '',
        customerPhone: contactInfo.phone,
        eventName,
        items: [{
          photoId: 'package',
          productName: order.package_type || 'Paquete de fotos',
          quantity: photoCount || 1,
          priceFormatted: formatCurrency(order.total_price || 0, order.currency || 'ARS'),
        }],
        subtotalFormatted: formatCurrency(order.base_price || order.total_price || 0, order.currency || 'ARS'),
        discountFormatted: order.base_price && order.total_price && order.base_price > order.total_price
          ? formatCurrency(order.base_price - order.total_price, order.currency || 'ARS')
          : undefined,
        totalFormatted: formatCurrency(order.total_price || 0, order.currency || 'ARS'),
        currency: order.currency || 'ARS',
        hasDigitalItems: true,
        hasPhysicalItems: true,
        trackingNumber: order.tracking_number || undefined,
        pickupLocation: order.delivery_info?.pickup_location as string | undefined,
        pickupInstructions: order.delivery_info?.pickup_instructions as string | undefined,
      };

      const result = await emailService.sendEmail({
        supabase,
        tenantId,
        emailType,
        to: recipientEmail,
        data: emailData,
      });

      // Log communication
      await logCommunication(supabase, {
        orderId: id,
        type: 'email',
        channel: emailType,
        recipient,
        recipientEmail,
        status: result.success ? 'sent' : 'failed',
        errorMessage: result.error,
        messageId: result.messageId,
      });

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Email enviado correctamente' : result.error,
        messageId: result.messageId,
        performance: { duration_ms: Date.now() - startTime },
      });
    }

    // Handle WHATSAPP notification
    if (type === 'whatsapp') {
      if (!recipientPhone) {
        return NextResponse.json(
          { error: 'No phone number available for recipient' },
          { status: 400 }
        );
      }

      const normalizedPhone = normalizePhoneNumber(recipientPhone, '54');
      if (!normalizedPhone) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        );
      }

      // Build WhatsApp message
      const message = customMessage || buildWhatsAppMessage({
        orderNumber: order.id.slice(0, 8).toUpperCase(),
        customerName: contactInfo.name || 'Cliente',
        eventName,
        total: formatCurrency(order.total_price || 0, order.currency || 'ARS'),
        status: order.status,
        recipient,
      });

      // Send WhatsApp via Meta API
      const whatsappResult = await sendWhatsAppToCustomer({
        phone: normalizedPhone,
        message,
      });

      // Log communication
      await logCommunication(supabase, {
        orderId: id,
        type: 'whatsapp',
        channel: channel || 'custom',
        recipient,
        recipientPhone: normalizedPhone,
        status: whatsappResult.success ? 'sent' : 'failed',
        errorMessage: whatsappResult.error,
        messageId: whatsappResult.messageId,
        messageBody: message,
      });

      return NextResponse.json({
        success: whatsappResult.success,
        message: whatsappResult.success ? 'WhatsApp enviado correctamente' : whatsappResult.error,
        messageId: whatsappResult.messageId,
        performance: { duration_ms: Date.now() - startTime },
      });
    }

    return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });

  } catch (error) {
    console.error('[Send Notification] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

// Helper functions
function formatCurrency(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
      minimumFractionDigits: 2,
    }).format(amountCents / 100);
  } catch {
    return `${currency} ${(amountCents / 100).toFixed(2)}`;
  }
}

function buildWhatsAppMessage(params: {
  orderNumber: string;
  customerName: string;
  eventName: string;
  total: string;
  status: string;
  recipient: string;
}): string {
  const { orderNumber, customerName, eventName, total, status, recipient } = params;

  const statusMessages: Record<string, string> = {
    pending_payment: 'está pendiente de pago',
    paid: 'fue confirmado y está siendo procesado',
    in_production: 'está en producción',
    shipped: 'fue enviado',
    delivered: 'fue entregado',
    cancelled: 'fue cancelado',
  };

  const statusText = statusMessages[status] || 'fue actualizado';

  if (recipient === 'photographer') {
    return `🎉 Nuevo pedido #${orderNumber}\n\nCliente: ${customerName}\nEvento: ${eventName}\nTotal: ${total}\n\nIngresá al panel para ver los detalles.`;
  }

  return `¡Hola ${customerName}! 👋\n\nTu pedido #${orderNumber} de ${eventName} ${statusText}.\n\nTotal: ${total}\n\nGracias por tu compra. Si tenés alguna consulta, respondé este mensaje.`;
}

async function sendWhatsAppToCustomer(params: {
  phone: string;
  message: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { phone, message } = params;

  // Check if WhatsApp is enabled
  const enabled = process.env.WHATSAPP_AUTOMATION_ENABLED === 'true';
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

  if (!enabled || !token || !phoneNumberId) {
    return { success: false, error: 'WhatsApp no está configurado' };
  }

  try {
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';
    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data?.error?.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function logCommunication(
  supabase: ReturnType<typeof createServerSupabaseServiceClient> extends Promise<infer T> ? T : never,
  params: {
    orderId: string;
    type: 'email' | 'whatsapp';
    channel: string;
    recipient: string;
    recipientEmail?: string | null;
    recipientPhone?: string | null;
    status: 'sent' | 'failed' | 'pending';
    errorMessage?: string | null;
    messageId?: string | null;
    messageBody?: string | null;
  }
) {
  try {
    await supabase.from('order_communications').insert({
      order_id: params.orderId,
      type: params.type,
      channel: params.channel,
      recipient: params.recipient,
      recipient_email: params.recipientEmail,
      recipient_phone: params.recipientPhone,
      status: params.status,
      error_message: params.errorMessage,
      provider_message_id: params.messageId,
      message_body: params.messageBody,
      sent_at: params.status === 'sent' ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error('[Log Communication] Error:', error);
  }
}
