import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Schema para validación de query parameters
const OrderStatusQuerySchema = z
  .object({
    token: z.string().min(20, 'Token inválido').optional(),
    orderId: z.string().uuid('Order ID inválido').optional(),
  })
  .refine((data) => data.token || data.orderId, {
    message: 'Se requiere token o orderId',
  });

// Rate limiting: 30 req/min por IP para status checks
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
});

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');
    const token = url.searchParams.get('token');

    // Validar parámetros
    if (!orderId && !token) {
      return NextResponse.json(
        { error: 'Se requiere orderId o token' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseServiceClient();

    // Usar la nueva vista con información de pagos
    let query = supabase.from('order_status_with_payments').select(`
        order_id,
        order_status,
        total_amount_cents,
        order_created_at,
        order_updated_at,
        approved_at,
        contact_name,
        contact_email,
        payment_id,
        mp_payment_id,
        mp_status,
        mp_status_detail,
        mp_payment_type,
        payment_amount_cents,
        processed_at,
        event_name,
        event_school,
        first_name,
        last_name,
        subject_type
      `);

    // Validar parámetros usando zod
    const validation = OrderStatusQuerySchema.safeParse({ token, orderId });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: validation.error.issues },
        { status: 400 }
      );
    }

    // Buscar por orderId o por token del sujeto
    if (validation.data.orderId) {
      query = query.eq('order_id', validation.data.orderId);
    } else if (validation.data.token) {
      // Validar token y obtener subject_id
      const { data: tokenData } = await supabase
        .from('subject_tokens')
        .select('subject_id, expires_at')
        .eq('token', validation.data.token)
        .single();

      if (!tokenData || new Date(tokenData.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Token inválido o expirado' },
          { status: 401 }
        );
      }

      query = query.eq('subject_id', tokenData.subject_id);
    }

    const { data: orders, error } = await query.order('order_created_at', {
      ascending: false,
    });

    if (error) {
      console.error(
        `[${requestId}] Error obteniendo estado del pedido:`,
        error
      );
      return NextResponse.json(
        { error: 'Error obteniendo estado del pedido' },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    // Mapear datos para respuesta mejorada
    const ordersWithStatus = orders.map((order) => ({
      orderId: order.order_id,
      status: order.order_status,
      totalAmount: order.total_amount_cents
        ? Math.round(order.total_amount_cents / 100)
        : 0,
      createdAt: order.order_created_at,
      updatedAt: order.order_updated_at,
      approvedAt: order.approved_at,
      contactName: order.contact_name,
      contactEmail: order.contact_email,
      subject: {
        name: order.first_name + (order.last_name ? ` ${order.last_name}` : ''),
        type: order.subject_type,
      },
      event: {
        name: order.event_name,
        school: order.event_school,
      },
      payment: order.payment_id
        ? {
            id: order.payment_id,
            mpPaymentId: order.mp_payment_id,
            status: order.mp_status,
            statusDetail: order.mp_status_detail,
            paymentType: order.mp_payment_type,
            amount: order.payment_amount_cents
              ? Math.round(order.payment_amount_cents / 100)
              : 0,
            processedAt: order.processed_at,
          }
        : null,
      // Status traducido para mostrar al usuario
      statusDisplay: getStatusDisplay(order.order_status, order.mp_status),
      // Próximos pasos sugeridos
      nextSteps: getNextSteps(order.order_status, order.mp_status),
    }));

    const duration = Date.now() - startTime;
    console.info(`[${requestId}] Estado de pedido consultado`, {
      ordersCount: ordersWithStatus.length,
      hasSpecificOrder: !!validation.data.orderId,
      duration,
    });

    return NextResponse.json({
      success: true,
      orders: ordersWithStatus,
      totalOrders: ordersWithStatus.length,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error en API de estado del pedido:`, error);

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Helper para traducir estados al español
function getStatusDisplay(orderStatus: string, mpStatus?: string): string {
  switch (orderStatus) {
    case 'pending':
      if (mpStatus === 'pending') return 'Pago pendiente de confirmación';
      if (mpStatus === 'in_process') return 'Procesando pago...';
      return 'Esperando pago';
    case 'approved':
      return 'Pagado - Procesando pedido';
    case 'delivered':
      return 'Entregado';
    case 'cancelled':
      return 'Cancelado';
    case 'failed':
      return 'Pago rechazado';
    default:
      return 'Estado desconocido';
  }
}

// Helper para sugerir próximos pasos
function getNextSteps(orderStatus: string, mpStatus?: string): string[] {
  const steps: string[] = [];

  switch (orderStatus) {
    case 'pending':
      if (!mpStatus || mpStatus === 'pending') {
        steps.push('Completa el pago a través del enlace de Mercado Pago');
        steps.push('El pago puede demorar unos minutos en confirmarse');
      } else if (mpStatus === 'in_process') {
        steps.push('Tu pago está siendo procesado por Mercado Pago');
        steps.push('Te notificaremos cuando se confirme');
      }
      break;
    case 'approved':
      steps.push('Tu pago fue aprobado exitosamente');
      steps.push('Estamos preparando tu pedido');
      steps.push('Te contactaremos para coordinar la entrega');
      break;
    case 'delivered':
      steps.push('Tu pedido fue entregado');
      steps.push('Si tienes alguna consulta, contacta al fotógrafo');
      break;
    case 'failed':
      steps.push('El pago no pudo ser procesado');
      steps.push('Puedes intentar realizar el pago nuevamente');
      steps.push('Verifica los datos de tu tarjeta o método de pago');
      break;
    case 'cancelled':
      steps.push('El pedido fue cancelado');
      steps.push('Si necesitas ayuda, contacta al fotógrafo');
      break;
  }

  return steps;
}
