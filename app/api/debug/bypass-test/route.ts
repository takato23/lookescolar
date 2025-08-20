import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('🔧 BYPASS TEST ENDPOINT');
  
  // This endpoint bypasses all middleware by not being in a protected path
  return NextResponse.json({
    success: true,
    message: 'Bypass test successful',
    timestamp: new Date().toISOString(),
    url: request.url,
    headers: {
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      origin: request.headers.get('origin'),
    },
    env: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    }
  });
}