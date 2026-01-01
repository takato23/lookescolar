import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { PRODUCT_CATALOG, UnifiedOrder } from '@/lib/types/unified-store';

/**
 * MercadoPago Integration for Physical Products
 *
 * Purpose: Process payments for physical products (folders and photos)
 * with shipping information using MercadoPago Developer API
 *
 * Required inputs:
 * - MercadoPago Public Key and Access Token
 * - Product details with SKU, title, unit price, quantity
 * - Buyer information (name, email, phone)
 * - Shipping address
 * - Success/failure callback URLs
 */

const CreatePreferenceSchema = z.object({
  order: z.object({
    id: z.string(),
    token: z.string(),
    basePackage: z.object({
      id: z.string(),
      name: z.string(),
      basePrice: z.number(),
    }),
    selectedPhotos: z.object({
      individual: z.array(z.string()),
      group: z.array(z.string()),
    }),
    additionalCopies: z.array(
      z.object({
        id: z.string(),
        productId: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        totalPrice: z.number(),
        photoId: z.string().optional(), // ID de la foto asociada
        options: z.object({
          size: z.string().optional(),
          format: z.string().optional(),
          quality: z.enum(['standard', 'premium']).optional(),
          productName: z.string().optional(),
        }).optional(),
        // Legacy metadata field (deprecated, use options instead)
        metadata: z
          .object({
            size: z.string().optional(),
          })
          .optional(),
      })
    ),
    contactInfo: z.object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
      address: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        country: z.string().default('Argentina'),
      }),
    }),
    totalPrice: z.number(),
  }),
  // Optional override for callback base path
  callbackBase: z.enum(['share', 'f', 'store', 'store-unified']).optional(),
});

type CreatePreferenceRequest = z.infer<typeof CreatePreferenceSchema>;

interface MercadoPagoItem {
  id: string;
  title: string;
  description?: string;
  picture_url?: string;
  category_id: string;
  quantity: number;
  currency_id: 'ARS';
  unit_price: number;
}

