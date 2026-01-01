/**
 * 🏪 Store Configuration Service
 *
 * Comprehensive service for store configuration CRUD operations.
 * Handles tenant-scoped store settings with validation, defaults, and mappers.
 *
 * Architecture:
 * - Tenant-scoped database operations via Supabase service client
 * - Zod validation for all inputs
 * - Database-to-UI and UI-to-database transformations
 * - Default configuration fallbacks
 *
 * Security:
 * - Tenant isolation enforced
 * - Service role client for RLS bypass
 * - Input validation with Zod schemas
 */

import { createServiceClient } from '@/lib/supabase/server';
import { StoreConfig, StoreProduct, validateStoreConfig } from '@/lib/validations/store-config';
import { convertDbToUiConfig, convertUiToDbConfig, getDefaultConfig } from '@/lib/services/store-config.mappers';
import type { Database } from '@/types/database';

type StoreSettingsRow = Database['public']['Tables']['store_settings']['Row'];
type StoreSettingsInsert = Database['public']['Tables']['store_settings']['Insert'];
type StoreSettingsUpdate = Database['public']['Tables']['store_settings']['Update'];

export interface StoreConfigResult {
  config: StoreConfig;
  metadata: {
    id: string;
    createdAt: string;
    updatedAt: string;
    eventId: string | null;
    folderId: string | null;
  };
}

/**
 * Get store configuration for a specific context (tenant, event, or folder)
 *
 * Priority order:
 * 1. Folder-specific configuration
 * 2. Event-specific configuration
 * 3. Tenant global configuration
 * 4. System default configuration
 */
export async function getStoreConfig(
  tenantId: string,
  options?: {
    eventId?: string;
    folderId?: string;
  }
): Promise<StoreConfig> {
  try {
    const supabase = await createServiceClient();
    let config: StoreSettingsRow | null = null;

    // Try folder-specific config first
    if (options?.folderId) {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('folder_id', options.folderId)
        .maybeSingle();

      if (!error && data) {
        config = data;
      }
    }

    // Try event-specific config
    if (!config && options?.eventId) {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('event_id', options.eventId)
        .maybeSingle();

      if (!error && data) {
        config = data;
      }
    }

    // Try tenant global config
    if (!config) {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('event_id', null)
        .is('folder_id', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        config = data;
      }
    }

    // Return default if no config found
    if (!config) {
      return getDefaultConfig();
    }

    return convertDbToUiConfig(config);
  } catch (error) {
    console.error('[StoreConfigService] Error fetching store config:', error);
    throw new Error('Failed to fetch store configuration');
  }
}

/**
 * Get store configuration with full metadata
 */
export async function getStoreConfigWithMetadata(
  tenantId: string,
  options?: {
    eventId?: string;
    folderId?: string;
  }
): Promise<StoreConfigResult | null> {
  try {
    const supabase = await createServiceClient();
    let config: StoreSettingsRow | null = null;

    // Try folder-specific config first
    if (options?.folderId) {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('folder_id', options.folderId)
        .maybeSingle();

      if (!error && data) {
        config = data;
      }
    }

    // Try event-specific config
    if (!config && options?.eventId) {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('event_id', options.eventId)
        .maybeSingle();

      if (!error && data) {
        config = data;
      }
    }

    // Try tenant global config
    if (!config) {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('event_id', null)
        .is('folder_id', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        config = data;
      }
    }

    if (!config) {
      return null;
    }

    return {
      config: convertDbToUiConfig(config),
      metadata: {
        id: config.id,
        createdAt: config.created_at || new Date().toISOString(),
        updatedAt: config.updated_at || new Date().toISOString(),
        eventId: config.event_id,
        folderId: config.folder_id,
      },
    };
  } catch (error) {
    console.error('[StoreConfigService] Error fetching store config with metadata:', error);
    throw new Error('Failed to fetch store configuration');
  }
}

/**
 * Create new store configuration
 */
