import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { shareService } from '@/lib/services/share.service';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// POST /api/share
// Creates a new share token for event|folder|photos
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    const shareType = body?.shareType as 'event' | 'folder' | 'photos' | undefined;
    if (!shareType || !['event', 'folder', 'photos'].includes(shareType)) {
      return NextResponse.json(
        { error: 'shareType inválido. Use: event|folder|photos' },
        { status: 400 }
      );
    }

    const eventId = body?.eventId as string | undefined;
    const folderId = body?.folderId as string | undefined;
    const photoIds = (body?.photoIds as string[] | undefined) || undefined;

    const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : undefined;
    const allowDownload = Boolean(body?.allowDownload);
    const allowComments = Boolean(body?.allowComments);
    const password = body?.password as string | undefined;
    const title = body?.title as string | undefined;
    const description = body?.description as string | undefined;
    const metadata = (body?.metadata as Record<string, any> | undefined) || {};

    if (!eventId && shareType !== 'photos') {
      return NextResponse.json(
        { error: 'eventId es requerido para shareType=event|folder' },
        { status: 400 }
      );
    }

    if (shareType === 'folder' && !folderId) {
      return NextResponse.json(
        { error: 'folderId es requerido para shareType=folder' },
        { status: 400 }
      );
    }

    if (shareType === 'photos' && (!photoIds || photoIds.length === 0)) {
      return NextResponse.json(
        { error: 'photoIds es requerido para shareType=photos' },
        { status: 400 }
      );
    }

    const result = await shareService.createShare({
      eventId: eventId || '',
      folderId: folderId || null,
      photoIds,
      shareType,
      title,
      description,
      password,
      expiresAt,
      allowDownload,
      allowComments,
      metadata,
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'No se pudo crear el share' },
        { status: 400 }
      );
    }

    const { shareToken, shareUrl } = result.data;

    // Build base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.get('host') || 'localhost:3000'}`;
    const storeUrl = `${baseUrl}/store-unified/${shareToken.token}`;

    // Backward-compatible response for existing admin UIs (PhotoAdmin expects shareToken + links)
    return NextResponse.json({
      // New unified shape
      share: {
        id: shareToken.id,
        token: shareToken.token,
        shareUrl,
        storeUrl,
        expiresAt: shareToken.expires_at,
        allowDownload: shareToken.allow_download,
        allowComments: shareToken.allow_comments,
      },
      // Legacy-compatible fields used by PhotoAdmin
      shareToken: {
        id: shareToken.id,
        token: shareToken.token,
        title: title || description || undefined,
        created_at: shareToken.created_at,
      },
      links: {
        store: storeUrl,
        gallery: shareUrl,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error interno' },
      { status: 500 }
    );
  }
});

// GET /api/share?eventId=...
// Lists share links for an event from both share_tokens and folders with share_token
export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');
    if (!eventId) {
      return NextResponse.json({ shares: [] });
    }

    const supabase = await createServerSupabaseServiceClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.get('host') || 'localhost:3000'}`;

    // Collect from share_tokens
    const { data: tokens } = await supabase
      .from('share_tokens')
      .select('id, token, created_at, expires_at, share_type, folder_id, photo_ids, is_active')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    // Collect from legacy folder share_token
    const { data: folders } = await supabase
      .from('folders')
      .select('id, name, share_token, published_at')
      .eq('event_id', eventId)
      .not('share_token', 'is', null);

    const shares: Array<{
      id: string;
      token: string;
      shareUrl: string;
      storeUrl: string;
      type: string;
      createdAt?: string | null;
      expiresAt?: string | null;
      isActive?: boolean;
    }> = [];

    (tokens || []).forEach((t: any) => {
      const url = `${baseUrl}/store-unified/${t.token}`;
      shares.push({
        id: t.id,
        token: t.token,
        shareUrl: url,
        storeUrl: url,
        type: t.share_type || 'event',
        createdAt: t.created_at,
        expiresAt: t.expires_at,
        isActive: t.is_active,
      });
    });

    (folders || []).forEach((f: any) => {
      if (!f.share_token) return;
      const url = `${baseUrl}/store-unified/${f.share_token}`;
      shares.push({
        id: f.id,
        token: f.share_token,
        shareUrl: url,
        storeUrl: url,
        type: 'folder',
        createdAt: f.published_at,
        expiresAt: null,
        isActive: true,
      });
    });

    // Sort by createdAt desc when available
    shares.sort((a, b) => (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));

    return NextResponse.json({ shares });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
});
