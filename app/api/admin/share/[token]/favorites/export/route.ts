import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/admin/share/[token]/favorites/export -> text/csv of filenames
export const GET = withAuth(async (_req: NextRequest, { params }: { params: { token: string } }) => {
  try {
    const tokenStr = params.token;
    const supabase = await createServerSupabaseServiceClient();

    const { data: tok } = await supabase
      .from('share_tokens')
      .select('id')
      .eq('token', tokenStr)
      .maybeSingle();
    if (!tok) return new NextResponse('', { status: 200, headers: { 'Content-Type': 'text/csv' } });
    const tokenId = (tok as any).id as string;

    const { data: favs } = await supabase
      .from('share_favorites')
      .select('asset_id')
      .eq('share_token_id', tokenId);
    const assetIds = (favs || []).map((f: any) => f.asset_id);
    if (assetIds.length === 0)
      return new NextResponse('', { status: 200, headers: { 'Content-Type': 'text/csv' } });

    const { data: assets } = await supabase
      .from('assets')
      .select('filename')
      .in('id', assetIds);

    const lines = (assets || []).map((a: any) => a.filename).join('\n');
    return new NextResponse(lines, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="favoritos.csv"',
      },
    });
  } catch (e: any) {
    return new NextResponse('error', { status: 500 });
  }
});

