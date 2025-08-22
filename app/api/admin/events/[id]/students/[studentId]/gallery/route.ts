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

// GET /api/admin/events/[id]/students/[studentId]/gallery
export const GET = withAuth(async (req: NextRequest, { params }: { params: { id: string, studentId: string } }) => {
  try {
    const eventId = params.id;
    const studentId = params.studentId;
    const { searchParams } = new URL(req.url);
    
    // Parse and validate query parameters
    const queryResult = GalleryQuerySchema.safeParse({
      page: parseInt(searchParams.get('page') || '0'),
      limit: parseInt(searchParams.get('limit') || '50'),
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: searchParams.get('sort_order') || 'desc',
      search: searchParams.get('search') || undefined,
      photo_type: searchParams.get('photo_type') || undefined,
      approved: searchParams.get('approved') ? searchParams.get('approved') === 'true' : undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const { page, limit, sort_by, sort_order, search, photo_type, approved } = queryResult.data;
    const offset = page * limit;

    const supabase = await createServerSupabaseServiceClient();

    // First verify that the student belongs to the event
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        name,
        grade,
        section,
        student_number,
        email,
        parent_name,
        parent_email,
        notes,
        course_id,
        courses (
          id,
          name,
          grade,
          section
        )
      `)
      .eq('id', studentId)
      .eq('event_id', eventId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found or does not belong to this event' },
        { status: 404 }
      );
    }

    // Build the photo query
    let photoQuery = supabase
      .from('photos')
      .select(`
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
          student_id
        )
      `)
      .eq('event_id', eventId)
      .eq('photo_students.student_id', studentId);

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
    photoQuery = photoQuery.order(sortColumn, { ascending: sort_order === 'asc' });

    // Apply pagination
    photoQuery = photoQuery.range(offset, offset + limit - 1);

    const { data: photos, error: photosError, count } = await photoQuery;

    if (photosError) {
      console.error('Error fetching student gallery photos:', photosError);
      return NextResponse.json(
        { error: 'Failed to fetch photos', details: photosError.message },
        { status: 500 }
      );
    }

    // Process photos for response
    const processedPhotos = (photos || []).map(photo => ({
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
    }));

    // Get statistics for the student gallery
    const { data: stats, error: statsError } = await supabase.rpc('get_student_gallery_stats', {
      student_id: studentId
    });

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        grade: student.grade,
        section: student.section,
        student_number: student.student_number,
        email: student.email,
        parent_name: student.parent_name,
        parent_email: student.parent_email,
        notes: student.notes,
        course: student.courses ? {
          id: student.courses.id,
          name: student.courses.name,
          grade: student.courses.grade,
          section: student.courses.section
        } : null
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
        approved_photos: processedPhotos.filter(p => p.approved).length,
      }
    });

  } catch (error) {
    console.error('Error in GET /api/admin/events/[id]/students/[studentId]/gallery:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /api/admin/events/[id]/students/[studentId]/gallery/download
export const POST = withAuth(async (req: NextRequest, { params }: { params: { id: string, studentId: string } }) => {
  try {
    const eventId = params.id;
    const studentId = params.studentId;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action !== 'download') {
      return NextResponse.json(
        { error: 'Invalid action. Use action=download for downloading photos' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { photo_ids } = body;

    const supabase = await createServerSupabaseServiceClient();

    // Verify the student belongs to the event
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('event_id', eventId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found or does not belong to this event' },
        { status: 404 }
      );
    }

    // Get photos for download
    let photoQuery = supabase
      .from('photos')
      .select('id, filename, storage_path')
      .eq('event_id', eventId)
      .eq('photo_students.student_id', studentId);

    if (photo_ids && Array.isArray(photo_ids) && photo_ids.length > 0) {
      // Filter by specific photo IDs
      photoQuery = photoQuery.in('id', photo_ids);
    }

    const { data: photos, error: photosError } = await photoQuery;

    if (photosError) {
      console.error('Error fetching photos for download:', photosError);
      return NextResponse.json(
        { error: 'Failed to fetch photos for download', details: photosError.message },
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
      download_urls: downloadUrls.filter(url => url.download_url), // Filter out failed URLs
    });

  } catch (error) {
    console.error('Error in POST /api/admin/events/[id]/students/[studentId]/gallery/download:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});