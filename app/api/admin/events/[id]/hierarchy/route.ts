import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/admin/events/[eventId]/hierarchy - Get event hierarchy structure
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const eventId = params.id;

      if (!eventId) {
        return NextResponse.json(
          { error: 'Event ID is required' },
          { status: 400 }
        );
      }

      const supabase = await createServerSupabaseServiceClient();

      // Get event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name, school, date, status, description')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      // Get levels for this event
      const { data: levels, error: levelsError } = await supabase
        .from('event_levels')
        .select(
          `
        id, name, description, sort_order,
        courses!event_levels_courses(
          id, name, grade, section, is_folder, sort_order, active,
          students!courses_students(id, name, active)
        )
      `
        )
        .eq('event_id', eventId)
        .eq('active', true)
        .order('sort_order');

      // Get courses directly attached to event (no level)
      const { data: directCourses, error: coursesError } = await supabase
        .from('courses')
        .select(
          `
        id, name, grade, section, is_folder, sort_order, active,
        students!courses_students(id, name, active)
      `
        )
        .eq('event_id', eventId)
        .is('level_id', null)
        .is('parent_course_id', null)
        .eq('active', true)
        .order('sort_order');

      // Get photo counts
      // Get photo stats via assets + folders
      const { data: folders } = await supabase
        .from('folders')
        .select('id')
        .eq('event_id', eventId);

      const { data: photoStats } = folders?.length
        ? await supabase
            .from('assets')
            .select('id, folder_id')
            .in(
              'folder_id',
              folders.map((f) => f.id)
            )
        : { data: [] };

      // Calculate statistics
      const processedLevels =
        levels?.map((level: any) => ({
          id: level.id,
          name: level.name,
          description: level.description,
          sort_order: level.sort_order,
          course_count: level.courses?.filter((c: any) => c.active).length || 0,
          student_count:
            level.courses?.reduce((total: number, course: any) => {
              return (
                total +
                (course.students?.filter((s: any) => s.active).length || 0)
              );
            }, 0) || 0,
          photo_count: 0, // Would need more complex query to get level-specific photos
          courses:
            level.courses
              ?.filter((c: any) => c.active)
              .map((course: any) => ({
                id: course.id,
                name: course.name,
                grade: course.grade,
                section: course.section,
                is_folder: course.is_folder,
                sort_order: course.sort_order,
                student_count:
                  course.students?.filter((s: any) => s.active).length || 0,
                photo_count: 0, // Would need more complex query
              })) || [],
        })) || [];

      const processedCourses =
        directCourses?.map((course: any) => ({
          id: course.id,
          name: course.name,
          grade: course.grade,
          section: course.section,
          is_folder: course.is_folder,
          sort_order: course.sort_order,
          student_count:
            course.students?.filter((s: any) => s.active).length || 0,
          photo_count: 0, // Would need more complex query
        })) || [];

      // Calculate total students across all levels and direct courses
      const totalStudents = [
        ...processedLevels.reduce(
          (acc: number, level: any) => acc + level.student_count,
          0
        ),
        ...processedCourses.reduce(
          (acc: number, course: any) => acc + course.student_count,
          0
        ),
      ].reduce((a, b) => a + b, 0);

      const hierarchy = {
        event: {
          id: event.id,
          name: `${event.school} - ${event.name}`,
          school: event.school,
          date: event.date,
          status: event.status,
          description: event.description,
        },
        levels: processedLevels,
        courses: processedCourses,
        stats: {
          total_photos: photoStats?.length || 0,
          total_levels: processedLevels.length,
          total_courses:
            processedLevels.reduce(
              (acc, level) => acc + level.course_count,
              0
            ) + processedCourses.length,
          total_students: totalStudents,
        },
        has_levels: processedLevels.length > 0,
        has_direct_courses: processedCourses.length > 0,
      };

      return NextResponse.json({ hierarchy });
    } catch (error) {
      console.error(
        'Error in GET /api/admin/events/[eventId]/hierarchy:',
        error
      );
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
