import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';

type OrderSource = 'orders' | 'unified_orders';

interface HandleOrderPaidOptions {
  supabase: SupabaseClient<Database>;
  orderId: string;
  orderSource: OrderSource;
  requestId?: string;
}

interface OrderSummary {
  orderId: string;
  orderCode: string;
  orderSource: OrderSource;
  tenantId?: string | null;
  eventId: string | null;
  totalValue: number;
  currency: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  itemsDescription: string;
  rawMetadata?: Record<string, any> | null;
}

interface EventSummary {
  id: string;
  tenantId: string;
  name: string | null;
  photographerName?: string | null;
  photographerEmail?: string | null;
  photographerPhone?: string | null;
}

interface NotificationRecord {
  id: string;
  status: 'pending' | 'sent' | 'failed';
  attempt_count: number;
  next_retry_at: string | null;
}

function getRetryDelayMs(attempt: number): number {
  const baseMinutes = 5;
  const multiplier = Math.pow(2, Math.max(0, attempt - 1));
  return baseMinutes * multiplier * 60 * 1000;
}

export function normalizePhoneNumber(
  input: string | null | undefined,
  defaultCountry?: string
): string | null {
  if (!input) {
    return null;
  }

  let digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) {
    digits = '+' + digits.slice(2);
  }

  if (digits.startsWith('+')) {
    return digits;
  }

  const countryCode = (defaultCountry || '54').replace(/\D/g, '');
  const trimmed = digits.replace(/^0+/, '');
  if (!countryCode) {
    return `+${trimmed}`;
  }
  return `+${countryCode}${trimmed}`;
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    const fallback = currency || 'ARS';
    return `${fallback} ${value.toFixed(2)}`;
  }
}

export class WhatsAppNotificationService {
  private readonly log = logger.child({ service: 'whatsapp_notification' });

  private isEnabled(): boolean {
    const enabled = process.env.WHATSAPP_AUTOMATION_ENABLED === 'true';
    if (!enabled) {
      return false;
    }

    return Boolean(
      process.env.META_WHATSAPP_TOKEN && process.env.META_WHATSAPP_PHONE_NUMBER_ID
    );
  }

