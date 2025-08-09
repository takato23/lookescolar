import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { AuthMiddleware } from '@/lib/middleware/auth.middleware';

export const PATCH = AuthMiddleware.withAuth(async (req: NextRequest, auth, ctx) => {
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const photoId = ctx.params?.id as string | undefined;
  if (!photoId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let body: { codeId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { codeId } = body;
  if (!codeId) return NextResponse.json({ error: 'codeId required' }, { status: 400 });

  const supabase = await createServerSupabaseServiceClient();
  const { error } = await supabase.from('photos').update({ code_id: codeId }).eq('id', photoId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}, 'admin');

export const runtime = 'nodejs';


