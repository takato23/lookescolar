import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { shareService, ShareScopeConfig } from '@/lib/services/share.service';

// GET /api/admin/share/list?event_id=...&folder_id=...&active=...
export const GET = withAdminAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('event_id');
  const folderId = searchParams.get('folder_id');
  const active = searchParams.get('active');

  const supabase = await createServerSupabaseServiceClient();

  if (!eventId) {
    return NextResponse.json({ success: true, tokens: [] });
  }

  const shareResult = await shareService.getEventShares(eventId);
  if (!shareResult.success || !shareResult.data) {
    return NextResponse.json(
      { success: false, error: shareResult.error || 'No se pudieron obtener los enlaces' },
      { status: 500 }
    );
  }

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';

  let tokens = shareResult.data.map((share: any) => {
    const scopeConfig: ShareScopeConfig = {
      scope: share.scope_config?.scope ?? 'event',
      anchorId: share.scope_config?.anchor_id ?? '',
      includeDescendants: share.scope_config?.include_descendants ?? false,
      filters: share.scope_config?.filters ?? {},
    };

    return {
      id: share.id,
      token: share.token,
      share_type: share.share_type,
      event_id: share.event_id,
      folder_id: share.folder_id,
      photo_ids: share.photo_ids,
      allow_download: share.allow_download,
      allow_comments: share.allow_comments,
      max_views: share.max_views,
      view_count: share.view_count,
      expires_at: share.expires_at,
      is_active: share.is_active,
      title: share.title,
      description: share.description,
      created_at: share.created_at,
      updated_at: share.updated_at,
      scope_config: scopeConfig,
      audiences_count: (share as any).audiences_count ?? 0,
      view_url: `${origin}/s/${share.token}`,
      store_url: `${origin}/store-unified/${share.token}`,
    };
  });

  if (folderId) {
    tokens = tokens.filter((token) => token.folder_id === folderId);
  }

  if (active === 'true') {
    tokens = tokens.filter((token) => token.is_active);
  } else if (active === 'false') {
    tokens = tokens.filter((token) => !token.is_active);
  }

  tokens.sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  return NextResponse.json({ success: true, tokens });
});
