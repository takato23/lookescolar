import { NextResponse } from 'next/server';

// Endpoint legacy deshabilitado: no se manejan levels/courses en el schema actual.
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Endpoint deprecado. Usa folders/assets en lugar de levels/courses.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}
