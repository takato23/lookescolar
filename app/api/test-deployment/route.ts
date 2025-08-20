import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Deployment is working',
    timestamp: new Date().toISOString(),
    deployment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7),
    },
    headers: {
      host: request.headers.get('host'),
      'user-agent': request.headers.get('user-agent')?.substring(0, 50)
    }
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}