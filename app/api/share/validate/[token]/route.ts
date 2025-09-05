import { NextRequest, NextResponse } from 'next/server';
import { shareTokenSecurity } from '@/lib/security/share-token-security';

// POST /api/share/validate/[token]
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;
  try {
    let password: string | undefined;
    try {
      const body = await req.json();
      password = body?.password;
    } catch {}

    const requestContext = await shareTokenSecurity.extractRequestContext();
    const validation = await shareTokenSecurity.validateToken(token, password, requestContext);

    if (!validation.isValid || !validation.token) {
      return NextResponse.json(
        { success: false, error: validation.error, errorCode: validation.errorCode },
        { status: validation.errorCode === 'PASSWORD_REQUIRED' ? 401 : 403 }
      );
    }

    const t = validation.token;
    return NextResponse.json({
      success: true,
      token: {
        id: t.id,
        shareType: t.share_type,
        eventId: t.event_id,
        folderId: t.folder_id,
        photoIds: t.photo_ids,
        allowDownload: t.allow_download,
        allowComments: t.allow_comments,
        viewCount: t.view_count,
        maxViews: t.max_views,
        expiresAt: t.expires_at,
        hasPassword: !!t.password_hash,
        createdAt: t.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/share/validate/[token]
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;
  try {
    const requestContext = await shareTokenSecurity.extractRequestContext();
    const validation = await shareTokenSecurity.validateToken(token, undefined, requestContext);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          errorCode: validation.errorCode,
          requiresPassword: validation.errorCode === 'PASSWORD_REQUIRED',
        },
        { status: validation.errorCode === 'PASSWORD_REQUIRED' ? 401 : 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

