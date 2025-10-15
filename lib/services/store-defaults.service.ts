/**
 * 🏪 Servicio para configuración global por defecto
 * Maneja configuraciones que se usan como fallback cuando no hay configuración específica
 */

import { createClient } from '@/lib/supabase/client';
import { StoreConfig, validateStoreConfig } from '@/lib/validations/store-config';
import { convertDbToUiConfig, convertUiToDbConfig, getDefaultConfig } from '@/lib/services/store-config.mappers';

/**
 * Carga configuración global por defecto
 */
export async function fetchGlobalStoreConfig(): Promise<StoreConfig> {
  try {
    const supabase = createClient();

    const { data: globalConfig } = await supabase
      .from('store_settings')
      .select('*')
      .is('event_id', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (globalConfig) {
      return convertDbToUiConfig(globalConfig);
    }

    // Si no hay configuración global, retornar configuración por defecto
    return getDefaultConfig();
  } catch (error) {
    console.error('[StoreDefaultsService] Error fetching global config:', error);
    return getDefaultConfig();
  }
}

/**
 * Guarda configuración global por defecto
 */
export async function saveGlobalStoreConfig(config: StoreConfig): Promise<StoreConfig> {
  try {
    const supabase = createClient();
    const validatedConfig = validateStoreConfig(config);
    const dbConfig = convertUiToDbConfig(validatedConfig);

    // Buscar configuración global existente
    const { data: existingConfig } = await supabase
      .from('store_settings')
      .select('id')
      .is('event_id', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let result;
    if (existingConfig) {
      // Actualizar existente
      const { data, error } = await supabase
        .from('store_settings')
        .update({
          ...dbConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Crear nueva
      const { data, error } = await supabase
        .from('store_settings')
        .insert({
          ...dbConfig,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    console.log('[StoreDefaultsService] Global configuration saved successfully');
    return convertDbToUiConfig(result);
  } catch (error) {
    console.error('[StoreDefaultsService] Error saving global config:', error);
    throw error;
  }
}

/**
 * Resetea configuración de un evento a la configuración global
 */
export async function resetEventConfigToGlobal(eventId: string): Promise<StoreConfig> {
  try {
    const globalConfig = await fetchGlobalStoreConfig();
    const supabase = createClient();

    // Eliminar configuración específica del evento
    await supabase
      .from('store_settings')
      .delete()
      .eq('event_id', eventId);

    console.log('[StoreDefaultsService] Event config reset to global defaults');
    return globalConfig;
  } catch (error) {
    console.error('[StoreDefaultsService] Error resetting event config:', error);
    throw error;
  }
}

/**
 * Crea configuración por defecto para un evento nuevo
 */
export async function createDefaultEventConfig(eventId: string): Promise<StoreConfig> {
  try {
    const globalConfig = await fetchGlobalStoreConfig();
    const supabase = createClient();
    const dbConfig = convertUiToDbConfig(globalConfig, eventId);

    // Crear configuración específica para el evento basada en la global
    const { data, error } = await supabase
      .from('store_settings')
      .insert({
        ...dbConfig,
        event_id: eventId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    console.log('[StoreDefaultsService] Default event config created');
    return convertDbToUiConfig(data);
  } catch (error) {
    console.error('[StoreDefaultsService] Error creating default event config:', error);
    throw error;
  }
}

export { getDefaultConfig as getDefaultStoreConfig } from '@/lib/services/store-config.mappers';
