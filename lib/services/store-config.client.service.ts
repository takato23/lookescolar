/**
 * 🏪 Servicio de configuración de tienda para el lado del cliente
 * Usa el cliente de Supabase del navegador para componentes del lado del cliente
 */

import { createClient } from '@/lib/supabase/client';
import { StoreConfig, StoreProduct, validateStoreConfig } from '@/lib/validations/store-config';
import { convertDbToUiConfig, convertUiToDbConfig, getDefaultConfig } from '@/lib/services/store-config.mappers';

/**
 * Carga configuración de tienda para un evento específico
 */
export async function fetchStoreConfig(eventId: string): Promise<StoreConfig> {
  try {
    // Verificar que estamos en el navegador
    if (typeof window === 'undefined') {
      throw new Error('fetchStoreConfig solo puede ser usado en el navegador');
    }

    const supabase = createClient();

    const { data: eventConfig, error: eventError } = await supabase
      .from('store_settings')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (eventError && eventError.code !== 'PGRST116') {
      console.error('[StoreConfigClientService] Error fetching event config:', eventError);
      throw new Error('Error cargando configuración del evento');
    }

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

    return convertDbToUiConfig(config || getDefaultConfig());
  } catch (error) {
    console.error('[StoreConfigClientService] Error in fetchStoreConfig:', error);
    throw error;
  }
}

/**
 * Guarda configuración de tienda para un evento
 */
export async function saveStoreConfig(eventId: string, config: StoreConfig): Promise<StoreConfig> {
  try {
    const supabase = createClient();

    // Verificar que el evento existe
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Evento no encontrado');
    }

    // Convertir y validar configuración
    const dbConfig = convertUiToDbConfig(config, eventId);

    // Buscar configuración existente
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
        .update({
          ...dbConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) {
        console.error('[StoreConfigClientService] Error updating config:', error);
        throw new Error('Error actualizando configuración');
      }
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

      if (error) {
        console.error('[StoreConfigClientService] Error creating config:', error);
        throw new Error('Error creando configuración');
      }
      result = data;
    }

    console.log('[StoreConfigClientService] Configuration saved successfully for event:', eventId);
    return convertDbToUiConfig(result);
  } catch (error) {
    console.error('[StoreConfigClientService] Error in saveStoreConfig:', error);
    throw error;
  }
}

/**
 * Valida que un producto tenga estructura correcta
 */
export function validateProductStructure(product: any): StoreProduct {
  try {
    return validateStoreConfig({ products: [product] }).products[0];
  } catch (error) {
    console.error('[StoreConfigClientService] Invalid product structure:', error);
    throw new Error('Estructura de producto inválida');
  }
}

/**
 * Calcula el total de productos habilitados
 */
export function getTotalEnabledProducts(config: StoreConfig): number {
  return config.products.filter(product => product.enabled).length;
}

/**
 * Calcula el valor total de productos habilitados
 */
export function getTotalValue(config: StoreConfig): number {
  return config.products
    .filter(product => product.enabled)
    .reduce((total, product) => total + product.price, 0);
}

/**
 * Obtiene productos activos (habilitados)
 */
export function getActiveProducts(config: StoreConfig): StoreProduct[] {
  return config.products.filter(product => product.enabled);
}

export { getDefaultConfig, convertDbToUiConfig, convertUiToDbConfig } from '@/lib/services/store-config.mappers';
