import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { AuthMiddleware, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';

// =============================================================================
// GET - Get email configuration
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
        .select('email_config')
        .eq('id', tenantId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: 'Error al obtener configuracion' }, { status: 500 });
      }

      const defaultConfig = {
        provider: 'resend',
        api_key: '',
        from_email: '',
        from_name: '',
        reply_to: '',
        templates: {
          order_confirmation: { enabled: true, subject_template: 'Confirmacion de pedido #{{order_number}}' },
          order_ready: { enabled: true, subject_template: 'Tu pedido #{{order_number}} esta listo' },
          download_ready: { enabled: true, subject_template: 'Tus fotos digitales estan listas para descargar' },
        },
      };

      // Merge with defaults but mask API key for security
      const config = { ...defaultConfig, ...(data?.email_config || {}) };
      const maskedConfig = {
        ...config,
        api_key: config.api_key ? '••••••••' + config.api_key.slice(-4) : '',
        api_key_configured: Boolean(config.api_key),
      };

      return NextResponse.json({
        success: true,
        config: maskedConfig,
      });
    } catch (error) {
      console.error('[Email Settings API] GET error:', error);
      return NextResponse.json(
        { error: 'Error al obtener configuracion' },
        { status: 500 }
      );
    }
  })
);

// =============================================================================
// PUT - Update email configuration
// =============================================================================

export const PUT = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    try {
      if (!authContext.isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      SecurityLogger.logResourceAccess('settings_email_update', authContext, request);

      const { tenantId } = resolveTenantFromHeaders(request.headers);
      const supabase = await createServerSupabaseServiceClient();

      const body = await request.json();
      const { config } = body;

      if (!config) {
        return NextResponse.json({ error: 'Configuracion requerida' }, { status: 400 });
      }

      // Get current config to preserve API key if not being updated
      const { data: currentData } = await supabase
        .from('tenants')
        .select('email_config')
        .eq('id', tenantId)
        .maybeSingle();

      const currentConfig = currentData?.email_config || {};

      // Validate and build config
      const validatedConfig = {
        provider: config.provider === 'smtp' ? 'smtp' : 'resend',
        api_key:
          config.api_key && !config.api_key.includes('••••')
            ? config.api_key
            : (currentConfig as Record<string, unknown>).api_key || '',
        from_email: config.from_email || '',
        from_name: config.from_name || '',
        reply_to: config.reply_to || '',
        templates: {
          order_confirmation: {
            enabled: Boolean(config.templates?.order_confirmation?.enabled ?? true),
            subject_template:
              config.templates?.order_confirmation?.subject_template ||
              'Confirmacion de pedido #{{order_number}}',
          },
          order_ready: {
            enabled: Boolean(config.templates?.order_ready?.enabled ?? true),
            subject_template:
              config.templates?.order_ready?.subject_template ||
              'Tu pedido #{{order_number}} esta listo',
          },
          download_ready: {
            enabled: Boolean(config.templates?.download_ready?.enabled ?? true),
            subject_template:
              config.templates?.download_ready?.subject_template ||
              'Tus fotos digitales estan listas para descargar',
          },
        },
      };

      const { error } = await supabase
        .from('tenants')
        .update({ email_config: validatedConfig })
        .eq('id', tenantId);

      if (error) {
        console.error('[Email Settings API] Update error:', error);
        return NextResponse.json({ error: 'Error al guardar configuracion' }, { status: 500 });
      }

      // Return masked config
      const maskedConfig = {
        ...validatedConfig,
        api_key: validatedConfig.api_key ? '••••••••' + validatedConfig.api_key.slice(-4) : '',
        api_key_configured: Boolean(validatedConfig.api_key),
      };

      return NextResponse.json({
        success: true,
        config: maskedConfig,
      });
    } catch (error) {
      console.error('[Email Settings API] PUT error:', error);
      return NextResponse.json(
        { error: 'Error al guardar configuracion' },
        { status: 500 }
      );
    }
  })
);
