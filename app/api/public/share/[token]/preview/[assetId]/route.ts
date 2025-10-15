import { NextRequest, NextResponse } from 'next/server';
import { shareTokenSecurity } from '@/lib/security/share-token-security';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/public/share/[token]/preview/[assetId]
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string; assetId: string } }
) {
  try {
    const { token, assetId } = params;
    if (!token || token.length !== 64 || !assetId) {
      return NextResponse.json({ success: false, error: 'Invalid params' }, { status: 400 });
    }

    // Validate share token
    const ctx = await shareTokenSecurity.extractRequestContext();
    const validation = await shareTokenSecurity.validateToken(token, undefined, ctx);
    if (!validation.isValid || !validation.token) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid token' },
        { status: 403 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Check access to asset based on token scope
    const t = validation.token;
    let allowedFolderIds: string[] | null = null;

    if (t.share_type === 'folder' && t.folder_id) {
      const { data: rows } = await supabase.rpc('get_descendant_folders', {
        p_folder_id: t.folder_id,
      });
      allowedFolderIds = (rows || []).map((r: any) => r.id);
    }

    // Build query to validate asset belongs to scope
    const q = supabase.from('assets').select('id, preview_path, folder_id, status').eq('id', assetId).single();
    const { data: asset, error } = await q;
    if (error || !asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    if (asset.status !== 'ready') {
      return NextResponse.json(
        { success: false, error: 'Asset not available' },
        { status: 403 }
      );
    }

    if (t.share_type === 'folder' && allowedFolderIds && !allowedFolderIds.includes(asset.folder_id)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    if (t.share_type === 'event') {
      // check asset's folder belongs to same event and is published
      const { data: folder } = await supabase
        .from('folders')
        .select('id, event_id, is_published')
        .eq('id', asset.folder_id)
        .maybeSingle();
      if (!folder || folder.event_id !== t.event_id || !folder.is_published) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Generate signed URL for preview (4h)
    const { data: signed, error: signErr } = await supabase.storage
      .from('photos')
      .createSignedUrl(asset.preview_path, 60 * 60 * 4);
    if (signErr || !signed) {
      return NextResponse.json(
        { success: false, error: 'Failed to sign preview' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, url: signed.signedUrl });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
