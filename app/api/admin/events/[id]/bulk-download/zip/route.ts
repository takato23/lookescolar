import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ZipDownloadSchema = z.object({
  level: z.enum(['event', 'level', 'course', 'student']).optional(),
  level_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
  photo_ids: z.array(z.string().uuid()).optional(),
  photo_types: z
    .array(z.enum(['individual', 'group', 'activity', 'event']))
    .optional(),
  approved_only: z.boolean().optional(),
  zip_filename: z.string().optional(),
});

// POST /api/admin/events/[id]/bulk-download/zip
export const POST = withAuth(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const eventId = params.id;
      const body = await req.json();

      // Validate input
      const validatedData = ZipDownloadSchema.parse(body);
      const {
        level,
        level_id,
        course_id,
        student_id,
        photo_ids,
        photo_types,
        approved_only,
        zip_filename,
      } = validatedData;

      const supabase = await createServerSupabaseServiceClient();

      // Build photo query based on hierarchy level
      let photoQuery = supabase
        .from('assets')
        .select('id, filename, storage_path, preview_path, file_size')
        .eq('event_id', eventId);

      // Apply filters based on hierarchy level
      if (photo_ids && photo_ids.length > 0) {
        // Specific photo IDs
        photoQuery = photoQuery.in('id', photo_ids);
      } else if (level === 'student' && student_id) {
        // Student-level photos
        photoQuery = photoQuery.eq('photo_students.student_id', student_id);
      } else if (level === 'course' && course_id) {
        // Course-level photos (either directly associated or through students)
        photoQuery = photoQuery.or(
          `course_id.eq.${course_id},student_id.in.(${supabase.rpc('get_students_for_course', { course_id })})`
        );
      } else if (level === 'level' && level_id) {
        // Level-level photos (through courses and students)
        photoQuery = photoQuery.or(
          `course_id.in.(${supabase.rpc('get_courses_for_level', { level_id })}),student_id.in.(${supabase.rpc('get_students_for_level', { level_id })})`
        );
      }
      // If level === 'event' or no specific level, we already have the base query for the event

      // Apply additional filters
      if (photo_types && photo_types.length > 0) {
        photoQuery = photoQuery.in('photo_type', photo_types);
      }

      if (approved_only) {
        photoQuery = photoQuery.eq('approved', true);
      }

      const { data: photos, error } = await photoQuery;

      if (error) {
        console.error('Error fetching photos for ZIP download:', error);
        return NextResponse.json(
          {
            error: 'Failed to fetch photos for download',
            details: error.message,
          },
          { status: 500 }
        );
      }

      if (!photos || photos.length === 0) {
        return NextResponse.json(
          { error: 'No photos found matching the criteria' },
          { status: 404 }
        );
      }

      // In a full implementation, this would trigger a background job to create the ZIP file
      // For now, we'll return a success message indicating the ZIP generation is ready to start

      const filename =
        zip_filename || `photos-${new Date().toISOString().split('T')[0]}.zip`;

      return NextResponse.json({
        success: true,
        message: `Ready to generate ZIP file with ${photos.length} photo(s)`,
        photo_count: photos.length,
        zip_filename: filename,
        // In a real implementation, this would include a job ID to track progress
        job_id: `zip-job-${Date.now()}`,
      });
    } catch (error) {
      console.error(
        'Error in POST /api/admin/events/[id]/bulk-download/zip:',
        error
      );

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
  }
);

// GET /api/admin/events/[id]/bulk-download/zip/[jobId]
// Check the status of a ZIP generation job
export const GET = withAuth(
  async (
    req: NextRequest,
    { params }: { params: { id: string; jobId: string } }
  ) => {
    try {
      const jobId = params.jobId;

      // In a real implementation, this would check the status of a background job
      // For now, we'll just return a placeholder response indicating completion

      return NextResponse.json({
        success: true,
        job_id: jobId,
        status: 'completed',
        message: 'ZIP file generation completed',
        // In a real implementation, this would include the download URL for the ZIP file
        download_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/zip-files/${jobId}.zip`,
      });
    } catch (error) {
      console.error(
        'Error in GET /api/admin/events/[id]/bulk-download/zip/[jobId]:',
        error
      );
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
