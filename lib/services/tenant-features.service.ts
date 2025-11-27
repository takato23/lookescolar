import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

// =============================================================================
// TYPES
// =============================================================================

export interface TenantFeatureConfig {
  id: string;
  tenant_id: string;

  // Feature flags
  coupons_enabled: boolean;
  digital_downloads_enabled: boolean;
  email_notifications_enabled: boolean;
  invoice_generation_enabled: boolean;
  receipt_generation_enabled: boolean;
  store_preview_enabled: boolean;

  // Checkout options
  whatsapp_checkout_enabled: boolean;
  mercadopago_enabled: boolean;
  cash_payment_enabled: boolean;

  // Gallery features
  watermark_enabled: boolean;
  qr_tagging_enabled: boolean;
  bulk_download_enabled: boolean;

  // Advanced features
  analytics_enabled: boolean;
  custom_branding_enabled: boolean;
  multi_currency_enabled: boolean;

  // Default values
  default_coupon_expiry_days: number;
  max_photos_per_order: number;
  max_digital_download_size_mb: number;
  download_link_expiry_hours: number;

  // Email settings
  email_from_name: string;
  email_reply_to: string | null;

  // Extra config
  extra_config: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}

export type FeatureFlag =
  | 'coupons_enabled'
  | 'digital_downloads_enabled'
  | 'email_notifications_enabled'
  | 'invoice_generation_enabled'
  | 'receipt_generation_enabled'
  | 'store_preview_enabled'
  | 'whatsapp_checkout_enabled'
  | 'mercadopago_enabled'
  | 'cash_payment_enabled'
  | 'watermark_enabled'
  | 'qr_tagging_enabled'
  | 'bulk_download_enabled'
  | 'analytics_enabled'
  | 'custom_branding_enabled'
  | 'multi_currency_enabled';

// Default configuration
const DEFAULT_CONFIG: Omit<TenantFeatureConfig, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
  coupons_enabled: true,
  digital_downloads_enabled: false,
  email_notifications_enabled: true,
  invoice_generation_enabled: true,
  receipt_generation_enabled: true,
  store_preview_enabled: true,
  whatsapp_checkout_enabled: false,
  mercadopago_enabled: true,
  cash_payment_enabled: false,
  watermark_enabled: true,
  qr_tagging_enabled: true,
  bulk_download_enabled: false,
  analytics_enabled: false,
  custom_branding_enabled: false,
  multi_currency_enabled: false,
  default_coupon_expiry_days: 30,
  max_photos_per_order: 100,
  max_digital_download_size_mb: 50,
  download_link_expiry_hours: 48,
  email_from_name: 'LookEscolar',
  email_reply_to: null,
  extra_config: {},
};

