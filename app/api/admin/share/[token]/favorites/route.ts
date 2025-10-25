import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/admin/share/[token]/favorites -> JSON list of favorite assets (id, filename)
export const GET = withAuth(async (req: NextRequest, context: RouteContext<{ token: string }>) => {
  const params = await context.params;
  try {
    const tokenStr = params.token;
    const supabase = await createServerSupabaseServiceClient();
    // Resolve token id
    const { data: tok } = await supabase
      .from('share_tokens')
      .select('id')
      .eq('token', tokenStr)
      .maybeSingle();
    if (!tok) return NextResponse.json({ success: true, favorites: [] });
    const tokenId = (tok as any).id as string;

    // Favorites -> assets
    const { data: favs } = await supabase
      .from('share_favorites')
      .select('asset_id')
      .eq('share_token_id', tokenId);
    const assetIds = (favs || []).map((f: any) => f.asset_id);
    if (assetIds.length === 0) return NextResponse.json({ success: true, favorites: [] });

    const { data: assets } = await supabase
      .from('assets')
      .select('id, filename')
      .in('id', assetIds);

    return NextResponse.json({ success: true, favorites: assets || [] });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'error' }, { status: 500 });
  }
});

