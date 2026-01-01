import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { StoreConfigSchema, StoreConfig } from '@/lib/validations/store-config';
import {
  getStoreConfig,
  saveStoreConfig,
  getDefaultConfig
} from '@/lib/services/store-config.service';

const DEFAULT_TENANT_ID = process.env.NEXT_PUBLIC_MULTITENANT_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';

/**
 * GET - Obtener configuración global de tienda (sin evento)
 */
export async function GET() {
  try {
    const config = await getStoreConfig(DEFAULT_TENANT_ID);

    console.log('[StoreSettings] Loaded global config');

    return NextResponse.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('[StoreSettings] Error in GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Guardar configuración global de tienda
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar input con Zod
    let parsedBody: StoreConfig;
    try {
      parsedBody = StoreConfigSchema.parse(body);
    } catch (parseError) {
      if (parseError instanceof ZodError) {
        return NextResponse.json({
          error: 'Invalid store configuration payload',
          details: parseError.flatten()
        }, { status: 400 });
      }
      throw parseError;
    }

    // Guardar configuración global (sin eventId ni folderId)
    const savedConfig = await saveStoreConfig(DEFAULT_TENANT_ID, parsedBody);

    console.log('[StoreSettings] Saved global config');

    return NextResponse.json({
      success: true,
      message: 'Configuración guardada exitosamente',
      config: savedConfig
    });

  } catch (error) {
    console.error('[StoreSettings] Error in POST:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
