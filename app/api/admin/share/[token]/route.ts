import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// PATCH /api/admin/share/[token]
// body: { action: 'deactivate' | 'rotate' }
export const PATCH = withAdminAuth(async (req: NextRequest, context: RouteContext<{ token: string }>) => {
  const params = await context.params;
  const { token } = params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action as 'deactivate' | 'rotate' | undefined;

  if (!token || !action) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const supabase = await createServerSupabaseServiceClient();

  if (action === 'deactivate') {
    const { error } = await supabase
      .from('share_tokens')
      .update({ is_active: false, expires_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('token', token);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'rotate') {
    const newToken = crypto.randomBytes(32).toString('hex');
    const { error } = await supabase
      .from('share_tokens')
      .update({ token: newToken, updated_at: new Date().toISOString() })
      .eq('token', token);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';
    return NextResponse.json({ success: true, token: newToken, view_url: `${origin}/s/${newToken}`, store_url: `${origin}/store-unified/${newToken}` });
  }

  return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
});
