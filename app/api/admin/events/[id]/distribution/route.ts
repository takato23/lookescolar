import { NextResponse } from 'next/server';

// Endpoint legacy deshabilitado: distribución por students/courses ya no existe en el schema actual.
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Endpoint deprecado. Usa flujos de publicación por folders/share_tokens.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Endpoint deprecado. Usa flujos de publicación por folders/share_tokens.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: 'Endpoint deprecado. Usa flujos de publicación por folders/share_tokens.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}
