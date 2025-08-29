import { z } from 'zod';
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export const SettingsSchema = z.object({
  businessName: z.string(),
  businessEmail: z.string().email().nullable().optional(),
  businessPhone: z.string().nullable().optional(),
  businessAddress: z.string().nullable().optional(),
  businessWebsite: z.string().nullable().optional(),
  watermarkText: z.string(),
  watermarkPosition: z.enum([
    'bottom-right',
    'bottom-left',
    'top-right',
    'top-left',
    'center',
  ]),
  watermarkOpacity: z.number(),
  watermarkSize: z.enum(['small', 'medium', 'large']),
  uploadMaxSizeMb: z.number(),
  uploadMaxConcurrent: z.number(),
  uploadQuality: z.number(),
  uploadMaxResolution: z.number(),
  defaultPhotoPriceArs: z.number(),
  bulkDiscountPercentage: z.number(),
  bulkDiscountMinimum: z.number(),
  packPriceArs: z.number(),
  notifyNewOrders: z.boolean(),
  notifyPayments: z.boolean(),
  notifyWeeklyReport: z.boolean(),
  notifyStorageAlerts: z.boolean(),
  timezone: z.string(),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  currency: z.enum(['ARS', 'USD', 'EUR']),
  language: z.enum(['es', 'en']),
  autoCleanupPreviews: z.boolean(),
  cleanupPreviewDays: z.number(),
});
export type AppSettings = z.infer<typeof SettingsSchema>;

interface SettingsCache {
  value: AppSettings | null;
  timestamp: number;
  etag?: string;
}

let cache: SettingsCache = { value: null, timestamp: 0 };

const CACHE_TTL_MS = 30_000; // 30 seconds

export async function getAppSettings(force = false): Promise<AppSettings> {
  const now = Date.now();

  // Return cached value if still valid
  if (!force && cache.value && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.value;
  }
  // In non-production or when DB not ready, return sensible defaults to avoid timeouts
  if (process.env.NODE_ENV !== 'production') {
    const defaults: AppSettings = {
      businessName: 'LookEscolar',
      businessEmail: null,
      businessPhone: null,
      businessAddress: null,
      businessWebsite: null,
      watermarkText: '© LookEscolar',
      watermarkPosition: 'center',
      watermarkOpacity: 50,
      watermarkSize: 'medium',
      uploadMaxSizeMb: 10,
      uploadMaxConcurrent: 3,
      uploadQuality: 72,
      uploadMaxResolution: 1600,
      defaultPhotoPriceArs: 1500,
      bulkDiscountPercentage: 10,
      bulkDiscountMinimum: 10,
      packPriceArs: 5000,
      notifyNewOrders: false,
      notifyPayments: false,
      notifyWeeklyReport: false,
      notifyStorageAlerts: false,
      timezone: 'America/Argentina/Buenos_Aires',
      dateFormat: 'DD/MM/YYYY',
      currency: 'ARS',
      language: 'es',
      autoCleanupPreviews: false,
      cleanupPreviewDays: 30,
    };
    cache = { value: defaults, timestamp: now };
    return defaults;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    throw new Error(`Failed to fetch app settings: ${error.message}`);
  }
  const settings = mapDbToSettings(data);

  // Update cache
  cache = {
    value: settings,
    timestamp: now,
    etag: data.updated_at,
  };

  return settings;
}

/**
 * Maps database row to AppSettings interface
 */
function mapDbToSettings(data: any): AppSettings {
  return {
    businessName: data.business_name,
    businessEmail: data.business_email ?? null,
    businessPhone: data.business_phone ?? null,
    businessAddress: data.business_address ?? null,
    businessWebsite: data.business_website ?? null,
    watermarkText: data.watermark_text,
    watermarkPosition: data.watermark_position,
    watermarkOpacity: data.watermark_opacity,
    watermarkSize: data.watermark_size,
    uploadMaxSizeMb: data.upload_max_size_mb,
    uploadMaxConcurrent: data.upload_max_concurrent,
    uploadQuality: data.upload_quality,
    uploadMaxResolution: data.upload_max_resolution,
    defaultPhotoPriceArs: data.default_photo_price_ars,
    bulkDiscountPercentage: data.bulk_discount_percentage,
    bulkDiscountMinimum: data.bulk_discount_minimum,
    packPriceArs: data.pack_price_ars,
    notifyNewOrders: data.notify_new_orders,
    notifyPayments: data.notify_payments,
    notifyWeeklyReport: data.notify_weekly_report,
    notifyStorageAlerts: data.notify_storage_alerts,
    timezone: data.timezone,
    dateFormat: data.date_format,
    currency: data.currency,
    language: data.language,
    autoCleanupPreviews: data.auto_cleanup_previews,
    cleanupPreviewDays: data.cleanup_preview_days,
  };
}
