import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // En producción, verificar autenticación
    if (process.env.NODE_ENV === 'production') {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID requerido' },
        { status: 400 }
      );
    }

    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Service] Error obteniendo alumnos:', error);
      return NextResponse.json(
        { error: 'Error obteniendo alumnos' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        subjects: (subjects || []).map((s: any) => ({
          id: s.id,
          name: s.name ?? 'Sin nombre',
          grade_section: s.grade_section ?? null,
          token: s.token ?? null,
          event_id: s.event_id,
          created_at: s.created_at,
        })),
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('[Service] Error en GET /api/admin/subjects-simple:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
}
