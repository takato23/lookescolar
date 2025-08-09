import { NextRequest, NextResponse } from 'next/server';
import { TablesInsert } from '@/types/database';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'No permitido en producción' },
        { status: 403 }
      );
    }

    const service = await createServerSupabaseServiceClient();

    // 1) Crear evento base según el schema tipado actual (school/date/active)
    const today = new Date().toISOString().slice(0, 10);
    const eventPayload: TablesInsert<'events'> = {
      school: 'Graduación 2024',
      date: today,
      active: true,
    };

    const { data: event, error: eventError } = await service
      .from('events')
      .insert(eventPayload)
      .select()
      .single();

    if (eventError || !event) {
      console.error('[Service] Error creando evento:', eventError);
      return NextResponse.json(
        { error: 'Error creando evento', details: eventError?.message },
        { status: 400 }
      );
    }

    // 2) Crear alumnos y tokens
    const alumnos = [
      { name: 'Juan Pérez', grade_section: '5A' },
      { name: 'María García', grade_section: '5A' },
      { name: 'Carlos López', grade_section: '5B' },
      { name: 'Ana Martínez', grade_section: '5B' },
    ];

    const created: Array<{ name: string; subject_id: string; token: string }> =
      [];

    for (const alumno of alumnos) {
      // Inserción con el schema tipado actual (event_id + name)
      const subjectInsert: TablesInsert<'subjects'> = {
        event_id: event.id,
        name: alumno.name,
      };

      const { data: subject, error: subjectError } = await service
        .from('subjects')
        .insert(subjectInsert)
        .select('id')
        .single();

      if (subjectError || !subject) {
        console.error('[Service] Error creando alumno:', subjectError);
        return NextResponse.json(
          { error: 'Error creando alumno', details: subjectError?.message },
          { status: 400 }
        );
      }

      // Generar token y guardar en subject_tokens
      const token =
        'tk_' +
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);
      const expiresAt = new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { error: tokenError } = await service
        .from('subject_tokens')
        .insert({ subject_id: subject.id, token, expires_at: expiresAt });

      if (tokenError) {
        return NextResponse.json(
          { error: 'Error creando token', details: tokenError.message },
          { status: 400 }
        );
      }

      created.push({ name: alumno.name, subject_id: subject.id, token });
    }

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        name: event.school,
        date: event.date,
        location: null,
      },
      subjects: created,
    });
  } catch (error) {
    console.error('[Service] Error en quick-setup:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