interface MercadoPagoPreference {
  items: MercadoPagoItem[];
  payer: {
    name: string;
    surname: string;
    email: string;
    phone?: {
      area_code: string;
      number: string;
    };
    address?: {
      street_name: string;
      street_number: string;
      zip_code: string;
    };
  };
  shipments: {
    mode: 'not_specified';
    local_pickup: false;
    dimensions: string;
    default_shipping_method: null;
    free_methods: Array<{
      id: number;
    }>;
    cost: number;
    free_shipping: boolean;
    receiver_address: {
      street_name: string;
      street_number: string;
      city_name: string;
      state_name: string;
      zip_code: string;
      country_name: string;
    };
  };
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return: 'approved';
  payment_methods: {
    excluded_payment_methods: Array<{ id: string }>;
    excluded_payment_types: Array<{ id: string }>;
    installments: number;
  };
  notification_url: string;
  external_reference: string;
  metadata: {
    order_id: string;
    token: string;
    contact_name: string;
    contact_email: string;
    shipping_address: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const requestId = crypto.randomUUID();
    const start = Date.now();
    // Validate request body
    const body = await request.json();
    const { order, callbackBase } = CreatePreferenceSchema.parse(body);

    // Get MercadoPago credentials
    // Credentials with fallbacks for legacy env names
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;
    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

    if (!accessToken || !publicKey) {
      console.error('[MP][create-preference] missing credentials', {
        requestId,
        hasAccessToken: !!accessToken,
        hasPublicKey: !!publicKey,
        env: process.env.NODE_ENV,
      });
      if (process.env.NODE_ENV !== 'production') {
        // Dev fallback to allow end-to-end testing without MP keys
        const devPreferenceId = `dev_${order.id}`;
        const baseUrl =
          request.headers.get('origin') ||
          process.env.NEXT_PUBLIC_APP_URL ||
          'http://localhost:3000';
        const basePath = callbackBase || 'store-unified';

        // Persist the order so success page can display it
        try {
          const supabase = await createServerSupabaseServiceClient();
          await supabase.from('unified_orders').insert({
            id: order.id,
            token: order.token,
            base_package: order.basePackage,
            selected_photos: order.selectedPhotos,
            additional_copies: order.additionalCopies,
            contact_info: order.contactInfo,
            total_price: order.totalPrice,
            status: 'pending_payment',
            mercadopago_preference_id: devPreferenceId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } catch (persistErr) {
          console.warn('[MP][create-preference] dev fallback order persist error', persistErr);
        }

        return NextResponse.json({
          success: true,
          preference_id: devPreferenceId,
          init_point: `${baseUrl}/${basePath}/${order.token}/payment/success?pref_id=${devPreferenceId}&external_reference=${order.id}`,
          sandbox_init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${devPreferenceId}`,
          public_key: 'TEST_PUBLIC_KEY',
          order_id: order.id,
          warning: 'Using development fallback due to missing MP credentials',
        });
      }
      return NextResponse.json(
        { error: 'MercadoPago credentials not configured' },
        { status: 500 }
      );
    }

    // Build MercadoPago items
    const items: MercadoPagoItem[] = [];

    // Base package item (optional if cart is only additional copies)
    if (order.basePackage.basePrice > 0 || order.additionalCopies.length === 0) {
      items.push({
        id: order.basePackage.id,
        title: order.basePackage.name,
        description: `Carpeta personalizada ${order.basePackage.name} - ${order.selectedPhotos.individual.length + order.selectedPhotos.group.length} fotos seleccionadas`,
        category_id: 'photo_package',
        quantity: 1,
        currency_id: 'ARS',
        unit_price: order.basePackage.basePrice,
      });
    }

    // Additional copies items
    order.additionalCopies.forEach((copy) => {
      const copyProduct = PRODUCT_CATALOG.additionalCopies.find(
        (c) => c.id === copy.productId
      );

      // Build description from options or fallback to catalog/legacy data
      const size = copy.options?.size || copy.metadata?.size || copyProduct?.size || '';
      const format = copy.options?.format || '';
      const quality = copy.options?.quality || '';
      const productName = copy.options?.productName || copyProduct?.name || copy.productId;

      let description = `Foto ${productName}`;
      if (size) description += ` ${size}`;
      if (format) description += ` - ${format}`;
      if (quality === 'premium') description += ' (Premium)';

      if (copyProduct) {
        items.push({
          id: copy.productId,
          title: `${productName}${size ? ` ${size}` : ''}`,
          description,
          category_id: 'photo_copy',
          quantity: copy.quantity,
          currency_id: 'ARS',
          unit_price: copy.unitPrice,
        });
      } else {
        items.push({
          id: copy.productId,
          title: productName,
          description,
          category_id: 'photo_copy',
          quantity: copy.quantity,
          currency_id: 'ARS',
          unit_price: copy.unitPrice,
        });
      }
    });

    // Shipping item
    const shippingCost = PRODUCT_CATALOG.pricing.shippingCost || 0;
    if (shippingCost > 0) {
      items.push({
        id: 'shipping',
        title: 'Envío a domicilio',
        description: 'Costo de envío de tu pedido',
        category_id: 'shipping',
        quantity: 1,
        currency_id: 'ARS',
        unit_price: shippingCost,
      });
    }

    // Parse contact name
    const nameParts = order.contactInfo.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Parse phone number
    let phoneAreaCode = '';
    let phoneNumber = '';
    if (order.contactInfo.phone) {
      const phone = order.contactInfo.phone.replace(/\D/g, '');
      if (phone.length >= 10) {
        phoneAreaCode = phone.slice(0, 3);
        phoneNumber = phone.slice(3);
      }
    }

    // Parse address
    const addressParts = order.contactInfo.address.street.split(' ');
    const streetNumber = addressParts.find((part) => /^\d+/.test(part)) || '0';
    const streetName =
      addressParts.filter((part) => !/^\d+/.test(part)).join(' ') ||
      order.contactInfo.address.street;

    // Get base URL for callbacks
    const baseUrl =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';

    // Determine callback path base
    const basePath = callbackBase || 'f';

    // Build MercadoPago preference
    const preference: MercadoPagoPreference = {
      items,
      payer: {
        name: firstName,
        surname: lastName,
        email: order.contactInfo.email,
        ...(order.contactInfo.phone &&
          phoneAreaCode &&
          phoneNumber && {
            phone: {
              area_code: phoneAreaCode,
              number: phoneNumber,
            },
          }),
        address: {
          street_name: streetName,
          street_number: streetNumber,
          zip_code: order.contactInfo.address.zipCode,
        },
      },
      shipments: {
        mode: 'not_specified',
        local_pickup: false,
        dimensions: '30x20x5,500', // Approximate package dimensions in cm and grams
        default_shipping_method: null,
        free_methods: [],
        cost: shippingCost,
        free_shipping: shippingCost === 0,
        receiver_address: {
          street_name: streetName,
          street_number: streetNumber,
          city_name: order.contactInfo.address.city,
          state_name: order.contactInfo.address.state,
          zip_code: order.contactInfo.address.zipCode,
          country_name: order.contactInfo.address.country,
        },
      },
      back_urls: {
        success: `${baseUrl}/${basePath}/${order.token}/payment/success`,
        failure: `${baseUrl}/${basePath}/${order.token}/payment/failure`,
        pending: `${baseUrl}/${basePath}/${order.token}/payment/pending`,
      },
      auto_return: 'approved',
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12, // Allow up to 12 installments
      },
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      external_reference: order.id,
      metadata: {
        order_id: order.id,
        token: order.token,
        contact_name: order.contactInfo.name,
        contact_email: order.contactInfo.email,
        shipping_address: `${order.contactInfo.address.street}, ${order.contactInfo.address.city}, ${order.contactInfo.address.state} ${order.contactInfo.address.zipCode}`,
      },
    };

    // Create preference in MercadoPago
    const maskedToken = order.token ? `${order.token.slice(0, 8)}...` : 'n/a';
    console.info('[MP][create-preference] request', {
      requestId,
      orderId: order.id,
      token: maskedToken,
      items: items.map((i) => ({ id: i.id, qty: i.quantity, price: i.unit_price })),
      total: items.reduce((s, i) => s + i.unit_price * i.quantity, 0),
      callbackBase: basePath,
    });
    const mpResponse = await fetch(
      'https://api.mercadopago.com/checkout/preferences',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preference),
      }
    );

    if (!mpResponse.ok) {
      const mpError = await mpResponse.text();
      console.error('[MP][create-preference] API error', { requestId, mpError });
      if (process.env.NODE_ENV !== 'production') {
        const devPreferenceId = `dev_${order.id}`;
        const baseUrl =
          request.headers.get('origin') ||
          process.env.NEXT_PUBLIC_APP_URL ||
          'http://localhost:3000';
        const basePath = callbackBase || 'store-unified';

        // Persist the order for the success page in dev
        try {
          const supabase = await createServerSupabaseServiceClient();
          await supabase.from('unified_orders').insert({
            id: order.id,
            token: order.token,
            base_package: order.basePackage,
            selected_photos: order.selectedPhotos,
            additional_copies: order.additionalCopies,
            contact_info: order.contactInfo,
            total_price: order.totalPrice,
            status: 'pending_payment',
            mercadopago_preference_id: devPreferenceId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } catch (persistErr) {
          console.warn('[MP][create-preference] dev persist error (mp error path)', persistErr);
        }
        return NextResponse.json(
          {
            success: true,
            preference_id: devPreferenceId,
            init_point: `${baseUrl}/${basePath}/${order.token}/payment/success?pref_id=${devPreferenceId}&external_reference=${order.id}`,
            sandbox_init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${devPreferenceId}`,
            public_key: publicKey,
            order_id: order.id,
            warning: 'Using development fallback due to MP error',
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: 'Error creating payment preference' },
        { status: 500 }
      );
    }

    const mpResult = await mpResponse.json();
    console.info('[MP][create-preference] response', {
      requestId,
      orderId: order.id,
      preferenceId: mpResult?.id,
      elapsedMs: Date.now() - start,
    });

    // Store order in database
    const supabase = await createServerSupabaseServiceClient();

    // Try to resolve share_token_id and event_id for unified analytics
    let shareTokenId: string | null = null;
    let eventId: string | null = null;
    try {
      const is64 = /^[a-f0-9]{64}$/i.test(order.token);
      if (is64) {
        const { data: tok } = await supabase
          .from('share_tokens')
          .select('id, event_id')
          .eq('token', order.token)
          .eq('is_active', true)
          .maybeSingle();
        if (tok) {
          shareTokenId = (tok as any).id;
          eventId = (tok as any).event_id || null;
        }
      } else if (order.token && order.token.length >= 16) {
        // Folder legacy token: map to folder -> share_tokens
        const { data: folder } = await supabase
          .from('folders')
          .select('id, event_id')
          .eq('share_token', order.token)
          .maybeSingle();
        if (folder) {
          eventId = (folder as any).event_id || null;
          const { data: st } = await supabase
            .from('share_tokens')
            .select('id')
            .eq('folder_id', (folder as any).id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (st) shareTokenId = (st as any).id;
        }
      }
    } catch {}

    const { error: orderError } = await supabase.from('unified_orders').insert({
      id: order.id,
      token: order.token,
      event_id: eventId,
      share_token_id: shareTokenId,
      base_package: order.basePackage,
      selected_photos: order.selectedPhotos,
      additional_copies: order.additionalCopies,
      contact_info: order.contactInfo,
      total_price: order.totalPrice,
      status: 'pending_payment',
      mercadopago_preference_id: mpResult.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (orderError) {
      console.error('[MP][create-preference] store order error', { requestId, orderError });
      // Continue anyway - preference was created successfully
    }

    const resp = NextResponse.json({
      success: true,
      preference_id: mpResult.id,
      init_point: mpResult.init_point,
      sandbox_init_point: mpResult.sandbox_init_point,
      public_key: publicKey,
      order_id: order.id,
    });
    resp.headers.set('X-Request-ID', requestId);
    return resp;
  } catch (error) {
    console.error('[MP][create-preference] error', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
