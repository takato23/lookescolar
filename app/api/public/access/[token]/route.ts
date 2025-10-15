import { NextRequest, NextResponse } from 'next/server';
import { publicAccessService } from '@/lib/services/public-access.service';

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  if (!token || token.length < 6) {
    return NextResponse.json(
      { error: 'Invalid token parameter' },
      { status: 400 }
    );
  }

  try {
    const resolved = await publicAccessService.resolveAccessToken(token);

    if (!resolved) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    const defaultRedirect = resolved.share || resolved.folder
      ? `/store-unified/${token}`
      : null;

    return NextResponse.json({
      token: resolved.token,
      event: resolved.event ?? null,
      share: resolved.share ?? null,
      folder: resolved.folder ?? null,
      student: resolved.student ?? null,
      subject: resolved.subject ?? null,
      defaultRedirect,
      compatibility: {
        isLegacy: resolved.token.isLegacy,
        source: resolved.token.legacySource,
      },
    });
  } catch (error: any) {
    console.error('[public-access] Failed to resolve token', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
