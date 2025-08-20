import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    alive: true,
    timestamp: new Date().toISOString(),
    deployment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7),
    },
    message: 'Server is alive and responding'
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}