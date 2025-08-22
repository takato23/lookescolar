import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const bulkActionSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'archive', 'export', 'delete', 'duplicate']),
  course_ids: z.array(z.string()).min(1, 'At least one course ID is required'),
  options: z.object({
    level_id: z.string().optional(),
    active: z.boolean().optional(),
  }).optional(),
});

// POST /api/admin/events/[id]/courses/bulk
export const POST = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const eventId = params.id;
    const body = await req.json();

    // Validate input
    const validatedData = bulkActionSchema.parse(body);
    const { action, course_ids, options = {} } = validatedData;

    const supabase = await createServerSupabaseServiceClient();

    // Verify all courses exist and belong to this event
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, name, active, student_count:students!left(count)')
      .eq('event_id', eventId)
      .in('id', course_ids);

    if (coursesError) {
      throw new Error(`Failed to verify courses: ${coursesError.message}`);
    }

    if (courses.length !== course_ids.length) {
      return NextResponse.json(
        { error: 'Some courses not found or do not belong to this event' },
        { status: 400 }
      );
    }

    let result: any = { success: true, affected_courses: courses.length };

    switch (action) {
      case 'activate':
        result = await handleActivateDeactivate(supabase, course_ids, true);
        break;

      case 'deactivate':
        result = await handleActivateDeactivate(supabase, course_ids, false);
        break;

      case 'archive':
        result = await handleArchive(supabase, course_ids);
        break;

      case 'export':
        result = await handleExport(supabase, eventId, course_ids);
        break;

      case 'delete':
        result = await handleDelete(supabase, course_ids);
        break;

      case 'duplicate':
        result = await handleDuplicate(supabase, eventId, course_ids, options);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST /api/admin/events/[id]/courses/bulk:', error);
    
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

// Handle activate/deactivate
async function handleActivateDeactivate(supabase: any, course_ids: string[], active: boolean) {
  const { error } = await supabase
    .from('courses')
    .update({
      active,
      updated_at: new Date().toISOString(),
    })
    .in('id', course_ids);

  if (error) {
    throw new Error(`Failed to ${active ? 'activate' : 'deactivate'} courses: ${error.message}`);
  }

  return {
    success: true,
    message: `Successfully ${active ? 'activated' : 'deactivated'} ${course_ids.length} course(s)`,
    affected_courses: course_ids.length,
  };
}

// Handle archive (soft delete)
async function handleArchive(supabase: any, course_ids: string[]) {
  const { error } = await supabase
    .from('courses')
    .update({
      active: false,
      archived: true,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', course_ids);

  if (error) {
    throw new Error(`Failed to archive courses: ${error.message}`);
  }

  return {
    success: true,
    message: `Successfully archived ${course_ids.length} course(s)`,
    affected_courses: course_ids.length,
  };
}

// Handle export
async function handleExport(supabase: any, eventId: string, course_ids: string[]) {
  // Get detailed course data for export
  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      *,
      event_levels!left (
        id,
        name
      ),
      students!left (
        id,
        name,
        grade,
        section,
        email,
        phone,
        parent_name,
        parent_email,
        parent_phone,
        qr_code,
        active,
        created_at
      )
    `)
    .eq('event_id', eventId)
    .in('id', course_ids)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to export courses: ${error.message}`);
  }

  // Format data for export
  const exportData = courses.map(course => ({
    course_id: course.id,
    course_name: course.name,
    grade: course.grade,
    section: course.section,
    level_name: course.event_levels?.name,
    description: course.description,
    sort_order: course.sort_order,
    active: course.active,
    student_count: course.students?.length || 0,
    created_at: course.created_at,
    students: course.students?.map((student: any) => ({
      student_id: student.id,
      name: student.name,
      grade: student.grade,
      section: student.section,
      email: student.email,
      phone: student.phone,
      parent_name: student.parent_name,
      parent_email: student.parent_email,
      parent_phone: student.parent_phone,
      qr_code: student.qr_code,
      active: student.active,
      created_at: student.created_at,
    })) || [],
  }));

  return {
    success: true,
    message: `Successfully exported ${course_ids.length} course(s)`,
    export_data: exportData,
    export_filename: `courses_export_${new Date().toISOString().split('T')[0]}.json`,
  };
}

// Handle delete (hard delete)
async function handleDelete(supabase: any, course_ids: string[]) {
  // First check if courses have students
  const { data: coursesWithStudents } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      students!left (count)
    `)
    .in('id', course_ids);

  const coursesWithStudentData = coursesWithStudents?.filter(
    (course: any) => course.students?.[0]?.count > 0
  );

  if (coursesWithStudentData && coursesWithStudentData.length > 0) {
    return NextResponse.json(
      { 
        error: 'Cannot delete courses with students', 
        details: `Courses with students: ${coursesWithStudentData.map((c: any) => c.name).join(', ')}` 
      },
      { status: 400 }
    );
  }

  // Delete courses
  const { error } = await supabase
    .from('courses')
    .delete()
    .in('id', course_ids);

  if (error) {
    throw new Error(`Failed to delete courses: ${error.message}`);
  }

  return {
    success: true,
    message: `Successfully deleted ${course_ids.length} course(s)`,
    affected_courses: course_ids.length,
  };
}

// Handle duplicate
async function handleDuplicate(supabase: any, eventId: string, course_ids: string[], options: any) {
  const { data: courses, error: fetchError } = await supabase
    .from('courses')
    .select('*')
    .eq('event_id', eventId)
    .in('id', course_ids);

  if (fetchError) {
    throw new Error(`Failed to fetch courses for duplication: ${fetchError.message}`);
  }

  const duplicatedCourses = [];

  for (const course of courses) {
    // Create duplicate with modified name
    const duplicateCourse = {
      ...course,
      id: undefined, // Let Supabase generate new ID
      name: `${course.name} (Copia)`,
      level_id: options.level_id || course.level_id,
      active: options.active !== undefined ? options.active : course.active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newCourse, error: createError } = await supabase
      .from('courses')
      .insert(duplicateCourse)
      .select()
      .single();

    if (createError) {
      console.error(`Failed to duplicate course ${course.name}:`, createError);
      continue;
    }

    duplicatedCourses.push(newCourse);
  }

  return {
    success: true,
    message: `Successfully duplicated ${duplicatedCourses.length} course(s)`,
    duplicated_courses: duplicatedCourses,
    affected_courses: duplicatedCourses.length,
  };
}