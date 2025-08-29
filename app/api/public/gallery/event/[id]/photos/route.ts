import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Public Gallery Photos API
 * 
 * Gets photos for a public event gallery
 * This is a simplified version that shows published photos from folders
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const eventId = (await params).id;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const supabase = await createServerSupabaseServiceClient();

    // Verify event exists and is active
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (event.status !== 'active') {
      return NextResponse.json(
        { error: 'Event not active' },
        { status: 404 }
      );
    }

    // Get published folders from this event
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id')
      .eq('event_id', eventId)
      .eq('is_published', true)
      .not('share_token', 'is', null);

    if (foldersError) {
      console.error('Error fetching folders:', foldersError);
      return NextResponse.json(
        { error: 'Error loading gallery' },
        { status: 500 }
      );
    }

    if (!folders || folders.length === 0) {
      return NextResponse.json({
        success: true,
        photos: [],
        total: 0,
        page,
        limit,
        has_more: false,
      });
    }

    const folderIds = folders.map(f => f.id);

    // Get photos from published folders
    const offset = (page - 1) * limit;
    
    const { data: photos, error: photosError } = await supabase
      .from('assets')
      .select(`
        id,
        filename,
        file_size,
        dimensions,
        preview_path,
        folder_id
      `)
      .in('folder_id', folderIds)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (photosError) {
      console.error('Error fetching photos:', photosError);
      return NextResponse.json(
        { error: 'Error loading photos' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .in('folder_id', folderIds)
      .eq('status', 'ready');

    // Transform photos for frontend
    const transformedPhotos = (photos || []).map(photo => ({
      id: photo.id,
      filename: photo.filename,
      preview_url: `/admin/previews/${photo.filename}`,
      size: photo.file_size || 0,
      width: photo.dimensions?.width || 0,
      height: photo.dimensions?.height || 0,
    }));

    return NextResponse.json({
      success: true,
      photos: transformedPhotos,
      total: totalCount || 0,
      page,
      limit,
      has_more: (totalCount || 0) > offset + limit,
      event: {
        id: event.id,
        name: event.name,
      },
    });

  } catch (error) {
    console.error('Public gallery photos error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
