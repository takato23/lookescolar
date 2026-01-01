import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
export const dynamic = 'force-dynamic';

const SettingsSchema = z.object({
  businessName: z.string().min(1).max(100).default('LookEscolar'),
  businessEmail: z.string().email().optional().nullable(),
  businessPhone: z.string().optional().nullable(),
  businessAddress: z.string().optional().nullable(),
  businessWebsite: z.string().url().optional().nullable(),

  watermarkText: z.string().min(1).max(100).default('© LookEscolar'),
  watermarkPosition: z
    .enum(['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'])
    .default('bottom-right'),
  watermarkOpacity: z.number().int().min(10).max(100).default(70),
  watermarkSize: z.enum(['small', 'medium', 'large']).default('medium'),

  uploadMaxSizeMb: z.number().int().min(1).max(50).default(10),
  uploadMaxConcurrent: z.number().int().min(1).max(10).default(5),
  uploadQuality: z.number().int().min(50).max(100).default(72),
  uploadMaxResolution: z
    .enum(['1600', '1920', '2048'])
    .transform(Number)
    .default('1920'),

  defaultPhotoPriceArs: z.number().int().min(0).default(500),
  bulkDiscountPercentage: z.number().int().min(0).max(50).default(10),
  bulkDiscountMinimum: z.number().int().min(2).default(5),
  packPriceArs: z.number().int().min(0).default(2000),

  notifyNewOrders: z.boolean().default(true),
  notifyPayments: z.boolean().default(true),
  notifyWeeklyReport: z.boolean().default(true),
  notifyStorageAlerts: z.boolean().default(true),

  timezone: z.string().default('America/Argentina/Buenos_Aires'),
  dateFormat: z
    .enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'])
    .default('DD/MM/YYYY'),
  currency: z.enum(['ARS', 'USD', 'EUR']).default('ARS'),
  language: z.enum(['es', 'en']).default('es'),

  autoCleanupPreviews: z.boolean().default(true),
  cleanupPreviewDays: z.number().int().min(1).default(90),

  qrDefaultSize: z.enum(['small', 'medium', 'large']).default('medium'),
  qrDetectionSensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
  qrAutoTagOnUpload: z.boolean().default(true),
  qrShowInGallery: z.boolean().default(false),
});

const SettingsPatchSchema = SettingsSchema.deepPartial();
type Settings = z.infer<typeof SettingsSchema>;
type SettingsPatch = z.infer<typeof SettingsPatchSchema>;

function fromDb(row: any): Settings {
  return {
    businessName: row.business_name ?? 'LookEscolar',
    businessEmail: row.business_email ?? null,
    businessPhone: row.business_phone ?? null,
    businessAddress: row.business_address ?? null,
    businessWebsite: row.business_website ?? null,

    watermarkText: row.watermark_text,
    watermarkPosition: row.watermark_position,
    watermarkOpacity: row.watermark_opacity,
    watermarkSize: row.watermark_size,

    uploadMaxSizeMb: row.upload_max_size_mb,
    uploadMaxConcurrent: row.upload_max_concurrent,
    uploadQuality: row.upload_quality,
    uploadMaxResolution: row.upload_max_resolution,

    defaultPhotoPriceArs: row.default_photo_price_ars,
    bulkDiscountPercentage: row.bulk_discount_percentage,
    bulkDiscountMinimum: row.bulk_discount_minimum,
    packPriceArs: row.pack_price_ars,

    notifyNewOrders: row.notify_new_orders,
    notifyPayments: row.notify_payments,
    notifyWeeklyReport: row.notify_weekly_report,
    notifyStorageAlerts: row.notify_storage_alerts,

    timezone: row.timezone,
    dateFormat: row.date_format,
    currency: row.currency,
    language: row.language,

    autoCleanupPreviews: row.auto_cleanup_previews,
    cleanupPreviewDays: row.cleanup_preview_days,

    qrDefaultSize: row.qr_default_size,
    qrDetectionSensitivity: row.qr_detection_sensitivity,
    qrAutoTagOnUpload: row.qr_auto_tag_on_upload,
    qrShowInGallery: row.qr_show_in_gallery,
  } as Settings;
}

/**
 * Maps camelCase settings to snake_case database fields
 */
