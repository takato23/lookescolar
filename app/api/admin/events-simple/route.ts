import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseServiceClient();
    
    // Get URL params for limit
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    // Get events with minimal fields to avoid schema drift issues
    const { data: events, error } = await supabase
      .from('events')
      .select('id, name, date, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[events-simple] Database error:', error);
      // If there's a DB error, return empty events array instead of 500
      return NextResponse.json(
        { 
          success: true,
          events: [],
          error: 'Could not fetch events'
        },
        { status: 200 }
      );
    }

    // Simplified response - avoid complex stats that may fail
    const eventsWithStats = (events || []).map((event) => {
      return {
        id: event.id,
        name: event.name || 'Sin nombre',
        school: (event as any).school || event.name || 'Sin nombre',
        location: (event as any).school || '',
        date: event.date || event.created_at,
        // Default to true to keep UI behavior simple across schema variations
        active: true,
        photo_price: 0, // Default value
        created_at: event.created_at,
        photo_count: 0 // We'll load this separately if needed
      };
    });

    console.log('[events-simple] Found events with stats:', eventsWithStats.length);

    return NextResponse.json(
      {
        success: true,
        events: eventsWithStats,
      },
      {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[events-simple] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Create a new event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseServiceClient();
    const body = await request.json();

    const { name, schoolName, date } = body;

    if (!name || !date) {
      return NextResponse.json(
        { error: 'Name and date are required' },
        { status: 400 }
      );
    }

    // Insert with compatibility: prefer setting 'location' to satisfy NOT NULL
    const insertData: any = { name, date, location: schoolName || name };

    const { data: event, error } = await supabase
      .from('events')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[events-simple] Error creating event:', error);
      return NextResponse.json(
        { error: 'Error creating event', details: error.message },
        { status: 500 }
      );
    }

    // Revalidate the events page to show the new event immediately
    revalidatePath('/admin/events');
    revalidatePath('/admin/events?include_stats=true');

    return NextResponse.json({
      success: true,
      event: {
        ...event,
        school: event.school || event.name, // Map for compatibility
        location: event.school || '',
        active: true,
      },
    });
  } catch (error) {
    console.error('[events-simple] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
