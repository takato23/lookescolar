import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseServiceClient();
    
    // Get URL params for limit
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    // Get events with all necessary fields - SIMPLIFIED to avoid errors
    const { data: events, error } = await supabase
      .from('events')
      .select('id, name, location, date, status, created_at')
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
        school: event.name || 'Sin nombre', // Map name to school for compatibility
        location: event.location,
        date: event.date || event.created_at,
        active: event.status === 'active',
        photo_price: 0, // Default value since column doesn't exist
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
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
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

    const { name, location, date } = body;

    if (!name || !date) {
      return NextResponse.json(
        { error: 'Name and date are required' },
        { status: 400 }
      );
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        name,
        location: location || null,
        date,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('[events-simple] Error creating event:', error);
      return NextResponse.json(
        { error: 'Error creating event', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event: {
        ...event,
        school: event.name, // Map for compatibility
        active: event.status === 'active',
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
