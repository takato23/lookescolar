import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

// GET /api/qr/url?url=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const url = searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'url requerida' }, { status: 400 });
    }

    // Convert relative URLs to absolute URLs
    let fullUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      // If it's a relative URL, make it absolute using the current request's origin
      const origin = request.nextUrl.origin;
      fullUrl = `${origin}${url.startsWith('/') ? url : `/${url}`}`;
    }

    const png = await QRCode.toBuffer(fullUrl, {
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

