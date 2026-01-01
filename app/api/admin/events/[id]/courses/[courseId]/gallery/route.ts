import { NextResponse } from 'next/server';

// Endpoint legacy deshabilitado: flujo de cursos/students no existe en el schema actual.
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Endpoint deprecado. Usa folders/assets en lugar de courses/students.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}
