import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/middleware/auth.middleware';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const supabase = await createServerSupabaseServiceClient();

    // Obtener parámetros
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    const includePhotoCount =
      searchParams.get('include_photo_count') === 'true';

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID requerido' },
        { status: 400 }
      );
    }

    // Obtener sujetos del evento
    const query = supabase
      .from('subjects')
      .select('*')
      .eq('event_id', eventId)
      .order('name', { ascending: true });

    const { data: subjects, error } = await query;

    if (error) {
      console.error('Error fetching subjects:', error);
      return NextResponse.json(
        { error: 'Error obteniendo alumnos' },
        { status: 500 }
      );
    }

    // Si se pide el conteo de fotos
    let subjectsWithCount = subjects || [];
    if (includePhotoCount && subjects) {
      subjectsWithCount = await Promise.all(
        subjects.map(async (subject) => {
          const { count } = await supabase
            .from('photo_subjects')
            .select('*', { count: 'exact', head: true })
            .eq('subject_id', subject.id);

          return {
            ...subject,
            photo_count: count || 0,
          };
        })
      );
    }

    return NextResponse.json({
      success: true,
      subjects: subjectsWithCount,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});
