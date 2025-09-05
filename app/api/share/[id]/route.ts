import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// PATCH /api/share/[id]
// Update share options (expiresAt, password, permissions, title/description, is_active)
export const PATCH = withAdminAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const body = await req.json();
    const supabase = await createServerSupabaseServiceClient();

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body?.expiresAt !== undefined) updates.expires_at = body.expiresAt ? new Date(body.expiresAt).toISOString() : null;
    if (body?.allowDownload !== undefined) updates.allow_download = !!body.allowDownload;
    if (body?.allowComments !== undefined) updates.allow_comments = !!body.allowComments;
    if (body?.title !== undefined) updates.title = body.title || null;
    if (body?.description !== undefined) updates.description = body.description || null;
    if (body?.isActive !== undefined) updates.is_active = !!body.isActive;
    if (body?.metadata && typeof body.metadata === 'object') updates.metadata = body.metadata;

    if (body?.password !== undefined) {
      const crypto = await import('crypto');
      updates.password_hash = body.password
        ? crypto.createHash('sha256').update(body.password).digest('hex')
        : null;
    }

    const { data, error } = await supabase
      .from('share_tokens')
      .update(updates)
      .eq('id', id)
      .select('id, token, expires_at, allow_download, allow_comments, title, description, is_active')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'No se pudo actualizar' }, { status: 400 });
    }

    return NextResponse.json({ share: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
});

// DELETE /api/share/[id]
// Revoke share (soft deactivate)
export const DELETE = withAdminAuth(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const supabase = await createServerSupabaseServiceClient();

    const { error } = await supabase
      .from('share_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString(), expires_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
});

