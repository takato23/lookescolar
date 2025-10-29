import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateShareTokenPassword, validateStorePassword } from '@/lib/middleware/password-validation.middleware';
import {
  buildPublicConfig,
  fetchFallbackStoreConfig,
} from '@/lib/services/store-config-utils';

// Schema for public store config request
const PublicStoreConfigSchema = z.object({
  token: z.string().min(1),
  password: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = PublicStoreConfigSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid request',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    const { token, password } = validationResult.data;
    const supabase = await createServiceClient();

    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    // Get store configuration for this token using the database function
    const { data: rpcStoreConfig, error } = await supabase
      .rpc('get_public_store_config', { store_token: token })
      .single();

    let storeConfig = rpcStoreConfig;
    let usedFallback = false;

    if (error || !storeConfig) {
      console.warn('Falling back to global store configuration for token', token, error);
      const fallbackConfig = await fetchFallbackStoreConfig(supabase);
      if (!fallbackConfig) {
        return NextResponse.json({ 
          error: 'Store not found or token expired' 
        }, { status: 404 });
      }
      storeConfig = fallbackConfig;
      usedFallback = true;
    }

    // Check if password protection is enabled (only for token-specific config)
    if (!usedFallback && storeConfig.password_protection) {
      const shareTokenValidation = await validateShareTokenPassword(
        token,
        password,
        clientIp
      );

      if (shareTokenValidation.requiresPassword) {
        if (!shareTokenValidation.isValid) {
          return NextResponse.json({
            error: shareTokenValidation.error || 'Contraseña requerida',
            passwordRequired: true
          }, { status: shareTokenValidation.statusCode || 401 });
        }
      } else {
        if (!password) {
          return NextResponse.json({
            passwordRequired: true,
            message: 'Esta tienda requiere una contraseña para acceder'
          });
        }

        const storePasswordValidation = await validateStorePassword(token, password);

        if (!storePasswordValidation.isValid) {
          return NextResponse.json({
            error: storePasswordValidation.error || 'Contraseña incorrecta',
            passwordRequired: true
          }, { status: storePasswordValidation.statusCode || 401 });
        }
      }
    }

    // Check if store is within schedule if enabled
    if (storeConfig.store_schedule?.enabled) {
      const now = new Date();
      const startDate = storeConfig.store_schedule.start_date ? new Date(storeConfig.store_schedule.start_date) : null;
      const endDate = storeConfig.store_schedule.end_date ? new Date(storeConfig.store_schedule.end_date) : null;

      if (startDate && now < startDate) {
        return NextResponse.json({
          error: storeConfig.store_schedule.maintenance_message || 'La tienda aún no está disponible',
          available: false,
          openDate: startDate.toISOString()
        }, { status: 403 });
      }

      if (endDate && now > endDate) {
        return NextResponse.json({
          error: storeConfig.store_schedule.maintenance_message || 'La tienda ya no está disponible',
          available: false,
          closedDate: endDate.toISOString()
        }, { status: 403 });
      }
    }

    const publicConfig = buildPublicConfig(storeConfig);
    const mercadoPagoConnected = Boolean(
      storeConfig.mercado_pago_connected ??
      storeConfig.mercadoPagoConnected ??
      true
    );

    return NextResponse.json({ 
      success: true, 
      settings: publicConfig,
      storeUrl: `/store-unified/${token}`,
      mercadoPagoConnected
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/public/store/config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint for checking store availability (without password)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { data: rpcStoreConfig, error } = await supabase
      .rpc('get_public_store_config', { store_token: token })
      .single();

    let storeConfig = rpcStoreConfig;
    let usedFallback = false;

    if (error || !storeConfig) {
      const fallbackConfig = await fetchFallbackStoreConfig(supabase);
      if (!fallbackConfig) {
        return NextResponse.json({ 
          available: false,
          error: 'Store not found or token expired' 
        }, { status: 404 });
      }
      storeConfig = fallbackConfig;
      usedFallback = true;
    }

    const available = Boolean(storeConfig.enabled);
    const passwordRequired = !usedFallback && Boolean(storeConfig.password_protection);

    let scheduleStatus = { withinSchedule: true, message: '' };
    if (storeConfig.store_schedule?.enabled) {
      const now = new Date();
      const startDate = storeConfig.store_schedule.start_date ? new Date(storeConfig.store_schedule.start_date) : null;
      const endDate = storeConfig.store_schedule.end_date ? new Date(storeConfig.store_schedule.end_date) : null;

      if (startDate && now < startDate) {
        scheduleStatus = {
          withinSchedule: false,
          message: storeConfig.store_schedule.maintenance_message || 'La tienda aún no está disponible',
          openDate: startDate.toISOString()
        };
      } else if (endDate && now > endDate) {
        scheduleStatus = {
          withinSchedule: false,
          message: storeConfig.store_schedule.maintenance_message || 'La tienda ya no está disponible',
          closedDate: endDate.toISOString()
        };
      }
    }

    return NextResponse.json({ 
      available: available && scheduleStatus.withinSchedule,
      passwordRequired,
      schedule: scheduleStatus,
      template: storeConfig.template,
      brand_name: storeConfig.custom_branding?.brand_name || 'LookEscolar'
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/public/store/config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
