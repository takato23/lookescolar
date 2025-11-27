import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { AuthMiddleware, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';
import { emailService, type EmailType, type OrderEmailData } from '@/lib/services/email.service';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const sendEmailSchema = z.object({
  orderId: z.string().uuid(),
  emailType: z.enum(['order_confirmation', 'order_ready', 'download_ready', 'order_shipped', 'order_cancelled']),
});

// =============================================================================
// POST - Send email for an order
// =============================================================================

export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    try {
      if (!authContext.isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      SecurityLogger.logResourceAccess('email_send', authContext, request);

      const { tenantId } = resolveTenantFromHeaders(request.headers);
      const supabase = await createServerSupabaseServiceClient();

      const body = await request.json();
      const validation = sendEmailSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Datos invalidos', details: validation.error.errors },
          { status: 400 }
        );
      }

      const { orderId, emailType } = validation.data;

      // Fetch order data
      const { data: order, error: orderError } = await supabase
        .from('unified_orders')
        .select(`
          id,
          total_price,
          currency,
          contact_info,
          selected_photos,
          has_digital_items,
          coupon_discount_cents,
          event:events(id, name)
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (orderError || !order) {
        return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
      }

      // Cast order to proper types
      const orderData = order as Record<string, unknown>;
      const contactInfo = (orderData.contact_info as { name?: string; email?: string; phone?: string }) || {};

      if (!contactInfo.email) {
        return NextResponse.json({ error: 'La orden no tiene email de contacto' }, { status: 400 });
      }

      const orderId_ = orderData.id as string;
      const currency = (orderData.currency as string) || 'ARS';
      const totalPrice = orderData.total_price as number;
      const couponDiscountCents = (orderData.coupon_discount_cents as number) || 0;
      const hasDigitalItems = (orderData.has_digital_items as boolean) || false;
      const eventInfo = orderData.event as { name?: string } | null;

      // Build email data
      const emailData: OrderEmailData = {
        orderId: orderId_,
        orderNumber: orderId_.slice(0, 8).toUpperCase(),
        customerName: contactInfo.name || 'Cliente',
        customerEmail: contactInfo.email,
        customerPhone: contactInfo.phone,
        eventName: eventInfo?.name,
        items: [], // Would need to fetch order_items for full detail
        subtotalFormatted: new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency,
        }).format(Number(totalPrice) + couponDiscountCents / 100),
        discountFormatted: couponDiscountCents
          ? new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency,
            }).format(couponDiscountCents / 100)
          : undefined,
        totalFormatted: new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency,
        }).format(Number(totalPrice)),
        currency,
        hasDigitalItems,
        hasPhysicalItems: true, // Default to true for physical
      };

      // If download_ready, fetch download links
      if (emailType === 'download_ready') {
        const { data: downloads } = await supabase
          .from('downloads')
          .select('photo_id, token, expires_at, download_count, max_downloads')
          .eq('order_id', orderId);

        if (downloads && downloads.length > 0) {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
          emailData.downloadLinks = downloads.map((d: Record<string, unknown>) => ({
            photoId: d.photo_id as string,
            downloadUrl: `${baseUrl}/download/${d.token as string}`,
            expiresAt: d.expires_at as string,
            remainingDownloads: (d.max_downloads as number) - (d.download_count as number),
          }));
        }
      }

      // Send email
      const result = await emailService.sendEmail({
        supabase,
        tenantId,
        emailType: emailType as EmailType,
        to: contactInfo.email,
        data: emailData,
        requestId: `req_${Date.now()}`,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        emailLogId: result.emailLogId,
      });
    } catch (error) {
      console.error('[Email Send API] POST error:', error);
      return NextResponse.json(
        { error: 'Error al enviar email' },
        { status: 500 }
      );
    }
  })
);
