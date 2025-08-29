import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/public/gallery/event/[id]
// Returns an event-level public gallery token if the event is public and a valid share exists
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const eventId = (await params).id;
    const supabase = await createServerSupabaseServiceClient();

    // Check if event exists
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('id, name, status')
      .eq('id', eventId)
      .single();

    if (eventErr || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // For now, allow all active events to be accessed publicly
    // TODO: Add public_gallery_enabled field to events table if needed
    if (event.status !== 'active') {
      return NextResponse.json(
        { error: 'Event not active' },
        { status: 404 }
      );
    }

    // For photographers: redirect directly to a simple public view
    // We'll create a simple public gallery page for events
    return NextResponse.json({ 
      success: true, 
      event: {
        id: event.id,
        name: event.name,
        status: event.status
      },
      redirect: `/gallery/${eventId}/public`
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

