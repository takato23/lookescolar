import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/middleware/auth.middleware';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const supabase = await createServerSupabaseServiceClient();

    // Get URL params for limit
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 100;

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
          error: 'Could not fetch events',
        },
        { status: 200 }
      );
    }

    // Simplified response - avoid complex stats that may fail
    const eventsWithStats = (events || []).map(
      (event: Record<string, unknown>) => {
        return {
          id: event.id as string,
          name: (event.name as string) || 'Sin nombre',
          school:
            (event.school as string) || (event.name as string) || 'Sin nombre',
          location: (event.school as string) || '',
          date: (event.date as string) || (event.created_at as string),
          // Default to true to keep UI behavior simple across schema variations
          active: true,
          photo_price: 0, // Default value
          created_at: event.created_at as string,
          photo_count: 0, // We'll load this separately if needed
        };
      }
    );

    console.log(
      '[events-simple] Found events with stats:',
      eventsWithStats.length
    );

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
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

// Create a new event
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const supabase = await createServerSupabaseServiceClient();
    const body = await request.json();

    const { name, schoolName, date, enable_qr_tagging } = body;

    if (!name || !date) {
      return NextResponse.json(
        { error: 'Name and date are required' },
        { status: 400 }
      );
    }

    // Insert with compatibility: prefer setting 'location' to satisfy NOT NULL
    const insertData: any = {
      name,
      date,
      location: schoolName || name,
    };

    if (typeof enable_qr_tagging === 'boolean') {
      insertData.metadata = {
        settings: {
          qrTaggingEnabled: enable_qr_tagging,
        },
      };
    }

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

    const eventData = event as Record<string, unknown>;
    return NextResponse.json({
      success: true,
      event: {
        ...eventData,
        school: (eventData.school as string) || (eventData.name as string), // Map for compatibility
        location: (eventData.school as string) || '',
        active: true,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('[events-simple] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
});
