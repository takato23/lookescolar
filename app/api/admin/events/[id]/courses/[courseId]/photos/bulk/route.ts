import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const bulkCoursePhotoActionSchema = z.object({
  action: z.enum([
    'approve',
    'reject',
    'delete',
    'download',
    'remove_from_course',
    'change_type',
  ]),
  photo_ids: z.array(z.string()).min(1, 'At least one photo ID is required'),
  options: z
    .object({
      photo_type: z.enum(['group', 'activity', 'event']).optional(),
      approved: z.boolean().optional(),
    })
    .optional(),
});

// POST /api/admin/events/[id]/courses/[courseId]/photos/bulk
export const POST = withAuth(
  async (
    req: NextRequest, context: RouteContext<{ id: string; courseId: string }>) => {
  const params = await context.params;
  try {
      const eventId = params.id;
      const courseId = params.courseId;
      const body = await req.json();

      // Validate input
      const validatedData = bulkCoursePhotoActionSchema.parse(body);
      const { action, photo_ids, options = {} } = validatedData;

      const supabase = await createServerSupabaseServiceClient();

      // Verify course exists and belongs to event
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, name, event_id')
        .eq('id', courseId)
        .eq('event_id', eventId)
        .single();

      if (courseError || !course) {
        return NextResponse.json(
          { error: 'Course not found or does not belong to this event' },
          { status: 404 }
        );
      }

      // Verify all photos exist and belong to this course
      const { data: photoAssociations, error: associationsError } =
        await supabase
          .from('photo_courses')
          .select(
            `
        id,
        photo_id,
        course_id,
        photo:photos (
          id,
          filename,
          storage_path,
          approved,
          event_id
        )
      `
          )
          .eq('course_id', courseId)
          .in('photo_id', photo_ids);

      if (associationsError) {
        throw new Error(
          `Failed to verify photos: ${associationsError.message}`
        );
      }

      if (photoAssociations.length !== photo_ids.length) {
        return NextResponse.json(
          { error: 'Some photos not found or do not belong to this course' },
          { status: 400 }
        );
      }

      let result: any = {
        success: true,
        affected_photos: photoAssociations.length,
      };

      switch (action) {
        case 'approve':
          result = await handleCourseApproveReject(supabase, photo_ids, true);
          break;

        case 'reject':
          result = await handleCourseApproveReject(supabase, photo_ids, false);
          break;

        case 'delete':
          result = await handleCourseDelete(supabase, photoAssociations);
          break;

        case 'download':
          result = await handleCourseDownload(supabase, photoAssociations);
          break;

        case 'remove_from_course':
          result = await handleRemoveFromCourse(
            supabase,
            courseId,
            photo_ids,
            course.name
          );
          break;

        case 'change_type':
          if (!options.photo_type) {
            return NextResponse.json(
              { error: 'photo_type is required for change_type action' },
              { status: 400 }
            );
          }
          result = await handleChangePhotoType(
            supabase,
            courseId,
            photo_ids,
            options.photo_type
          );
          break;

        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error(
        'Error in POST /api/admin/events/[id]/courses/[courseId]/photos/bulk:',
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

// Handle approve/reject for course photos
async function handleCourseApproveReject(
  supabase: any,
  photo_ids: string[],
  approved: boolean
) {
  const { error } = await supabase
    .from('assets')
    .update({
      approved,
      updated_at: new Date().toISOString(),
    })
    .in('id', photo_ids);

  if (error) {
    throw new Error(
      `Failed to ${approved ? 'approve' : 'reject'} photos: ${error.message}`
    );
  }

  return {
    success: true,
    message: `Successfully ${approved ? 'approved' : 'rejected'} ${photo_ids.length} photo(s)`,
    affected_photos: photo_ids.length,
  };
}

// Handle delete for course photos
async function handleCourseDelete(supabase: any, photoAssociations: any[]) {
  // Delete photos from storage first
  const storageDeletePromises = photoAssociations.map((association) =>
    supabase.storage.from('assets').remove([association.photo.storage_path])
  );

  await Promise.allSettled(storageDeletePromises);

  // Delete photo-course associations first
  const { error: associationError } = await supabase
    .from('photo_courses')
    .delete()
    .in(
      'id',
      photoAssociations.map((a) => a.id)
    );

  if (associationError) {
    console.warn(
      'Warning: Failed to delete photo-course associations:',
      associationError
    );
  }

  // Delete from photos table
  const { error: photoError } = await supabase
    .from('assets')
    .delete()
    .in(
      'id',
      photoAssociations.map((a) => a.photo.id)
    );

  if (photoError) {
    throw new Error(`Failed to delete photos: ${photoError.message}`);
  }

  return {
    success: true,
    message: `Successfully deleted ${photoAssociations.length} photo(s)`,
    affected_photos: photoAssociations.length,
  };
}

// Handle download for course photos
async function handleCourseDownload(supabase: any, photoAssociations: any[]) {
  const downloadUrls = await Promise.all(
    photoAssociations.map(async (association) => {
      const { data } = await supabase.storage
        .from('assets')
        .createSignedUrl(association.photo.storage_path, 3600); // 1 hour expiry

      return {
        id: association.photo.id,
        filename: association.photo.filename,
        download_url: data?.signedUrl || '',
        association_id: association.id,
      };
    })
  );

  return {
    success: true,
    message: `Generated download URLs for ${photoAssociations.length} photo(s)`,
    download_urls: downloadUrls,
    affected_photos: photoAssociations.length,
  };
}

// Handle remove from course (keep photo, remove association)
async function handleRemoveFromCourse(
  supabase: any,
  courseId: string,
  photo_ids: string[],
  courseName: string
) {
  // Remove photo-course associations
  const { error: deleteError } = await supabase
    .from('photo_courses')
    .delete()
    .eq('course_id', courseId)
    .in('photo_id', photo_ids);

  if (deleteError) {
    throw new Error(
      `Failed to remove photo associations: ${deleteError.message}`
    );
  }

  // Clear course_id from photos if no other associations exist
  for (const photoId of photo_ids) {
    const { count } = await supabase
      .from('photo_courses')
      .select('*', { count: 'exact', head: true })
      .eq('photo_id', photoId);

    if (count === 0) {
      await supabase
        .from('assets')
        .update({
          course_id: null,
          photo_type: 'individual',
          updated_at: new Date().toISOString(),
        })
        .eq('id', photoId);
    }
  }

  return {
    success: true,
    message: `Successfully removed ${photo_ids.length} photo(s) from course ${courseName}`,
    course_name: courseName,
    affected_photos: photo_ids.length,
  };
}

// Handle change photo type for course photos
async function handleChangePhotoType(
  supabase: any,
  courseId: string,
  photo_ids: string[],
  photo_type: string
) {
  // Update photo_courses associations
  const { error: associationError } = await supabase
    .from('photo_courses')
    .update({ photo_type })
    .eq('course_id', courseId)
    .in('photo_id', photo_ids);

  if (associationError) {
    throw new Error(
      `Failed to update photo type in associations: ${associationError.message}`
    );
  }

  // Update photos table
  const { error: photoError } = await supabase
    .from('assets')
    .update({
      photo_type,
      updated_at: new Date().toISOString(),
    })
    .in('id', photo_ids);

  if (photoError) {
    console.warn(
      'Warning: Failed to update photo type in photos table:',
      photoError
    );
  }

  return {
    success: true,
    message: `Successfully changed type to ${photo_type} for ${photo_ids.length} photo(s)`,
    photo_type,
    affected_photos: photo_ids.length,
  };
}
