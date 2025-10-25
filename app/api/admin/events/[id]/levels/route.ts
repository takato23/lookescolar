import { NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import type { RouteContext } from '@/types/next-route';

export async function POST(
  request: Request,
  context: RouteContext<{ id: string }>
) {
  try {
    const { id: eventId } = await context.params;
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nombre del nivel requerido' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Create new level
    const { data: level, error } = await supabase
      .from('levels')
      .insert({
        name: name.trim(),
        event_id: eventId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating level:', error);
      return NextResponse.json(
        { error: 'Error creando el nivel' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      level,
      message: `Nivel "${name}" creado exitosamente`,
    });

  } catch (error) {
    console.error('API Error creating level:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  context: RouteContext<{ id: string }>
) {
  try {
    const { id: eventId } = await context.params;
    const supabase = await createServerSupabaseServiceClient();

    // Get all levels for event
    const { data: levels, error } = await supabase
      .from('levels')
      .select(`
        id,
        name,
        created_at,
        courses (
          id,
          name,
          created_at
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching levels:', error);
      return NextResponse.json(
        { error: 'Error obteniendo niveles' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      levels: levels || [],
    });

  } catch (error) {
    console.error('API Error fetching levels:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
