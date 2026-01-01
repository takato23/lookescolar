import { NextResponse } from 'next/server';

// Endpoint deprecado: cupones deshabilitados en el schema actual.
export const POST = async () =>
  NextResponse.json(
    {
      valid: false,
      error: 'Cupones deshabilitados en esta instancia.',
      errorCode: 'COUPONS_DISABLED',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
