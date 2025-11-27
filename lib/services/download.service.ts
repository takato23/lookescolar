import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';
import { tenantFeaturesService } from '@/lib/services/tenant-features.service';

// =============================================================================
// TYPES
// =============================================================================

export interface TenantProductConfig {
  physical_enabled: boolean;
  digital_enabled: boolean;
  digital_price_base_cents: number;
  digital_packages: Array<{
    id: string;
    name: string;
    photo_count: number | 'all';
    price_cents: number;
    discount_percentage?: number;
  }>;
  download_limit: number;
  download_expiry_hours: number;
}

export interface DownloadRecord {
  id: string;
  tenant_id: string;
  order_id: string;
  photo_id: string;
  token: string;
  download_count: number;
  max_downloads: number;
  expires_at: string;
  first_downloaded_at: string | null;
  last_downloaded_at: string | null;
  created_at: string;
}

export interface CreateDownloadsOptions {
  supabase: SupabaseClient<Database>;
  orderId: string;
  tenantId: string;
  photoIds: string[];
  expiryHours?: number;
  maxDownloads?: number;
}

export interface CreateDownloadsResult {
  success: boolean;
  downloads: Array<{
    photoId: string;
    token: string;
    downloadUrl: string;
    expiresAt: string;
    maxDownloads: number;
  }>;
  error?: string;
}

export interface ValidateDownloadOptions {
  supabase: SupabaseClient<Database>;
  token: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ValidateDownloadResult {
  valid: boolean;
  download?: DownloadRecord;
  photo?: {
    id: string;
    storage_path: string;
    tenant_id: string;
  };
  signedUrl?: string;
  remainingDownloads?: number;
  error?: string;
}

// =============================================================================
// DOWNLOAD SERVICE CLASS
// =============================================================================

export class DownloadService {
  private readonly log = logger.child({ service: 'download' });

  /**
   * Get tenant product configuration
   */
  async getTenantProductConfig(
    supabase: SupabaseClient<Database>,
    tenantId: string
  ): Promise<TenantProductConfig | null> {
    const { data, error } = await supabase
      .from('tenants')
      .select('product_config')
      .eq('id', tenantId)
      .maybeSingle();

    if (error || !data) {
      this.log.error('tenant_product_config_fetch_failed', { error: error?.message, tenantId });
      return null;
    }

    const defaultConfig: TenantProductConfig = {
      physical_enabled: true,
      digital_enabled: false,
      digital_price_base_cents: 0,
      digital_packages: [],
      download_limit: 3,
      download_expiry_hours: 48,
    };

    return { ...defaultConfig, ...(data.product_config as TenantProductConfig) };
  }

  /**
   * Check if digital sales are enabled for tenant
   */
  async isDigitalEnabled(
    supabase: SupabaseClient<Database>,
    tenantId: string
  ): Promise<boolean> {
    const config = await this.getTenantProductConfig(supabase, tenantId);
    return config?.digital_enabled ?? false;
  }

