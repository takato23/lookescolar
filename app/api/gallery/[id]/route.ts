import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Public: GET /api/gallery/[id]
// Returns event info and paginated public-ready photos (watermarked/preview URLs)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const url = new URL(request.url);
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get('limit') || '24', 10), 1),
      100
    );
    const offset = (page - 1) * limit;

    const supabase = await createServerSupabaseServiceClient();

    // Validate event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, location, date, status, created_at, theme, settings')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // First, get all folders for this event
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id')
      .eq('event_id', eventId);

    if (foldersError) {
      return NextResponse.json(
        { error: 'Failed to fetch event folders' },
        { status: 500 }
      );
    }

    const folderIds = folders?.map((f) => f.id) || [];

    if (folderIds.length === 0) {
      // No folders found, return empty result
      return NextResponse.json({
        success: true,
        data: {
          event: {
            id: event.id,
            name: event.name,
            school: event.name,
            date: event.date,
            created_at: event.created_at,
          },
          photos: [],
          // Include theme and design settings for Pixieset-like runtime
          theme: (event as any).theme || 'default',
          settings: (event as any).settings || {},
        },
        event: {
          id: event.id,
          name: event.name,
          school: event.name,
          date: event.date,
          created_at: event.created_at,
        },
        photos: [],
        pagination: { page, limit, total: 0, has_more: false, total_pages: 0 },
      });
    }

    // Count total assets from all folders for this event
    const countQuery = supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .in('folder_id', folderIds);

    const { count: total, error: countError } = await countQuery;
    if (countError) {
      return NextResponse.json(
        { error: 'Failed to count photos' },
        { status: 500 }
      );
    }

    // Fetch paginated assets (prioritize watermark/preview for public view)
    const photosQuery = supabase
      .from('assets')
      .select(
        `id, original_path, preview_path, checksum, dimensions, created_at, status`
      )
      .in('folder_id', folderIds)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: assets, error: assetsError } = await photosQuery;
    if (assetsError) {
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 }
      );
    }

    // Build public URLs (preview > original) using public bucket path
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const toPublicUrl = (path?: string | null) =>
      path && baseUrl
        ? `${baseUrl}/storage/v1/object/public/photos/${path}`
        : null;

    const processed = (assets || []).map((asset) => {
      const key = asset.preview_path || asset.original_path;
      const signed_url = toPublicUrl(key) || '';
      const dimensions = asset.dimensions ? JSON.parse(asset.dimensions) : null;

      return {
        id: asset.id,
        storage_path: asset.original_path,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        created_at: asset.created_at,
        signed_url,
      };
    });

    const totalPhotos = total || 0;
    const totalPages = Math.max(Math.ceil(totalPhotos / limit), 1);
    const pagination = {
      page,
      limit,
      total: totalPhotos,
      has_more: page < totalPages,
      total_pages: totalPages,
    };

    // Return response supporting both shapes used across the app/tests
    return NextResponse.json({
      success: true,
      // Preferred shape used by components
      data: {
        event: {
          id: event.id,
          name: event.name,
          school: event.name,
          date: event.date,
          created_at: event.created_at,
        },
        photos: processed,
      },
      // Back-compat direct fields used by some tests
      event: {
        id: event.id,
        name: event.name,
        school: event.name,
        date: event.date,
        created_at: event.created_at,
        theme: (event as any).theme || 'default',
        settings: (event as any).settings || {},
      },
      photos: processed,
      pagination,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