function toDb(patch: SettingsPatch): Record<string, any> {
  const dbFields: Record<string, any> = {};

  const mapField = (camelKey: keyof SettingsPatch, dbKey: string) => {
    if (patch[camelKey] !== undefined) {
      dbFields[dbKey] = patch[camelKey];
    }
  };
  // Business settings
  mapField('businessName', 'business_name');
  mapField('businessEmail', 'business_email');
  mapField('businessPhone', 'business_phone');
  mapField('businessAddress', 'business_address');
  mapField('businessWebsite', 'business_website');

  // Watermark settings
  mapField('watermarkText', 'watermark_text');
  mapField('watermarkPosition', 'watermark_position');
  mapField('watermarkOpacity', 'watermark_opacity');
  mapField('watermarkSize', 'watermark_size');

  // Upload settings
  mapField('uploadMaxSizeMb', 'upload_max_size_mb');
  mapField('uploadMaxConcurrent', 'upload_max_concurrent');
  mapField('uploadQuality', 'upload_quality');
  mapField('uploadMaxResolution', 'upload_max_resolution');

  // Pricing settings
  mapField('defaultPhotoPriceArs', 'default_photo_price_ars');
  mapField('bulkDiscountPercentage', 'bulk_discount_percentage');
  mapField('bulkDiscountMinimum', 'bulk_discount_minimum');
  mapField('packPriceArs', 'pack_price_ars');

  // Notification settings
  mapField('notifyNewOrders', 'notify_new_orders');
  mapField('notifyPayments', 'notify_payments');
  mapField('notifyWeeklyReport', 'notify_weekly_report');
  mapField('notifyStorageAlerts', 'notify_storage_alerts');

  // Localization settings
  mapField('timezone', 'timezone');
  mapField('dateFormat', 'date_format');
  mapField('currency', 'currency');
  mapField('language', 'language');

  // System settings
  mapField('autoCleanupPreviews', 'auto_cleanup_previews');
  mapField('cleanupPreviewDays', 'cleanup_preview_days');

  // QR settings
  mapField('qrDefaultSize', 'qr_default_size');
  mapField('qrDetectionSensitivity', 'qr_detection_sensitivity');
  mapField('qrAutoTagOnUpload', 'qr_auto_tag_on_upload');
  mapField('qrShowInGallery', 'qr_show_in_gallery');

  return dbFields;
}

/**
 * Generates ETag from timestamp for caching
 */
function makeEtag(updatedAt: string | null | undefined): string {
  return `"${updatedAt ?? Date.now().toString()}"`;
}

function sanitizeEtag(etag: string | null): string | null {
  if (!etag) {
    return null;
  }

  return etag.trim().replace(/^W\//, '');
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Failed to fetch settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings', details: error.message },
        { status: 500 }
      );
    }

    const etag = makeEtag(data?.updated_at);

    // Handle conditional GET for caching
    if (req.headers.get('if-none-match') === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'private, max-age=30',
        },
      });
    }

    return NextResponse.json(fromDb(data), {
      headers: {
        ETag: etag,
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (error: any) {
    console.error('GET /api/admin/settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const normalizedBody = { ...body };

    if (typeof normalizedBody.businessEmail === 'string') {
      const email = normalizedBody.businessEmail.trim();
      normalizedBody.businessEmail = email.length === 0 ? null : email;
    }

    if (typeof normalizedBody.businessWebsite === 'string') {
      const website = normalizedBody.businessWebsite.trim();
      if (website.length === 0) {
        normalizedBody.businessWebsite = null;
      } else if (!/^https?:\/\//i.test(website)) {
        normalizedBody.businessWebsite = `https://${website}`;
      } else {
        normalizedBody.businessWebsite = website;
      }
    }

    if (typeof normalizedBody.uploadMaxResolution === 'number') {
      normalizedBody.uploadMaxResolution = String(
        normalizedBody.uploadMaxResolution
      );
    }

    const parsed = SettingsPatchSchema.safeParse(normalizedBody);

    if (!parsed.success) {
      console.error('Settings validation error:', parsed.error);
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const ifMatch = sanitizeEtag(req.headers.get('if-match'));

    if (ifMatch) {
      const { data: current, error: currentError } = await supabase
        .from('app_settings')
        .select('updated_at')
        .eq('id', 1)
        .single();

      if (currentError) {
        console.error(
          'Failed to verify settings version before update:',
          currentError
        );
        return NextResponse.json(
          {
            error: 'Failed to verify settings version',
            details: currentError.message,
          },
          { status: 500 }
        );
      }

      const currentEtag = makeEtag(current?.updated_at);

      if (currentEtag !== ifMatch) {
        return NextResponse.json(
          {
            error: 'Settings have been modified by another user',
          },
          {
            status: 412,
            headers: {
              ETag: currentEtag,
              'Cache-Control': 'no-cache',
            },
          }
        );
      }
    }

    // Convert to database format
    const update = toDb(parsed.data);

    if (Object.keys(update).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No updates to apply',
      });
    }

    // Add audit info
    update.updated_at = new Date().toISOString();
    // Note: updated_by would come from auth context in production

    // Apply update with optimistic locking check
    const { data, error } = await supabase
      .from('app_settings')
      .update(update)
      .eq('id', 1)
      .select('*')
      .single();

    if (error) {
      console.error('Settings update error:', error);
      return NextResponse.json(
        {
          error: 'Failed to update settings',
          details: error.message,
        },
        { status: 500 }
      );
    }

    const result = fromDb(data);
    const etag = makeEtag(data.updated_at);

    return NextResponse.json(
      {
        success: true,
        message: 'Settings updated successfully',
        data: result,
      },
      {
        headers: {
          ETag: etag,
          'Cache-Control': 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('PATCH /api/admin/settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