  async handleOrderPaid(options: HandleOrderPaidOptions): Promise<void> {
    const { supabase, orderId, orderSource, requestId } = options;
    const log = this.log.child({ orderId, orderSource, requestId });

    if (!this.isEnabled()) {
      log.info('whatsapp_disabled_skip');
      return;
    }

    const orderSummary = await this.fetchOrderSummary(
      supabase,
      orderId,
      orderSource,
      log
    );

    if (!orderSummary?.eventId) {
      log.warn('order_summary_missing_event', { orderSummary });
      return;
    }

    const event = await this.fetchEventSummary(
      supabase,
      orderSummary.eventId,
      log
    );

    if (!event) {
      log.warn('event_not_found', { eventId: orderSummary.eventId });
      return;
    }

    const tenantId = event.tenantId || orderSummary.tenantId;
    if (!tenantId) {
      log.warn('tenant_id_missing', { eventId: event.id });
      return;
    }

    const defaultCountry = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '54';
    const photographerPhone = normalizePhoneNumber(
      event.photographerPhone,
      defaultCountry
    );

    const messagePayload = {
      orderId: orderSummary.orderId,
      orderCode: orderSummary.orderCode,
      orderSource,
      eventId: event.id,
      eventName: event.name,
      totalValue: orderSummary.totalValue,
      currency: orderSummary.currency,
      customerName: orderSummary.customerName,
      customerEmail: orderSummary.customerEmail,
      customerPhone: orderSummary.customerPhone,
      itemsDescription: orderSummary.itemsDescription,
      metadata: orderSummary.rawMetadata ?? {},
    };

    const messageBody = this.buildMessageBody({
      event,
      order: orderSummary,
      formattedTotal: formatCurrency(
        orderSummary.totalValue,
        orderSummary.currency
      ),
    });

    const existing = await this.getExistingNotification(
      supabase,
      orderId,
      orderSource
    );

    if (existing?.status === 'sent') {
      log.info('notification_already_sent', { notificationId: existing.id });
      return;
    }

    if (!photographerPhone) {
      const record = await this.ensureNotificationRecord({
        supabase,
        tenantId,
        orderSummary,
        event,
        messageBody,
        messagePayload,
        existing,
        phone: null,
        statusOverride: 'failed',
        lastError: 'missing_photographer_phone',
      });
      log.warn('photographer_phone_missing', { notificationId: record?.id });
      return;
    }

    const notification = await this.ensureNotificationRecord({
      supabase,
      tenantId,
      orderSummary,
      event,
      messageBody,
      messagePayload,
      existing,
      phone: photographerPhone,
    });

    if (!notification) {
      log.error('notification_record_creation_failed');
      return;
    }

    const maxAttempts = Number(process.env.WHATSAPP_MAX_ATTEMPTS || '3');
    const startAttempt = (existing?.attempt_count ?? 0) + 1;

    for (let attempt = startAttempt; attempt <= maxAttempts; attempt++) {
      const payload = this.buildProviderPayload(photographerPhone, messageBody);
      const attemptLog = {
        attemptNumber: attempt,
        requestPayload: payload,
      };

      try {
        const response = await this.callProvider(payload);
        const responseBody = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorMessage =
            responseBody?.error?.message ||
            `HTTP ${response.status} ${response.statusText}`;
          await this.persistAttempt({
            supabase,
            notificationId: notification.id,
            tenantId,
            attemptNumber: attempt,
            status: 'failed',
            requestPayload: payload,
            responsePayload: responseBody,
            errorMessage,
          });

          const nextRetry =
            attempt < maxAttempts
              ? new Date(Date.now() + getRetryDelayMs(attempt))
              : null;

          await supabase
            .from('whatsapp_notifications')
            .update({
              status: attempt >= maxAttempts ? 'failed' : 'pending',
              attempt_count: attempt,
              last_error: errorMessage,
              last_attempt_at: new Date().toISOString(),
              photographer_phone: photographerPhone,
              next_retry_at: nextRetry ? nextRetry.toISOString() : null,
            })
            .eq('id', notification.id);

          log.warn('provider_request_failed', {
            attempt,
            errorMessage,
            nextRetryAt: nextRetry?.toISOString(),
          });

          if (attempt >= maxAttempts) {
            return;
          }

          continue;
        }

        const providerMessageId =
          responseBody?.messages?.[0]?.id || responseBody?.messages?.id;

        await this.persistAttempt({
          supabase,
          notificationId: notification.id,
          tenantId,
          attemptNumber: attempt,
          status: 'sent',
          requestPayload: payload,
          responsePayload: responseBody,
        });

        await supabase
          .from('whatsapp_notifications')
          .update({
            status: 'sent',
            attempt_count: attempt,
            provider_message_id: providerMessageId || null,
            last_error: null,
            last_attempt_at: new Date().toISOString(),
            next_retry_at: null,
            photographer_phone: photographerPhone,
          })
          .eq('id', notification.id);

        log.info('notification_sent', {
          notificationId: notification.id,
          attempt,
          providerMessageId,
        });
        return;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error) || 'unknown';

        await this.persistAttempt({
          supabase,
          notificationId: notification.id,
          tenantId,
          attemptNumber: attempt,
          status: 'failed',
          requestPayload: payload,
          responsePayload: null,
          errorMessage: message,
        });

        const nextRetry =
          attempt < maxAttempts
            ? new Date(Date.now() + getRetryDelayMs(attempt))
            : null;

        await supabase
          .from('whatsapp_notifications')
          .update({
            status: attempt >= maxAttempts ? 'failed' : 'pending',
            attempt_count: attempt,
            last_error: message,
            last_attempt_at: new Date().toISOString(),
            next_retry_at: nextRetry ? nextRetry.toISOString() : null,
            photographer_phone: photographerPhone,
          })
          .eq('id', notification.id);

        log.warn('provider_call_exception', {
          attempt,
          error: message,
          nextRetryAt: nextRetry?.toISOString(),
        });

        if (attempt >= maxAttempts) {
          return;
        }
      }
    }
  }

  private async fetchOrderSummary(
    supabase: SupabaseClient<Database>,
    orderId: string,
    orderSource: OrderSource,
    log: ReturnType<typeof this.log.child>
  ): Promise<OrderSummary | null> {
    if (orderSource === 'orders') {
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, tenant_id, event_id, total_amount, total_cents, metadata, contact_name, contact_email, contact_phone, created_at'
        )
        .eq('id', orderId)
        .maybeSingle();

      if (error) {
        log.error('order_fetch_failed', { error: error.message });
        return null;
      }

      if (!data) {
        return null;
      }

      const total =
        typeof data.total_amount === 'number'
          ? data.total_amount
          : data.total_cents
          ? data.total_cents / 100
          : 0;
      const metadata = (data.metadata as Record<string, any>) ?? {};
      const items = Array.isArray(metadata.items) ? metadata.items : [];
      const quantity = items.reduce(
        (sum: number, item: any) => sum + Number(item.quantity || 0),
        0
      );

      const itemsDescription =
        quantity > 0
          ? `${quantity} ${quantity === 1 ? 'ítem' : 'ítems'}`
          : 'Sin detalle de ítems';

      return {
        orderId: data.id,
        orderCode: data.id,
        orderSource,
        tenantId: data.tenant_id,
        eventId: data.event_id,
        totalValue: total,
        currency: metadata?.currency || 'ARS',
        customerName: (metadata?.original_request?.name as string) ?? data.contact_name,
        customerEmail:
          (metadata?.original_request?.email as string) ?? data.contact_email,
        customerPhone:
          (metadata?.original_request?.phone as string) ?? data.contact_phone,
        itemsDescription,
        rawMetadata: metadata,
      };
    }

    const { data, error } = await supabase
      .from('unified_orders')
      .select(
        'id, event_id, total_price, currency, contact_info, selected_photos, additional_copies, metadata'
      )
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      log.error('unified_order_fetch_failed', { error: error.message });
      return null;
    }

    if (!data) {
      return null;
    }

    const contactInfo = (data.contact_info as Record<string, any>) ?? {};
    const selectedPhotos = data.selected_photos as Record<string, any> | null;
    const additional = Array.isArray(data.additional_copies)
      ? data.additional_copies
      : [];

    const photoCount = Object.values(selectedPhotos || {}).reduce(
      (sum, list) => {
        if (Array.isArray(list)) {
          return sum + list.length;
        }
        return sum;
      },
      0
    );

    const totalCopies = additional.reduce(
      (sum: number, item: any) => sum + Number(item.quantity || 0),
      0
    );

    const itemsDescriptionParts: string[] = [];
    if (photoCount > 0) {
      itemsDescriptionParts.push(
        `${photoCount} ${photoCount === 1 ? 'foto' : 'fotos'} seleccionadas`
      );
    }
    if (totalCopies > 0) {
      itemsDescriptionParts.push(
        `${totalCopies} ${totalCopies === 1 ? 'copia' : 'copias'} extra`
      );
    }

    const itemsDescription =
      itemsDescriptionParts.join(' · ') || 'Sin detalle de ítems';

    return {
      orderId: data.id,
      orderCode: data.id,
      orderSource,
      tenantId: null,
      eventId: data.event_id,
      totalValue: Number(data.total_price ?? 0),
      currency: data.currency || 'ARS',
      customerName: contactInfo.name,
      customerEmail: contactInfo.email,
      customerPhone: contactInfo.phone,
      itemsDescription,
      rawMetadata: (data.metadata as Record<string, any>) ?? {},
    };
  }

  private async fetchEventSummary(
    supabase: SupabaseClient<Database>,
    eventId: string,
    log: ReturnType<typeof this.log.child>
  ): Promise<EventSummary | null> {
    const { data, error } = await supabase
      .from('events')
      .select(
        'id, tenant_id, name, photographer_name, photographer_email, photographer_phone'
      )
      .eq('id', eventId)
      .maybeSingle();

    if (error) {
      log.error('event_fetch_failed', { error: error.message, eventId });
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      photographerName: data.photographer_name,
      photographerEmail: data.photographer_email,
      photographerPhone: data.photographer_phone,
    };
  }

  private async getExistingNotification(
    supabase: SupabaseClient<Database>,
    orderId: string,
    orderSource: OrderSource
  ): Promise<NotificationRecord | null> {
    const { data } = await supabase
      .from('whatsapp_notifications')
      .select('id, status, attempt_count, next_retry_at')
      .eq('order_id', orderId)
      .eq('order_source', orderSource)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data as NotificationRecord | null;
  }

  private async ensureNotificationRecord(params: {
    supabase: SupabaseClient<Database>;
    tenantId: string;
    orderSummary: OrderSummary;
    event: EventSummary;
    messageBody: string;
    messagePayload: Record<string, any>;
    existing: NotificationRecord | null;
    phone: string | null;
    statusOverride?: 'pending' | 'sent' | 'failed';
    lastError?: string | null;
  }): Promise<{ id: string } | null> {
    const {
      supabase,
      tenantId,
      orderSummary,
      event,
      messageBody,
      messagePayload,
      existing,
      phone,
      statusOverride,
      lastError,
    } = params;

    if (existing) {
      const { data, error } = await supabase
        .from('whatsapp_notifications')
        .update({
          tenant_id: tenantId,
          event_id: event.id,
          photographer_phone: phone,
          photographer_name: event.photographerName,
          photographer_email: event.photographerEmail,
          message_body: messageBody,
          message_payload: messagePayload,
          status: statusOverride ?? (existing.status === 'failed' ? 'pending' : existing.status),
          last_error: lastError ?? existing.status === 'failed' ? null : lastError,
        })
        .eq('id', existing.id)
        .select('id')
        .maybeSingle();

      if (error) {
        this.log.error('notification_update_failed', {
          error: error.message,
          notificationId: existing.id,
        });
        return null;
      }
      return data ? { id: data.id } : { id: existing.id };
    }

    const { data, error } = await supabase
      .from('whatsapp_notifications')
      .insert({
        tenant_id: tenantId,
        order_id: orderSummary.orderId,
        order_source: orderSummary.orderSource,
        event_id: event.id,
        photographer_phone: phone,
        photographer_name: event.photographerName,
        photographer_email: event.photographerEmail,
        status: statusOverride ?? (phone ? 'pending' : 'failed'),
        message_body: messageBody,
        message_payload: messagePayload,
        last_error: lastError ?? (phone ? null : 'missing_photographer_phone'),
      })
      .select('id')
      .maybeSingle();

    if (error) {
      this.log.error('notification_insert_failed', { error: error.message });
      return null;
    }

    return data ? { id: data.id } : null;
  }

  private buildMessageBody(params: {
    event: EventSummary;
    order: OrderSummary;
    formattedTotal: string;
  }): string {
    const { event, order, formattedTotal } = params;
    const greetingName = event.photographerName || 'fotógrafo/a';
    const eventName = event.name || 'evento sin nombre';
    const customerName = order.customerName || 'Cliente sin nombre';
    const contactPhone = order.customerPhone || '-';
    const contactEmail = order.customerEmail || '-';

    const lines = [
      `Hola ${greetingName}! 🎉`,
      `Se confirmó un nuevo pedido para ${eventName}.`,
      '',
      `• Pedido: ${order.orderCode}`,
      `• Cliente: ${customerName}`,
      `• Total: ${formattedTotal}`,
      `• Items: ${order.itemsDescription}`,
      '',
      `Contacto: ${contactEmail} · ${contactPhone}`,
      '',
      'Ingresá al panel para ver más detalles. ¡Gracias!',
    ];

    return lines.join('\n');
  }

  private buildProviderPayload(phone: string, message: string) {
    return {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: {
        body: message,
      },
    };
  }

  private async callProvider(payload: Record<string, any>): Promise<Response> {
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID!;
    const token = process.env.META_WHATSAPP_TOKEN!;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';
    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    return await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  private async persistAttempt(params: {
    supabase: SupabaseClient<Database>;
    notificationId: string;
    tenantId: string;
    attemptNumber: number;
    status: 'sent' | 'failed';
    requestPayload: Record<string, any>;
    responsePayload: any;
    errorMessage?: string | null;
  }): Promise<void> {
    const {
      supabase,
      notificationId,
      tenantId,
      attemptNumber,
      status,
      requestPayload,
      responsePayload,
      errorMessage,
    } = params;

    await supabase.from('whatsapp_notification_attempts').insert({
      notification_id: notificationId,
      tenant_id: tenantId,
      attempt_number: attemptNumber,
      status,
      request_payload: requestPayload,
      response_payload: responsePayload,
      error_message: errorMessage ?? null,
    });
  }
}

export const whatsappNotificationService =
  new WhatsAppNotificationService();
