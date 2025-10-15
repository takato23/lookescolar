import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Public Store Settings API
 * Returns the latest published store settings for public consumption.
 * No authentication required. Sanitized to avoid leaking internals.
 */
export async function GET() {
  try {
    const supabase = await createServiceClient();

    const { data: settings, error } = await supabase
      .from('store_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[public-store-settings] fetch error:', error);
      // In dev, provide a sensible default to allow testing
      if (process.env.NODE_ENV !== 'production') {
        const defaultSettings = {
          enabled: true,
          template: 'pixieset' as const,
          products: {
            'individual-photo': {
              name: 'Foto Individual',
              description: 'Descarga digital de alta calidad',
              price: 2500,
              enabled: true,
            },
            'photo-pack': {
              name: 'Paquete de Fotos',
              description: 'Todas las fotos del alumno',
              price: 15000,
              enabled: true,
            },
            'printed-photo': {
              name: 'Foto Impresa',
              description: 'Foto impresa 15x21 cm',
              price: 3500,
              enabled: false,
            },
            'class-pack': {
              name: 'Paquete Grupal',
              description: 'Todas las fotos de la clase',
              price: 30000,
              enabled: false,
            },
          },
        };
        return NextResponse.json({ settings: defaultSettings }, { status: 200 });
      }
      return NextResponse.json({ error: 'Unable to load settings' }, { status: 500 });
    }

    if (!settings) {
      const defaultSettings = {
        enabled: false,
        template: 'pixieset' as const,
        products: {},
      };
      return NextResponse.json({ settings: defaultSettings }, { status: 200 });
    }

    const row: any = settings;
    const sjson: any = row.settings || {};

    const formatted = {
      enabled: row.enabled ?? false,
      template: (row.template as 'pixieset' | 'editorial' | 'minimal') ?? 'pixieset',
      currency: row.currency || sjson.currency || 'ARS',
      colors: row.colors || sjson.colors || {
        primary: '#1f2937',
        secondary: '#6b7280',
        accent: '#3b82f6',
        background: '#f9fafb',
        surface: '#ffffff',
        text: '#111827',
        text_secondary: '#6b7280'
      },
      texts: row.texts || sjson.texts || {
        hero_title: 'Galería Fotográfica',
        hero_subtitle: 'Encuentra tus mejores momentos escolares',
        footer_text: '© 2024 LookEscolar - Fotografía Escolar',
        contact_email: '',
        contact_phone: '',
        terms_url: '',
        privacy_url: ''
      },
      products: row.products || {},
      payment_methods: row.payment_methods || sjson.paymentMethods || sjson.payment_methods || {},
      paymentMethods: row.payment_methods || sjson.paymentMethods || sjson.payment_methods || {},
      logo_url: row.logo_url || sjson.logo_url || '',
      banner_url: row.banner_url || sjson.banner_url || '',
      storeUrl: row.store_url || sjson.storeUrl || '',
      mercadoPagoConnected: row.mercado_pago_connected ?? sjson.mercadoPagoConnected ?? false,
      // optional feature flags bucket for storefront behavior
      features: sjson.features || {
        allowExtrasOnly: true,
        showFAQ: true,
        showBadges: true,
      },
    } as any;

    return NextResponse.json({ settings: formatted });
  } catch (err) {
    console.error('[public-store-settings] unexpected error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
