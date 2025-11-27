import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { invoiceService } from '@/lib/services/invoice.service';

// =============================================================================
// GET - Download receipt PDF using order ID and email verification
// Public endpoint - no auth required but validated by order email
// =============================================================================

export const GET = RateLimitMiddleware.withRateLimit(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('order');
    const email = url.searchParams.get('email');
    const token = url.searchParams.get('token'); // Optional secure token for direct access

    // Validate required params
    if (!orderId) {
      return NextResponse.json(
        { error: 'Se requiere ID de orden' },
        { status: 400 }
      );
    }

    if (!email && !token) {
      return NextResponse.json(
        { error: 'Se requiere email o token de acceso' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Fetch order to validate ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderData, error: orderError } = await supabase
      .from('unified_orders')
      .select('id, token, contact_info, status, mercadopago_status')
      .eq('id', orderId)
      .maybeSingle() as { data: any; error: any };

    if (orderError || !orderData) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    const order = orderData;

    // Parse contact info
    const contactInfo = order.contact_info as { email?: string; name?: string } | null;

    // Validate access
    let isAuthorized = false;

    // Method 1: Validate by email
    if (email) {
      const orderEmail = contactInfo?.email?.toLowerCase().trim();
      const providedEmail = email.toLowerCase().trim();
      isAuthorized = orderEmail === providedEmail;
    }

    // Method 2: Validate by family token
    if (!isAuthorized && token) {
      isAuthorized = order.token === token;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Acceso no autorizado' },
        { status: 403 }
      );
    }

    // Only allow receipt generation for paid/approved orders
    const validStatuses = ['paid', 'in_production', 'shipped', 'delivered'];
    const validMPStatuses = ['approved'];

    if (!validStatuses.includes(order.status) && !validMPStatuses.includes(order.mercadopago_status || '')) {
      return NextResponse.json(
        { error: 'El recibo solo esta disponible para ordenes pagadas' },
        { status: 400 }
      );
    }

    // Get tenant ID from order (need to fetch more data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderWithTenant } = await supabase
      .from('unified_orders')
      .select(`
        id,
        events!inner (
          tenant_id
        )
      `)
      .eq('id', orderId)
      .maybeSingle() as { data: any; error: any };

    // If order doesn't have an event, try to get tenant from share token
    let tenantId: string | null = null;

    if (orderWithTenant?.events?.tenant_id) {
      tenantId = orderWithTenant.events.tenant_id;
    } else if (order.token) {
      // Look up tenant from family_tokens
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tokenData } = await supabase
        .from('family_tokens')
        .select('tenant_id')
        .eq('token', order.token)
        .maybeSingle() as { data: any; error: any };

      tenantId = tokenData?.tenant_id || null;
    }

    // Default tenant if none found
    if (!tenantId) {
      tenantId = process.env.NEXT_PUBLIC_MULTITENANT_DEFAULT_TENANT_ID || 'default';
    }

    // Generate receipt PDF
    const result = await invoiceService.generateReceiptFromOrder(
      supabase,
      orderId,
      tenantId
    );

    if (!result.success || !result.pdf) {
      return NextResponse.json(
        { error: result.error || 'Error al generar recibo' },
        { status: 500 }
      );
    }

    // Build filename
    const orderNumber = (order.id as string).slice(0, 8).toUpperCase();
    const filename = `recibo-${orderNumber}.pdf`;

    // Return PDF
    return new NextResponse(result.pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': result.pdf.length.toString(),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-cache',
      },
    });

  } catch (error) {
    console.error('[Public Receipt API] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});
