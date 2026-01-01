import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const token = searchParams.get('token');
    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'token requerido' }, { status: 400 });
    }

    const url = `${request.nextUrl.origin}/store-unified/${token}`;
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
    console.error('[Service] QR error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
