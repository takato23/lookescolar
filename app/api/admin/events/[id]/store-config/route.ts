import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ZodError } from 'zod';
import { StoreConfigSchema, StoreConfig } from '@/lib/validations/store-config';
import type { RouteContext } from '@/types/next-route';
import {
  getStoreConfig,
  saveStoreConfig,
  getDefaultConfig
} from '@/lib/services/store-config.service';
import { convertDbToUiConfig, convertUiToDbConfig } from '@/lib/services/store-config.mappers';

const DEFAULT_TENANT_ID = process.env.NEXT_PUBLIC_MULTITENANT_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';

// GET - Obtener configuración de tienda por evento
export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  try {
    const { id: eventId } = await context.params;
    const supabase = await createServiceClient();

    // Verificar que el evento existe
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, tenant_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const tenantId = event.tenant_id || DEFAULT_TENANT_ID;

    // Obtener config usando el servicio unificado
    const config = await getStoreConfig(tenantId, { eventId });

    console.log(`[StoreConfig] Loaded config for event ${eventId}`);

    return NextResponse.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('[StoreConfig] Error in GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Actualizar configuración de tienda por evento
export async function PATCH(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  try {
    const { id: eventId } = await context.params;
    const body = await request.json();

    // Validar input con Zod
    let parsedBody: StoreConfig;
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

    const supabase = await createServiceClient();

    // Verificar que el evento existe
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, tenant_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const tenantId = event.tenant_id || DEFAULT_TENANT_ID;

    // Guardar usando el servicio unificado
    const savedConfig = await saveStoreConfig(tenantId, parsedBody, { eventId });

    console.log(`[StoreConfig] Saved config for event ${eventId}`);

    return NextResponse.json({
      success: true,
      message: 'Configuración guardada exitosamente',
      config: savedConfig
    });

  } catch (error) {
    console.error('[StoreConfig] Error in PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
