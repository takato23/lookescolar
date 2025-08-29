import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET: Obtener etiquetas temporales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');
    const eventId = searchParams.get('eventId');

    const supabase = await createServerSupabaseServiceClient();

    let query = supabase
      .from('temp_photo_tags')
      .select('*')
      .order('created_at', { ascending: false });

    if (photoId) {
      query = query.eq('photo_id', photoId);
    }

    if (eventId) {
      // Join with photos to filter by event
      query = supabase
        .from('temp_photo_tags')
        .select(
          `
          id,
          photo_id,
          temp_name,
          temp_email,
          created_at,
          photos(event_id)
        `
        )
        .eq('photos.event_id', eventId)
        .order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching temp tags:', error);
      return NextResponse.json(
        { error: 'Error fetching temporary tags' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tempTags: data || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/temp-tags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Crear etiqueta temporal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photoId, tempName, tempEmail } = body;

    if (!photoId || !tempName) {
      return NextResponse.json(
        { error: 'photo_id and temp_name are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Verificar que la foto existe
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Crear etiqueta temporal
    const { data, error } = await supabase
      .from('temp_photo_tags')
      .insert({
        photo_id: photoId,
        temp_name: tempName.trim(),
        temp_email: tempEmail?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating temp tag:', error);
      return NextResponse.json(
        { error: 'Error creating temporary tag' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tempTag: data,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/temp-tags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar etiqueta temporal
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('id');

    if (!tagId) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    const { error } = await supabase
      .from('temp_photo_tags')
      .delete()
      .eq('id', tagId);

    if (error) {
      console.error('Error deleting temp tag:', error);
      return NextResponse.json(
        { error: 'Error deleting temporary tag' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/temp-tags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
