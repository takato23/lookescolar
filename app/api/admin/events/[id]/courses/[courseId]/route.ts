import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const courseUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  grade: z.string().optional(),
  section: z.string().optional(),
  level_id: z.string().nullable().optional(),
  description: z.string().optional(),
  sort_order: z.number().optional(),
  active: z.boolean().optional(),
});

// GET /api/admin/events/[id]/courses/[courseId]
export const GET = withAuth(async (
  req: NextRequest, 
  { params }: { params: { id: string; courseId: string } }
) => {
  try {
    const eventId = params.id;
    const courseId = params.courseId;
    
    const supabase = await createServerSupabaseServiceClient();

    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        *,
        event_levels!left (
          id,
          name
        ),
        students:students!left (
          id,
          name,
          grade,
          section,
          qr_code,
          email,
          phone,
          parent_name,
          parent_email,
          parent_phone,
          active,
          created_at,
          photo_students:photo_students!left (
            id,
            photo_id,
            tagged_at
          )
        ),
        photo_courses:photo_courses!left (
          id,
          photo_type,
          photos!inner (
            id,
            filename,
            created_at
          )
        )
      `)
      .eq('id', courseId)
      .eq('event_id', eventId)
      .single();

    if (error) {
      console.error('Error fetching course:', error);
      return NextResponse.json(
        { error: 'Failed to fetch course', details: error.message },
        { status: 500 }
      );
    }

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Process course with calculated fields
    const processedCourse = {
      ...course,
      level_name: course.event_levels?.name,
      student_count: course.students?.filter((s: any) => s.active)?.length || 0,
      photo_count: course.students?.reduce((total: number, student: any) => {
        return total + (student.photo_students?.length || 0);
      }, 0) || 0,
      group_photo_count: course.photo_courses?.length || 0,
      students: course.students?.map((student: any) => ({
        ...student,
        photo_count: student.photo_students?.length || 0,
        last_photo_tagged: student.photo_students?.length > 0
          ? student.photo_students.reduce((latest: string, ps: any) => {
              return ps.tagged_at > latest ? ps.tagged_at : latest;
            }, student.photo_students[0].tagged_at)
          : null,
      })),
    };

    return NextResponse.json({ course: processedCourse });
  } catch (error) {
    console.error('Error in GET /api/admin/events/[id]/courses/[courseId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// PUT /api/admin/events/[id]/courses/[courseId]
export const PUT = withAuth(async (
  req: NextRequest, 
  { params }: { params: { id: string; courseId: string } }
) => {
  try {
    const eventId = params.id;
    const courseId = params.courseId;
    const body = await req.json();

    // Validate input
    const validatedData = courseUpdateSchema.parse(body);

    const supabase = await createServerSupabaseServiceClient();

    // Check if course exists
    const { data: existingCourse, error: fetchError } = await supabase
      .from('courses')
      .select('id, name')
      .eq('id', courseId)
      .eq('event_id', eventId)
      .single();

    if (fetchError || !existingCourse) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check for name conflicts (if name is being updated)
    if (validatedData.name && validatedData.name !== existingCourse.name) {
      const { data: conflictCourse } = await supabase
        .from('courses')
        .select('id')
        .eq('event_id', eventId)
        .eq('name', validatedData.name)
        .neq('id', courseId)
        .single();

      if (conflictCourse) {
        return NextResponse.json(
          { error: 'A course with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Update course
    const { data: course, error } = await supabase
      .from('courses')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', courseId)
      .eq('event_id', eventId)
      .select(`
        *,
        event_levels!left (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Error updating course:', error);
      return NextResponse.json(
        { error: 'Failed to update course', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error('Error in PUT /api/admin/events/[id]/courses/[courseId]:', error);
    
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

// DELETE /api/admin/events/[id]/courses/[courseId]
export const DELETE = withAuth(async (
  req: NextRequest, 
  { params }: { params: { id: string; courseId: string } }
) => {
  try {
    const eventId = params.id;
    const courseId = params.courseId;
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';
    
    const supabase = await createServerSupabaseServiceClient();

    // Check if course exists
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('id, name')
      .eq('id', courseId)
      .eq('event_id', eventId)
      .single();

    if (fetchError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check for dependencies (students)
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('course_id', courseId)
      .eq('active', true);

    if (studentsError) {
      console.error('Error checking course dependencies:', studentsError);
      return NextResponse.json(
        { error: 'Failed to check course dependencies' },
        { status: 500 }
      );
    }

    if (students && students.length > 0 && !force) {
      return NextResponse.json(
        { 
          error: 'Cannot delete course with active students',
          details: `Course has ${students.length} active students. Use force=true to archive instead.`,
          student_count: students.length,
        },
        { status: 400 }
      );
    }

    if (force && students && students.length > 0) {
      // Archive the course instead of deleting
      const { error: archiveError } = await supabase
        .from('courses')
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', courseId)
        .eq('event_id', eventId);

      if (archiveError) {
        console.error('Error archiving course:', archiveError);
        return NextResponse.json(
          { error: 'Failed to archive course', details: archiveError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        message: 'Course archived successfully',
        archived: true,
      });
    }

    // Delete course
    const { error: deleteError } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('event_id', eventId);

    if (deleteError) {
      console.error('Error deleting course:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete course', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Course deleted successfully',
      deleted: true,
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/events/[id]/courses/[courseId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});