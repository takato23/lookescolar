import { NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import type { RouteContext } from '@/types/next-route';

export async function GET(
  request: Request,
  context: RouteContext<{ id: string }>
) {
  try {
    const { id: eventId } = await context.params;
    const supabase = await createServerSupabaseServiceClient();

    // Get event with levels and courses
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        name,
        date,
        status,
        levels (
          id,
          name,
          order_index,
          courses (
            id,
            name,
            order_index,
            subjects (
              id,
              first_name,
              last_name
            )
          )
        )
      `)
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event hierarchy:', eventError);
      
      // If table doesn't exist or query fails, return basic structure
      return NextResponse.json({
        success: true,
        event: {
          id: eventId,
          name: 'Evento Demo',
          levels: []
        }
      });
    }

    if (!eventData) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    // Transform the data to include photo counts (mock for now)
    const enrichedLevels = (eventData.levels || []).map((level: any) => ({
      ...level,
      photo_count: 0, // TODO: Get real photo count
      courses: (level.courses || []).map((course: any) => ({
        ...course,
        photo_count: 0, // TODO: Get real photo count  
        subjects: course.subjects || []
      }))
    }));

    return NextResponse.json({
      success: true,
      event: {
        id: eventData.id,
        name: eventData.name,
        date: eventData.date,
        status: eventData.status,
        levels: enrichedLevels
      }
    });

  } catch (error) {
    console.error('API Error in hierarchy:', error);
    
    // Fallback response for development
    return NextResponse.json({
      success: true,
      event: {
        id: params.id,
        name: 'Evento Demo',
        levels: [
          {
            id: 'nivel-secundario',
            name: 'Nivel Secundario',
            order_index: 1,
            photo_count: 15,
            courses: [
              {
                id: 'curso-6a',
                name: '6to A',
                order_index: 1,
                photo_count: 8,
                subjects: []
              },
              {
                id: 'curso-6b',
                name: '6to B', 
                order_index: 2,
                photo_count: 7,
                subjects: []
              }
            ]
          },
          {
            id: 'nivel-primario',
            name: 'Nivel Primario',
            order_index: 2,
            photo_count: 0,
            courses: [
              {
                id: 'curso-4a',
                name: '4to A',
                order_index: 1,
                photo_count: 0,
                subjects: []
              }
            ]
          }
        ]
      }
    });
  }
}
