import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const photosQuerySchema = z.object({
  event_id: z.string().nullable().optional(),
  level_id: z.string().nullable().optional(),
  course_id: z.string().nullable().optional(),
  student_id: z.string().nullable().optional(),
  page: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: z.string().nullable().optional(),
  approved: z.coerce.boolean().optional(),
  tagged: z.coerce.boolean().optional(),
  date_from: z.string().nullable().optional(),
  date_to: z.string().nullable().optional(),
  sort_by: z
    .enum(['created_at', 'original_filename', 'file_size'])
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/admin/gallery/photos - Get photos with hierarchy filtering
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);

    // Validate query parameters
    const rawParams = {
      event_id: searchParams.get('event_id'),
      level_id: searchParams.get('level_id'),
      course_id: searchParams.get('course_id'),
      student_id: searchParams.get('student_id'),
      page: searchParams.get('page') || '0',
      limit: searchParams.get('limit') || '50',
      search: searchParams.get('search'),
      approved: searchParams.get('approved'),
      tagged: searchParams.get('tagged'),
      date_from: searchParams.get('date_from'),
      date_to: searchParams.get('date_to'),
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: searchParams.get('sort_order') || 'desc',
    };

    const query = photosQuerySchema.parse(rawParams);

    const supabase = await createServerSupabaseServiceClient();
    const offset = query.page * query.limit;

    // Build photos query based on hierarchy context
    let photosQuery;

    if (query.student_id) {
      // Student-specific photos
      photosQuery = supabase
        .from('photo_subjects')
        .select(
          `
          photos!inner(
            id, original_filename, storage_path, preview_path, watermark_path,
            file_size, width, height, approved, created_at,
            event_id, metadata,
            events!inner(id, name, school)
          )
        `,
          { count: 'exact' }
        )
        .eq('student_id', query.student_id);
    } else if (query.course_id) {
      // Course-specific photos (through students)
      photosQuery = supabase
        .from('photos')
        .select(
          `
          id, original_filename, storage_path, preview_path, watermark_path,
          file_size, width, height, approved, created_at,
          event_id, metadata,
          events!inner(id, name, school),
          photo_subjects!left(
            subjects!inner(id, name, course_id)
          )
        `,
          { count: 'exact' }
        )
        .eq('photo_subjects.subjects.course_id', query.course_id);
    } else {
      // General photos query
      photosQuery = supabase.from('photos').select(
        `
          id, original_filename, storage_path, preview_path, watermark_path,
          file_size, width, height, approved, created_at,
          event_id, metadata,
          events!inner(id, name, school),
          photo_subjects!left(
            subjects!inner(id, name)
          )
        `,
        { count: 'exact' }
      );
    }

    // Apply event filter if specified
    if (query.event_id) {
      if (query.student_id) {
        photosQuery = photosQuery.eq('photos.event_id', query.event_id);
      } else {
        photosQuery = photosQuery.eq('event_id', query.event_id);
      }
    }

    // Apply other filters
    if (query.search) {
      if (query.student_id) {
        photosQuery = photosQuery.ilike(
          'photos.original_filename',
          `%${query.search}%`
        );
      } else {
        photosQuery = photosQuery.ilike(
          'original_filename',
          `%${query.search}%`
        );
      }
    }

    if (query.approved !== undefined) {
      if (query.student_id) {
        photosQuery = photosQuery.eq('photos.approved', query.approved);
      } else {
        photosQuery = photosQuery.eq('approved', query.approved);
      }
    }

    if (query.date_from) {
      if (query.student_id) {
        photosQuery = photosQuery.gte('photos.created_at', query.date_from);
      } else {
        photosQuery = photosQuery.gte('created_at', query.date_from);
      }
    }

    if (query.date_to) {
      if (query.student_id) {
        photosQuery = photosQuery.lte('photos.created_at', query.date_to);
      } else {
        photosQuery = photosQuery.lte('created_at', query.date_to);
      }
    }

    // Apply sorting
    const sortColumn = query.student_id
      ? `photos.${query.sort_by}`
      : query.sort_by;
    photosQuery = photosQuery.order(sortColumn, {
      ascending: query.sort_order === 'asc',
    });

    // Apply pagination
    photosQuery = photosQuery.range(offset, offset + query.limit - 1);

    const { data: rawPhotos, error, count } = await photosQuery;

    if (error) {
      console.error('Error fetching photos:', error);
      throw error;
    }

    // Transform data based on query type
    let photos;
    if (query.student_id) {
      photos =
        rawPhotos?.map((item: any) => ({
          ...item.photos,
          event: item.photos.events,
          subject: null, // Will be filled by student info
        })) || [];
    } else {
      photos =
        rawPhotos?.map((photo: any) => ({
          ...photo,
          event: photo.events,
          subject: photo.photo_subjects?.[0]?.subjects || null,
        })) || [];
    }

    const total = count || 0;
    const hasMore = total > offset + query.limit;

    return NextResponse.json({
      photos,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        hasMore,
        nextPage: hasMore ? query.page + 1 : null,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/gallery/photos:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
