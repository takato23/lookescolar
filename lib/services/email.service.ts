import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { Resend } from 'resend';
import { logger } from '@/lib/utils/logger';
import { tenantFeaturesService } from '@/lib/services/tenant-features.service';

// =============================================================================
// TYPES
// =============================================================================

export type EmailType =
  | 'order_confirmation'
  | 'order_ready'
  | 'download_ready'
  | 'order_shipped'
  | 'order_cancelled';

export type EmailStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'bounced'
  | 'delivered'
  | 'opened'
  | 'clicked';

export interface TenantEmailConfig {
  provider: 'resend' | 'smtp';
  api_key: string;
  from_email: string;
  from_name: string;
  reply_to?: string;
  templates: Record<string, { enabled: boolean; subject_template: string }>;
}

export interface TenantBrandingConfig {
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  footer_text: string;
  social_links: Record<string, string>;
}

export interface OrderEmailData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  eventName?: string;
  items: Array<{
    photoId: string;
    photoUrl?: string;
    productName: string;
    quantity: number;
    priceFormatted: string;
  }>;
  subtotalFormatted: string;
  discountFormatted?: string;
  totalFormatted: string;
  currency: string;
  hasDigitalItems: boolean;
  hasPhysicalItems: boolean;
  downloadLinks?: Array<{
    photoId: string;
    downloadUrl: string;
    expiresAt: string;
    remainingDownloads: number;
  }>;
  pickupLocation?: string;
  pickupInstructions?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

export interface SendEmailOptions {
  supabase: SupabaseClient<Database>;
  tenantId: string;
  emailType: EmailType;
  to: string;
  data: OrderEmailData;
  requestId?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  emailLogId?: string;
}

// =============================================================================
// EMAIL SERVICE CLASS
// =============================================================================

export class EmailService {
  private readonly log = logger.child({ service: 'email' });
  private resendClients: Map<string, Resend> = new Map();

  /**
   * Get or create Resend client for a tenant
   */
  private getResendClient(apiKey: string): Resend {
    if (!this.resendClients.has(apiKey)) {
      this.resendClients.set(apiKey, new Resend(apiKey));
    }
    return this.resendClients.get(apiKey)!;
  }

  /**
   * Fetch tenant email and branding configuration
   */
  async getTenantConfig(
    supabase: SupabaseClient<Database>,
    tenantId: string
  ): Promise<{
    emailConfig: TenantEmailConfig;
    brandingConfig: TenantBrandingConfig;
  } | null> {
    const { data, error } = await supabase
      .from('tenants')
      .select('email_config, branding_config')
      .eq('id', tenantId)
      .maybeSingle();

    if (error || !data) {
      this.log.error('tenant_config_fetch_failed', { error: error?.message, tenantId });
      return null;
    }

    const defaultEmailConfig: TenantEmailConfig = {
      provider: 'resend',
      api_key: '',
      from_email: '',
      from_name: '',
      reply_to: '',
      templates: {
        order_confirmation: { enabled: true, subject_template: 'Confirmacion de pedido #{{order_number}}' },
        order_ready: { enabled: true, subject_template: 'Tu pedido #{{order_number}} esta listo' },
        download_ready: { enabled: true, subject_template: 'Tus fotos digitales estan listas para descargar' },
      },
    };

    const defaultBrandingConfig: TenantBrandingConfig = {
      logo_url: '',
      primary_color: '#3B82F6',
      secondary_color: '#1E40AF',
      footer_text: '',
      social_links: {},
    };

    return {
      emailConfig: { ...defaultEmailConfig, ...(data.email_config as TenantEmailConfig) },
      brandingConfig: { ...defaultBrandingConfig, ...(data.branding_config as TenantBrandingConfig) },
    };
  }

  /**
   * Check if email was already sent (idempotency)
   */
  async wasEmailSent(
    supabase: SupabaseClient<Database>,
    idempotencyKey: string
  ): Promise<boolean> {
    const { data } = await supabase
      .from('email_logs')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .in('status', ['sent', 'delivered', 'opened', 'clicked'])
      .maybeSingle();

    return !!data;
  }

