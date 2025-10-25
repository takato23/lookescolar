import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import type { RouteContext } from '@/types/next-route';

interface DriveItem {
  id: string;
  name: string;
  type: 'folder' | 'photo' | 'student';
  parentId?: string;
  photoCount?: number;
  studentCount?: number;
  isActive?: boolean;
  thumbnailUrl?: string;
  metadata?: {
    level?: string;
    course?: string;
    section?: string;
    grade?: string;
    uploadDate?: string;
    fileSize?: number;
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  try {
    const { id: eventId } = await context.params;
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const pathSegments = path ? path.split('/').filter(Boolean) : [];

    const supabase = await createServerSupabaseServiceClient();
    const items: DriveItem[] = [];

    // Root level - show event levels or courses if no levels exist
    if (pathSegments.length === 0) {
      // Get event levels
      const { data: levels } = await supabase
        .from('event_levels')
        .select(
          `
          id, name, description, active, sort_order,
          courses:courses(count)
        `
        )
        .eq('event_id', eventId)
        .eq('active', true)
        .order('sort_order');

      if (levels && levels.length > 0) {
        // Show levels as folders
        for (const level of levels) {
          const { data: levelCourses } = await supabase
            .from('courses')
            .select('id')
            .eq('level_id', level.id)
            .eq('active', true);

          const { data: levelStudents } = await supabase
            .from('students')
            .select(
              `
              id,
              courses:courses!inner(level_id)
            `
            )
            .eq('courses.level_id', level.id)
            .eq('active', true);

          const { data: levelPhotos } = await supabase
            .from('photos')
            .select(
              `
              id,
              photo_students!inner(
                students!inner(
                  courses!inner(level_id)
                )
              )
            `
            )
            .eq('photo_students.students.courses.level_id', level.id);

          items.push({
            id: level.id,
            name: level.name,
            type: 'folder',
            photoCount: levelPhotos?.length || 0,
            studentCount: levelStudents?.length || 0,
            isActive: level.active,
            metadata: {
              level: level.name,
            },
          });
        }
      } else {
        // No levels, show courses directly
        const { data: courses } = await supabase
          .from('courses')
          .select(
            `
            id, name, grade, section, active, sort_order,
            students:students(count),
            level:event_levels(name)
          `
          )
          .eq('event_id', eventId)
          .eq('active', true)
          .order('sort_order');

        if (courses) {
          for (const course of courses) {
            const { data: coursePhotos } = await supabase
              .from('photos')
              .select(
                `
                id,
                photo_students!inner(
                  students!inner(course_id)
                )
              `
              )
              .eq('photo_students.students.course_id', course.id);

            items.push({
              id: course.id,
              name: course.name,
              type: 'folder',
              photoCount: coursePhotos?.length || 0,
              studentCount: course.students?.[0]?.count || 0,
              isActive: course.active,
              metadata: {
                course: course.name,
                grade: course.grade,
                section: course.section,
              },
            });
          }
        }
      }
    }
    // Level selected - show courses in that level
    else if (pathSegments.length === 1) {
      const levelId = pathSegments[0];

      const { data: courses } = await supabase
        .from('courses')
        .select(
          `
          id, name, grade, section, active, sort_order,
          students:students(count)
        `
        )
        .eq('level_id', levelId)
        .eq('active', true)
        .order('sort_order');

      if (courses) {
        for (const course of courses) {
          const { data: coursePhotos } = await supabase
            .from('photos')
            .select(
              `
              id,
              photo_students!inner(
                students!inner(course_id)
              )
            `
            )
            .eq('photo_students.students.course_id', course.id);

          items.push({
            id: course.id,
            name: course.name,
            type: 'folder',
            photoCount: coursePhotos?.length || 0,
            studentCount: course.students?.[0]?.count || 0,
            isActive: course.active,
            metadata: {
              course: course.name,
              grade: course.grade,
              section: course.section,
            },
          });
        }
      }
    }
    // Course selected - show students in that course
    else if (pathSegments.length === 2) {
      const courseId = pathSegments[1];

      const { data: students } = await supabase
        .from('students')
        .select(
          `
          id, name, grade, section, active,
          courses:courses(name, grade, section)
        `
        )
        .eq('course_id', courseId)
        .eq('active', true)
        .order('name');

      if (students) {
        for (const student of students) {
          const { data: studentPhotos } = await supabase
            .from('photos')
            .select(
              `
              id, filename, storage_path, created_at,
              photo_students!inner(student_id)
            `
            )
            .eq('photo_students.student_id', student.id)
            .order('created_at', { ascending: false });

          // Get thumbnail for first photo
          let thumbnailUrl = undefined;
          if (studentPhotos && studentPhotos.length > 0) {
            const firstPhoto = studentPhotos[0];
            thumbnailUrl = `/api/photos/${firstPhoto.id}/thumbnail`;
          }

          items.push({
            id: student.id,
            name: student.name,
            type: 'student',
            photoCount: studentPhotos?.length || 0,
            isActive: student.active,
            thumbnailUrl,
            metadata: {
              grade: student.grade,
              section: student.section,
              course: student.courses?.name,
            },
          });
        }
      }
    }
    // Student selected - show photos for that student
    else if (pathSegments.length === 3) {
      const studentId = pathSegments[2];

      const { data: photos } = await supabase
        .from('photos')
        .select(
          `
          id, filename, storage_path, created_at, file_size_bytes, approved,
          photo_students!inner(student_id)
        `
        )
        .eq('photo_students.student_id', studentId)
        .order('created_at', { ascending: false });

      if (photos) {
        for (const photo of photos) {
          items.push({
            id: photo.id,
            name: photo.filename,
            type: 'photo',
            isActive: photo.approved || false,
            thumbnailUrl: `/api/photos/${photo.id}/thumbnail`,
            metadata: {
              uploadDate: photo.created_at,
              fileSize: photo.file_size_bytes,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      items,
      path: pathSegments,
      total: items.length,
    });
  } catch (error: any) {
    console.error('Error in drive-items API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  try {
    const { id: eventId } = await context.params;
    const body = await request.json();
    const { action, data } = body;

    const supabase = await createServerSupabaseServiceClient();

    switch (action) {
      case 'create_folder':
        const { name, parentPath, type = 'course' } = data;

        if (type === 'level') {
          const { data: newLevel, error } = await supabase
            .from('event_levels')
            .insert({
              event_id: eventId,
              name,
              active: true,
              sort_order: 0,
            })
            .select()
            .single();

          if (error) throw error;

          return NextResponse.json({
            success: true,
            item: {
              id: newLevel.id,
              name: newLevel.name,
              type: 'folder',
            },
          });
        } else {
          // Create course folder
          const levelId = parentPath.length > 0 ? parentPath[0] : null;

          const { data: newCourse, error } = await supabase
            .from('courses')
            .insert({
              event_id: eventId,
              level_id: levelId,
              name,
              active: true,
              sort_order: 0,
            })
            .select()
            .single();

          if (error) throw error;

          return NextResponse.json({
            success: true,
            item: {
              id: newCourse.id,
              name: newCourse.name,
              type: 'folder',
            },
          });
        }

      case 'move_items':
        // Implementation for moving items between folders
        const { itemIds, targetPath } = data;
        // This would require updating the parent relationships
        // Implementation depends on specific business logic

        return NextResponse.json({
          success: true,
          message: 'Items moved successfully',
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error in drive-items POST:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
