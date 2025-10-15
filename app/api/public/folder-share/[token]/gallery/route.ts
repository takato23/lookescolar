import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/public/folder-share/[token]/gallery
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const url = new URL(req.url);
    const sp = url.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '60')));
    const offset = (page - 1) * limit;

    if (!token || typeof token !== 'string' || token.length < 16) {
      return NextResponse.json(
        { success: false, error: 'Invalid folder share token' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Resolve folder by share token and ensure it's published
    console.log('🔍 [FOLDER-SHARE API] Looking for folder with token:', token.slice(0, 8) + '...');
    
    const { data: folder, error: folderErr } = await supabase
      .from('folders')
      .select('id, event_id, name, is_published, share_token')
      .eq('share_token', token)
      .single();
    
    console.log('📡 [FOLDER-SHARE API] Query result:', { 
      found: !!folder, 
      error: folderErr,
      isPublished: folder?.is_published,
      folderId: folder?.id
    });

    if (folderErr || !folder || !folder.is_published) {
      return NextResponse.json(
        { success: false, error: 'Share not found or unpublished' },
        { status: 404 }
      );
    }

    // Get all descendant folders (including the root)
    let allowedFolderIds: string[] = [];
    try {
      const { data: rows } = await supabase.rpc('get_descendant_folders', {
        p_folder_id: folder.id,
      });
      allowedFolderIds = (rows || []).map((r: any) => r.id);
      if (!allowedFolderIds.includes(folder.id)) allowedFolderIds.push(folder.id);
    } catch {
      allowedFolderIds = [folder.id];
    }

    // Base select
    const baseSelect = [
      'id',
      'folder_id',
      'filename',
      'original_path',
      'preview_path',
      'file_size',
      'mime_type',
      'created_at',
      'status',
    ].join(', ');

    const q = supabase
      .from('assets')
      .select(baseSelect, { count: 'exact' })
      .eq('status', 'ready')
      .in('folder_id', allowedFolderIds);

    const { data: assets, error: assetsErr, count } = (await q
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)) as any;

    if (assetsErr) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch gallery assets' },
        { status: 500 }
      );
    }

    // Event branding
    let eventName: string | null = null;
    try {
      const { data: ev } = await supabase
        .from('events')
        .select('name, school')
        .eq('id', folder.event_id)
        .maybeSingle();
      eventName = (ev as any)?.name || (ev as any)?.school || null;
    } catch {}

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicBuckets = ['assets', 'photos', 'photo-public'];

    const buildPublicUrl = (path?: string | null) => {
      if (!path || !baseUrl) return null;
      for (const b of publicBuckets) {
        return `${baseUrl}/storage/v1/object/public/${b}/${path}`;
      }
      return null;
    };

    const items = (assets || []).map((a: any) => {
      const wm = a.watermark_path || a.watermark_url || null;
      const pre = a.preview_path || a.preview_url || null;
      const orig = a.original_path || a.storage_path || null;
      const direct = typeof pre === 'string' && pre.startsWith('http') ? pre : null;
      const url = direct || buildPublicUrl(wm) || buildPublicUrl(pre) || buildPublicUrl(orig) || '';
      return {
        id: a.id,
        filename: a.filename || a.original_filename || 'foto',
        preview_url: url,
        created_at: a.created_at,
        size: a.file_size || 0,
        mime: a.mime_type || null,
        folder_id: a.folder_id,
      };
    });

    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const pagination = {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_more: page < totalPages,
    };

    return NextResponse.json({
      success: true,
      gallery: {
        token: {
          shareType: 'folder',
          allowDownload: false,
          allowComments: false,
          expiresAt: null,
        },
        eventId: folder.event_id,
        eventName,
        items,
        pagination,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
