import { NextResponse } from 'next/server';

// Endpoint deprecado: el schema actual no tiene tabla de cupones.
export const GET = async () =>
  NextResponse.json(
    {
      success: false,
      error: 'Cupones deshabilitados en esta instancia.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );

export const PATCH = async () =>
  NextResponse.json(
    {
      success: false,
      error: 'Cupones deshabilitados en esta instancia.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );

export const DELETE = async () =>
  NextResponse.json(
    {
      success: false,
      error: 'Cupones deshabilitados en esta instancia.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
