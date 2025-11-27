/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from 'pdfkit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';
import { tenantFeaturesService } from '@/lib/services/tenant-features.service';

// =============================================================================
// TYPES
// =============================================================================

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface InvoiceData {
  // Order info
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  orderStatus: string;

  // Customer info
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };

  // Items
  items: InvoiceItem[];

  // Pricing
  subtotalCents: number;
  discountCents: number;
  couponCode?: string;
  couponDescription?: string;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;

  // Payment info
  paymentMethod?: string;
  paymentId?: string;
  paymentDate?: Date;
  paymentStatus?: string;

  // Tenant branding
  tenantName: string;
  tenantLogo?: string;
  tenantAddress?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  tenantTaxId?: string;
  primaryColor?: string;
  secondaryColor?: string;
  footerText?: string;

  // Event info
  eventName?: string;
  eventDate?: Date;
  eventSchool?: string;
}

export interface InvoiceGenerationOptions {
  includePaymentDetails?: boolean;
  includeQRCode?: boolean;
  language?: 'es' | 'en';
  paperSize?: 'A4' | 'Letter';
  isReceipt?: boolean; // Receipt vs Invoice
}

// =============================================================================
// INVOICE SERVICE CLASS
// =============================================================================

export class InvoiceService {
  private readonly log = logger.child({ service: 'invoice' });

  private readonly defaultOptions: InvoiceGenerationOptions = {
    includePaymentDetails: true,
    includeQRCode: false,
    language: 'es',
    paperSize: 'A4',
    isReceipt: false,
  };

  private readonly translations = {
    es: {
      invoice: 'Factura',
      receipt: 'Recibo de Compra',
      orderNumber: 'Pedido N°',
      date: 'Fecha',
      customer: 'Cliente',
      description: 'Descripción',
      quantity: 'Cant.',
      unitPrice: 'Precio Unit.',
      total: 'Total',
      subtotal: 'Subtotal',
      discount: 'Descuento',
      couponApplied: 'Cupón aplicado',
      shipping: 'Envío',
      tax: 'IVA',
      grandTotal: 'Total a Pagar',
      paymentMethod: 'Método de Pago',
      paymentId: 'ID de Pago',
      paymentDate: 'Fecha de Pago',
      paymentStatus: 'Estado del Pago',
      paid: 'Pagado',
      pending: 'Pendiente',
      event: 'Evento',
      school: 'Escuela',
      eventDate: 'Fecha del Evento',
      thankYou: 'Gracias por tu compra',
      questions: 'Si tienes preguntas, contáctanos a',
      generatedOn: 'Generado el',
      page: 'Página',
      of: 'de',
      free: 'Gratis',
      address: 'Dirección',
      email: 'Email',
      phone: 'Teléfono',
      taxId: 'CUIT/DNI',
    },
    en: {
      invoice: 'Invoice',
      receipt: 'Receipt',
      orderNumber: 'Order #',
      date: 'Date',
      customer: 'Customer',
      description: 'Description',
      quantity: 'Qty.',
      unitPrice: 'Unit Price',
      total: 'Total',
      subtotal: 'Subtotal',
      discount: 'Discount',
      couponApplied: 'Coupon applied',
      shipping: 'Shipping',
      tax: 'Tax',
      grandTotal: 'Grand Total',
      paymentMethod: 'Payment Method',
      paymentId: 'Payment ID',
      paymentDate: 'Payment Date',
      paymentStatus: 'Payment Status',
      paid: 'Paid',
      pending: 'Pending',
      event: 'Event',
      school: 'School',
      eventDate: 'Event Date',
      thankYou: 'Thank you for your purchase',
      questions: 'If you have questions, contact us at',
      generatedOn: 'Generated on',
      page: 'Page',
      of: 'of',
      free: 'Free',
      address: 'Address',
      email: 'Email',
      phone: 'Phone',
      taxId: 'Tax ID',
    },
  };

