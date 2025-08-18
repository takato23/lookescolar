import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import crypto from 'crypto';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Estados de MP mapeados a estados internos
export const MP_STATUS_MAPPING = {
  approved: 'approved',
  pending: 'pending',
  in_process: 'pending',
  in_mediation: 'pending',
  rejected: 'failed',
  cancelled: 'failed',
  refunded: 'failed',
  charged_back: 'failed',
} as const;

export type MPStatus = keyof typeof MP_STATUS_MAPPING;
export type OrderStatus = (typeof MP_STATUS_MAPPING)[MPStatus];

// Configuración del cliente MP con reintentos
const getMPClient = () => {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('MP_ACCESS_TOKEN no configurado');
  }

  return new MercadoPagoConfig({
    accessToken,
    options: {
      timeout: 10000, // Incrementar timeout a 10s
      idempotencyKey: crypto.randomBytes(16).toString('hex'),
    },
  });
};

// Crear preferencia de pago
export interface CreatePreferenceParams {
  orderId: string;
  items: {
    title: string;
    quantity: number;
    unit_price: number;
  }[];
  payer: {
    name: string;
    email: string;
    phone?: string;
  };
}

export const createPaymentPreference = async (
  params: CreatePreferenceParams,
  retryCount: number = 0
): Promise<{ id: string; init_point: string; sandbox_init_point: string }> => {
  const MAX_RETRIES = 2;

  try {
    const client = getMPClient();
    const preference = new Preference(client);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Preferencia mínima para debugging
    const preferenceData = {
      items: params.items,
      back_urls: {
        success: `${baseUrl}/f/success`,
        failure: `${baseUrl}/f/error`,
        pending: `${baseUrl}/f/pending`,
      },
      external_reference: params.orderId,
    };

    console.log('[MP DEBUG] Enviando preferenceData:', JSON.stringify(preferenceData, null, 2));
    const result = await preference.create({ body: preferenceData });
    console.log('[MP DEBUG] Respuesta MP:', { id: result.id, hasInitPoint: !!result.init_point, hasSandboxInitPoint: !!result.sandbox_init_point });

    if (!result.id || !result.init_point || !result.sandbox_init_point) {
      throw new Error('Respuesta incompleta de MercadoPago');
    }

    return {
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    };
  } catch (error) {
    console.error(
      `Error creando preferencia MP (intento ${retryCount + 1}):`,
      error
    );

    // Retry logic for transient errors
    if (retryCount < MAX_RETRIES) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      console.info(`Reintentando crear preferencia en ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return createPaymentPreference(params, retryCount + 1);
    }

    throw new Error('Error al crear preferencia de pago después de reintentos');
  }
};

// Obtener información del pago con reintentos
export const getPaymentInfo = async (
  paymentId: string,
  retryCount: number = 0
) => {
  const MAX_RETRIES = 3;

  try {
    const client = getMPClient();
    const payment = new Payment(client);

    const result = await payment.get({ id: paymentId });

    if (!result) {
      throw new Error('Pago no encontrado en MercadoPago');
    }

    return result;
  } catch (error: any) {
    console.error(
      `Error obteniendo pago ${paymentId} (intento ${retryCount + 1}):`,
      {
        error: error.message,
        status: error.status,
        cause: error.cause,
      }
    );

    // Retry for transient errors (rate limits, network issues)
    if (
      retryCount < MAX_RETRIES &&
      (error.status === 429 || // Rate limit
        error.status >= 500 || // Server errors
        error.code === 'ECONNRESET' || // Network issues
        error.code === 'ETIMEDOUT')
    ) {
      const delay = Math.min(
        1000 * Math.pow(2, retryCount) + Math.random() * 1000,
        10000
      );
      console.info(`Reintentando obtener pago en ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return getPaymentInfo(paymentId, retryCount + 1);
    }

    throw new Error(
      `Error al obtener información del pago después de ${retryCount + 1} intentos`
    );
  }
};

