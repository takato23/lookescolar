import { NextResponse } from 'next/server';

// Endpoint legacy deshabilitado: students ya no se usa (migrado a folders/assets).
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Endpoint deprecado. Usa folders/assets en lugar de students.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}
