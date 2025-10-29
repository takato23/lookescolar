import type { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_COLORS = {
  primary: '#1f2937',
  secondary: '#6b7280',
  accent: '#3b82f6',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  text_secondary: '#6b7280',
};

const DEFAULT_TEXTS = {
  hero_title: 'Galería Fotográfica',
  hero_subtitle: 'Encuentra tus mejores momentos escolares',
  footer_text: '© 2024 LookEscolar - Fotografía Escolar',
  contact_email: '',
  contact_phone: '',
  terms_url: '',
  privacy_url: '',
};

export async function fetchFallbackStoreConfig(
  supabase: SupabaseClient<any, any, any>
) {
  try {
    const { data: row, error } = await supabase
      .from('store_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !row) {
      return null;
    }

    const jsonSettings: any = row.settings ?? {};

    const paymentMethods =
      row.payment_methods ||
      jsonSettings.paymentMethods ||
      jsonSettings.payment_methods || {
        mercadopago: {
          enabled: true,
          name: 'MercadoPago',
          description: 'Pago seguro con tarjeta',
        },
      };

    return {
      enabled: row.enabled ?? jsonSettings.enabled ?? false,
      template: row.template ?? jsonSettings.template ?? 'pixieset',
      currency: row.currency ?? jsonSettings.currency ?? 'ARS',
      colors: row.colors ?? jsonSettings.colors ?? DEFAULT_COLORS,
      texts: row.texts ?? jsonSettings.texts ?? DEFAULT_TEXTS,
      welcome_message: row.welcome_message ?? jsonSettings.welcome_message ?? '',
      custom_branding: row.custom_branding ?? jsonSettings.custom_branding ?? {},
      download_limits: row.download_limits ?? jsonSettings.download_limits ?? null,
      theme_customization: row.theme_customization ?? jsonSettings.theme_customization ?? {},
      seo_settings: row.seo_settings ?? jsonSettings.seo_settings ?? {},
      social_settings: row.social_settings ?? jsonSettings.social_settings ?? {},
      products: row.products ?? jsonSettings.products ?? {},
      payment_methods: paymentMethods,
      store_schedule: row.store_schedule ?? jsonSettings.store_schedule ?? {},
      password_protection:
        row.password_protection ?? jsonSettings.password_protection ?? false,
      features: row.features ?? jsonSettings.features ?? {},
      logo_url: row.logo_url ?? jsonSettings.logo_url ?? '',
      banner_url: row.banner_url ?? jsonSettings.banner_url ?? '',
      updated_at: row.updated_at ?? jsonSettings.updated_at ?? null,
      mercado_pago_connected:
        row.mercado_pago_connected ??
        jsonSettings.mercado_pago_connected ??
        jsonSettings.mercadoPagoConnected ??
        false,
    };
  } catch (error) {
    console.error('Error fetching fallback store config:', error);
    return null;
  }
}

export function buildPublicConfig(storeConfig: any) {
  if (!storeConfig) {
    return null;
  }

  const colors = storeConfig.colors || DEFAULT_COLORS;
  const texts = storeConfig.texts || DEFAULT_TEXTS;
  const paymentMethods =
    storeConfig.payment_methods || storeConfig.paymentMethods || {};

  return {
    enabled: storeConfig.enabled ?? false,
    template: storeConfig.template ?? 'pixieset',
    currency: storeConfig.currency ?? 'ARS',
    colors,
    texts,
    welcome_message: storeConfig.welcome_message ?? '',
    custom_branding: {
      logo_url: storeConfig.custom_branding?.logo_url,
      brand_name: storeConfig.custom_branding?.brand_name,
      brand_tagline: storeConfig.custom_branding?.brand_tagline,
      primary_color: storeConfig.custom_branding?.primary_color,
      secondary_color: storeConfig.custom_branding?.secondary_color,
      accent_color: storeConfig.custom_branding?.accent_color,
      font_family: storeConfig.custom_branding?.font_family,
      custom_css: storeConfig.custom_branding?.custom_css,
    },
    download_limits: storeConfig.download_limits?.enabled
      ? {
          enabled: true,
          max_downloads_per_photo: storeConfig.download_limits.max_downloads_per_photo,
          download_expiry_days: storeConfig.download_limits.download_expiry_days,
        }
      : { enabled: false },
    theme_customization: storeConfig.theme_customization || {},
    seo_settings: {
      meta_title: storeConfig.seo_settings?.meta_title,
      meta_description: storeConfig.seo_settings?.meta_description,
      meta_keywords: storeConfig.seo_settings?.meta_keywords,
      og_image: storeConfig.seo_settings?.og_image,
    },
    social_settings: {
      enable_sharing: storeConfig.social_settings?.enable_sharing,
      whatsapp_enabled: storeConfig.social_settings?.whatsapp_enabled,
      whatsapp_message: storeConfig.social_settings?.whatsapp_message,
    },
    products: storeConfig.products || {},
    payment_methods: paymentMethods,
    paymentMethods,
    logo_url: storeConfig.logo_url || storeConfig.custom_branding?.logo_url,
    banner_url: storeConfig.banner_url,
    features: storeConfig.features,
    store_schedule: {
      enabled: storeConfig.store_schedule?.enabled || false,
      maintenance_message: storeConfig.store_schedule?.maintenance_message,
      start_date: storeConfig.store_schedule?.start_date,
      end_date: storeConfig.store_schedule?.end_date,
    },
    updated_at: storeConfig.updated_at,
  };
}