export async function createStoreConfig(
  tenantId: string,
  config: StoreConfig,
  options?: {
    eventId?: string;
    folderId?: string;
  }
): Promise<StoreConfig> {
  try {
    const supabase = await createServiceClient();

    // Validate input
    const validated = validateStoreConfig(config);

    // Convert to database format
    const dbConfig = convertUiToDbConfig(validated, options?.eventId || null);

    // Prepare insert payload
    const insertPayload: StoreSettingsInsert = {
      tenant_id: tenantId,
      event_id: options?.eventId || null,
      folder_id: options?.folderId || null,
      ...dbConfig,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('store_settings')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('[StoreConfigService] Error creating store config:', error);
      throw new Error(`Failed to create store configuration: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create store configuration: No data returned');
    }

    return convertDbToUiConfig(data);
  } catch (error) {
    console.error('[StoreConfigService] Error in createStoreConfig:', error);
    throw error;
  }
}

/**
 * Update existing store configuration
 */
export async function updateStoreConfig(
  id: string,
  tenantId: string,
  updates: Partial<StoreConfig>
): Promise<StoreConfig> {
  try {
    const supabase = await createServiceClient();

    // Get existing config to merge
    const { data: existing, error: fetchError } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existing) {
      throw new Error('Store configuration not found');
    }

    // Merge with existing config
    const currentConfig = convertDbToUiConfig(existing);
    const mergedConfig = { ...currentConfig, ...updates };

    // Validate merged config
    const validated = validateStoreConfig(mergedConfig);

    // Convert to database format
    const dbConfig = convertUiToDbConfig(validated, existing.event_id);

    // Prepare update payload
    const updatePayload: StoreSettingsUpdate = {
      ...dbConfig,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('store_settings')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('[StoreConfigService] Error updating store config:', error);
      throw new Error(`Failed to update store configuration: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to update store configuration: No data returned');
    }

    return convertDbToUiConfig(data);
  } catch (error) {
    console.error('[StoreConfigService] Error in updateStoreConfig:', error);
    throw error;
  }
}

/**
 * Save store configuration (create or update)
 *
 * This is a convenience method that automatically determines whether to
 * create or update based on existing configuration.
 */
export async function saveStoreConfig(
  tenantId: string,
  config: StoreConfig,
  options?: {
    eventId?: string;
    folderId?: string;
  }
): Promise<StoreConfig> {
  try {
    const supabase = await createServiceClient();

    // Check if config exists
    let existingConfig: StoreSettingsRow | null = null;

    if (options?.folderId) {
      const { data } = await supabase
        .from('store_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('folder_id', options.folderId)
        .maybeSingle();
      existingConfig = data;
    } else if (options?.eventId) {
      const { data } = await supabase
        .from('store_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('event_id', options.eventId)
        .maybeSingle();
      existingConfig = data;
    } else {
      const { data } = await supabase
        .from('store_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('event_id', null)
        .is('folder_id', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existingConfig = data;
    }

    if (existingConfig) {
      return updateStoreConfig(existingConfig.id, tenantId, config);
    } else {
      return createStoreConfig(tenantId, config, options);
    }
  } catch (error) {
    console.error('[StoreConfigService] Error in saveStoreConfig:', error);
    throw error;
  }
}

/**
 * Delete store configuration
 */
export async function deleteStoreConfig(
  id: string,
  tenantId: string
): Promise<void> {
  try {
    const supabase = await createServiceClient();

    const { error } = await supabase
      .from('store_settings')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('[StoreConfigService] Error deleting store config:', error);
      throw new Error(`Failed to delete store configuration: ${error.message}`);
    }
  } catch (error) {
    console.error('[StoreConfigService] Error in deleteStoreConfig:', error);
    throw error;
  }
}

/**
 * List all store configurations for a tenant
 */
export async function listStoreConfigs(
  tenantId: string,
  options?: {
    eventId?: string;
    folderId?: string;
    includeGlobal?: boolean;
  }
): Promise<StoreConfigResult[]> {
  try {
    const supabase = await createServiceClient();

    let query = supabase
      .from('store_settings')
      .select('*')
      .eq('tenant_id', tenantId);

    if (options?.eventId) {
      query = query.eq('event_id', options.eventId);
    }

    if (options?.folderId) {
      query = query.eq('folder_id', options.folderId);
    }

    if (!options?.includeGlobal) {
      // Exclude global configs
      query = query.not('event_id', 'is', null).not('folder_id', 'is', null);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[StoreConfigService] Error listing store configs:', error);
      throw new Error(`Failed to list store configurations: ${error.message}`);
    }

    return (data || []).map((row) => ({
      config: convertDbToUiConfig(row),
      metadata: {
        id: row.id,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
        eventId: row.event_id,
        folderId: row.folder_id,
      },
    }));
  } catch (error) {
    console.error('[StoreConfigService] Error in listStoreConfigs:', error);
    throw error;
  }
}

// ========================================
// Product Utilities
// ========================================

/**
 * Validate product structure
 */
export function validateProductStructure(product: any): StoreProduct {
  try {
    return validateStoreConfig({ products: [product] }).products[0];
  } catch (error) {
    console.error('[StoreConfigService] Invalid product structure:', error);
    throw new Error('Invalid product structure');
  }
}

/**
 * Get total enabled products
 */
export function getTotalEnabledProducts(config: StoreConfig): number {
  return config.products.filter((product) => product.enabled).length;
}

/**
 * Get total value of enabled products
 */
export function getTotalValue(config: StoreConfig): number {
  return config.products
    .filter((product) => product.enabled)
    .reduce((total, product) => total + product.price, 0);
}

/**
 * Get active products (enabled only)
 */
export function getActiveProducts(config: StoreConfig): StoreProduct[] {
  return config.products.filter((product) => product.enabled);
}

/**
 * Get products by type
 */
export function getProductsByType(
  config: StoreConfig,
  type: 'physical' | 'digital'
): StoreProduct[] {
  return config.products.filter((product) => product.type === type && product.enabled);
}

// Export mappers and defaults for convenience
export { getDefaultConfig, convertDbToUiConfig, convertUiToDbConfig } from '@/lib/services/store-config.mappers';
