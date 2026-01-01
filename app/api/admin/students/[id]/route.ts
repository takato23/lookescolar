import { NextResponse } from 'next/server';

// Endpoint legacy deshabilitado: students ya no está en el schema actual.
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Endpoint deprecado (students).' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: 'Endpoint deprecado (students).' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Endpoint deprecado (students).' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}
