import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { AuthMiddleware, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';

// =============================================================================
// GET - Get product configuration
// =============================================================================

export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    try {
      if (!authContext.isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const { tenantId } = resolveTenantFromHeaders(request.headers);
      const supabase = await createServerSupabaseServiceClient();

      const { data, error } = await supabase
        .from('tenants')
        .select('product_config')
        .eq('id', tenantId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: 'Error al obtener configuracion' }, { status: 500 });
      }

      const defaultConfig = {
        physical_enabled: true,
        digital_enabled: false,
        digital_price_base_cents: 0,
        digital_packages: [],
        download_limit: 3,
        download_expiry_hours: 48,
      };

      return NextResponse.json({
        success: true,
        config: { ...defaultConfig, ...(data?.product_config || {}) },
      });
    } catch (error) {
      console.error('[Products Settings API] GET error:', error);
      return NextResponse.json(
        { error: 'Error al obtener configuracion' },
        { status: 500 }
      );
    }
  })
);

// =============================================================================
// PUT - Update product configuration
// =============================================================================

export const PUT = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    try {
      if (!authContext.isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      SecurityLogger.logResourceAccess('settings_products_update', authContext, request);

      const { tenantId } = resolveTenantFromHeaders(request.headers);
      const supabase = await createServerSupabaseServiceClient();

      const body = await request.json();
      const { config } = body;

      if (!config) {
        return NextResponse.json({ error: 'Configuracion requerida' }, { status: 400 });
      }

      // Validate config
      const validatedConfig = {
        physical_enabled: Boolean(config.physical_enabled),
        digital_enabled: Boolean(config.digital_enabled),
        digital_price_base_cents: Math.max(0, parseInt(config.digital_price_base_cents) || 0),
        digital_packages: Array.isArray(config.digital_packages) ? config.digital_packages : [],
        download_limit: Math.min(10, Math.max(1, parseInt(config.download_limit) || 3)),
        download_expiry_hours: Math.min(168, Math.max(1, parseInt(config.download_expiry_hours) || 48)),
      };

      const { error } = await supabase
        .from('tenants')
        .update({ product_config: validatedConfig })
        .eq('id', tenantId);

      if (error) {
        console.error('[Products Settings API] Update error:', error);
        return NextResponse.json({ error: 'Error al guardar configuracion' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        config: validatedConfig,
      });
    } catch (error) {
      console.error('[Products Settings API] PUT error:', error);
      return NextResponse.json(
        { error: 'Error al guardar configuracion' },
        { status: 500 }
      );
    }
  })
);