  /**
   * Generate a secure download token
   */
  private generateToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    const randomValues = new Uint8Array(64);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < 64; i++) {
      result += chars[randomValues[i] % chars.length];
    }
    return result;
  }

  /**
   * Create download records for an order's digital photos
   */
  async createDownloads(options: CreateDownloadsOptions): Promise<CreateDownloadsResult> {
    const { supabase, orderId, tenantId, photoIds } = options;
    const log = this.log.child({ orderId, tenantId, photoCount: photoIds.length });

    if (photoIds.length === 0) {
      return { success: true, downloads: [] };
    }

    // Get tenant config for defaults
    const config = await this.getTenantProductConfig(supabase, tenantId);
    if (!config) {
      return { success: false, downloads: [], error: 'Configuracion de tenant no encontrada' };
    }

    const expiryHours = options.expiryHours ?? config.download_expiry_hours;
    const maxDownloads = options.maxDownloads ?? config.download_limit;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

    const downloads: CreateDownloadsResult['downloads'] = [];
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    for (const photoId of photoIds) {
      // Generate unique token
      let token: string;
      let attempts = 0;
      do {
        token = this.generateToken();
        const { data: existing } = await supabase
          .from('downloads')
          .select('id')
          .eq('token', token)
          .maybeSingle();

        if (!existing) break;
        attempts++;
      } while (attempts < 5);

      if (attempts >= 5) {
        log.error('token_generation_failed', { photoId });
        continue;
      }

      // Create download record
      const { data, error } = await supabase
        .from('downloads')
        .insert({
          tenant_id: tenantId,
          order_id: orderId,
          photo_id: photoId,
          token,
          max_downloads: maxDownloads,
          expires_at: expiresAt,
        })
        .select('id')
        .maybeSingle();

      if (error) {
        log.error('download_record_creation_failed', { error: error.message, photoId });
        continue;
      }

      downloads.push({
        photoId,
        token,
        downloadUrl: `${baseUrl}/download/${token}`,
        expiresAt,
        maxDownloads,
      });
    }

    // Update order to mark digital delivery as ready
    await supabase
      .from('unified_orders')
      .update({
        has_digital_items: true,
        digital_delivery_status: 'ready',
      })
      .eq('id', orderId);

    log.info('downloads_created', { count: downloads.length });

    return { success: true, downloads };
  }

  /**
   * Validate a download token and get the photo
   */
  async validateDownload(options: ValidateDownloadOptions): Promise<ValidateDownloadResult> {
    const { supabase, token } = options;
    const log = this.log.child({ token: token.substring(0, 8) + '...' });

    // Find download record first to get tenant_id
    const { data: download, error } = await supabase
      .from('downloads')
      .select(`
        *,
        photo:photos(id, storage_path, tenant_id)
      `)
      .eq('token', token)
      .maybeSingle();

    if (error || !download) {
      log.warn('download_not_found');
      return { valid: false, error: 'Token de descarga invalido' };
    }

    // Check if digital downloads are enabled for this tenant
    const downloadsEnabled = await tenantFeaturesService.isFeatureEnabled(
      supabase,
      download.tenant_id,
      'digital_downloads_enabled'
    );

    if (!downloadsEnabled) {
      log.info('digital_downloads_disabled', { tenantId: download.tenant_id });
      return { valid: false, error: 'Las descargas digitales están deshabilitadas' };
    }

    // Check expiration
    if (new Date(download.expires_at) < new Date()) {
      log.warn('download_expired');
      return { valid: false, error: 'El enlace de descarga ha expirado' };
    }

    // Check download limit
    if (download.download_count >= download.max_downloads) {
      log.warn('download_limit_exceeded');
      return { valid: false, error: 'Has alcanzado el limite de descargas' };
    }

    const photo = download.photo as unknown as { id: string; storage_path: string; tenant_id: string };
    if (!photo) {
      log.error('photo_not_found');
      return { valid: false, error: 'Foto no encontrada' };
    }

    // Generate signed URL for the original photo (without watermark)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('photo-private')
      .createSignedUrl(photo.storage_path, 60 * 5); // 5 minutes

    if (signedUrlError || !signedUrlData?.signedUrl) {
      log.error('signed_url_generation_failed', { error: signedUrlError?.message });
      return { valid: false, error: 'Error al generar enlace de descarga' };
    }

    return {
      valid: true,
      download: download as unknown as DownloadRecord,
      photo,
      signedUrl: signedUrlData.signedUrl,
      remainingDownloads: download.max_downloads - download.download_count,
    };
  }

  /**
   * Record a download attempt and update counters
   */
  async recordDownload(options: ValidateDownloadOptions): Promise<ValidateDownloadResult> {
    const { supabase, token, ipAddress, userAgent } = options;
    const log = this.log.child({ token: token.substring(0, 8) + '...' });

    // Validate first
    const validation = await this.validateDownload(options);
    if (!validation.valid || !validation.download) {
      return validation;
    }

    // Update download record
    const { error: updateError } = await supabase
      .from('downloads')
      .update({
        download_count: validation.download.download_count + 1,
        first_downloaded_at: validation.download.first_downloaded_at || new Date().toISOString(),
        last_downloaded_at: new Date().toISOString(),
        ip_addresses: ipAddress
          ? supabase.rpc('array_append_unique', {
              arr: validation.download.ip_addresses || [],
              val: ipAddress,
            })
          : undefined,
        user_agent: userAgent || validation.download.user_agent,
      })
      .eq('id', validation.download.id);

    if (updateError) {
      log.error('download_record_update_failed', { error: updateError.message });
      // Still return success since we validated successfully
    }

    log.info('download_recorded', {
      downloadId: validation.download.id,
      newCount: validation.download.download_count + 1,
    });

    return {
      ...validation,
      remainingDownloads: validation.download.max_downloads - validation.download.download_count - 1,
    };
  }

  /**
   * Get all downloads for an order
   */
  async getOrderDownloads(
    supabase: SupabaseClient<Database>,
    orderId: string
  ): Promise<DownloadRecord[]> {
    const { data, error } = await supabase
      .from('downloads')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      this.log.error('order_downloads_fetch_failed', { error: error.message, orderId });
      return [];
    }

    return (data || []) as unknown as DownloadRecord[];
  }

  /**
   * Extend download expiration
   */
  async extendDownloadExpiry(
    supabase: SupabaseClient<Database>,
    downloadId: string,
    additionalHours: number
  ): Promise<boolean> {
    const { data: download, error: fetchError } = await supabase
      .from('downloads')
      .select('expires_at')
      .eq('id', downloadId)
      .maybeSingle();

    if (fetchError || !download) {
      return false;
    }

    const currentExpiry = new Date(download.expires_at);
    const newExpiry = new Date(currentExpiry.getTime() + additionalHours * 60 * 60 * 1000);

    const { error: updateError } = await supabase
      .from('downloads')
      .update({ expires_at: newExpiry.toISOString() })
      .eq('id', downloadId);

    return !updateError;
  }

  /**
   * Reset download count for a specific download
   */
  async resetDownloadCount(
    supabase: SupabaseClient<Database>,
    downloadId: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('downloads')
      .update({ download_count: 0 })
      .eq('id', downloadId);

    return !error;
  }

  /**
   * Get download statistics for admin dashboard
   */
  async getDownloadStats(
    supabase: SupabaseClient<Database>,
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalDownloads: number;
    uniqueOrders: number;
    totalPhotosDownloaded: number;
    expiredLinks: number;
    exhaustedLinks: number;
  }> {
    let query = supabase
      .from('downloads')
      .select('id, order_id, download_count, max_downloads, expires_at', { count: 'exact' })
      .eq('tenant_id', tenantId);

    if (dateFrom) {
      query = query.gte('created_at', dateFrom.toISOString());
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo.toISOString());
    }

    const { data, count } = await query;

    if (!data) {
      return {
        totalDownloads: 0,
        uniqueOrders: 0,
        totalPhotosDownloaded: 0,
        expiredLinks: 0,
        exhaustedLinks: 0,
      };
    }

    const now = new Date();
    const uniqueOrders = new Set(data.map((d) => d.order_id)).size;
    const totalDownloads = data.reduce((sum, d) => sum + (d.download_count || 0), 0);
    const expiredLinks = data.filter((d) => new Date(d.expires_at) < now).length;
    const exhaustedLinks = data.filter((d) => d.download_count >= d.max_downloads).length;

    return {
      totalDownloads,
      uniqueOrders,
      totalPhotosDownloaded: count || 0,
      expiredLinks,
      exhaustedLinks,
    };
  }
}

// Export singleton instance
export const downloadService = new DownloadService();
