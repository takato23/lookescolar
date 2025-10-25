import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { logger, generateRequestId } from '@/lib/utils/logger';
import { whatsappNotificationService } from '@/lib/services/whatsapp-notification.service';

/**
 * MercadoPago Webhook Handler
 *
 * Processes payment notifications from MercadoPago
 * Updates order status and triggers production workflow
 */

interface MercadoPagoNotification {
  id: number;
  live_mode: boolean;
  type:
    | 'payment'
    | 'plan'
    | 'subscription'
    | 'invoice'
    | 'point_integration_wh';
  date_created: string;
  application_id: number;
  user_id: number;
  version: number;
  api_version: string;
  action: 'payment.created' | 'payment.updated' | string;
  data: {
    id: string;
  };
}

interface MercadoPagoPayment {
  id: number;
  date_created: string;
  date_approved: string | null;
  date_last_updated: string;
  money_release_date: string | null;
  payment_method_id: string;
  payment_type_id: string;
  status:
    | 'pending'
    | 'approved'
    | 'authorized'
    | 'in_process'
    | 'in_mediation'
    | 'rejected'
    | 'cancelled'
    | 'refunded'
    | 'charged_back';
  status_detail: string;
  currency_id: string;
  description: string | null;
  collector_id: number;
  payer: {
    id: string;
    email: string;
    identification: {
      type: string;
      number: string;
    };
    type: string;
  };
  metadata: {
    order_id?: string;
    token?: string;
    contact_name?: string;
    contact_email?: string;
    shipping_address?: string;
  };
  additional_info: {
    items: Array<{
      id: string;
      title: string;
      description: string;
      picture_url: string | null;
      category_id: string;
      quantity: number;
      unit_price: number;
    }>;
    shipments: {
      receiver_address: {
        zip_code: string;
        state_name: string;
        city_name: string;
        street_name: string;
        street_number: string;
      };
    };
  };
  order: {
    id: string;
    type: string;
  };
  external_reference: string | null;
  transaction_amount: number;
  transaction_amount_refunded: number;
  coupon_amount: number;
  differential_pricing_id: number | null;
  financing_group: string | null;
  deduction_schema: string | null;
  installments: number;
  transaction_details: {
    payment_method_reference_id: string | null;
    net_received_amount: number;
    total_paid_amount: number;
    overpaid_amount: number;
    external_resource_url: string | null;
    installment_amount: number;
    financial_institution: string | null;
    payable_deferral_period: string | null;
    acquirer_reference: string | null;
  };
  fee_details: Array<{
    type: string;
    amount: number;
    fee_payer: string;
  }>;
  charges_details: Array<{
    id: string;
    name: string;
    type: string;
    accounts: {
      from: string;
      to: string;
    };
    client_id: number;
    date_created: string;
    last_updated: string;
  }>;
  captured: boolean;
  binary_mode: boolean;
  call_for_authorize_id: string | null;
  statement_descriptor: string | null;
  card: {
    id: string | null;
    first_six_digits: string | null;
    last_four_digits: string | null;
    expiration_month: number | null;
    expiration_year: number | null;
    date_created: string | null;
    date_last_updated: string | null;
    cardholder: {
      name: string | null;
      identification: {
        number: string | null;
        type: string | null;
      };
    };
  } | null;
  notification_url: string | null;
  refunds: Array<any>;
  processing_mode: string;
  merchant_account_id: string | null;
  merchant_number: string | null;
  acquirer_reconciliation: Array<any>;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ requestId });
  
  try {
    log.info('webhook_notification_received', { 
      source: 'mercadopago',
      path: '/api/webhooks/mercadopago' 
    });

    const body = await request.json();
    log.debug('webhook_payload_received', { 
      type: body.type,
      action: body.action,
      dataId: body.data?.id 
    });

    // Verificar que sea una notificación válida
    if (!body.data || !body.data.id) {
      log.warn('webhook_invalid_data', { body });
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const paymentId = body.data.id;
    log.info('payment_processing_started', { paymentId });

    // Obtener detalles del pago desde MercadoPago
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      log.error('payment_details_fetch_failed', { 
        paymentId,
        statusCode: response.status 
      });
      return NextResponse.json(
        { error: 'Error obteniendo detalles' },
        { status: 500 }
      );
    }

    const payment = await response.json();
    log.info('payment_details_retrieved', {
      paymentId: payment?.id,
      status: payment?.status,
      external_reference: payment?.external_reference,
      token: payment?.metadata?.token,
      amount: payment?.transaction_amount
    });

    // Actualizar orden en la base de datos (unified_orders preferido; fallback a orders)
    const supabase = await createServerSupabaseServiceClient();

    const externalRef = payment.external_reference || payment?.metadata?.order_id;
    const isApproved = payment.status === 'approved';

    // Try unified_orders first
    let updatedUnified = false;
    if (externalRef) {
      const { error: uniErr } = await supabase
        .from('unified_orders')
        .update({
          status: isApproved ? 'paid' : 'pending_payment',
          mercadopago_payment_id: String(payment.id),
          mercadopago_status: payment.status,
          payment_method: payment.payment_method_id || payment.payment_type_id || null,
          payment_details: payment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', externalRef);

      if (!uniErr) {
        updatedUnified = true;
        log.info('order_updated', { 
          orderId: externalRef,
          table: 'unified_orders',
          status: isApproved ? 'paid' : 'pending_payment' 
        });
      } else {
        log.warn('unified_orders_update_failed', { 
          orderId: externalRef,
          error: uniErr 
        });
      }
    }

    // Fallback to legacy orders table if unified not updated
    if (!updatedUnified && externalRef) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: isApproved ? 'paid' : 'pending',
          mp_payment_id: payment.id,
          mp_status: payment.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', externalRef);

      if (updateError) {
        log.error('order_update_failed', { 
          orderId: externalRef,
          table: 'orders',
          error: updateError 
        });
        return NextResponse.json(
          { error: 'Error actualizando orden' },
          { status: 500 }
        );
      }
      log.info('order_updated', { 
        orderId: externalRef,
        table: 'orders',
        status: isApproved ? 'paid' : 'pending' 
      });
    }

    if (isApproved && externalRef) {
      try {
        await whatsappNotificationService.handleOrderPaid({
          supabase,
          orderId: externalRef,
          orderSource: updatedUnified ? 'unified_orders' : 'orders',
          requestId,
        });
      } catch (error) {
        const err =
          error instanceof Error ? error.message : String(error ?? 'unknown');
        log.warn('whatsapp_notification_failed', {
          orderId: externalRef,
          error: err,
        });
      }
    }

    const resp = NextResponse.json({ success: true });
    resp.headers.set('X-Request-ID', requestId);
    return resp;
  } catch (error) {
    log.logError(error as Error, { 
      operation: 'webhook_processing',
      path: '/api/webhooks/mercadopago' 
    });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// Also handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');

  if (challenge) {
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({ status: 'Webhook endpoint active' });
}
