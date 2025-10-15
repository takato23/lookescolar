import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ZodError } from 'zod';
import { ensureStoreSettings } from '@/lib/services/store-initialization.service';
import { convertDbToUiConfig, convertUiToDbConfig, getDefaultConfig } from '@/lib/services/store-config.mappers';
import { StoreConfigSchema } from '@/lib/validations/store-config';

// Template mapping (simple)
const TEMPLATE_VARIANT_TO_BASE: Record<string, string> = {
  'pixieset': 'pixieset',
  'editorial': 'editorial',
  'minimal': 'minimal',
  'modern-minimal': 'minimal',
  'bold-vibrant': 'editorial',
  'premium-photography': 'editorial',
  'studio-dark': 'editorial',
  'classic-gallery': 'pixieset',
  'fashion-editorial': 'editorial',
  'modern': 'minimal',
  'classic': 'pixieset',
  'premium-store': 'editorial'
};

// Default settings (minimal)
const getDefaultSettings = () => ({
  enabled: false,
  template: 'pixieset',
  currency: 'ARS',
  colors: {
    primary: '#1f2937',
    secondary: '#6b7280',
    accent: '#3b82f6',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#111827',
    text_secondary: '#6b7280'
  },
  texts: {
    hero_title: 'Galería Fotográfica',
    hero_subtitle: 'Encuentra tus mejores momentos escolares',
    footer_text: '© 2024 LookEscolar - Fotografía Escolar',
    contact_email: '',
    contact_phone: '',
    terms_url: '',
    privacy_url: ''
  },
  theme_customization: {
    template_variant: 'pixieset',
    custom_css: '',
    header_style: 'default',
    gallery_layout: 'grid',
    photo_aspect_ratio: 'auto',
    show_photo_numbers: true,
    enable_zoom: true,
    enable_fullscreen: true,
    mobile_columns: 2,
    desktop_columns: 4
  },
  products: {},
  payment_methods: {},
  logo_url: '',
  banner_url: '',
  features: {
    allowExtrasOnly: true,
    showFAQ: true,
    showBadges: true
  }
});

export async function GET() {
  try {
    const supabase = await createServiceClient();
    
    const { data: settings, error } = await supabase
      .from('store_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching store settings:', error);
      return NextResponse.json(
        { error: 'Error fetching settings' },
        { status: 500 }
      );
    }

    // If no settings found, return defaults
    if (!settings) {
      const defaultSettings = getDefaultSettings();
      return NextResponse.json({
        success: true,
        config: getDefaultConfig(),
        settings: defaultSettings
      });
    }

    // Usar el nuevo sistema de inicialización segura
    const safeSettings = ensureStoreSettings(settings);
    
    // 🔥 LEER payment_methods directamente de la columna
    const paymentMethods = settings?.payment_methods || {
      mercadopago: { enabled: true, name: "MercadoPago", description: "Pago seguro con tarjeta" }
    };
    
    // Mantener compatibilidad con campos esperados por el frontend
    const mergedSettings = {
      ...getDefaultSettings(),
      ...safeSettings,
      payment_methods: paymentMethods, // 🔥 Incluir payment_methods en la respuesta
      theme_customization: { 
        ...getDefaultSettings().theme_customization, 
        ...(settings?.theme_customization || {}) 
      }
    };

    return NextResponse.json({
      success: true,
      config: convertDbToUiConfig(safeSettings),
      settings: mergedSettings
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/store-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 Store settings POST request body:', JSON.stringify(body, null, 2));

    const supabase = await createServiceClient();

    let parsed;
    try {
      parsed = StoreConfigSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json({
          error: 'Invalid store configuration payload',
          details: error.flatten()
        }, { status: 400 });
      }
      throw error;
    }

    const dbConfig = convertUiToDbConfig(parsed, null);

    const { data: existingSettings } = await supabase
      .from('store_settings')
      .select('*')
      .is('event_id', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const baseSettings = existingSettings ? ensureStoreSettings(existingSettings) : getDefaultSettings();

    let result;
    if (existingSettings) {
      const { id: _ignoreId, created_at, updated_at: _oldUpdatedAt, ...rest } = baseSettings as Record<string, any>;
      const payload = {
        ...rest,
        ...dbConfig,
        event_id: null,
        created_at: created_at ?? existingSettings.created_at ?? new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('store_settings')
        .update(payload)
        .eq('id', existingSettings.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating store settings:', error);
        return NextResponse.json({
          error: 'Failed to update settings',
          details: error.message,
          hint: error.hint,
          code: error.code
        }, { status: 500 });
      }

      result = data;
    } else {
      const defaultSettings = getDefaultSettings();
      const { data, error } = await supabase
        .from('store_settings')
        .insert({
          ...defaultSettings,
          ...dbConfig,
          event_id: null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating store settings:', error);
        return NextResponse.json({
          error: 'Failed to create settings',
          details: error.message,
          hint: error.hint,
          code: error.code
        }, { status: 500 });
      }

      result = data;
    }

    console.log('✅ Settings saved successfully:', result);
    const safeSettings = ensureStoreSettings(result);
    return NextResponse.json({ 
      success: true,
      config: convertDbToUiConfig(safeSettings),
      settings: safeSettings,
      message: 'Settings saved successfully'
    });

  } catch (error) {
    console.error('❌ Unexpected error in POST /api/admin/store-settings:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
