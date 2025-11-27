import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { AuthMiddleware, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';
import { tenantFeaturesService } from '@/lib/services/tenant-features.service';

// =============================================================================
// GET - Get feature configuration for current tenant
// =============================================================================

export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    try {
      if (!authContext.isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const { tenantId } = resolveTenantFromHeaders(request.headers);
      const supabase = await createServerSupabaseServiceClient();

      SecurityLogger.logResourceAccess('tenant_features_read', authContext, request);

      const config = await tenantFeaturesService.getConfig(supabase, tenantId);
      const definitions = tenantFeaturesService.getFeatureDefinitions();

      return NextResponse.json({
        success: true,
        config,
        definitions,
      });
    } catch (error) {
      console.error('[Features API] GET error:', error);
      return NextResponse.json(
        { error: 'Error al obtener configuracion' },
        { status: 500 }
      );
    }
  })
);

// =============================================================================
// PATCH - Update feature configuration
// =============================================================================

export const PATCH = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    try {
      if (!authContext.isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const { tenantId } = resolveTenantFromHeaders(request.headers);
      const supabase = await createServerSupabaseServiceClient();

      SecurityLogger.logResourceAccess('tenant_features_update', authContext, request);

      const body = await request.json();
      const { feature, enabled, updates } = body;

      // Single feature toggle
      if (feature && typeof enabled === 'boolean') {
        const result = await tenantFeaturesService.toggleFeature(
          supabase,
          tenantId,
          feature,
          enabled
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        const config = await tenantFeaturesService.getConfig(supabase, tenantId);
        return NextResponse.json({ success: true, config });
      }

      // Bulk updates
      if (updates && typeof updates === 'object') {
        const result = await tenantFeaturesService.updateConfig(
          supabase,
          tenantId,
          updates
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, config: result.config });
      }

      return NextResponse.json(
        { error: 'Se requiere feature/enabled o updates' },
        { status: 400 }
      );
    } catch (error) {
      console.error('[Features API] PATCH error:', error);
      return NextResponse.json(
        { error: 'Error al actualizar configuracion' },
        { status: 500 }
      );
    }
  })
);
