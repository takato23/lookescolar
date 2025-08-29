import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const GalleryQuerySchema = z.object({
  page: z.number().min(0).default(0),
  limit: z.number().min(1).max(500).default(50),
  sort_by: z.enum(['created_at', 'taken_at', 'filename']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  photo_type: z.enum(['individual', 'group', 'activity', 'event']).optional(),
  approved: z.boolean().optional(),
});

// GET /api/admin/events/[id]/levels/[levelId]/gallery
export const GET = withAuth(
  async (
    req: NextRequest,
    { params }: { params: { id: string; levelId: string } }
  ) => {
    try {
      const eventId = params.id;
      const levelId = params.levelId;
      const { searchParams } = new URL(req.url);

      // Parse and validate query parameters
      const queryResult = GalleryQuerySchema.safeParse({
        page: parseInt(searchParams.get('page') || '0'),
        limit: parseInt(searchParams.get('limit') || '50'),
        sort_by: searchParams.get('sort_by') || 'created_at',
        sort_order: searchParams.get('sort_order') || 'desc',
        search: searchParams.get('search') || undefined,
        photo_type: searchParams.get('photo_type') || undefined,
        approved: searchParams.get('approved')
          ? searchParams.get('approved') === 'true'
          : undefined,
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

      const { page, limit, sort_by, sort_order, search, photo_type, approved } =
        queryResult.data;
      const offset = page * limit;

      const supabase = await createServerSupabaseServiceClient();

      // First verify that the level belongs to the event
      const { data: level, error: levelError } = await supabase
        .from('event_levels')
        .select('id, name, event_id')
        .eq('id', levelId)
        .eq('event_id', eventId)
        .single();

      if (levelError || !level) {
        return NextResponse.json(
          { error: 'Level not found or does not belong to this event' },
          { status: 404 }
        );
      }

      // Build the photo query
      let photoQuery = supabase
        .from('photos')
        .select(
          `
        id,
        filename,
        storage_path,
        preview_path,
        file_size,
        width,
        height,
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
        .eq('event_id', eventId);

      // Join with courses that belong to this level
      photoQuery = photoQuery.or(
        `course_id.in.(${supabase.rpc('get_courses_for_level', { level_id: levelId })}),student_id.in.(${supabase.rpc('get_students_for_level', { level_id: levelId })})`
      );

      // Apply filters
      if (photo_type) {
        photoQuery = photoQuery.eq('photo_type', photo_type);
      }

      if (approved !== undefined) {
        photoQuery = photoQuery.eq('approved', approved);
      }

      if (search) {
        photoQuery = photoQuery.ilike('filename', `%${search}%`);
      }

      // Apply sorting
      const sortColumn = sort_by === 'taken_at' ? 'taken_at' : 'created_at';
      photoQuery = photoQuery.order(sortColumn, {
        ascending: sort_order === 'asc',
      });

      // Apply pagination
      photoQuery = photoQuery.range(offset, offset + limit - 1);

      const { data: photos, error: photosError, count } = await photoQuery;

      if (photosError) {
        console.error('Error fetching level gallery photos:', photosError);
        return NextResponse.json(
          { error: 'Failed to fetch photos', details: photosError.message },
          { status: 500 }
        );
      }

      // Process photos for response
      const processedPhotos = (photos || []).map((photo) => ({
        id: photo.id,
        filename: photo.filename,
        preview_url: photo.preview_path
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.preview_path}`
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path}`,
        file_size: photo.file_size,
        width: photo.width,
        height: photo.height,
        taken_at: photo.taken_at,
        created_at: photo.created_at,
        approved: photo.approved,
        photo_type: photo.photo_type,
        tagged_students:
          photo.photo_students?.map((ps) => ps.students).filter(Boolean) || [],
        tagged_courses:
          photo.photo_courses?.map((pc) => pc.courses).filter(Boolean) || [],
      }));

      // Get statistics for the level gallery
      const { data: stats, error: statsError } = await supabase.rpc(
        'get_level_gallery_stats',
        {
          level_id: levelId,
        }
      );

      return NextResponse.json({
        success: true,
        level: {
          id: level.id,
          name: level.name,
        },
        photos: processedPhotos,
        pagination: {
          page,
          limit,
          total: count || processedPhotos.length,
          has_more: (count || 0) > (page + 1) * limit,
        },
        stats: stats || {
          total_photos: processedPhotos.length,
          approved_photos: processedPhotos.filter((p) => p.approved).length,
          individual_photos: processedPhotos.filter(
            (p) => p.photo_type === 'individual'
          ).length,
          group_photos: processedPhotos.filter((p) => p.photo_type === 'group')
            .length,
        },
      });
    } catch (error) {
      console.error(
        'Error in GET /api/admin/events/[id]/levels/[levelId]/gallery:',
        error
      );
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

// POST /api/admin/events/[id]/levels/[levelId]/gallery/download
export const POST = withAuth(
  async (
    req: NextRequest,
    { params }: { params: { id: string; levelId: string } }
  ) => {
    try {
      const eventId = params.id;
      const levelId = params.levelId;
      const { searchParams } = new URL(req.url);
      const action = searchParams.get('action');

      if (action !== 'download') {
        return NextResponse.json(
          {
            error: 'Invalid action. Use action=download for downloading photos',
          },
          { status: 400 }
        );
      }

      const body = await req.json();
      const { photo_ids } = body;

      const supabase = await createServerSupabaseServiceClient();

      // Verify the level belongs to the event
      const { data: level, error: levelError } = await supabase
        .from('event_levels')
        .select('id')
        .eq('id', levelId)
        .eq('event_id', eventId)
        .single();

      if (levelError || !level) {
        return NextResponse.json(
          { error: 'Level not found or does not belong to this event' },
          { status: 404 }
        );
      }

      // Get photos for download
      let photoQuery = supabase
        .from('photos')
        .select('id, filename, storage_path')
        .eq('event_id', eventId);

      if (photo_ids && Array.isArray(photo_ids) && photo_ids.length > 0) {
        // Filter by specific photo IDs
        photoQuery = photoQuery.in('id', photo_ids);
      } else {
        // Get all photos for this level
        photoQuery = photoQuery.or(
          `course_id.in.(${supabase.rpc('get_courses_for_level', { level_id: levelId })}),student_id.in.(${supabase.rpc('get_students_for_level', { level_id: levelId })})`
        );
      }

      const { data: photos, error: photosError } = await photoQuery;

      if (photosError) {
        console.error('Error fetching photos for download:', photosError);
        return NextResponse.json(
          {
            error: 'Failed to fetch photos for download',
            details: photosError.message,
          },
          { status: 500 }
        );
      }

      // Generate signed URLs for download
      const downloadUrls = await Promise.all(
        photos.map(async (photo) => {
          const { data } = await supabase.storage
            .from('photos')
            .createSignedUrl(photo.storage_path, 3600); // 1 hour expiry

          return {
            id: photo.id,
            filename: photo.filename,
            download_url: data?.signedUrl || '',
          };
        })
      );

      return NextResponse.json({
        success: true,
        message: `Generated download URLs for ${photos.length} photo(s)`,
        download_urls: downloadUrls.filter((url) => url.download_url), // Filter out failed URLs
      });
    } catch (error) {
      console.error(
        'Error in POST /api/admin/events/[id]/levels/[levelId]/gallery/download:',
        error
      );
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
