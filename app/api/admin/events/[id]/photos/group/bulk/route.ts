import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const bulkPhotoActionSchema = z.object({
  action: z.enum([
    'approve',
    'reject',
    'delete',
    'download',
    'move_to_course',
    'set_type',
  ]),
  photo_ids: z.array(z.string()).min(1, 'At least one photo ID is required'),
  options: z
    .object({
      course_id: z.string().optional(),
      photo_type: z.enum(['group', 'activity', 'event']).optional(),
      approved: z.boolean().optional(),
    })
    .optional(),
});

// POST /api/admin/events/[id]/photos/group/bulk
export const POST = withAuth(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const eventId = params.id;
      const body = await req.json();

      // Validate input
      const validatedData = bulkPhotoActionSchema.parse(body);
      const { action, photo_ids, options = {} } = validatedData;

      const supabase = await createServerSupabaseServiceClient();

      // Verify all photos exist and belong to this event
      const { data: photos, error: photosError } = await supabase
        .from('assets')
        .select('id, filename, storage_path, course_id, approved')
        .eq('event_id', eventId)
        .in('id', photo_ids);

      if (photosError) {
        throw new Error(`Failed to verify photos: ${photosError.message}`);
      }

      if (photos.length !== photo_ids.length) {
        return NextResponse.json(
          { error: 'Some photos not found or do not belong to this event' },
          { status: 400 }
        );
      }

      let result: any = { success: true, affected_photos: photos.length };

      switch (action) {
        case 'approve':
          result = await handleApproveReject(supabase, photo_ids, true);
          break;

        case 'reject':
          result = await handleApproveReject(supabase, photo_ids, false);
          break;

        case 'delete':
          result = await handleDelete(supabase, photos);
          break;

        case 'download':
          result = await handleDownload(supabase, photos);
          break;

        case 'move_to_course':
          if (!options.course_id) {
            return NextResponse.json(
              { error: 'course_id is required for move_to_course action' },
              { status: 400 }
            );
          }
          result = await handleMoveToCourse(
            supabase,
            photo_ids,
            options.course_id
          );
          break;

        case 'set_type':
          if (!options.photo_type) {
            return NextResponse.json(
              { error: 'photo_type is required for set_type action' },
              { status: 400 }
            );
          }
          result = await handleSetType(supabase, photo_ids, options.photo_type);
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
        'Error in POST /api/admin/events/[id]/photos/group/bulk:',
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

// Handle approve/reject
async function handleApproveReject(
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

// Handle delete
async function handleDelete(supabase: any, photos: any[]) {
  // Delete photos from storage first
  const storageDeletePromises = photos.map((photo) =>
    supabase.storage.from('assets').remove([photo.storage_path])
  );

  await Promise.allSettled(storageDeletePromises);

  // Delete from database
  const { error } = await supabase
    .from('assets')
    .delete()
    .in(
      'id',
      photos.map((p) => p.id)
    );

  if (error) {
    throw new Error(`Failed to delete photos: ${error.message}`);
  }

  return {
    success: true,
    message: `Successfully deleted ${photos.length} photo(s)`,
    affected_photos: photos.length,
  };
}

// Handle download (generate signed URLs for bulk download)
async function handleDownload(supabase: any, photos: any[]) {
  const downloadUrls = await Promise.all(
    photos.map(async (photo) => {
      const { data } = await supabase.storage
        .from('assets')
        .createSignedUrl(photo.storage_path, 3600); // 1 hour expiry

      return {
        id: photo.id,
        filename: photo.filename,
        download_url: data?.signedUrl || '',
      };
    })
  );

  return {
    success: true,
    message: `Generated download URLs for ${photos.length} photo(s)`,
    download_urls: downloadUrls,
    affected_photos: photos.length,
  };
}

// Handle move to course
async function handleMoveToCourse(
  supabase: any,
  photo_ids: string[],
  course_id: string
) {
  // Verify course exists
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, name')
    .eq('id', course_id)
    .single();

  if (courseError || !course) {
    throw new Error('Course not found');
  }

  // Update photos
  const { error } = await supabase
    .from('assets')
    .update({
      course_id,
      updated_at: new Date().toISOString(),
    })
    .in('id', photo_ids);

  if (error) {
    throw new Error(`Failed to move photos to course: ${error.message}`);
  }

  // Update photo_courses associations
  for (const photo_id of photo_ids) {
    await supabase.from('photo_courses').upsert({
      photo_id,
      course_id,
      photo_type: 'group',
      tagged_at: new Date().toISOString(),
    });
  }

  return {
    success: true,
    message: `Successfully moved ${photo_ids.length} photo(s) to course ${course.name}`,
    course: course,
    affected_photos: photo_ids.length,
  };
}

// Handle set photo type
async function handleSetType(
  supabase: any,
  photo_ids: string[],
  photo_type: string
) {
  const { error } = await supabase
    .from('assets')
    .update({
      photo_type,
      updated_at: new Date().toISOString(),
    })
    .in('id', photo_ids);

  if (error) {
    throw new Error(`Failed to set photo type: ${error.message}`);
  }

  // Update photo_courses associations
  for (const photo_id of photo_ids) {
    await supabase
      .from('photo_courses')
      .update({ photo_type })
      .eq('photo_id', photo_id);
  }

  return {
    success: true,
    message: `Successfully set type to ${photo_type} for ${photo_ids.length} photo(s)`,
    photo_type,
    affected_photos: photo_ids.length,
  };
}
