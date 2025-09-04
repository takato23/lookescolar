import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

// GET /api/qr/url?url=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const url = searchParams.get('url');
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'url inválida' }, { status: 400 });
    }

    const png = await QRCode.toBuffer(url, {
      type: 'png',
      margin: 1,
      width: 512,
    });

    return new NextResponse(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[QR URL] error:', error);
    return NextResponse.json({ error: 'error interno' }, { status: 500 });
  }
}

