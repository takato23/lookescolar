import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  buildPublicConfig,
  fetchFallbackStoreConfig,
} from '@/lib/services/store-config-utils';

const DEPRECATION_HEADERS = {
  Warning: '299 - "Deprecated: use /api/store/[token]"',
  Deprecation: 'true',
};

async function loadFallbackSettings() {
  const supabase = await createServiceClient();
  const storeConfig = await fetchFallbackStoreConfig(supabase);
  if (!storeConfig) return null;

  return {
    settings: buildPublicConfig(storeConfig),
    mercadoPagoConnected: Boolean(
      storeConfig?.mercado_pago_connected ??
        storeConfig?.mercadoPagoConnected ??
        true
    ),
  };
}

async function respondWithFallback() {
  try {
    const payload = await loadFallbackSettings();
    if (!payload) {
      return NextResponse.json(
        { error: 'Store config not found' },
        { status: 404, headers: DEPRECATION_HEADERS }
      );
    }

    return NextResponse.json(payload, { headers: DEPRECATION_HEADERS });
  } catch (error) {
    console.error('Unexpected error in GET /api/store/settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: DEPRECATION_HEADERS }
    );
  }
}

export async function GET() {
  return respondWithFallback();
}

export async function POST() {
  return respondWithFallback();
}
