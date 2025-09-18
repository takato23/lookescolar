import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateShareTokenPassword, validateStorePassword } from '@/lib/middleware/password-validation.middleware';

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

async function fetchFallbackStoreConfig(supabase: any) {
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
    
    // 🔧 INTENTAR MÚLTIPLES FUENTES para payment_methods
    const paymentMethods = 
      row.payment_methods || 
      jsonSettings.paymentMethods || 
      jsonSettings.payment_methods || 
      // Si no hay nada, usar configuración por defecto con MercadoPago
      {
        mercadopago: {
          enabled: true,
          name: "MercadoPago",
          description: "Pago seguro con tarjeta, efectivo o transferencia"
        }
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
      password_protection: row.password_protection ?? jsonSettings.password_protection ?? false,
      features: row.features ?? jsonSettings.features ?? {},
      logo_url: row.logo_url ?? jsonSettings.logo_url ?? '',
      banner_url: row.banner_url ?? jsonSettings.banner_url ?? '',
      updated_at: row.updated_at ?? jsonSettings.updated_at ?? null,
      mercado_pago_connected:
        row.mercado_pago_connected ?? jsonSettings.mercado_pago_connected ?? jsonSettings.mercadoPagoConnected ?? false,
    };
  } catch (err) {
    console.error('Error fetching fallback store config:', err);
    return null;
  }
}

function buildPublicConfig(storeConfig: any) {
  const colors = storeConfig.colors || DEFAULT_COLORS;
  const texts = storeConfig.texts || DEFAULT_TEXTS;
  const paymentMethods = storeConfig.payment_methods || storeConfig.paymentMethods || {};

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

// Schema for public store config request
const PublicStoreConfigSchema = z.object({
  token: z.string().min(1),
  password: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = PublicStoreConfigSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid request',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    const { token, password } = validationResult.data;
    const supabase = await createServiceClient();

    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    // Get store configuration for this token using the database function
    const { data: rpcStoreConfig, error } = await supabase
      .rpc('get_public_store_config', { store_token: token })
      .single();

    let storeConfig = rpcStoreConfig;
    let usedFallback = false;

    if (error || !storeConfig) {
      console.warn('Falling back to global store configuration for token', token, error);
      const fallbackConfig = await fetchFallbackStoreConfig(supabase);
      if (!fallbackConfig) {
        return NextResponse.json({ 
          error: 'Store not found or token expired' 
        }, { status: 404 });
      }
      storeConfig = fallbackConfig;
      usedFallback = true;
    }

    // Check if password protection is enabled (only for token-specific config)
    if (!usedFallback && storeConfig.password_protection) {
      const shareTokenValidation = await validateShareTokenPassword(
        token,
        password,
        clientIp
      );

      if (shareTokenValidation.requiresPassword) {
        if (!shareTokenValidation.isValid) {
          return NextResponse.json({
            error: shareTokenValidation.error || 'Contraseña requerida',
            passwordRequired: true
          }, { status: shareTokenValidation.statusCode || 401 });
        }
      } else {
        if (!password) {
          return NextResponse.json({
            passwordRequired: true,
            message: 'Esta tienda requiere una contraseña para acceder'
          });
        }

        const storePasswordValidation = await validateStorePassword(token, password);

        if (!storePasswordValidation.isValid) {
          return NextResponse.json({
            error: storePasswordValidation.error || 'Contraseña incorrecta',
            passwordRequired: true
          }, { status: storePasswordValidation.statusCode || 401 });
        }
      }
    }

    // Check if store is within schedule if enabled
    if (storeConfig.store_schedule?.enabled) {
      const now = new Date();
      const startDate = storeConfig.store_schedule.start_date ? new Date(storeConfig.store_schedule.start_date) : null;
      const endDate = storeConfig.store_schedule.end_date ? new Date(storeConfig.store_schedule.end_date) : null;

      if (startDate && now < startDate) {
        return NextResponse.json({
          error: storeConfig.store_schedule.maintenance_message || 'La tienda aún no está disponible',
          available: false,
          openDate: startDate.toISOString()
        }, { status: 403 });
      }

      if (endDate && now > endDate) {
        return NextResponse.json({
          error: storeConfig.store_schedule.maintenance_message || 'La tienda ya no está disponible',
          available: false,
          closedDate: endDate.toISOString()
        }, { status: 403 });
      }
    }

    const publicConfig = buildPublicConfig(storeConfig);
    const mercadoPagoConnected = Boolean(
      storeConfig.mercado_pago_connected ??
      storeConfig.mercadoPagoConnected ??
      true
    );

    return NextResponse.json({ 
      success: true, 
      settings: publicConfig,
      storeUrl: `/store-unified/${token}`,
      mercadoPagoConnected
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/public/store/config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint for checking store availability (without password)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { data: rpcStoreConfig, error } = await supabase
      .rpc('get_public_store_config', { store_token: token })
      .single();

    let storeConfig = rpcStoreConfig;
    let usedFallback = false;

    if (error || !storeConfig) {
      const fallbackConfig = await fetchFallbackStoreConfig(supabase);
      if (!fallbackConfig) {
        return NextResponse.json({ 
          available: false,
          error: 'Store not found or token expired' 
        }, { status: 404 });
      }
      storeConfig = fallbackConfig;
      usedFallback = true;
    }

    const available = Boolean(storeConfig.enabled);
    const passwordRequired = !usedFallback && Boolean(storeConfig.password_protection);

    let scheduleStatus = { withinSchedule: true, message: '' };
    if (storeConfig.store_schedule?.enabled) {
      const now = new Date();
      const startDate = storeConfig.store_schedule.start_date ? new Date(storeConfig.store_schedule.start_date) : null;
      const endDate = storeConfig.store_schedule.end_date ? new Date(storeConfig.store_schedule.end_date) : null;

      if (startDate && now < startDate) {
        scheduleStatus = {
          withinSchedule: false,
          message: storeConfig.store_schedule.maintenance_message || 'La tienda aún no está disponible',
          openDate: startDate.toISOString()
        };
      } else if (endDate && now > endDate) {
        scheduleStatus = {
          withinSchedule: false,
          message: storeConfig.store_schedule.maintenance_message || 'La tienda ya no está disponible',
          closedDate: endDate.toISOString()
        };
      }
    }

    return NextResponse.json({ 
      available: available && scheduleStatus.withinSchedule,
      passwordRequired,
      schedule: scheduleStatus,
      template: storeConfig.template,
      brand_name: storeConfig.custom_branding?.brand_name || 'LookEscolar'
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/public/store/config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}