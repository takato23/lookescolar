import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const GalleryStatsQuerySchema = z.object({
  level_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
});

// GET /api/admin/events/[id]/stats/gallery
export const GET = withAuth(
  async (req: NextRequest, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  try {
      const eventId = params.id;
      const { searchParams } = new URL(req.url);

      // Parse and validate query parameters
      const queryResult = GalleryStatsQuerySchema.safeParse({
        level_id: searchParams.get('level_id') || undefined,
        course_id: searchParams.get('course_id') || undefined,
        student_id: searchParams.get('student_id') || undefined,
      });

      if (!queryResult.success) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: queryResult.error.errors,
          },
          { status: 400 }
        );
      }

      const { level_id, course_id, student_id } = queryResult.data;

      const supabase = await createServerSupabaseServiceClient();

      // Build the photo query based on hierarchy level
      let photoQuery = supabase
        .from('assets')
        .select(
          `
        id,
        filename,
        storage_path,
        preview_path,
        file_size,
        taken_at,
        created_at,
        approved,
        photo_type,
        photo_students (
          id,
          student_id,
          students (
            id,
            name,
            grade,
            section
          )
        ),
        photo_courses (
          id,
          course_id,
          courses (
            id,
            name,
            grade,
            section
          )
        )
      `
        )
        .in('folder_id', [eventId]); // Simplified - will need folder lookup later

      // Apply filters based on hierarchy level
      if (student_id) {
        // Student-level photos
        photoQuery = photoQuery.eq('photo_students.student_id', student_id);
      } else if (course_id) {
        // Course-level photos (either directly associated or through students)
        photoQuery = photoQuery.or(
          `course_id.eq.${course_id},student_id.in.(${supabase.rpc('get_students_for_course', { course_id })})`
        );
      } else if (level_id) {
        // Level-level photos (through courses and students)
        photoQuery = photoQuery.or(
          `course_id.in.(${supabase.rpc('get_courses_for_level', { level_id })}),student_id.in.(${supabase.rpc('get_students_for_level', { level_id })})`
        );
      }
      // If no specific level, we already have the base query for the event

      const { data: photos, error } = await photoQuery;

      if (error) {
        console.error('Error fetching gallery photos for stats:', error);
        return NextResponse.json(
          {
            error: 'Failed to fetch photos for statistics',
            details: error.message,
          },
          { status: 500 }
        );
      }

      // Calculate statistics
      const total_photos = photos?.length || 0;
      const approved_photos = photos?.filter((p) => p.approved).length || 0;
      const individual_photos =
        photos?.filter((p) => p.photo_type === 'individual').length || 0;
      const group_photos =
        photos?.filter((p) => p.photo_type === 'group').length || 0;
      const activity_photos =
        photos?.filter((p) => p.photo_type === 'activity').length || 0;
      const event_photos =
        photos?.filter((p) => p.photo_type === 'event').length || 0;

      // Group by grade (if available)
      const by_grade: Record<string, number> = {};
      if (photos) {
        photos.forEach((photo) => {
          // Check student grades
          photo.photo_students?.forEach((ps) => {
            if (ps.students?.grade) {
              by_grade[ps.students.grade] =
                (by_grade[ps.students.grade] || 0) + 1;
            }
          });

          // Check course grades
          photo.photo_courses?.forEach((pc) => {
            if (pc.courses?.grade) {
              by_grade[pc.courses.grade] =
                (by_grade[pc.courses.grade] || 0) + 1;
            }
          });
        });
      }

      // Group by date (created_at)
      const by_date: Array<{ date: string; count: number }> = [];
      if (photos) {
        const dateCounts: Record<string, number> = {};

        photos.forEach((photo) => {
          const date = new Date(photo.created_at).toISOString().split('T')[0];
          dateCounts[date] = (dateCounts[date] || 0) + 1;
        });

        // Convert to array and sort by date
        Object.entries(dateCounts).forEach(([date, count]) => {
          by_date.push({ date, count });
        });

        by_date.sort((a, b) => a.date.localeCompare(b.date));
      }

      return NextResponse.json({
        success: true,
        stats: {
          total_photos,
          approved_photos,
          individual_photos,
          group_photos,
          activity_photos,
          event_photos,
          by_grade: Object.keys(by_grade).length > 0 ? by_grade : undefined,
          by_date: by_date.length > 0 ? by_date : undefined,
        },
      });
    } catch (error) {
      console.error(
        'Error in GET /api/admin/events/[id]/stats/gallery:',
        error
      );
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
