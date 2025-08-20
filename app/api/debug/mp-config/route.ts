import { NextResponse } from 'next/server';
import { MP_CONFIG } from '@/lib/mercadopago/client';

export async function GET() {
  return NextResponse.json({
    MP_CONFIG,
    env: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NODE_ENV: process.env.NODE_ENV,
    }
  });
}