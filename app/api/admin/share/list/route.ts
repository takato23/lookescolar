import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/admin/share/list?event_id=...&folder_id=...&active=...
export const GET = withAdminAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('event_id');
  const folderId = searchParams.get('folder_id');
  const active = searchParams.get('active');

  const supabase = await createServerSupabaseServiceClient();

  let query = supabase
    .from('share_tokens')
    .select(
      `id, token, share_type, event_id, folder_id, photo_ids, allow_download, allow_comments, max_views, view_count, expires_at, is_active, title, description, created_at, updated_at`
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (eventId) query = query.eq('event_id', eventId);
  if (folderId) query = query.eq('folder_id', folderId);
  if (active === 'true') query = query.eq('is_active', true);
  if (active === 'false') query = query.eq('is_active', false);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';
  const items = (data || []).map((t) => ({
    ...t,
    view_url: `${origin}/s/${t.token}`,
    store_url: `${origin}/store-unified/${t.token}`,
  }));
  return NextResponse.json({ success: true, tokens: items });
});
