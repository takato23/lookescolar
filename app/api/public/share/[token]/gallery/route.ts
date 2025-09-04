import { NextRequest, NextResponse } from 'next/server';
import { shareTokenSecurity } from '@/lib/security/share-token-security';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/public/share/[token]/gallery
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const url = new URL(req.url);
    const sp = url.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '60')));
    const offset = (page - 1) * limit;

    if (!token || token.length !== 64) {
      return NextResponse.json(
        { success: false, error: 'Invalid share token' },
        { status: 400 }
      );
    }

    const requestContext = await shareTokenSecurity.extractRequestContext();
    const validation = await shareTokenSecurity.validateToken(
      token,
      undefined,
      requestContext
    );

    if (!validation.isValid || !validation.token) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid or expired token' },
        { status: 403 }
      );
    }

    const t = validation.token;
    const supabase = await createServerSupabaseServiceClient();

    // Base gallery container
    const galleryData: any = {
      token: {
        shareType: t.share_type,
        allowDownload: t.allow_download,
        allowComments: t.allow_comments,
        expiresAt: t.expires_at,
      },
      eventId: t.event_id,
    };

    // Fetch event basic info for branding (safe public fields)
    try {
      const { data: ev } = await supabase
        .from('events')
        .select('name, school')
        .eq('id', t.event_id)
        .maybeSingle();
      galleryData.eventName = (ev as any)?.name || (ev as any)?.school || null;
    } catch {}

    // Resolve scope and fetch assets
    let allowedFolderIds: string[] | null = null;

    if (t.share_type === 'folder' && t.folder_id) {
      // Get folder subtree
      const { data: rows, error: rpcErr } = await supabase.rpc(
        'get_descendant_folders',
        { p_folder_id: t.folder_id }
      );
      if (rpcErr) {
        return NextResponse.json(
          { success: false, error: 'Failed to resolve folder hierarchy' },
          { status: 500 }
        );
      }
      allowedFolderIds = (rows || []).map((r: any) => r.id);
    }

    // Build query
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
    let selectExpr = baseSelect;
    let q = supabase.from('assets').select(selectExpr, { count: 'exact' }).eq('status', 'ready');

    if (t.share_type === 'event') {
      // Fetch by event
      // Get folders for event to constrain assets by folder (more index-friendly)
      const { data: fRows } = await supabase
        .from('folders')
        .select('id')
        .eq('event_id', t.event_id)
        .eq('is_published', true);
      const ids = (fRows || []).map((r: any) => r.id);
      if (ids.length > 0) {
        allowedFolderIds = ids;
        q = q.in('folder_id', ids);
      } else {
        q = q.eq('folder_id', '00000000-0000-0000-0000-000000000000'); // no results
      }
    } else if (allowedFolderIds && allowedFolderIds.length > 0) {
      q = q.in('folder_id', allowedFolderIds);
    } else if (t.share_type === 'photos' && t.photo_ids && t.photo_ids.length > 0) {
      q = q.in('id', t.photo_ids);
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported share scope' },
        { status: 400 }
      );
    }

    // Subject-level restriction for privacy (e.g., bullying cases)
    const subjectId = (t as any).subject_id || (t.metadata && (t.metadata as any).subject_id) || null;
    if (subjectId) {
      // Apply inner join with asset_subjects to ensure only assets tagged with this subject are returned
      selectExpr = `${baseSelect}, asset_subjects!inner(subject_id)`;
      q = supabase
        .from('assets')
        .select(selectExpr, { count: 'exact' })
        .eq('status', 'ready')
        .eq('asset_subjects.subject_id', subjectId);

      // Re-apply scope constraints
      if (t.share_type === 'event' && allowedFolderIds && allowedFolderIds.length > 0) {
        q = q.in('folder_id', allowedFolderIds);
      } else if (t.share_type === 'folder' && allowedFolderIds && allowedFolderIds.length > 0) {
        q = q.in('folder_id', allowedFolderIds);
      } else if (t.share_type === 'photos' && t.photo_ids && t.photo_ids.length > 0) {
        q = q.in('id', t.photo_ids);
      }
    }

    const { data: assets, error: assetsErr, count } = await q
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1) as any;
    if (assetsErr) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch gallery assets' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicBuckets = ['assets', 'photos', 'photo-public'];

    const buildPublicUrl = (path?: string | null) => {
      if (!path || !baseUrl) return null;
      // Try known public buckets
      for (const b of publicBuckets) {
        return `${baseUrl}/storage/v1/object/public/${b}/${path}`;
      }
      return null;
    };

    const items = (assets || []).map((a: any) => {
      // Support multiple schema variants
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

    return NextResponse.json({ success: true, gallery: { ...galleryData, items, pagination } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
