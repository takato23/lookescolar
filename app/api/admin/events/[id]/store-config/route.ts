import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Schema for store configuration
const StoreConfigSchema = z.object({
  enabled: z.boolean(),
  products: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['physical', 'digital']),
    enabled: z.boolean(),
    price: z.number(),
    description: z.string().optional(),
    options: z.object({
      sizes: z.array(z.string()).optional(),
      formats: z.array(z.string()).optional(),
      quality: z.enum(['standard', 'premium']).optional()
    }).optional()
  })),
  currency: z.string(),
  tax_rate: z.number(),
  shipping_enabled: z.boolean(),
  shipping_price: z.number(),
  payment_methods: z.array(z.string())
});

// GET - Obtener configuración de tienda por evento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const eventId = (await params).id;
    const supabase = await createServerSupabaseServiceClient();

    // Buscar carpetas del evento que tengan configuración de tienda
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, store_settings, is_published, share_token')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (foldersError) {
      console.error('Error fetching event folders:', foldersError);
      return NextResponse.json({ error: 'Error fetching store config' }, { status: 500 });
    }

    // Buscar la primera carpeta con configuración o usar valores por defecto
    let config = null;
    if (folders && folders.length > 0) {
      const folderWithSettings = folders.find(f => f.store_settings && Object.keys(f.store_settings).length > 0);
      if (folderWithSettings) {
        config = {
          ...folderWithSettings.store_settings,
          enabled: folderWithSettings.is_published || false,
          folder_id: folderWithSettings.id,
          share_token: folderWithSettings.share_token
        };
      }
    }

    return NextResponse.json({
      success: true,
      config: config || {
        enabled: false,
        products: [],
        currency: 'ARS',
        tax_rate: 0,
        shipping_enabled: true,
        shipping_price: 150000, // $1,500 ARS en centavos
        payment_methods: ['mercadopago']
      }
    });

  } catch (error) {
    console.error('Error in GET store config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Actualizar configuración de tienda por evento
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const eventId = (await params).id;
    const body = await request.json();
    
    console.log('🔍 Store config PATCH request for event:', eventId, JSON.stringify(body, null, 2));

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

    // Obtener o crear una carpeta principal para el evento
    const { data: folders } = await supabase
      .from('folders')
      .select('id, name, store_settings')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
      .limit(1);

    let targetFolderId = body.folder_id;

    // Si no hay carpeta especificada, usar la primera del evento o crear una
    if (!targetFolderId) {
      if (folders && folders.length > 0) {
        targetFolderId = folders[0].id;
      } else {
        // Crear carpeta principal para el evento si no existe
        const { data: newFolder, error: folderError } = await supabase
          .from('folders')
          .insert({
            name: 'Galería Principal',
            event_id: eventId,
            parent_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (folderError) {
          console.error('Error creating folder:', folderError);
          return NextResponse.json({ error: 'Failed to create folder for store' }, { status: 500 });
        }
        targetFolderId = newFolder.id;
      }
    }

    // Preparar la configuración de tienda para guardar en folders.store_settings
    const storeSettings = {
      allow_download: false,
      watermark_enabled: true,
      store_title: event.name || 'Evento Escolar',
      store_description: 'Galería Fotográfica Escolar',
      contact_info: {
        email: 'info@ejemplo.com',
        phone: '+54 11 1234-5678'
      },
      currency: body.currency || 'ARS',
      products: body.products || [],
      payment_methods: body.payment_methods || ['mercadopago'],
      tax_rate: body.tax_rate || 0,
      shipping_enabled: body.shipping_enabled || false,
      shipping_price: body.shipping_price || 0
    };

    // Actualizar la carpeta con la configuración de tienda
    const { data: updatedFolder, error: updateError } = await supabase
      .from('folders')
      .update({
        store_settings: storeSettings,
        is_published: body.enabled || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetFolderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating folder store settings:', updateError);
      return NextResponse.json({ error: 'Failed to update store settings' }, { status: 500 });
    }

    // Si se habilitó la tienda y no tiene token, generar uno
    let result = updatedFolder;
    if (body.enabled && !updatedFolder.share_token) {
      const { data: tokenResult } = await supabase.rpc('publish_store', {
        p_folder_id: targetFolderId,
        p_store_settings: storeSettings
      });

      if (tokenResult && tokenResult[0]) {
        result = {
          ...updatedFolder,
          share_token: tokenResult[0].token,
          store_url: tokenResult[0].store_url
        };
      }
    }

    console.log('✅ Store settings saved for event:', eventId);
    return NextResponse.json({
      success: true,
      message: 'Configuración guardada exitosamente',
      config: result
    });

  } catch (error) {
    console.error('❌ Error in PATCH store config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
