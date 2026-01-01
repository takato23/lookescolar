/**
 * 🔧 Server Actions para store-settings
 * Operaciones server-side con validación estricta
 */

'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';
import { headers } from 'next/headers';
import { validateStoreConfig, StoreConfig } from '@/lib/validations/store-config';
import { convertDbToUiConfig, convertUiToDbConfig } from '@/lib/services/store-config.service';
import type { Database } from '@/types/database';

/**
 * Carga configuración de tienda para un evento
 */
export async function loadStoreConfig(eventId: string): Promise<{
  success: boolean;
  config?: StoreConfig;
  error?: string;
}> {
  try {
    const supabase = await createServiceClient();
    const storeSettingsTable = supabase.from('store_settings') as any;

    const { data: eventConfig, error: eventError } = await storeSettingsTable
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (eventError && eventError.code !== 'PGRST116') {
      console.error('[ServerAction] Error fetching event config:', eventError);
      return { success: false, error: 'Error cargando configuración del evento' };
    }

    let config = eventConfig;
    if (!config) {
      const { data: globalConfig } = await storeSettingsTable
        .select('*')
        .is('event_id', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      config = globalConfig;
    }

    const uiConfig = convertDbToUiConfig(config || {});

    return {
      success: true,
      config: uiConfig
    };
  } catch (error) {
    console.error('[ServerAction] Error in loadStoreConfig:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    };
  }
}

/**
 * Guarda configuración de tienda para un evento
 */
export async function saveStoreConfigAction(
  eventId: string,
  config: StoreConfig
): Promise<{
  success: boolean;
  config?: StoreConfig;
  error?: string;
}> {
  try {
    // Validación estricta server-side
    const validatedConfig = validateStoreConfig(config);

    const supabase = await createServiceClient();
    const storeSettingsTable = supabase.from('store_settings') as any;

    // Verificar que el evento existe
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: 'Evento no encontrado' };
    }

    // Resolver tenant_id
    const requestHeaders = await headers();
    const tenantResolution = resolveTenantFromHeaders(Object.fromEntries(requestHeaders.entries()));
    const tenantId = tenantResolution.tenantId;

    // Convertir a formato DB y guardar
    const dbConfig = convertUiToDbConfig(validatedConfig, eventId);

    // Buscar configuración existente
    const { data: existingConfig } = await storeSettingsTable
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();

    let result;
    if (existingConfig) {
      // Actualizar existente
      const updatePayload: Database['public']['Tables']['store_settings']['Update'] = {
        ...dbConfig,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await storeSettingsTable
        .update(updatePayload)
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) {
        console.error('[ServerAction] Error updating config:', error);
        return { success: false, error: 'Error actualizando configuración' };
      }
      result = data;
    } else {
      // Crear nueva
      const insertPayload: Database['public']['Tables']['store_settings']['Insert'] = {
        ...dbConfig,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await storeSettingsTable
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error('[ServerAction] Error creating config:', error);
        return { success: false, error: 'Error creando configuración' };
      }
      result = data;
    }

    console.log('[ServerAction] Configuration saved successfully for event:', eventId);
    const uiConfig = convertDbToUiConfig(result);

    return {
      success: true,
      config: uiConfig
    };
  } catch (error) {
    console.error('[ServerAction] Error in saveStoreConfigAction:', error);

    let errorMessage = 'Error guardando configuración';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Carga configuración global de tienda
 */
export async function loadGlobalStoreConfig(): Promise<{
  success: boolean;
  config?: StoreConfig;
  error?: string;
}> {
  try {
    const supabase = await createServiceClient();

    const { data: globalConfig } = await supabase
      .from('store_settings')
      .select('*')
      .is('event_id', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const uiConfig = convertDbToUiConfig(globalConfig || {});

    return {
      success: true,
      config: uiConfig
    };
  } catch (error) {
    console.error('[ServerAction] Error in loadGlobalStoreConfig:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    };
  }
}

/**
 * Guarda configuración global de tienda
 */
export async function saveGlobalStoreConfigAction(
  config: StoreConfig
): Promise<{
  success: boolean;
  config?: StoreConfig;
  error?: string;
}> {
  try {
    // Validación estricta server-side
    const validatedConfig = validateStoreConfig(config);

    const supabase = await createServiceClient();
    const storeSettingsTable = supabase.from('store_settings') as any;

    // Resolver tenant_id
    const requestHeaders = await headers();
    const tenantResolution = resolveTenantFromHeaders(Object.fromEntries(requestHeaders.entries()));
    const tenantId = tenantResolution.tenantId;

    // Convertir a formato DB y guardar
    const dbConfig = convertUiToDbConfig(validatedConfig);

    // Buscar configuración global existente
    const { data: existingConfig } = await storeSettingsTable
      .select('id')
      .is('event_id', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let result;
    if (existingConfig) {
      // Actualizar existente
      const updatePayload: Database['public']['Tables']['store_settings']['Update'] = {
        ...dbConfig,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await storeSettingsTable
        .update(updatePayload)
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) {
        console.error('[ServerAction] Error updating global config:', error);
        return { success: false, error: 'Error actualizando configuración global' };
      }
      result = data;
    } else {
      // Crear nueva
      const insertPayload: Database['public']['Tables']['store_settings']['Insert'] = {
        ...dbConfig,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await storeSettingsTable
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error('[ServerAction] Error creating global config:', error);
        return { success: false, error: 'Error creando configuración global' };
      }
      result = data;
    }

    console.log('[ServerAction] Global configuration saved successfully');
    const uiConfig = convertDbToUiConfig(result);

    return {
      success: true,
      config: uiConfig
    };
  } catch (error) {
    console.error('[ServerAction] Error in saveGlobalStoreConfigAction:', error);

    let errorMessage = 'Error guardando configuración global';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}
