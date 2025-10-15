import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { ZodError } from 'zod';
import { StoreConfigSchema } from '@/lib/validations/store-config';
import { convertDbToUiConfig, convertUiToDbConfig, getDefaultConfig } from '@/lib/services/store-config.mappers';

// GET - Obtener configuración de tienda por evento
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = (params).id;
    const supabase = await createServerSupabaseServiceClient();

    // Buscar configuración específica del evento
    const { data: eventConfig, error: eventError } = await supabase
      .from('store_settings')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (eventError && eventError.code !== 'PGRST116') {
      console.error('Error fetching event store config:', eventError);
      return NextResponse.json({ error: 'Error fetching store config' }, { status: 500 });
    }

    // Si no hay configuración específica, usar la global
    let config = eventConfig;
    if (!config) {
      const { data: globalConfig } = await supabase
        .from('store_settings')
        .select('*')
        .is('event_id', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      config = globalConfig;
    }

    return NextResponse.json({
      success: true,
      config: convertDbToUiConfig(config || getDefaultConfig())
    });

  } catch (error) {
    console.error('Error in GET store config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Actualizar configuración de tienda por evento
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = (params).id;
    const body = await request.json();

    let parsedBody;
    try {
      parsedBody = StoreConfigSchema.parse(body);
    } catch (parseError) {
      if (parseError instanceof ZodError) {
        return NextResponse.json({
          error: 'Invalid store configuration payload',
          details: parseError.flatten()
        }, { status: 400 });
      }
      throw parseError;
    }

    console.log('🔍 Store config PATCH request for event:', eventId, JSON.stringify(parsedBody, null, 2));

    const supabase = await createServerSupabaseServiceClient();

    // Verificar que el evento existe
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Convertir la estructura del StoreConfigPanel al formato de StoreSettings
    const storeSettings = {
      template: 'pixieset',
      colors: {
        primary: '#d97706',
        secondary: '#374151',
        accent: '#f59e0b',
        background: '#ffffff',
        surface: '#f9fafb',
        text: '#111827',
        text_secondary: '#6b7280'
      },
      texts: {
        hero_title: event.name || 'Evento Escolar',
        hero_subtitle: 'Galería Fotográfica Escolar',
        footer_text: 'BALOSKIER © 2025',
        contact_email: 'info@ejemplo.com',
        contact_phone: '+54 11 1234-5678',
        terms_url: '',
        privacy_url: ''
      },
      logo_url: '',
      banner_url: '',
      event_id: eventId,
      ...convertUiToDbConfig(parsedBody, eventId)
    };

    // Buscar configuración existente del evento
    const { data: existingConfig } = await supabase
      .from('store_settings')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();

    let result;
    if (existingConfig) {
      // Actualizar existente
      const { data, error } = await supabase
        .from('store_settings')
        .update(storeSettings)
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating store settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
      }
      result = data;
    } else {
      // Crear nuevo
      const { data, error } = await supabase
        .from('store_settings')
        .insert({
          ...storeSettings,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating store settings:', error);
        return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 });
      }
      result = data;
    }

    console.log('✅ Store settings saved for event:', eventId);
    return NextResponse.json({
      success: true,
      message: 'Configuración guardada exitosamente',
      config: convertDbToUiConfig(result)
    });

  } catch (error) {
    console.error('❌ Error in PATCH store config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
