import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { shareTokenSecurity } from '@/lib/security/share-token-security';

// GET /api/hierarchical/[token]/preview/[assetId]
// Supports:
// - 64-hex share_tokens (delegates to share validation)
// - 32-char folder share tokens (folders.share_token)
// - Dev bypass via ALLOW_DEV_BYPASS
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; assetId: string }> }
) {
  try {
    const { token, assetId } = await params;
    if (!token || !assetId) {
      return NextResponse.json({ success: false, error: 'Invalid params' }, { status: 400 });
    }

    const supabase = await createServerSupabaseServiceClient();

    // Resolve asset and basic checks
    const { data: asset, error: assetErr } = await supabase
      .from('assets')
      .select('id, folder_id, preview_path, status')
      .eq('id', assetId)
      .maybeSingle();
    if (assetErr || !asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }
    if (asset.status !== 'ready') {
      return NextResponse.json({ success: false, error: 'Asset not available' }, { status: 403 });
    }

    const isShare64 = /^[a-f0-9]{64}$/i.test(token);
    const isFolder32 = !isShare64 && token.length >= 16 && token.length <= 64; // tolerate 32

    if (isShare64) {
      // Delegate to share token validation
      const ctx = { ip: req.headers.get('x-forwarded-for') || undefined, userAgent: req.headers.get('user-agent') || undefined };
      const validation = await shareTokenSecurity.validateToken(token, undefined, ctx);
      if (!validation.isValid || !validation.token) {
        return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 403 });
      }
      const t = validation.token;

      // Validate scope
      if (t.share_type === 'folder' && t.folder_id) {
        let allowed: string[] = [t.folder_id];
        try {
          const { data: rows } = await supabase.rpc('get_descendant_folders', { p_folder_id: t.folder_id });
          allowed = (rows || []).map((r: any) => r.id);
          if (!allowed.includes(t.folder_id)) allowed.push(t.folder_id);
        } catch {}
        if (!allowed.includes(asset.folder_id)) {
          return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }
      } else if (t.share_type === 'event') {
        const { data: folder } = await supabase
          .from('folders')
          .select('event_id, is_published')
          .eq('id', asset.folder_id)
          .maybeSingle();
        if (!folder || folder.event_id !== t.event_id || !folder.is_published) {
          return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }
      } else if (t.share_type === 'photos' && Array.isArray(t.photo_ids)) {
        if (!t.photo_ids.includes(assetId)) {
          return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }
      }

      // Sign preview
      const { data: signed, error: signErr } = await supabase.storage
        .from('photos')
        .createSignedUrl(asset.preview_path, 60 * 60 * 4);
      if (signErr || !signed) {
        return NextResponse.json({ success: false, error: 'Failed to sign preview' }, { status: 500 });
      }
      return NextResponse.json({ success: true, url: signed.signedUrl });
    }

    if (isFolder32) {
      // Map folder share token -> allowed folders
      const { data: folder } = await supabase
        .from('folders')
        .select('id')
        .eq('share_token', token)
        .maybeSingle();
      if (!folder) {
        return NextResponse.json({ success: false, error: 'Invalid folder token' }, { status: 403 });
      }
      let allowed: string[] = [folder.id];
      try {
        const { data: rows } = await supabase.rpc('get_descendant_folders', { p_folder_id: folder.id });
        allowed = (rows || []).map((r: any) => r.id);
        if (!allowed.includes(folder.id)) allowed.push(folder.id);
      } catch {}
      if (!allowed.includes(asset.folder_id)) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
      const { data: signed, error: signErr } = await supabase.storage
        .from('photos')
        .createSignedUrl(asset.preview_path, 60 * 60 * 4);
      if (signErr || !signed) {
        return NextResponse.json({ success: false, error: 'Failed to sign preview' }, { status: 500 });
      }
      return NextResponse.json({ success: true, url: signed.signedUrl });
    }

    // Dev bypass
    if (process.env.ALLOW_DEV_BYPASS === 'true') {
      const { data: signed } = await supabase.storage
        .from('photos')
        .createSignedUrl(asset.preview_path, 60 * 60 * 1);
      if (signed?.signedUrl) return NextResponse.json({ success: true, url: signed.signedUrl });
    }

    return NextResponse.json({ success: false, error: 'Unsupported token' }, { status: 403 });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
