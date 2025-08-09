import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paymentClient, MP_CONFIG } from '@/lib/mercadopago/client';
import crypto from 'crypto';

// Verify webhook signature from Mercado Pago
function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  secret: string
): boolean {
  if (!xSignature || !xRequestId) {
    return false;
  }

  // Extract ts and hash from x-signature header
  const parts = xSignature.split(',');
  let ts = '';
  let hash = '';
  
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 'ts') {
      ts = value;
    } else if (key === 'v1') {
      hash = value;
    }
  }
  
  if (!ts || !hash) {
    return false;
  }
  
  // Create the manifest string
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  
  // Generate HMAC signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(manifest);
  const calculatedHash = hmac.digest('hex');
  
  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(calculatedHash)
  );
}

// Map Mercado Pago status to internal status
function mapPaymentStatus(mpStatus: string): string {
  const statusMap: Record<string, string> = {
    'approved': 'approved',
    'pending': 'pending',
    'in_process': 'pending',
    'rejected': 'rejected',
    'cancelled': 'cancelled',
    'refunded': 'cancelled',
    'charged_back': 'cancelled'
  };
  
  return statusMap[mpStatus] || 'pending';
}

export async function POST(request: NextRequest) {
  try {
    // Get headers
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');
    
    // Parse body
    const body = await request.json();
    
    // Log webhook receipt (without sensitive data)
    console.log('Webhook received:', {
      type: body.type,
      action: body.action,
      id: body.data?.id,
      requestId: xRequestId
    });
    
    // Verify webhook signature
    if (MP_CONFIG.webhookSecret && body.data?.id) {
      const isValid = verifyWebhookSignature(
        xSignature,
        xRequestId,
        body.data.id,
        MP_CONFIG.webhookSecret
      );
      
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }
    
    // Process only payment notifications
    if (body.type !== 'payment' || !body.data?.id) {
      return NextResponse.json({ received: true });
    }
    
    const paymentId = body.data.id;
    
    // Get payment details from Mercado Pago
    const payment = await paymentClient.get({ id: paymentId });
    
    if (!payment) {
      console.error('Payment not found:', paymentId);
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    // Get order ID from external reference
    const orderId = payment.external_reference;
    if (!orderId) {
      console.error('No external reference in payment:', paymentId);
      return NextResponse.json({ received: true });
    }
    
    const supabase = createClient();
    
    // Check if payment already processed (idempotency)
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('mp_payment_id', paymentId.toString())
      .single();
      
    if (existingPayment) {
      console.log('Payment already processed:', paymentId);
      return NextResponse.json({ received: true });
    }
    
    // Map payment status
    const internalStatus = mapPaymentStatus(payment.status || 'pending');
    
    // Prepare webhook data
    const webhookData = {
      payment_id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      payment_type: payment.payment_type_id,
      payment_method_id: payment.payment_method_id,
      transaction_amount: payment.transaction_amount,
      net_received_amount: payment.transaction_details?.net_received_amount,
      total_paid_amount: payment.transaction_details?.total_paid_amount,
      overpaid_amount: payment.transaction_details?.overpaid_amount,
      installments: payment.installments,
      currency_id: payment.currency_id,
      date_created: payment.date_created,
      date_approved: payment.date_approved,
      date_last_updated: payment.date_last_updated,
      payer_email: payment.payer?.email,
      payer_identification: payment.payer?.identification,
      collector_id: payment.collector_id
    };
    
    // Use the atomic function to process payment
    const { error: processError } = await supabase.rpc('process_payment_webhook', {
      p_order_id: orderId,
      p_mp_payment_id: paymentId.toString(),
      p_mp_preference_id: payment.preference_id || null,
      p_mp_external_reference: payment.external_reference || orderId,
      p_mp_status: payment.status || 'pending',
      p_mp_status_detail: payment.status_detail || null,
      p_mp_payment_type: payment.payment_type_id || null,
      p_amount_cents: Math.round((payment.transaction_amount || 0) * 100),
      p_internal_status: internalStatus,
      p_webhook_data: webhookData
    });
    
    if (processError) {
      // Check if it's a duplicate payment error
      if (processError.message?.includes('already processed')) {
        console.log('Payment already processed (from function):', paymentId);
        return NextResponse.json({ received: true });
      }
      
      console.error('Error processing payment webhook:', processError);
      return NextResponse.json(
        { error: 'Failed to process payment' },
        { status: 500 }
      );
    }
    
    // Log successful processing
    console.log('Payment processed successfully:', {
      orderId,
      paymentId,
      status: internalStatus,
      amount: payment.transaction_amount
    });
    
    // Send notification email if payment approved (optional)
    if (internalStatus === 'approved') {
      // TODO: Send confirmation email to customer
      // await sendPaymentConfirmationEmail(orderId);
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Return 200 to prevent Mercado Pago from retrying
    // Log the error for investigation
    return NextResponse.json({ 
      received: true,
      error: 'Internal processing error'
    });
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}