import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { ensureStoreSettings, mergeWithGuaranteedSettings } from '@/lib/services/store-initialization.service';

// SUPER SIMPLE schema - accepts almost anything
const SimpleStoreSettingsSchema = z.object({}).passthrough();

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
      return NextResponse.json({ settings: defaultSettings });
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

    return NextResponse.json({ settings: mergedSettings });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/store-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔍 Store settings POST request body:', JSON.stringify(body, null, 2));

    // Very permissive validation - just make sure it's an object
    if (!body || typeof body !== 'object') {
      return NextResponse.json({
        error: 'Request body must be an object',
      }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // 🔥 USAR columna payment_methods directamente (después del SQL)
    const allowedFields = {
      enabled: body.enabled,
      template: body.template,
      products: body.products,
      payment_methods: body.payment_methods // 🔥 Usar directamente payment_methods column
    };
    
    // Filtrar undefined para no intentar insertarlos
    const settingsData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, v]) => v !== undefined)
    );
    
    // Log what we're trying to save
    console.log('🔧 Cleaned settings data:', JSON.stringify(settingsData, null, 2));

    // Check if settings exist
    const { data: existingSettings } = await supabase
      .from('store_settings')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let result;
    const now = new Date().toISOString();

    // Prepare settings for save
    const settingsToSave = {
      ...settingsData,
      updated_at: now
    };

    if (existingSettings) {
      // Update existing - more robust error handling
      console.log('🔄 Updating existing settings with ID:', existingSettings.id);
      
      const { data, error } = await supabase
        .from('store_settings')
        .update(settingsToSave)
        .eq('id', existingSettings.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating store settings:', error);
        console.error('❌ Settings data causing error:', settingsToSave);
        return NextResponse.json({ 
          error: 'Failed to update settings',
          details: error.message,
          hint: error.hint,
          code: error.code
        }, { status: 500 });
      }

      result = data;
    } else {
      // Insert new - minimal safe data to avoid DB conflicts
      console.log('➕ Creating new settings record');
      
      const minimalSettings = {
        enabled: settingsData.enabled ?? false,
        template: settingsData.template ?? 'pixieset',
        products: settingsData.products ?? {},
        created_at: now,
        updated_at: now
      };

      const { data, error } = await supabase
        .from('store_settings')
        .insert(minimalSettings)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating store settings:', error);
        console.error('❌ Minimal settings causing error:', minimalSettings);
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
    return NextResponse.json({ 
      success: true, 
      settings: result,
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