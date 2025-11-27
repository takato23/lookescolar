import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { AuthMiddleware, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';
import { invoiceService } from '@/lib/services/invoice.service';

// =============================================================================
// GET - Generate and download invoice/receipt PDF for an order
// =============================================================================

export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    try {
      if (!authContext.isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      // Extract order ID from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const orderId = pathParts[pathParts.indexOf('orders') + 1];

      if (!orderId) {
        return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
      }

      SecurityLogger.logResourceAccess('order_invoice_generate', authContext, request);

      const { tenantId } = resolveTenantFromHeaders(request.headers);
      const supabase = await createServerSupabaseServiceClient();

      // Parse query params
      const searchParams = url.searchParams;
      const type = searchParams.get('type') || 'invoice'; // 'invoice' or 'receipt'
      const language = searchParams.get('lang') === 'en' ? 'en' : 'es';
      const download = searchParams.get('download') !== 'false';

      // Generate the PDF
      const result = type === 'receipt'
        ? await invoiceService.generateReceiptFromOrder(supabase, orderId, tenantId)
        : await invoiceService.generateInvoiceFromOrder(supabase, orderId, tenantId, {
            language,
            includePaymentDetails: true,
          });

      if (!result.success || !result.pdf) {
        return NextResponse.json(
          { error: result.error || 'Error al generar documento' },
          { status: 500 }
        );
      }

      // Get order number for filename
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: order } = await supabase
        .from('unified_orders')
        .select('id, created_at')
        .eq('id', orderId)
        .maybeSingle() as { data: any; error: any };

      const orderNumber = order?.id?.slice(0, 8).toUpperCase() || orderId.slice(0, 8);
      const filename = type === 'receipt'
        ? `recibo-${orderNumber}.pdf`
        : `factura-${orderNumber}.pdf`;

      // Return PDF
      const headers: HeadersInit = {
        'Content-Type': 'application/pdf',
        'Content-Length': result.pdf.length.toString(),
      };

      if (download) {
        headers['Content-Disposition'] = `attachment; filename="${filename}"`;
      } else {
        headers['Content-Disposition'] = `inline; filename="${filename}"`;
      }

      return new NextResponse(result.pdf, { status: 200, headers });

    } catch (error) {
      console.error('[Invoice API] Error:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  })
);
