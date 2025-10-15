import { preferenceClient, MP_CONFIG } from '@/lib/mercadopago/client';

export interface PreferenceItemInput {
  id: string;
  title: string;
  quantity: number;
  unitPriceCents: number;
  description?: string;
  categoryId?: string;
  pictureUrl?: string;
}

export interface PreferencePayerInput {
  name: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    number?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface PreferenceOptions {
  externalReference: string;
  backUrls: {
    success: string;
    failure: string;
    pending: string;
  };
  metadata?: Record<string, any>;
  expiresAt?: string;
  binaryMode?: boolean;
  statementDescriptor?: string;
  notificationUrl?: string;
}

export interface PreferenceResult {
  id: string;
  initPoint: string;
  sandboxInitPoint: string;
}

export async function createMercadoPagoPreference(params: {
  items: PreferenceItemInput[];
  payer: PreferencePayerInput;
  options: PreferenceOptions;
}): Promise<PreferenceResult> {
  const { items, payer, options } = params;

  const hasAccessToken = Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN);
  const hasPublicKey = Boolean(
    process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || process.env.NEXT_PUBLIC_MP_PUBLIC_KEY
  );

  if (!hasAccessToken || !hasPublicKey) {
    throw new Error('Credenciales de MercadoPago no configuradas');
  }

  const mpItems = items.map((item) => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    unit_price: Math.round(item.unitPriceCents) / 100,
    currency_id: 'ARS' as const,
    description: item.description,
    category_id: item.categoryId ?? 'art',
    picture_url: item.pictureUrl,
  }));

  const mpPayer = {
    name: payer.name,
    surname: '',
    email: payer.email,
    ...(payer.phone
      ? {
          phone: {
            area_code: '',
            number: payer.phone,
          },
        }
      : {}),
    ...(payer.address
      ? {
          address: {
            street_name: payer.address.street ?? '',
            street_number: payer.address.number ?? '',
            zip_code: payer.address.zipCode ?? '',
          },
        }
      : {}),
  };

  const preferenceBody: Record<string, any> = {
    items: mpItems,
    payer: mpPayer,
    back_urls: options.backUrls,
    auto_return: 'approved',
    notification_url: options.notificationUrl ?? MP_CONFIG.notificationUrl,
    external_reference: options.externalReference,
    metadata: options.metadata ?? {},
    binary_mode: options.binaryMode ?? true,
    statement_descriptor: options.statementDescriptor ?? 'LookEscolar Fotos',
  };

  if (options.expiresAt) {
    preferenceBody.expires = true;
    preferenceBody.expiration_date_to = options.expiresAt;
  }

  const result = await preferenceClient.create({ body: preferenceBody });

  if (!result.id || !result.init_point || !result.sandbox_init_point) {
    throw new Error('Respuesta incompleta de MercadoPago');
  }

  return {
    id: result.id,
    initPoint: result.init_point,
    sandboxInitPoint: result.sandbox_init_point,
  };
}