  /**
   * Generate idempotency key for an email
   */
  generateIdempotencyKey(orderId: string, emailType: EmailType): string {
    return `${orderId}:${emailType}`;
  }

  /**
   * Replace template variables in subject
   */
  private replaceTemplateVars(
    template: string,
    data: Record<string, string>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
  }

  /**
   * Format currency amount
   */
  private formatCurrency(amountCents: number, currency: string): string {
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

  /**
   * Generate HTML email content
   */
  private generateEmailHtml(
    emailType: EmailType,
    data: OrderEmailData,
    branding: TenantBrandingConfig
  ): string {
    const logoHtml = branding.logo_url
      ? `<img src="${branding.logo_url}" alt="Logo" style="max-height: 60px; margin-bottom: 20px;" />`
      : '';

    const baseStyles = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    `;

    const headerStyles = `
      background-color: ${branding.primary_color};
      color: white;
      padding: 30px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    `;

    const buttonStyles = `
      display: inline-block;
      background-color: ${branding.primary_color};
      color: white;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 10px 5px;
    `;

    switch (emailType) {
      case 'order_confirmation':
        return this.generateOrderConfirmationHtml(data, branding, {
          logoHtml,
          baseStyles,
          headerStyles,
          buttonStyles,
        });

      case 'order_ready':
        return this.generateOrderReadyHtml(data, branding, {
          logoHtml,
          baseStyles,
          headerStyles,
          buttonStyles,
        });

      case 'download_ready':
        return this.generateDownloadReadyHtml(data, branding, {
          logoHtml,
          baseStyles,
          headerStyles,
          buttonStyles,
        });

      default:
        return this.generateOrderConfirmationHtml(data, branding, {
          logoHtml,
          baseStyles,
          headerStyles,
          buttonStyles,
        });
    }
  }

  private generateOrderConfirmationHtml(
    data: OrderEmailData,
    branding: TenantBrandingConfig,
    styles: { logoHtml: string; baseStyles: string; headerStyles: string; buttonStyles: string }
  ): string {
    const itemsHtml = data.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            ${item.productName}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
            ${item.priceFormatted}
          </td>
        </tr>
      `
      )
      .join('');

    const discountHtml = data.discountFormatted
      ? `
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right; color: #16a34a;">Descuento:</td>
          <td style="padding: 12px; text-align: right; color: #16a34a;">-${data.discountFormatted}</td>
        </tr>
      `
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmacion de Pedido</title>
      </head>
      <body style="${styles.baseStyles}">
        <div style="${styles.headerStyles}">
          ${styles.logoHtml}
          <h1 style="margin: 0; font-size: 24px;">Confirmacion de Pedido</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Pedido #${data.orderNumber}</p>
        </div>

        <div style="padding: 30px 20px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hola <strong>${data.customerName}</strong>,
          </p>

          <p style="color: #6b7280; margin-bottom: 30px;">
            Gracias por tu compra! Tu pedido ha sido recibido y esta siendo procesado.
            ${data.eventName ? `<br><br>Evento: <strong>${data.eventName}</strong>` : ''}
          </p>

          <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px; color: #111827;">Detalle del pedido</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 12px; text-align: left;">Producto</th>
                  <th style="padding: 12px; text-align: center;">Cant.</th>
                  <th style="padding: 12px; text-align: right;">Precio</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 12px; text-align: right;">Subtotal:</td>
                  <td style="padding: 12px; text-align: right;">${data.subtotalFormatted}</td>
                </tr>
                ${discountHtml}
                <tr style="font-weight: bold; font-size: 18px;">
                  <td colspan="2" style="padding: 12px; text-align: right; border-top: 2px solid #e5e7eb;">Total:</td>
                  <td style="padding: 12px; text-align: right; border-top: 2px solid #e5e7eb; color: ${branding.primary_color};">${data.totalFormatted}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          ${
            data.hasDigitalItems
              ? `
            <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 0; color: #047857;">
                <strong>Productos digitales incluidos</strong><br>
                Recibiras un email con los enlaces de descarga cuando tu pago sea confirmado.
              </p>
            </div>
          `
              : ''
          }

          ${
            data.hasPhysicalItems
              ? `
            <div style="background: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 0; color: #1d4ed8;">
                <strong>Productos fisicos</strong><br>
                Te notificaremos cuando tu pedido este listo para retirar o enviar.
              </p>
            </div>
          `
              : ''
          }

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Si tienes alguna pregunta, no dudes en contactarnos.
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          ${branding.footer_text || 'Gracias por tu compra'}
        </div>
      </body>
      </html>
    `;
  }

  private generateOrderReadyHtml(
    data: OrderEmailData,
    branding: TenantBrandingConfig,
    styles: { logoHtml: string; baseStyles: string; headerStyles: string; buttonStyles: string }
  ): string {
    const pickupHtml = data.pickupLocation
      ? `
        <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px; color: #111827;">Lugar de retiro</h3>
          <p style="margin: 0; color: #374151;">${data.pickupLocation}</p>
          ${data.pickupInstructions ? `<p style="margin: 10px 0 0; color: #6b7280; font-size: 14px;">${data.pickupInstructions}</p>` : ''}
        </div>
      `
      : '';

    const trackingHtml =
      data.trackingNumber && data.trackingUrl
        ? `
        <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px; color: #111827;">Seguimiento de envio</h3>
          <p style="margin: 0 0 15px; color: #374151;">
            Numero de seguimiento: <strong>${data.trackingNumber}</strong>
          </p>
          <a href="${data.trackingUrl}" style="${styles.buttonStyles}">
            Rastrear envio
          </a>
        </div>
      `
        : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tu pedido esta listo</title>
      </head>
      <body style="${styles.baseStyles}">
        <div style="${styles.headerStyles}">
          ${styles.logoHtml}
          <h1 style="margin: 0; font-size: 24px;">Tu pedido esta listo!</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Pedido #${data.orderNumber}</p>
        </div>

        <div style="padding: 30px 20px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hola <strong>${data.customerName}</strong>,
          </p>

          <p style="color: #6b7280; margin-bottom: 30px;">
            Buenas noticias! Tu pedido ya esta listo ${data.trackingNumber ? 'y fue enviado' : 'para retirar'}.
          </p>

          ${pickupHtml}
          ${trackingHtml}

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Si tienes alguna pregunta, no dudes en contactarnos.
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          ${branding.footer_text || 'Gracias por tu compra'}
        </div>
      </body>
      </html>
    `;
  }

