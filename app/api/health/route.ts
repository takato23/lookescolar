import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const storageBucket = process.env.STORAGE_BUCKET || 'photos';
    return NextResponse.json({
      ok: true,
      status: 'ok',
      nodeEnv,
      storageBucket,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Service] /api/health error', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
