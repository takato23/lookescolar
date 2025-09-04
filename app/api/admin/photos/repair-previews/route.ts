import { NextResponse } from 'next/server';

// Stub seguro temporal para no romper compilación. Se conectará al servicio real luego.
export async function POST(_req: Request) {
  return NextResponse.json(
    { ok: true, processed: 0, message: 'repair-previews stub (implement soon)' },
    { status: 200 }
  );
}

export async function GET() {
  return NextResponse.json(
    { ok: true, message: 'Use POST to trigger preview repair' },
    { status: 200 }
  );
}
