import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET - Get current cover photo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createServerSupabaseServiceClient();

    const { data: event, error } = await supabase
      .from('events')
      .select('metadata')
      .eq('id', eventId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const coverPhotoId = (event?.metadata as Record<string, unknown>)?.cover_photo_id || null;
    return NextResponse.json({ cover_photo_id: coverPhotoId });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Set cover photo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const body = await request.json();
    const { photo_id } = body;

    if (!photo_id) {
      return NextResponse.json({ error: 'photo_id is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseServiceClient();

    // Get current metadata
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('metadata')
      .eq('id', eventId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Update metadata with cover_photo_id
    const currentMetadata = (event?.metadata || {}) as Record<string, unknown>;
    const updatedMetadata = {
      ...currentMetadata,
      cover_photo_id: photo_id,
    };

    const { error: updateError } = await supabase
      .from('events')
      .update({ metadata: updatedMetadata })
      .eq('id', eventId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, cover_photo_id: photo_id });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove cover photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createServerSupabaseServiceClient();

    // Get current metadata
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('metadata')
      .eq('id', eventId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Remove cover_photo_id from metadata
    const currentMetadata = (event?.metadata || {}) as Record<string, unknown>;
    const { cover_photo_id, ...restMetadata } = currentMetadata;

    const { error: updateError } = await supabase
      .from('events')
      .update({ metadata: restMetadata })
      .eq('id', eventId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
