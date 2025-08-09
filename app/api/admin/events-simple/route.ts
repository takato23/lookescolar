import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // En desarrollo, no verificar autenticación
    if (process.env.NODE_ENV === 'production') {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }

    // Query directa con * para evitar errores de columnas
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Service] Error obteniendo eventos:', error);
      return NextResponse.json(
        { error: 'Error obteniendo eventos' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        events: (events || []).map((e: any) => ({
          id: e.id,
          name: e.name || 'Sin nombre',
          location: e.location || null,
          date: e.date || e.created_at,
          status: e.status || 'active',
        })),
      },
      {
        // Agregar headers de cache para mejorar performance
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
