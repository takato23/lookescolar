import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // En desarrollo, no verificar autenticación
    if (process.env.NODE_ENV !== 'development') {
      // TODO: Verificar autenticación en producción
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = createClient();

    // Obtener todos los sujetos con el conteo de fotos
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select(
        `
        id,
        name,
        grade,
        token,
        event_id,
        events (
          id,
          name,
          school_name
        )
      `
      )
      .order('name');

    if (error) {
      console.error('Error cargando sujetos:', error);
      return NextResponse.json(
        { error: 'Error al cargar sujetos' },
        { status: 500 }
      );
    }

    // Obtener conteo de fotos por sujeto
    const { data: photoCounts } = await supabase
      .from('photo_subjects')
      .select('subject_id')
      .in('subject_id', subjects?.map((s) => s.id) || []);

    // Mapear los datos
    const subjectsWithCount =
      subjects?.map((subject) => {
        const photoCount =
          photoCounts?.filter((p) => p.subject_id === subject.id).length || 0;
        return {
          id: subject.id,
          name: subject.name,
          grade: subject.grade,
          token: subject.token,
          event_id: subject.event_id,
          school_name: subject.events?.school_name || '',
          photo_count: photoCount,
        };
      }) || [];

    return NextResponse.json({
      success: true,
      subjects: subjectsWithCount,
    });
  } catch (error) {
    console.error('Error en subjects API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // En desarrollo, no verificar autenticación
    if (process.env.NODE_ENV !== 'development') {
      // TODO: Verificar autenticación en producción
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, grade, event_id } = body;

    if (!name || !event_id) {
      return NextResponse.json(
        { error: 'Nombre y evento son requeridos' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Generar token único
    const token = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Crear sujeto
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name,
        grade,
        event_id,
        token,
        token_expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 días
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando sujeto:', error);
      return NextResponse.json(
        { error: 'Error al crear sujeto' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subject: data,
    });
  } catch (error) {
    console.error('Error en subjects API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
