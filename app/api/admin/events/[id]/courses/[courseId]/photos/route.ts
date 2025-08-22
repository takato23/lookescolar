import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const uploadGroupPhotoSchema = z.object({
  photo_ids: z.array(z.string()).min(1, 'At least one photo ID is required'),
  photo_type: z.enum(['group', 'activity', 'event']).default('group'),
});

const queryParamsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
  limit: z.string().optional().transform(val => val ? Math.min(parseInt(val, 10), 100) : 50),
  photo_type: z.enum(['group', 'activity', 'event']).optional(),
  approved: z.enum(['true', 'false']).optional(),
});

// GET /api/admin/events/[id]/courses/[courseId]/photos - Get group photos for a course
export const GET = withAuth(async (req: NextRequest, { params }: { params: { id: string; courseId: string } }) => {
  try {
    const eventId = params.id;
    const courseId = params.courseId;
    const { searchParams } = new URL(req.url);
    
    const queryParams = queryParamsSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      photo_type: searchParams.get('photo_type'),
      approved: searchParams.get('approved'),
    });

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

    // Build query for group photos
    let query = supabase
      .from('photo_courses')
      .select(`
        id,
        photo_id,
        course_id,
        photo_type,
        tagged_at,
        tagged_by,
        photo:photos (
          id,
          filename,
          storage_path,
          photo_type,
          approved,
          file_size_bytes,
          metadata,
          created_at
        )
      `, { count: 'exact' })
      .eq('course_id', courseId);

    // Apply filters
    if (queryParams.photo_type) {
      query = query.eq('photo_type', queryParams.photo_type);
    }

    if (queryParams.approved !== undefined) {
      query = query.eq('photo.approved', queryParams.approved === 'true');
    }

    // Apply pagination
    const offset = queryParams.page * queryParams.limit;
    query = query
      .order('tagged_at', { ascending: false })
      .range(offset, offset + queryParams.limit - 1);

    const { data: photoAssociations, error, count } = await query;

    if (error) {
      console.error('Error fetching course photos:', error);
      return NextResponse.json(
        { error: 'Failed to fetch course photos', details: error.message },
        { status: 500 }
      );
    }

    // Process photos with preview URLs
    const processedPhotos = await Promise.all((photoAssociations || []).map(async (association) => {
      const photo = association.photo;
      
      // Generate signed URL for preview
      const { data: signedUrlData } = await supabase.storage
        .from('photos')
        .createSignedUrl(photo.storage_path, 3600); // 1 hour expiry

      return {
        id: photo.id,
        filename: photo.filename,
        storage_path: photo.storage_path,
        preview_url: signedUrlData?.signedUrl || '',
        photo_type: association.photo_type,
        course_id: courseId,
        event_id: eventId,
        approved: photo.approved,
        file_size_bytes: photo.file_size_bytes,
        metadata: photo.metadata,
        created_at: photo.created_at,
        tagged_at: association.tagged_at,
        tagged_by: association.tagged_by,
        association_id: association.id,
      };
    }));

    const totalCount = count || processedPhotos.length;
    const hasMore = totalCount > (queryParams.page + 1) * queryParams.limit;

    return NextResponse.json({
      course: {
        id: course.id,
        name: course.name,
        event_id: course.event_id,
      },
      photos: processedPhotos,
      pagination: {
        page: queryParams.page,
        limit: queryParams.limit,
        total: totalCount,
        has_more: hasMore,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/events/[id]/courses/[courseId]/photos:', error);
    
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

// POST /api/admin/events/[id]/courses/[courseId]/photos - Associate existing photos with course as group photos
export const POST = withAuth(async (req: NextRequest, { params }: { params: { id: string; courseId: string } }) => {
  try {
    const eventId = params.id;
    const courseId = params.courseId;
    const body = await req.json();

    // Validate input
    const validatedData = uploadGroupPhotoSchema.parse(body);
    const { photo_ids, photo_type } = validatedData;

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

    // Verify all photos exist and belong to this event
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id, filename, storage_path, approved')
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

    // Create photo-course associations
    const associations = photo_ids.map(photoId => ({
      photo_id: photoId,
      course_id: courseId,
      photo_type,
      tagged_at: new Date().toISOString(),
      // tagged_by would come from auth context if available
    }));

    const { data: createdAssociations, error: associationError } = await supabase
      .from('photo_courses')
      .upsert(associations, {
        onConflict: 'photo_id,course_id,photo_type',
        ignoreDuplicates: false
      })
      .select();

    if (associationError) {
      console.error('Error creating photo-course associations:', associationError);
      return NextResponse.json(
        { error: 'Failed to associate photos with course', details: associationError.message },
        { status: 500 }
      );
    }

    // Update photos to set course_id and photo_type
    const { error: updateError } = await supabase
      .from('photos')
      .update({
        course_id: courseId,
        photo_type,
        updated_at: new Date().toISOString(),
      })
      .in('id', photo_ids);

    if (updateError) {
      console.warn('Warning: Failed to update photos with course_id:', updateError);
      // Don't fail the request for this non-critical update
    }

    return NextResponse.json({
      success: true,
      message: `Successfully associated ${photo_ids.length} photo(s) with course ${course.name} as ${photo_type} photos`,
      course: {
        id: course.id,
        name: course.name,
      },
      photo_type,
      associations: createdAssociations,
      photos_count: photo_ids.length,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/events/[id]/courses/[courseId]/photos:', error);
    
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

// DELETE /api/admin/events/[id]/courses/[courseId]/photos - Remove photo associations from course
export const DELETE = withAuth(async (req: NextRequest, { params }: { params: { id: string; courseId: string } }) => {
  try {
    const eventId = params.id;
    const courseId = params.courseId;
    const { searchParams } = new URL(req.url);
    
    const photoIds = searchParams.get('photo_ids')?.split(',') || [];
    
    if (photoIds.length === 0) {
      return NextResponse.json(
        { error: 'photo_ids parameter is required' },
        { status: 400 }
      );
    }

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

    // Remove photo-course associations
    const { error: deleteError } = await supabase
      .from('photo_courses')
      .delete()
      .eq('course_id', courseId)
      .in('photo_id', photoIds);

    if (deleteError) {
      console.error('Error removing photo-course associations:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove photo associations', details: deleteError.message },
        { status: 500 }
      );
    }

    // Optionally clear course_id from photos if no other associations exist
    for (const photoId of photoIds) {
      const { count } = await supabase
        .from('photo_courses')
        .select('*', { count: 'exact', head: true })
        .eq('photo_id', photoId);

      if (count === 0) {
        await supabase
          .from('photos')
          .update({
            course_id: null,
            photo_type: 'individual',
            updated_at: new Date().toISOString(),
          })
          .eq('id', photoId);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${photoIds.length} photo association(s) from course ${course.name}`,
      course: {
        id: course.id,
        name: course.name,
      },
      removed_photos: photoIds.length,
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/events/[id]/courses/[courseId]/photos:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});