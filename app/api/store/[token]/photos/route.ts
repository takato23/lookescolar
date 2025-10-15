import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Store Photos API
 *
 * Gets photos for a store (selling physical prints)
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const storeToken = (params).token;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = await createServerSupabaseServiceClient();

    // Verify folder exists and is published for store
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, event_id, is_published, store_settings')
      .eq('share_token', storeToken)
      .single();

    if (folderError || !folder) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    if (!folder.is_published) {
      return NextResponse.json(
        { error: 'Store not published' },
        { status: 404 }
      );
    }

    // Get event info
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name')
      .eq('id', folder.event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get photos from this folder
    const offset = (page - 1) * limit;

    const { data: photos, error: photosError } = await supabase
      .from('assets')
      .select(
        `
        id,
        filename,
        file_size,
        dimensions,
        preview_path,
        folder_id
      `
      )
      .eq('folder_id', folder.id)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (photosError) {
      console.error('Error fetching store photos:', photosError);
      return NextResponse.json(
        { error: 'Error loading photos' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('folder_id', folder.id)
      .eq('status', 'ready');

    // Transform photos for frontend with store info
    const transformedPhotos = (photos || []).map((photo) => ({
      id: photo.id,
      filename: photo.filename,
      preview_url: `/admin/previews/${photo.filename}`,
      size: photo.file_size || 0,
      width: photo.dimensions?.width || 0,
      height: photo.dimensions?.height || 0,
      price: 1500, // Precio fijo por foto (en centavos)
    }));

    return NextResponse.json({
      success: true,
      photos: transformedPhotos,
      total: totalCount || 0,
      page,
      limit,
      has_more: (totalCount || 0) > offset + limit,
      folder: {
        id: folder.id,
        name: folder.name,
        store_settings: folder.store_settings,
      },
      event: {
        id: event.id,
        name: event.name,
      },
    });
  } catch (error) {
    console.error('Store photos error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