  /**
   * Format currency amount
   */
  private formatCurrency(amountCents: number, currency: string = 'ARS'): string {
    try {
      const locale = currency === 'ARS' ? 'es-AR' : 'en-US';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(amountCents / 100);
    } catch {
      return `${currency} ${(amountCents / 100).toFixed(2)}`;
    }
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date, locale: string = 'es-AR'): string {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  /**
   * Generate invoice/receipt PDF for an order
   */
  async generateInvoicePDF(
    data: InvoiceData,
    options: InvoiceGenerationOptions = {}
  ): Promise<Buffer> {
    const config = { ...this.defaultOptions, ...options };
    const t = this.translations[config.language!];
    const primaryColor = data.primaryColor || '#3B82F6';
    const primaryRgb = this.hexToRgb(primaryColor) || { r: 59, g: 130, b: 246 };

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: config.paperSize,
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          bufferPages: true,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        const contentWidth = pageWidth - 100;

        // =================================================================
        // HEADER
        // =================================================================

        // Colored header bar
        doc.rect(0, 0, pageWidth, 100)
           .fill(`rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b})`);

        // Title (Invoice/Receipt)
        doc.fontSize(24)
           .fillColor('#FFFFFF')
           .font('Helvetica-Bold')
           .text(config.isReceipt ? t.receipt : t.invoice, 50, 35);

        // Order number and date
        doc.fontSize(10)
           .fillColor('#FFFFFF')
           .font('Helvetica')
           .text(`${t.orderNumber}: ${data.orderNumber}`, 50, 65)
           .text(`${t.date}: ${this.formatDate(data.orderDate, config.language === 'es' ? 'es-AR' : 'en-US')}`, 50, 80);

        // Tenant name (right side)
        doc.fontSize(16)
           .fillColor('#FFFFFF')
           .font('Helvetica-Bold')
           .text(data.tenantName, pageWidth - 250, 35, { width: 200, align: 'right' });

        // Reset fill color
        doc.fillColor('#000000');

        let currentY = 130;

        // =================================================================
        // CUSTOMER & TENANT INFO (two columns)
        // =================================================================

        const leftColX = 50;
        const rightColX = pageWidth / 2 + 25;
        const colWidth = contentWidth / 2 - 25;

        // Customer section
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(`rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b})`)
           .text(t.customer, leftColX, currentY);

        currentY += 18;
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#333333')
           .text(data.customerName, leftColX, currentY);

        currentY += 14;
        doc.text(data.customerEmail, leftColX, currentY);

        if (data.customerPhone) {
          currentY += 14;
          doc.text(data.customerPhone, leftColX, currentY);
        }

        if (data.customerAddress) {
          currentY += 14;
          const addressParts = [
            data.customerAddress.street,
            data.customerAddress.city,
            data.customerAddress.state,
            data.customerAddress.zipCode,
          ].filter(Boolean);
          doc.text(addressParts.join(', '), leftColX, currentY, { width: colWidth });
        }

        // Tenant section (right column)
        let rightY = 130;

        if (data.tenantAddress || data.tenantEmail || data.tenantPhone || data.tenantTaxId) {
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor(`rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b})`)
             .text(data.tenantName, rightColX, rightY, { width: colWidth, align: 'right' });

          rightY += 18;
          doc.fontSize(10)
             .font('Helvetica')
             .fillColor('#333333');

          if (data.tenantAddress) {
            doc.text(data.tenantAddress, rightColX, rightY, { width: colWidth, align: 'right' });
            rightY += 14;
          }

          if (data.tenantEmail) {
            doc.text(data.tenantEmail, rightColX, rightY, { width: colWidth, align: 'right' });
            rightY += 14;
          }

          if (data.tenantPhone) {
            doc.text(data.tenantPhone, rightColX, rightY, { width: colWidth, align: 'right' });
            rightY += 14;
          }

          if (data.tenantTaxId) {
            doc.text(`${t.taxId}: ${data.tenantTaxId}`, rightColX, rightY, { width: colWidth, align: 'right' });
            rightY += 14;
          }
        }

        currentY = Math.max(currentY, rightY) + 30;

        // =================================================================
        // EVENT INFO (if available)
        // =================================================================

        if (data.eventName || data.eventSchool) {
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor(`rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b})`)
             .text(t.event, leftColX, currentY);

          currentY += 18;
          doc.fontSize(10)
             .font('Helvetica')
             .fillColor('#333333');

          if (data.eventName) {
            doc.text(data.eventName, leftColX, currentY);
            currentY += 14;
          }

          if (data.eventSchool) {
            doc.text(`${t.school}: ${data.eventSchool}`, leftColX, currentY);
            currentY += 14;
          }

          if (data.eventDate) {
            doc.text(`${t.eventDate}: ${this.formatDate(data.eventDate, config.language === 'es' ? 'es-AR' : 'en-US')}`, leftColX, currentY);
            currentY += 14;
          }

          currentY += 15;
        }

        // =================================================================
        // ITEMS TABLE
        // =================================================================

        // Table header background
        doc.rect(50, currentY, contentWidth, 25)
           .fill(`rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b})`);

        // Table headers
        const descCol = leftColX + 5;
        const qtyCol = pageWidth - 200;
        const priceCol = pageWidth - 140;
        const totalCol = pageWidth - 70;

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#FFFFFF')
           .text(t.description, descCol, currentY + 7)
           .text(t.quantity, qtyCol, currentY + 7, { width: 40, align: 'center' })
           .text(t.unitPrice, priceCol, currentY + 7, { width: 60, align: 'right' })
           .text(t.total, totalCol, currentY + 7, { width: 50, align: 'right' });

        currentY += 30;

        // Table rows
        doc.font('Helvetica')
           .fillColor('#333333');

        let rowBg = false;
        for (const item of data.items) {
          // Alternating row background
          if (rowBg) {
            doc.rect(50, currentY - 3, contentWidth, 22)
               .fill('#F9FAFB');
            doc.fillColor('#333333');
          }
          rowBg = !rowBg;

          doc.fontSize(9)
             .text(item.description, descCol, currentY, { width: qtyCol - descCol - 10 })
             .text(item.quantity.toString(), qtyCol, currentY, { width: 40, align: 'center' })
             .text(this.formatCurrency(item.unitPriceCents, data.currency), priceCol, currentY, { width: 60, align: 'right' })
             .text(this.formatCurrency(item.totalCents, data.currency), totalCol, currentY, { width: 50, align: 'right' });

          currentY += 22;
        }

        // Table bottom line
        doc.moveTo(50, currentY)
           .lineTo(pageWidth - 50, currentY)
           .strokeColor('#E5E7EB')
           .stroke();

        currentY += 20;

        // =================================================================
        // TOTALS SECTION
        // =================================================================

        const totalsX = pageWidth - 200;
        const totalsWidth = 150;

        // Subtotal
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#666666')
           .text(t.subtotal, totalsX, currentY)
           .text(this.formatCurrency(data.subtotalCents, data.currency), totalsX, currentY, { width: totalsWidth, align: 'right' });

        currentY += 18;

        // Discount (if any)
        if (data.discountCents > 0) {
          doc.fillColor('#16A34A')
             .text(data.couponCode ? `${t.discount} (${data.couponCode})` : t.discount, totalsX, currentY)
             .text(`-${this.formatCurrency(data.discountCents, data.currency)}`, totalsX, currentY, { width: totalsWidth, align: 'right' });
          currentY += 18;
        }

        // Shipping
        doc.fillColor('#666666')
           .text(t.shipping, totalsX, currentY)
           .text(data.shippingCents > 0 ? this.formatCurrency(data.shippingCents, data.currency) : t.free, totalsX, currentY, { width: totalsWidth, align: 'right' });

        currentY += 18;

        // Tax (if any)
        if (data.taxCents > 0) {
          doc.text(t.tax, totalsX, currentY)
             .text(this.formatCurrency(data.taxCents, data.currency), totalsX, currentY, { width: totalsWidth, align: 'right' });
          currentY += 18;
        }

        // Separator line
        doc.moveTo(totalsX, currentY)
           .lineTo(pageWidth - 50, currentY)
           .strokeColor(`rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b})`)
           .lineWidth(2)
           .stroke();

        currentY += 10;

        // Grand total
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor(`rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b})`)
           .text(t.grandTotal, totalsX, currentY)
           .text(this.formatCurrency(data.totalCents, data.currency), totalsX, currentY, { width: totalsWidth, align: 'right' });

        currentY += 40;

        // =================================================================
        // PAYMENT DETAILS (if requested and available)
        // =================================================================

        if (config.includePaymentDetails && (data.paymentMethod || data.paymentId)) {
          doc.moveTo(50, currentY)
             .lineTo(pageWidth - 50, currentY)
             .strokeColor('#E5E7EB')
             .lineWidth(1)
             .stroke();

          currentY += 15;

          doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor(`rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b})`)
             .text(t.paymentMethod, leftColX, currentY);

          currentY += 18;
          doc.fontSize(10)
             .font('Helvetica')
             .fillColor('#333333');

          if (data.paymentMethod) {
            doc.text(`${t.paymentMethod}: ${data.paymentMethod}`, leftColX, currentY);
            currentY += 14;
          }

          if (data.paymentId) {
            doc.text(`${t.paymentId}: ${data.paymentId}`, leftColX, currentY);
            currentY += 14;
          }

          if (data.paymentDate) {
            doc.text(`${t.paymentDate}: ${this.formatDate(data.paymentDate, config.language === 'es' ? 'es-AR' : 'en-US')}`, leftColX, currentY);
            currentY += 14;
          }

          if (data.paymentStatus) {
            const statusText = data.paymentStatus === 'approved' || data.paymentStatus === 'paid'
              ? t.paid
              : t.pending;
            const statusColor = data.paymentStatus === 'approved' || data.paymentStatus === 'paid'
              ? '#16A34A'
              : '#DC2626';
            doc.fillColor(statusColor)
               .text(`${t.paymentStatus}: ${statusText}`, leftColX, currentY);
            currentY += 14;
          }
        }

        // =================================================================
        // FOOTER
        // =================================================================

        const footerY = doc.page.height - 80;

        // Thank you message
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(`rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b})`)
           .text(t.thankYou, 50, footerY, { width: contentWidth, align: 'center' });

        // Contact info
        if (data.tenantEmail) {
          doc.fontSize(9)
             .font('Helvetica')
             .fillColor('#666666')
             .text(`${t.questions} ${data.tenantEmail}`, 50, footerY + 20, { width: contentWidth, align: 'center' });
        }

        // Footer text (custom)
        if (data.footerText) {
          doc.fontSize(8)
             .text(data.footerText, 50, footerY + 35, { width: contentWidth, align: 'center' });
        }

        // Generated date
        doc.fontSize(8)
           .fillColor('#999999')
           .text(`${t.generatedOn} ${this.formatDate(new Date(), config.language === 'es' ? 'es-AR' : 'en-US')}`, 50, footerY + 50, { width: contentWidth, align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Fetch order data and generate invoice
   */
  async generateInvoiceFromOrder(
    supabase: SupabaseClient<Database>,
    orderId: string,
    tenantId: string,
    options: InvoiceGenerationOptions = {}
  ): Promise<{ success: boolean; pdf?: Buffer; error?: string }> {
    const log = this.log.child({ orderId, tenantId });

    try {
      // Check if invoice generation is enabled for this tenant
      const featureFlag = options.isReceipt ? 'receipt_generation_enabled' : 'invoice_generation_enabled';
      const isEnabled = await tenantFeaturesService.isFeatureEnabled(supabase, tenantId, featureFlag);

      if (!isEnabled) {
        const docType = options.isReceipt ? 'recibos' : 'facturas';
        log.info('feature_disabled', { feature: featureFlag });
        return { success: false, error: `La generación de ${docType} está deshabilitada para este tenant` };
      }
      // Fetch order with related data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: orderData, error: orderError } = await supabase
        .from('unified_orders')
        .select(`
          *,
          coupons (
            id, code, type, value, description
          )
        `)
        .eq('id', orderId)
        .maybeSingle() as { data: any; error: any };

      if (orderError || !orderData) {
        log.error('order_fetch_failed', { error: orderError?.message });
        return { success: false, error: 'Orden no encontrada' };
      }

      const order = orderData;

      // Fetch tenant info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, branding_config, email_config')
        .eq('id', tenantId)
        .maybeSingle() as { data: any; error: any };

      // Fetch event info if available
      let event: { name?: string; school?: string; date?: string } | null = null;
      if (order.event_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: eventData } = await supabase
          .from('events')
          .select('name, school, date')
          .eq('id', order.event_id)
          .maybeSingle() as { data: any; error: any };
        event = eventData;
      }

      // Parse JSONB fields
      const basePackage = order.base_package;
      const contactInfo = order.contact_info;
      const additionalCopies = order.additional_copies || [];
      const coupon = order.coupons;
      const brandingConfig = tenant?.branding_config || {};

      // Build items list
      const items: InvoiceItem[] = [];

      // Base package
      if (basePackage) {
        items.push({
          description: basePackage.name || 'Paquete Base',
          quantity: 1,
          unitPriceCents: Math.round((order.base_price || 0) * 100),
          totalCents: Math.round((order.base_price || 0) * 100),
        });
      }

      // Additional copies
      for (const copy of additionalCopies) {
        items.push({
          description: copy.metadata?.size ? `Copia adicional ${copy.metadata.size}` : 'Copia adicional',
          quantity: copy.quantity || 1,
          unitPriceCents: Math.round((copy.unitPrice || 0) * 100),
          totalCents: Math.round((copy.totalPrice || 0) * 100),
        });
      }

      // Build invoice data
      const invoiceData: InvoiceData = {
        orderId: order.id,
        orderNumber: order.id.slice(0, 8).toUpperCase(),
        orderDate: new Date(order.created_at),
        orderStatus: order.status,

        customerName: contactInfo?.name || 'Cliente',
        customerEmail: contactInfo?.email || '',
        customerPhone: contactInfo?.phone,
        customerAddress: contactInfo?.address,

        items,

        subtotalCents: Math.round(((order.base_price || 0) + (order.additions_price || 0)) * 100),
        discountCents: (order.coupon_discount_cents || 0),
        couponCode: coupon?.code,
        couponDescription: coupon?.description,
        shippingCents: Math.round((order.shipping_cost || 0) * 100),
        taxCents: 0, // Tax included in Argentina
        totalCents: Math.round((order.total_price || 0) * 100),
        currency: order.currency || 'ARS',

        paymentMethod: order.payment_method || undefined,
        paymentId: order.mercadopago_payment_id || undefined,
        paymentStatus: order.mercadopago_status || undefined,

        tenantName: tenant?.name || 'Apertura',
        tenantLogo: brandingConfig.logo_url,
        tenantEmail: (tenant?.email_config as any)?.from_email || brandingConfig.contact_email,
        tenantPhone: brandingConfig.contact_phone,
        tenantAddress: brandingConfig.address,
        tenantTaxId: brandingConfig.tax_id,
        primaryColor: brandingConfig.primary_color || '#3B82F6',
        secondaryColor: brandingConfig.secondary_color,
        footerText: brandingConfig.footer_text,

        eventName: event?.name,
        eventDate: event?.date ? new Date(event.date) : undefined,
        eventSchool: event?.school,
      };

      // Generate PDF
      const pdf = await this.generateInvoicePDF(invoiceData, options);

      log.info('invoice_generated', { orderId, pdfSize: pdf.length });
      return { success: true, pdf };

    } catch (error) {
      log.error('invoice_generation_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al generar factura',
      };
    }
  }

  /**
   * Generate a receipt (simplified invoice for customers)
   */
  async generateReceiptFromOrder(
    supabase: SupabaseClient<Database>,
    orderId: string,
    tenantId: string
  ): Promise<{ success: boolean; pdf?: Buffer; error?: string }> {
    return this.generateInvoiceFromOrder(supabase, orderId, tenantId, {
      isReceipt: true,
      includePaymentDetails: true,
    });
  }
}

// Export singleton instance
export const invoiceService = new InvoiceService();
