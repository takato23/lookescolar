import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

// GET /api/public/gallery/[token]
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const token = (params).token;

    // Validate token format
    if (!token || token.length !== 32) {
      return NextResponse.json(
        { error: 'Invalid gallery share token' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Validate gallery share token
    const { data: validationData, error: validationError } = await supabase.rpc('validate_gallery_share_token', {
      p_token: token,
    });

    if (validationError) {
      console.error('Error validating gallery share token:', validationError);
      return NextResponse.json(
        { error: 'Failed to validate gallery share token', details: validationError.message },
        { status: 500 }
      );
    }

    if (!validationData || !validationData.is_valid) {
      return NextResponse.json(
        { error: 'Invalid or expired gallery share token' },
        { status: 404 }
      );
    }

    // Fetch gallery data based on hierarchy level
    const galleryData: any = {
      share: {
        id: validationData.share_id,
        allow_download: validationData.allow_download,
        allow_share: validationData.allow_share,
        custom_message: validationData.custom_message,
        expires_at: validationData.expires_at,
        view_count: validationData.view_count,
        max_views: validationData.max_views,
        views_remaining: validationData.max_views ? validationData.max_views - validationData.view_count : null,
      },
    };

    // Fetch event information
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, name, school, date')
      .eq('id', validationData.event_id)
      .single();

    if (eventError) {
      console.error('Error fetching event data:', eventError);
      return NextResponse.json(
        { error: 'Failed to fetch event data', details: eventError.message },
        { status: 500 }
      );
    }

    galleryData.event = eventData;

    // Fetch gallery content based on hierarchy level
    if (validationData.student_id) {
      // Student-level gallery
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, name, grade, section, course_id, courses (id, name, grade, section)')
        .eq('id', validationData.student_id)
        .single();

      if (studentError) {
        console.error('Error fetching student data:', studentError);
        return NextResponse.json(
          { error: 'Failed to fetch student data', details: studentError.message },
          { status: 500 }
        );
      }

      galleryData.student = studentData;

      // Fetch student photos
      const { data: photosData, error: photosError } = await supabase
        .from('assets')
        .select(`
          id,
          filename,
          storage_path,
          preview_path,
          watermark_path,
          file_size,
          width,
          height,
          taken_at,
          created_at,
          approved,
          photo_type
        `)
        .eq('event_id', validationData.event_id)
        .eq('photo_students.student_id', validationData.student_id);

      if (photosError) {
        console.error('Error fetching student photos:', photosError);
        return NextResponse.json(
          { error: 'Failed to fetch student photos', details: photosError.message },
          { status: 500 }
        );
      }

      galleryData.photos = (photosData || []).map(photo => ({
        ...photo,
        // For buyer views, prioritize watermarked/lower quality versions
        preview_url: photo.watermark_path
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.watermark_path}`
          : photo.preview_path 
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.preview_path}`
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path}`,
      }));
    } else if (validationData.course_id) {
      // Course-level gallery
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, name, grade, section, level_id, event_levels (id, name)')
        .eq('id', validationData.course_id)
        .single();

      if (courseError) {
        console.error('Error fetching course data:', courseError);
        return NextResponse.json(
          { error: 'Failed to fetch course data', details: courseError.message },
          { status: 500 }
        );
      }

      galleryData.course = courseData;

      // Fetch course photos (either directly associated or through students)
      const { data: photosData, error: photosError } = await supabase
        .from('assets')
        .select(`
          id,
          filename,
          storage_path,
          preview_path,
          watermark_path,
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
          )
        `)
        .eq('event_id', validationData.event_id)
        .or(`course_id.eq.${validationData.course_id},student_id.in.(${supabase.rpc('get_students_for_course', { course_id: validationData.course_id })})`);

      if (photosError) {
        console.error('Error fetching course photos:', photosError);
        return NextResponse.json(
          { error: 'Failed to fetch course photos', details: photosError.message },
          { status: 500 }
        );
      }

      galleryData.photos = (photosData || []).map(photo => ({
        ...photo,
        // For buyer views, prioritize watermarked/lower quality versions
        preview_url: photo.watermark_path
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.watermark_path}`
          : photo.preview_path 
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.preview_path}`
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path}`,
        tagged_students: photo.photo_students?.map(ps => ps.students).filter(Boolean) || [],
      }));
    } else if (validationData.level_id) {
      // Level-level gallery
      const { data: levelData, error: levelError } = await supabase
        .from('event_levels')
        .select('id, name, event_id')
        .eq('id', validationData.level_id)
        .single();

      if (levelError) {
        console.error('Error fetching level data:', levelError);
        return NextResponse.json(
          { error: 'Failed to fetch level data', details: levelError.message },
          { status: 500 }
        );
      }

      galleryData.level = levelData;

      // Fetch level photos (through courses and students)
      const { data: photosData, error: photosError } = await supabase
        .from('assets')
        .select(`
          id,
          filename,
          storage_path,
          preview_path,
          watermark_path,
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
        `)
        .eq('event_id', validationData.event_id)
        .or(`course_id.in.(${supabase.rpc('get_courses_for_level', { level_id: validationData.level_id })}),student_id.in.(${supabase.rpc('get_students_for_level', { level_id: validationData.level_id })})`);

      if (photosError) {
        console.error('Error fetching level photos:', photosError);
        return NextResponse.json(
          { error: 'Failed to fetch level photos', details: photosError.message },
          { status: 500 }
        );
      }

      galleryData.photos = (photosData || []).map(photo => ({
        ...photo,
        // For buyer views, prioritize watermarked/lower quality versions
        preview_url: photo.watermark_path
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.watermark_path}`
          : photo.preview_path 
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.preview_path}`
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path}`,
        tagged_students: photo.photo_students?.map(ps => ps.students).filter(Boolean) || [],
        tagged_courses: photo.photo_courses?.map(pc => pc.courses).filter(Boolean) || [],
      }));
    } else {
      // Event-level gallery
      // Fetch event photos
      const { data: photosData, error: photosError } = await supabase
        .from('assets')
        .select(`
          id,
          filename,
          storage_path,
          preview_path,
          watermark_path,
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
        `)
        .eq('event_id', validationData.event_id);

      if (photosError) {
        console.error('Error fetching event photos:', photosError);
        return NextResponse.json(
          { error: 'Failed to fetch event photos', details: photosError.message },
          { status: 500 }
        );
      }

      galleryData.photos = (photosData || []).map(photo => ({
        ...photo,
        // For buyer views, prioritize watermarked/lower quality versions
        preview_url: photo.watermark_path
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.watermark_path}`
          : photo.preview_path 
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.preview_path}`
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path}`,
        tagged_students: photo.photo_students?.map(ps => ps.students).filter(Boolean) || [],
        tagged_courses: photo.photo_courses?.map(pc => pc.courses).filter(Boolean) || [],
      }));
    }

    return NextResponse.json({
      success: true,
      gallery: galleryData,
    });

  } catch (error) {
    console.error('Error in GET /api/public/gallery/[token]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

const DownloadSchema = z.object({
  photo_ids: z.array(z.string().uuid()).optional(),
});

// POST /api/public/gallery/[token]/download
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    const body = await req.json();

    // Validate token format
    if (!token || token.length !== 32) {
      return NextResponse.json(
        { error: 'Invalid gallery share token' },
        { status: 400 }
      );
    }

    // Validate input
    const validatedData = DownloadSchema.parse(body);
    const { photo_ids } = validatedData;

    const supabase = await createServerSupabaseServiceClient();

    // Validate gallery share token
    const { data: validationData, error: validationError } = await supabase.rpc('validate_gallery_share_token', {
      p_token: token,
    });

    if (validationError) {
      console.error('Error validating gallery share token:', validationError);
      return NextResponse.json(
        { error: 'Failed to validate gallery share token', details: validationError.message },
        { status: 500 }
      );
    }

    if (!validationData || !validationData.is_valid) {
      return NextResponse.json(
        { error: 'Invalid or expired gallery share token' },
        { status: 404 }
      );
    }

    // Check if download is allowed
    if (!validationData.allow_download) {
      return NextResponse.json(
        { error: 'Download not allowed for this gallery share' },
        { status: 403 }
      );
    }

    // Fetch photos based on hierarchy level and filters
    let photoQuery = supabase
      .from('assets')
      .select('id, filename, storage_path')
      .eq('event_id', validationData.event_id);

    // Apply filters based on hierarchy level
    if (validationData.student_id) {
      // Student-level photos
      photoQuery = photoQuery.eq('photo_students.student_id', validationData.student_id);
    } else if (validationData.course_id) {
      // Course-level photos (either directly associated or through students)
      photoQuery = photoQuery
        .or(`course_id.eq.${validationData.course_id},student_id.in.(${supabase.rpc('get_students_for_course', { course_id: validationData.course_id })})`);
    } else if (validationData.level_id) {
      // Level-level photos (through courses and students)
      photoQuery = photoQuery
        .or(`course_id.in.(${supabase.rpc('get_courses_for_level', { level_id: validationData.level_id })}),student_id.in.(${supabase.rpc('get_students_for_level', { level_id: validationData.level_id })})`);
    }
    // If event-level, we already have the base query

    // If specific photo IDs are provided, filter by them
    if (photo_ids && photo_ids.length > 0) {
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

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: 'No photos found matching the criteria' },
        { status: 404 }
      );
    }

    // Generate signed URLs for download
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

    // Filter out failed URLs
    const validDownloadUrls = downloadUrls.filter(url => url.download_url);

    if (validDownloadUrls.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate download URLs for all photos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Generated download URLs for ${validDownloadUrls.length} photo(s)`,
      download_urls: validDownloadUrls,
    });

  } catch (error) {
    console.error('Error in POST /api/public/gallery/[token]/download:', error);
    
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
