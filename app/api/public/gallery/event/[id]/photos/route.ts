import { NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const url = new URL(request.url);
    const courseId = url.searchParams.get('course');
    const levelId = url.searchParams.get('level');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    const supabase = await createServerSupabaseServiceClient();

    // Verify event exists and is active
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, name, status')
      .eq('id', eventId)
      .eq('status', 'active')
      .single();

    if (eventError || !eventData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Evento no encontrado' 
        },
        { status: 404 }
      );
    }

    // Build query for photos
    let query = supabase
      .from('photos')
      .select(`
        id,
        original_filename,
        preview_url,
        thumbnail_url,
        file_size,
        width,
        height,
        created_at,
        metadata
      `)
      .eq('event_id', eventId)
      .eq('approved', true) // Only approved photos for public view
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by course or level if specified
    if (courseId) {
      query = query.contains('metadata', { course_id: courseId });
    } else if (levelId) {
      query = query.contains('metadata', { level_id: levelId });
    }

    const { data: photosData, error: photosError } = await query;

    if (photosError) {
      console.error('Error fetching photos:', photosError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error obteniendo fotos' 
        },
        { status: 500 }
      );
    }

    // Transform photos for public consumption
    const publicPhotos = (photosData || []).map(photo => ({
      id: photo.id,
      filename: photo.original_filename,
      preview_url: photo.preview_url,
      thumbnail_url: photo.thumbnail_url,
      dimensions: {
        width: photo.width,
        height: photo.height
      },
      file_size: photo.file_size,
      created_at: photo.created_at,
      // Don't expose sensitive metadata
      course_id: photo.metadata?.course_id,
      level_id: photo.metadata?.level_id,
    }));

    // Get context info if course/level specified
    let contextInfo = null;
    if (courseId) {
      const { data: courseData } = await supabase
        .from('courses')
        .select('id, name, level_id, levels(id, name)')
        .eq('id', courseId)
        .single();
      
      contextInfo = {
        type: 'course',
        course: courseData,
        level: courseData?.levels
      };
    } else if (levelId) {
      const { data: levelData } = await supabase
        .from('levels')
        .select('id, name')
        .eq('id', levelId)
        .single();
      
      contextInfo = {
        type: 'level',
        level: levelData
      };
    }

    return NextResponse.json({
      success: true,
      photos: publicPhotos,
      context: contextInfo,
      total_count: publicPhotos.length,
      pricing: {
        individual_price: 200, // $2 per photo
        album_price: Math.max(800, publicPhotos.length * 80), // Album pricing
        bulk_discount_threshold: 3,
        bulk_discount_percent: 10,
      }
    });

  } catch (error) {
    console.error('Error in public photos API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}