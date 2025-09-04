import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ success: false, error: 'token is required' }, { status: 400 });
    }
    const supabase = await createServerSupabaseServiceClient();
    const { data, error } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, token: data ?? null });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'error' }, { status: 500 });
  }
});