// Verificar webhook signature
export const verifyWebhookSignature = (
  body: string,
  signature: string,
  secret: string = process.env.MP_WEBHOOK_SECRET || ''
): boolean => {
  if (!secret || !signature) {
    console.error(
      'Webhook signature verification failed: missing secret or signature'
    );
    return false;
  }

  try {
    // MP envía la signature como "v1=hash"
    const expectedSignature = signature.startsWith('v1=')
      ? signature
      : `v1=${signature}`;

    const computedHash = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const computedSignature = `v1=${computedHash}`;

    // Comparación time-safe para evitar timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    console.error('Error verificando signature webhook:', error);
    return false;
  }
};

// Procesar notificación de webhook con integración completa payments table
export const processWebhookNotification = async (
  paymentId: string,
  retryCount: number = 0
): Promise<{ success: boolean; message: string }> => {
  const MAX_RETRIES = 3;
  const supabase = createServerSupabaseServiceClient();

  try {
    // Obtener información del pago desde MP
    const paymentInfo = await getPaymentInfo(paymentId);

    if (!paymentInfo.external_reference) {
      return {
        success: false,
        message: 'External reference faltante en pago MP',
      };
    }

    const orderId = paymentInfo.external_reference;
    const mpStatus = paymentInfo.status as MPStatus;
    const internalStatus = MP_STATUS_MAPPING[mpStatus] || 'pending';
    const amountCents = Math.round((paymentInfo.transaction_amount || 0) * 100);

    // Log del pago recibido (datos importantes sin información sensible)
    console.info('Processing payment notification', {
      paymentId: `pay_***${paymentId.slice(-4)}`,
      orderId: `ord_***${orderId.slice(-4)}`,
      mpStatus,
      internalStatus,
      amount: paymentInfo.transaction_amount,
      paymentType: paymentInfo.payment_type_id,
      paymentMethod: paymentInfo.payment_method_id,
    });

    // IDEMPOTENCIA: Verificar si ya existe un payment record con este mp_payment_id
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, mp_payment_id, order_id')
      .eq('mp_payment_id', paymentId)
      .single();

    if (existingPayment) {
      console.info('Payment already exists in payments table (idempotencia)', {
        paymentId: `pay_***${paymentId.slice(-4)}`,
        existingPaymentId: existingPayment.id,
      });
      return {
        success: true,
        message: 'Pago ya procesado anteriormente (idempotencia)',
      };
    }

    // Verificar que la orden existe antes de procesar
    const { data: orderExists } = await supabase
      .from('orders')
      .select('id, status, mp_payment_id, total_amount_cents')
      .eq('id', orderId)
      .single();

    if (!orderExists) {
      console.error(`Order not found for external_reference: ${orderId}`);
      return {
        success: false,
        message: 'Orden no encontrada en base de datos',
      };
    }

    // Verificar idempotencia a nivel orden también (backup)
    if (orderExists.mp_payment_id === paymentId) {
      console.info(
        'Payment already processed at order level (backup idempotencia)'
      );
      return {
        success: true,
        message: 'Pago ya procesado anteriormente en orden',
      };
    }

    // Usar transacción para atomicidad - actualizar orden Y crear payment record
    const { error: transactionError } = await supabase.rpc(
      'process_payment_webhook',
      {
        p_order_id: orderId,
        p_mp_payment_id: paymentId,
        p_mp_preference_id: paymentInfo.preference_id,
        p_mp_external_reference: orderId,
        p_mp_status: mpStatus,
        p_mp_status_detail: paymentInfo.status_detail || null,
        p_mp_payment_type: paymentInfo.payment_type_id || null,
        p_amount_cents: amountCents,
        p_internal_status: internalStatus,
        p_webhook_data: JSON.stringify({
          collector_id: paymentInfo.collector_id,
          operation_type: paymentInfo.operation_type,
          payment_method_id: paymentInfo.payment_method_id,
          payment_type_id: paymentInfo.payment_type_id,
          status_detail: paymentInfo.status_detail,
          transaction_amount: paymentInfo.transaction_amount,
          installments: paymentInfo.installments,
          processed_at: new Date().toISOString(),
        }),
      }
    );

    // Si la función RPC no existe, hacer transacción manual
    if (transactionError?.code === '42883') {
      // función no existe
      console.warn('RPC function not found, using manual transaction');

      // Transacción manual: crear payment record y actualizar orden
      const paymentRecord = {
        order_id: orderId,
        mp_payment_id: paymentId,
        mp_preference_id: paymentInfo.preference_id || null,
        mp_external_reference: orderId,
        mp_status: mpStatus,
        mp_status_detail: paymentInfo.status_detail || null,
        mp_payment_type: paymentInfo.payment_type_id || null,
        amount_cents: amountCents,
        processed_at:
          internalStatus === 'approved' ? new Date().toISOString() : null,
        webhook_data: {
          collector_id: paymentInfo.collector_id,
          operation_type: paymentInfo.operation_type,
          payment_method_id: paymentInfo.payment_method_id,
          payment_type_id: paymentInfo.payment_type_id,
          status_detail: paymentInfo.status_detail,
          transaction_amount: paymentInfo.transaction_amount,
          installments: paymentInfo.installments,
          processed_at: new Date().toISOString(),
        },
      };

      // Crear payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentRecord);

      if (paymentError) {
        console.error('Error creating payment record:', {
          error: paymentError.message,
          orderId: `ord_***${orderId.slice(-4)}`,
          paymentId: `pay_***${paymentId.slice(-4)}`,
        });
        return { success: false, message: 'Error creando registro de pago' };
      }

      // Actualizar orden
      const orderUpdateData = {
        mp_payment_id: paymentId,
        mp_status: mpStatus,
        status: internalStatus,
        updated_at: new Date().toISOString(),
      };

      if (internalStatus === 'approved') {
        Object.assign(orderUpdateData, {
          mp_external_reference: orderId,
          approved_at: new Date().toISOString(),
        });
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update(orderUpdateData)
        .eq('id', orderId);

      if (orderError) {
        console.error('Error actualizando orden:', {
          error: orderError.message,
          orderId: `ord_***${orderId.slice(-4)}`,
          paymentId: `pay_***${paymentId.slice(-4)}`,
        });
        return { success: false, message: 'Error actualizando orden en BD' };
      }
    } else if (transactionError) {
      console.error('Error in payment webhook transaction:', {
        error: transactionError.message,
        orderId: `ord_***${orderId.slice(-4)}`,
        paymentId: `pay_***${paymentId.slice(-4)}`,
      });
      return {
        success: false,
        message: 'Error procesando transacción de pago',
      };
    }

    // Log exitoso
    console.info('Payment notification processed successfully', {
      paymentId: `pay_***${paymentId.slice(-4)}`,
      orderId: `ord_***${orderId.slice(-4)}`,
      oldStatus: orderExists.status,
      newStatus: internalStatus,
      amountCents,
      hasPaymentRecord: true,
    });

    return {
      success: true,
      message: `Orden ${orderId.slice(0, 8)} actualizada: ${orderExists.status} → ${internalStatus}`,
    };
  } catch (error: any) {
    console.error(`Error procesando webhook (intento ${retryCount + 1}):`, {
      error: error.message,
      paymentId: `pay_***${paymentId.slice(-4)}`,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // Primeras 3 líneas del stack
    });

    if (retryCount < MAX_RETRIES) {
      // Retry exponencial con jitter
      const baseDelay = 1000 * Math.pow(2, retryCount);
      const jitter = Math.random() * 1000;
      const delay = Math.min(baseDelay + jitter, 30000);

      console.info(`Reintentando procesamiento en ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return processWebhookNotification(paymentId, retryCount + 1);
    }

    return {
      success: false,
      message: `Error después de ${MAX_RETRIES + 1} intentos: ${error.message}`,
    };
  }
};

// Validar que solo haya un pedido pendiente por sujeto
export const validateSinglePendingOrder = async (
  subjectId: string
): Promise<boolean> => {
  const supabase = await createServerSupabaseServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('subject_id', subjectId)
    .in('status', ['pending'])
    .limit(1);

  if (error) {
    console.error('Error validando pedidos pendientes:', error);
    throw new Error('Error validando pedidos existentes');
  }

  return data.length === 0;
};