  private generateDownloadReadyHtml(
    data: OrderEmailData,
    branding: TenantBrandingConfig,
    styles: { logoHtml: string; baseStyles: string; headerStyles: string; buttonStyles: string }
  ): string {
    const downloadLinksHtml =
      data.downloadLinks
        ?.map(
          (link, index) => `
        <div style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <p style="margin: 0; font-weight: 500; color: #111827;">Foto ${index + 1}</p>
            <p style="margin: 5px 0 0; font-size: 12px; color: #6b7280;">
              ${link.remainingDownloads} descargas restantes - Expira: ${new Date(link.expiresAt).toLocaleDateString('es-AR')}
            </p>
          </div>
          <a href="${link.downloadUrl}" style="${styles.buttonStyles}; padding: 10px 20px; font-size: 14px;">
            Descargar
          </a>
        </div>
      `
        )
        .join('') || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tus fotos estan listas</title>
      </head>
      <body style="${styles.baseStyles}">
        <div style="${styles.headerStyles}">
          ${styles.logoHtml}
          <h1 style="margin: 0; font-size: 24px;">Tus fotos estan listas!</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Pedido #${data.orderNumber}</p>
        </div>

        <div style="padding: 30px 20px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hola <strong>${data.customerName}</strong>,
          </p>

          <p style="color: #6b7280; margin-bottom: 30px;">
            Tus fotos digitales estan listas para descargar. Cada enlace tiene un limite de descargas y una fecha de expiracion.
          </p>

          <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px; color: #111827;">Enlaces de descarga</h3>
            ${downloadLinksHtml}
          </div>

          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Importante:</strong> Los enlaces de descarga son personales y tienen un limite de uso.
              No los compartas con terceros.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Si tienes alguna pregunta o problema con las descargas, no dudes en contactarnos.
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          ${branding.footer_text || 'Gracias por tu compra'}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text version of email
   */
  private generateEmailText(emailType: EmailType, data: OrderEmailData): string {
    switch (emailType) {
      case 'order_confirmation':
        return `
Confirmacion de Pedido #${data.orderNumber}

Hola ${data.customerName},

Gracias por tu compra! Tu pedido ha sido recibido y esta siendo procesado.
${data.eventName ? `Evento: ${data.eventName}` : ''}

Detalle del pedido:
${data.items.map((item) => `- ${item.productName} x${item.quantity}: ${item.priceFormatted}`).join('\n')}

Subtotal: ${data.subtotalFormatted}
${data.discountFormatted ? `Descuento: -${data.discountFormatted}` : ''}
Total: ${data.totalFormatted}

${data.hasDigitalItems ? 'Recibiras los enlaces de descarga cuando tu pago sea confirmado.' : ''}
${data.hasPhysicalItems ? 'Te notificaremos cuando tu pedido este listo.' : ''}

Gracias por tu compra!
        `.trim();

      case 'order_ready':
        return `
Tu pedido #${data.orderNumber} esta listo!

Hola ${data.customerName},

Buenas noticias! Tu pedido ya esta listo ${data.trackingNumber ? 'y fue enviado' : 'para retirar'}.

${data.pickupLocation ? `Lugar de retiro: ${data.pickupLocation}` : ''}
${data.pickupInstructions ? `Instrucciones: ${data.pickupInstructions}` : ''}
${data.trackingNumber ? `Numero de seguimiento: ${data.trackingNumber}` : ''}
${data.trackingUrl ? `Rastrear envio: ${data.trackingUrl}` : ''}

Gracias por tu compra!
        `.trim();

      case 'download_ready':
        return `
Tus fotos estan listas para descargar - Pedido #${data.orderNumber}

Hola ${data.customerName},

Tus fotos digitales estan listas para descargar.

Enlaces de descarga:
${data.downloadLinks?.map((link, i) => `Foto ${i + 1}: ${link.downloadUrl} (${link.remainingDownloads} descargas restantes)`).join('\n') || ''}

Importante: Los enlaces de descarga son personales y tienen un limite de uso.

Gracias por tu compra!
        `.trim();

      default:
        return `Pedido #${data.orderNumber}\n\nGracias por tu compra!`;
    }
  }

  /**
   * Log email attempt to database
   */
  private async logEmail(
    supabase: SupabaseClient<Database>,
    params: {
      tenantId: string;
      orderId: string;
      emailType: EmailType;
      toEmail: string;
      subject: string;
      idempotencyKey: string;
      status: EmailStatus;
      providerMessageId?: string;
      errorMessage?: string;
    }
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('email_logs')
      .upsert(
        {
          tenant_id: params.tenantId,
          order_id: params.orderId,
          email_type: params.emailType,
          to_email: params.toEmail,
          subject: params.subject,
          idempotency_key: params.idempotencyKey,
          status: params.status,
          provider_message_id: params.providerMessageId || null,
          error_message: params.errorMessage || null,
          sent_at: params.status === 'sent' ? new Date().toISOString() : null,
        },
        {
          onConflict: 'idempotency_key',
        }
      )
      .select('id')
      .maybeSingle();

    if (error) {
      this.log.error('email_log_failed', { error: error.message });
      return null;
    }

    return data?.id || null;
  }

  /**
   * Send email using Resend
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const { supabase, tenantId, emailType, to, data, requestId } = options;
    const log = this.log.child({ tenantId, emailType, orderId: data.orderId, requestId });

    // Check if email notifications are enabled for this tenant
    const emailsEnabled = await tenantFeaturesService.isFeatureEnabled(
      supabase,
      tenantId,
      'email_notifications_enabled'
    );

    if (!emailsEnabled) {
      log.info('email_notifications_disabled', { tenantId });
      return { success: false, error: 'Las notificaciones por email están deshabilitadas' };
    }

    // Get tenant configuration
    const config = await this.getTenantConfig(supabase, tenantId);
    if (!config) {
      log.error('tenant_config_not_found');
      return { success: false, error: 'Configuracion de email no encontrada' };
    }

    const { emailConfig, brandingConfig } = config;

    // Validate configuration
    if (!emailConfig.api_key || !emailConfig.from_email) {
      log.warn('email_config_incomplete');
      return { success: false, error: 'Configuracion de email incompleta' };
    }

    // Check if email type is enabled
    const templateConfig = emailConfig.templates[emailType];
    if (!templateConfig?.enabled) {
      log.info('email_type_disabled', { emailType });
      return { success: false, error: `Tipo de email '${emailType}' deshabilitado` };
    }

    // Generate idempotency key and check for duplicates
    const idempotencyKey = this.generateIdempotencyKey(data.orderId, emailType);
    const alreadySent = await this.wasEmailSent(supabase, idempotencyKey);
    if (alreadySent) {
      log.info('email_already_sent', { idempotencyKey });
      return { success: true, error: 'Email ya fue enviado anteriormente' };
    }

    // Generate subject from template
    const subject = this.replaceTemplateVars(templateConfig.subject_template, {
      order_number: data.orderNumber,
      customer_name: data.customerName,
      event_name: data.eventName || '',
    });

    // Generate email content
    const html = this.generateEmailHtml(emailType, data, brandingConfig);
    const text = this.generateEmailText(emailType, data);

    // Log pending email
    await this.logEmail(supabase, {
      tenantId,
      orderId: data.orderId,
      emailType,
      toEmail: to,
      subject,
      idempotencyKey,
      status: 'pending',
    });

    try {
      const resend = this.getResendClient(emailConfig.api_key);

      const { data: sendResult, error: sendError } = await resend.emails.send({
        from: `${emailConfig.from_name} <${emailConfig.from_email}>`,
        to: [to],
        replyTo: emailConfig.reply_to || emailConfig.from_email,
        subject,
        html,
        text,
        tags: [
          { name: 'tenant_id', value: tenantId },
          { name: 'order_id', value: data.orderId },
          { name: 'email_type', value: emailType },
        ],
      });

      if (sendError) {
        log.error('resend_send_failed', { error: sendError.message });
        await this.logEmail(supabase, {
          tenantId,
          orderId: data.orderId,
          emailType,
          toEmail: to,
          subject,
          idempotencyKey,
          status: 'failed',
          errorMessage: sendError.message,
        });
        return { success: false, error: sendError.message };
      }

      const emailLogId = await this.logEmail(supabase, {
        tenantId,
        orderId: data.orderId,
        emailType,
        toEmail: to,
        subject,
        idempotencyKey,
        status: 'sent',
        providerMessageId: sendResult?.id,
      });

      log.info('email_sent_successfully', { messageId: sendResult?.id });

      return {
        success: true,
        messageId: sendResult?.id,
        emailLogId: emailLogId || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('email_send_exception', { error: errorMessage });

      await this.logEmail(supabase, {
        tenantId,
        orderId: data.orderId,
        emailType,
        toEmail: to,
        subject,
        idempotencyKey,
        status: 'failed',
        errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(
    supabase: SupabaseClient<Database>,
    tenantId: string,
    data: OrderEmailData
  ): Promise<SendEmailResult> {
    return this.sendEmail({
      supabase,
      tenantId,
      emailType: 'order_confirmation',
      to: data.customerEmail,
      data,
    });
  }

  /**
   * Send order ready email (for physical products)
   */
  async sendOrderReady(
    supabase: SupabaseClient<Database>,
    tenantId: string,
    data: OrderEmailData
  ): Promise<SendEmailResult> {
    return this.sendEmail({
      supabase,
      tenantId,
      emailType: 'order_ready',
      to: data.customerEmail,
      data,
    });
  }

  /**
   * Send download ready email (for digital products)
   */
  async sendDownloadReady(
    supabase: SupabaseClient<Database>,
    tenantId: string,
    data: OrderEmailData
  ): Promise<SendEmailResult> {
    if (!data.downloadLinks || data.downloadLinks.length === 0) {
      return { success: false, error: 'No hay enlaces de descarga para enviar' };
    }

    return this.sendEmail({
      supabase,
      tenantId,
      emailType: 'download_ready',
      to: data.customerEmail,
      data,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
