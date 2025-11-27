import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';
import { tenantFeaturesService, type FeatureFlag } from '@/lib/services/tenant-features.service';

// =============================================================================
// GET - Get public feature flags for current tenant
// Only returns a subset of features relevant for the public store
// =============================================================================

const PUBLIC_FEATURES: FeatureFlag[] = [
  'coupons_enabled',
  'digital_downloads_enabled',
  'mercadopago_enabled',
  'whatsapp_checkout_enabled',
  'cash_payment_enabled',
  'watermark_enabled',
];

export const GET = RateLimitMiddleware.withRateLimit(
  async (request: NextRequest) => {
    try {
      const { tenantId } = resolveTenantFromHeaders(request.headers);
      const supabase = await createServerSupabaseServiceClient();

      const config = await tenantFeaturesService.getConfig(supabase, tenantId);

      // Only return public-safe features
      const publicFeatures: Record<string, boolean> = {};
      for (const feature of PUBLIC_FEATURES) {
        publicFeatures[feature] = config[feature];
      }

      return NextResponse.json({
        success: true,
        features: publicFeatures,
      });
    } catch (error) {
      console.error('[Public Features API] GET error:', error);
      // Return safe defaults on error
      return NextResponse.json({
        success: true,
        features: {
          coupons_enabled: true,
          digital_downloads_enabled: false,
          mercadopago_enabled: true,
          whatsapp_checkout_enabled: false,
          cash_payment_enabled: false,
          watermark_enabled: true,
        },
      });
    }
  }
);
