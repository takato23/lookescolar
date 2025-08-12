import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/admin/students
// Optional query params:
// - eventId or event_id: filter students by event
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId') || searchParams.get('event_id') || undefined;

    const supabase = await createServerSupabaseServiceClient();

    // Build base query
    let query = supabase
      .from('subjects')
      .select(
        `
        id,
        name,
        event_id
      `
      )
      .order('name', { ascending: true });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Error fetching students', details: error.message },
        { status: 500 }
      );
    }

    const students = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name || 'Sin nombre',
      event_id: s.event_id ?? null,
    }));

    return NextResponse.json({ students });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
});

export const runtime = 'nodejs';