// In-memory cache for performance
const configCache = new Map<string, { config: TenantFeatureConfig; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// SERVICE CLASS
// =============================================================================

class TenantFeaturesService {
  /**
   * Get feature configuration for a tenant
   */
  async getConfig(
    supabase: SupabaseClient<Database>,
    tenantId: string
  ): Promise<TenantFeatureConfig> {
    // Check cache first
    const cached = configCache.get(tenantId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.config;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from('tenant_feature_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle() as { data: any; error: any };

      if (error) {
        console.error('[TenantFeatures] Error fetching config:', error);
        return this.getDefaultConfig(tenantId);
      }

      if (!data) {
        // Create default config for new tenant
        return await this.createDefaultConfig(supabase, tenantId);
      }

      const config = data as TenantFeatureConfig;

      // Update cache
      configCache.set(tenantId, { config, timestamp: Date.now() });

      return config;
    } catch (error) {
      console.error('[TenantFeatures] Unexpected error:', error);
      return this.getDefaultConfig(tenantId);
    }
  }

  /**
   * Check if a specific feature is enabled for a tenant
   */
  async isFeatureEnabled(
    supabase: SupabaseClient<Database>,
    tenantId: string,
    feature: FeatureFlag
  ): Promise<boolean> {
    const config = await this.getConfig(supabase, tenantId);
    return config[feature] ?? DEFAULT_CONFIG[feature] ?? false;
  }

  /**
   * Update feature configuration for a tenant
   */
  async updateConfig(
    supabase: SupabaseClient<Database>,
    tenantId: string,
    updates: Partial<TenantFeatureConfig>
  ): Promise<{ success: boolean; error?: string; config?: TenantFeatureConfig }> {
    try {
      // Remove readonly fields
      const { id, tenant_id, created_at, updated_at, ...updateData } = updates;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from('tenant_feature_configs')
        .update(updateData)
        .eq('tenant_id', tenantId)
        .select()
        .single() as { data: any; error: any };

      if (error) {
        console.error('[TenantFeatures] Error updating config:', error);
        return { success: false, error: error.message };
      }

      const config = data as TenantFeatureConfig;

      // Invalidate cache
      configCache.delete(tenantId);

      return { success: true, config };
    } catch (error) {
      console.error('[TenantFeatures] Unexpected error:', error);
      return { success: false, error: 'Error interno al actualizar configuracion' };
    }
  }

  /**
   * Toggle a specific feature
   */
  async toggleFeature(
    supabase: SupabaseClient<Database>,
    tenantId: string,
    feature: FeatureFlag,
    enabled: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.updateConfig(supabase, tenantId, {
      [feature]: enabled,
    } as Partial<TenantFeatureConfig>);
    return { success: result.success, error: result.error };
  }

  /**
   * Create default configuration for a new tenant
   */
  private async createDefaultConfig(
    supabase: SupabaseClient<Database>,
    tenantId: string
  ): Promise<TenantFeatureConfig> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from('tenant_feature_configs')
        .insert({
          tenant_id: tenantId,
          ...DEFAULT_CONFIG,
        })
        .select()
        .single() as { data: any; error: any };

      if (error) {
        console.error('[TenantFeatures] Error creating default config:', error);
        return this.getDefaultConfig(tenantId);
      }

      const config = data as TenantFeatureConfig;
      configCache.set(tenantId, { config, timestamp: Date.now() });
      return config;
    } catch (error) {
      console.error('[TenantFeatures] Unexpected error creating config:', error);
      return this.getDefaultConfig(tenantId);
    }
  }

  /**
   * Get default config object (for fallback)
   */
  private getDefaultConfig(tenantId: string): TenantFeatureConfig {
    return {
      id: 'default',
      tenant_id: tenantId,
      ...DEFAULT_CONFIG,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Clear cache for a tenant
   */
  clearCache(tenantId?: string) {
    if (tenantId) {
      configCache.delete(tenantId);
    } else {
      configCache.clear();
    }
  }

  /**
   * Get all available features with their descriptions
   */
  getFeatureDefinitions(): Array<{
    key: FeatureFlag;
    label: string;
    description: string;
    category: string;
  }> {
    return [
      // Store Features
      {
        key: 'coupons_enabled',
        label: 'Cupones de descuento',
        description: 'Permite a los clientes aplicar codigos de descuento en el checkout',
        category: 'store',
      },
      {
        key: 'digital_downloads_enabled',
        label: 'Descargas digitales',
        description: 'Permite vender fotos en formato digital para descarga',
        category: 'store',
      },
      {
        key: 'invoice_generation_enabled',
        label: 'Generacion de facturas',
        description: 'Genera facturas PDF para las ordenes',
        category: 'store',
      },
      {
        key: 'receipt_generation_enabled',
        label: 'Generacion de recibos',
        description: 'Genera recibos PDF para los clientes',
        category: 'store',
      },
      {
        key: 'store_preview_enabled',
        label: 'Vista previa de tienda',
        description: 'Permite previsualizar la tienda antes de publicar',
        category: 'store',
      },

      // Checkout
      {
        key: 'mercadopago_enabled',
        label: 'Pago con MercadoPago',
        description: 'Habilita pagos mediante MercadoPago',
        category: 'checkout',
      },
      {
        key: 'whatsapp_checkout_enabled',
        label: 'Checkout por WhatsApp',
        description: 'Permite completar pedidos via WhatsApp',
        category: 'checkout',
      },
      {
        key: 'cash_payment_enabled',
        label: 'Pago en efectivo',
        description: 'Permite pedidos con pago en efectivo',
        category: 'checkout',
      },

      // Notifications
      {
        key: 'email_notifications_enabled',
        label: 'Notificaciones por email',
        description: 'Envia emails automaticos de confirmacion y estado de ordenes',
        category: 'notifications',
      },

      // Gallery
      {
        key: 'watermark_enabled',
        label: 'Marca de agua',
        description: 'Aplica marca de agua a las fotos de vista previa',
        category: 'gallery',
      },
      {
        key: 'qr_tagging_enabled',
        label: 'Etiquetado QR',
        description: 'Permite etiquetar fotos usando codigos QR',
        category: 'gallery',
      },
      {
        key: 'bulk_download_enabled',
        label: 'Descarga masiva',
        description: 'Permite descargar multiples fotos en un ZIP',
        category: 'gallery',
      },

      // Advanced
      {
        key: 'analytics_enabled',
        label: 'Analiticas avanzadas',
        description: 'Metricas detalladas de ventas y comportamiento',
        category: 'advanced',
      },
      {
        key: 'custom_branding_enabled',
        label: 'Branding personalizado',
        description: 'Permite personalizar colores, logo y estilos',
        category: 'advanced',
      },
      {
        key: 'multi_currency_enabled',
        label: 'Multi-moneda',
        description: 'Soporte para multiples monedas',
        category: 'advanced',
      },
    ];
  }
}

export const tenantFeaturesService = new TenantFeaturesService();
