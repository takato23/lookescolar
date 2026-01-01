import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Endpoint legado: /api/products/pricing
 *
 * El flujo actual de la tienda unificada usa precios desde `store_settings` / `folders.store_settings`.
 * Este endpoint quedó de un esquema anterior (photo_products/combo_packages/event_product_pricing).
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Endpoint deprecado',
      message: 'La tienda unificada usa precios desde la configuración del store.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Endpoint deprecado',
      message: 'La tienda unificada usa precios desde la configuración del store.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}
