import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/admin/events/[id]/photos/group
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const eventId = params.id;
      const { searchParams } = new URL(req.url);

      const courseId = searchParams.get('course_id');
      const search = searchParams.get('search');
      const photoType = searchParams.get('photo_type');
      const approved = searchParams.get('approved');
      const page = parseInt(searchParams.get('page') || '0');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

      const supabase = await createServerSupabaseServiceClient();

      // Build query for group photos
      let query = supabase
        .from('assets')
        .select(
          `
        id,
        filename,
        storage_path,
        photo_type,
        approved,
        file_size_bytes,
        metadata,
        created_at,
        course_id,
        courses!left (
          id,
          name,
          grade,
          section,
          event_levels!left (
            name
          )
        ),
        photo_courses!left (
          photo_type,
          tagged_at,
          tagged_by
        )
      `,
          { count: 'exact' }
        )
        .eq('event_id', eventId)
        .not('course_id', 'is', null); // Only photos associated with courses

      // Apply filters
      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      if (search) {
        query = query.or(`filename.ilike.%${search}%`);
      }

      if (photoType) {
        query = query.eq('photo_type', photoType);
      }

      if (approved !== null && approved !== undefined) {
        query = query.eq('approved', approved === 'true');
      }

      // Apply pagination
      const offset = page * limit;
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: photos, error, count } = await query;

      if (error) {
        console.error('Error fetching group photos:', error);
        return NextResponse.json(
          { error: 'Failed to fetch group photos', details: error.message },
          { status: 500 }
        );
      }

      // Process photos with preview URLs
      const processedPhotos = await Promise.all(
        (photos || []).map(async (photo) => {
          // Generate signed URL for preview
          const { data: signedUrlData } = await supabase.storage
            .from('assets')
            .createSignedUrl(photo.storage_path, 3600); // 1 hour expiry

          const photoTagging = photo.photo_courses?.[0];

          return {
            id: photo.id,
            filename: photo.filename,
            storage_path: photo.storage_path,
            preview_url: signedUrlData?.signedUrl || '',
            photo_type: photo.photo_type || 'group',
            course_id: photo.course_id,
            course_name: photo.courses?.name || 'Unknown Course',
            level_name: photo.courses?.event_levels?.name,
            event_id: eventId,
            approved: photo.approved,
            file_size_bytes: photo.file_size_bytes,
            metadata: photo.metadata,
            created_at: photo.created_at,
            tagged_at: photoTagging?.tagged_at,
            tagged_by: photoTagging?.tagged_by,
          };
        })
      );

      const totalCount = count || processedPhotos.length;
      const hasMore = totalCount > (page + 1) * limit;

      return NextResponse.json({
        photos: processedPhotos,
        pagination: {
          page,
          limit,
          total: totalCount,
          has_more: hasMore,
        },
      });
    } catch (error) {
      console.error('Error in GET /api/admin/events/[id]/photos/group:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
