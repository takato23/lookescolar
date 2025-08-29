import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

/**
 * MercadoPago Webhook Handler
 * 
 * Processes payment notifications from MercadoPago
 * Updates order status and triggers production workflow
 */

interface MercadoPagoNotification {
  id: number;
  live_mode: boolean;
  type: 'payment' | 'plan' | 'subscription' | 'invoice' | 'point_integration_wh';
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
  status: 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
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
  try {
    console.log('🔔 [WEBHOOK] Notificación recibida de MercadoPago');
    
    const body = await request.json();
    console.log('📋 [WEBHOOK] Datos recibidos:', JSON.stringify(body, null, 2));
    
    // Verificar que sea una notificación válida
    if (!body.data || !body.data.id) {
      console.log('❌ [WEBHOOK] Datos inválidos');
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    
    const paymentId = body.data.id;
    console.log('💰 [WEBHOOK] Procesando pago:', paymentId);
    
    // Obtener detalles del pago desde MercadoPago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      console.error('❌ [WEBHOOK] Error obteniendo detalles del pago');
      return NextResponse.json({ error: 'Error obteniendo detalles' }, { status: 500 });
    }
    
    const payment = await response.json();
    console.log('📊 [WEBHOOK] Detalles del pago:', JSON.stringify(payment, null, 2));
    
    // Actualizar orden en la base de datos
    const supabase = await createServerSupabaseServiceClient();
    
    // Buscar por external_reference (que es el order.id)
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: payment.status === 'approved' ? 'paid' : 'pending',
        mp_payment_id: payment.id,
        mp_status: payment.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.external_reference);
    
    if (updateError) {
      console.error('❌ [WEBHOOK] Error actualizando orden:', updateError);
      return NextResponse.json({ error: 'Error actualizando orden' }, { status: 500 });
    }
    
    console.log('✅ [WEBHOOK] Orden actualizada correctamente');
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Error general:', error);
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
