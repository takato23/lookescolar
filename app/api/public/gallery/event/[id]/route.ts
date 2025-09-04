import { NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const supabase = await createServerSupabaseServiceClient();

    // Get event with public visibility
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        name,
        date,
        location,
        status
      `)
      .eq('id', eventId)
      .eq('status', 'active') // Only active events
      .single();

    if (eventError || !eventData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Evento no encontrado o no disponible públicamente' 
        },
        { status: 404 }
      );
    }

    // Get levels (collections) with basic info
    const { data: levelsData, error: levelsError } = await supabase
      .from('levels')
      .select(`
        id,
        name,
        order_index
      `)
      .eq('event_id', eventId)
      .order('order_index', { ascending: true });

    // For each level, get courses (subcarpetas) and photo counts
    const collectionsWithData = await Promise.all(
      (levelsData || []).map(async (level) => {
        // Get courses for this level
        const { data: coursesData } = await supabase
          .from('courses')
          .select(`
            id,
            name,
            order_index
          `)
          .eq('level_id', level.id)
          .order('order_index', { ascending: true });

        // Count approved photos for each course
        const coursesWithCounts = await Promise.all(
          (coursesData || []).map(async (course) => {
            const { count: photoCount } = await supabase
              .from('photos')
              .select('id', { count: 'exact', head: true })
              .eq('event_id', eventId)
              .eq('approved', true)
              .contains('metadata', { course_id: course.id });

            return {
              id: course.id,
              name: course.name,
              photo_count: photoCount || 0,
              // Pricing logic
              individual_price: 200, // $2 per photo
              album_price: Math.max(800, (photoCount || 0) * 80), // ~$0.8 per photo in album
            };
          })
        );

        const totalPhotos = coursesWithCounts.reduce((sum, course) => sum + course.photo_count, 0);

        return {
          id: level.id,
          name: level.name,
          photo_count: totalPhotos,
          subcarpetas: coursesWithCounts,
          // Collection pricing
          album_price: Math.max(1500, totalPhotos * 60), // ~$0.6 per photo for full collection
        };
      })
    );

    // Calculate event totals
    const totalEventPhotos = collectionsWithData.reduce((sum, col) => sum + col.photo_count, 0);
    const eventAlbumPrice = Math.max(3000, totalEventPhotos * 50); // ~$0.5 per photo for full event

    return NextResponse.json({
      success: true,
      event: {
        id: eventData.id,
        name: eventData.name,
        date: eventData.date,
        location: eventData.location,
        photo_count: totalEventPhotos,
        colecciones: collectionsWithData,
        pricing: {
          event_album_price: eventAlbumPrice,
          individual_photo_price: 200,
          bulk_discount_threshold: 3, // 10% off for 3+ individual photos
          bulk_discount_percent: 10,
        }
      }
    });

  } catch (error) {
    console.error('Error fetching public gallery:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}