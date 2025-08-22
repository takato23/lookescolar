import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const levelSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  sort_order: z.number().optional(),
  active: z.boolean().optional(),
});

// GET /api/admin/events/[id]/levels
export const GET = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const eventId = params.id;
    const supabase = await createServerSupabaseServiceClient();

    // Get event levels with course and student counts
    const { data: levels, error } = await supabase
      .from('event_levels')
      .select(`
        *,
        courses:courses!left (
          id,
          active,
          students:students!left (
            id,
            active
          )
        )
      `)
      .eq('event_id', eventId)
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching levels:', error);
      return NextResponse.json(
        { error: 'Failed to fetch levels', details: error.message },
        { status: 500 }
      );
    }

    // Process levels with aggregated counts
    const processedLevels = (levels || []).map(level => ({
      id: level.id,
      name: level.name,
      description: level.description,
      sort_order: level.sort_order,
      active: level.active,
      created_at: level.created_at,
      updated_at: level.updated_at,
      course_count: level.courses?.filter((c: any) => c.active)?.length || 0,
      student_count: level.courses?.reduce((total: number, course: any) => {
        return total + (course.students?.filter((s: any) => s.active)?.length || 0);
      }, 0) || 0,
    }));

    return NextResponse.json({ levels: processedLevels });
  } catch (error) {
    console.error('Error in GET /api/admin/events/[id]/levels:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /api/admin/events/[id]/levels
export const POST = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const eventId = params.id;
    const body = await req.json();

    // Validate input
    const validatedData = levelSchema.parse(body);

    const supabase = await createServerSupabaseServiceClient();

    // Insert new level
    const { data: level, error } = await supabase
      .from('event_levels')
      .insert({
        event_id: eventId,
        name: validatedData.name,
        description: validatedData.description,
        sort_order: validatedData.sort_order ?? 0,
        active: validatedData.active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating level:', error);
      return NextResponse.json(
        { error: 'Failed to create level', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ level }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/events/[id]/levels:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});