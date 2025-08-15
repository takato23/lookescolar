import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // En desarrollo, no verificar autenticación
    if (process.env.NODE_ENV !== 'development') {
      // TODO: Verificar autenticación en producción
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = await (async () => {
      try {
        return await createServerSupabaseServiceClient();
      } catch {
        // Fallback a cliente anon en dev si falta service key
        return await createServerSupabaseClient();
      }
    })();

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    // Soporte de ordenado
    const sort = (searchParams.get('sort') || 'name').toLowerCase();
    const order = (searchParams.get('order') || 'asc').toLowerCase();
    const sortable = sort === 'created_at' ? 'created_at' : 'name';
    const ascending = order !== 'desc';

    // Obtener sujetos (sin join para evitar errores de relación en entornos mixtos)
    let query = supabase
      .from('subjects')
      .select(
        `
        id,
        name,
        event_id,
        created_at
      `
      )
      .order(sortable, { ascending });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Service] Error cargando sujetos', error);
      return NextResponse.json(
        { error: 'Error al cargar sujetos' },
        { status: 500 }
      );
    }

    const subjects = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      event_id: s.event_id,
      created_at: s.created_at,
    }));

    return NextResponse.json({ success: true, subjects });
  } catch (error) {
    console.error('[Service] Error en subjects API (GET)', error);
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
    const { name, event_id } = body as { name?: string; event_id?: string };

    if (!name || !event_id) {
      return NextResponse.json(
        { error: 'Nombre y evento son requeridos' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Crear sujeto con el esquema actual (solo event_id y name)
    const { data: subject, error } = await supabase
      .from('subjects')
      .insert({
        event_id,
        name: name.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Service] Error creando sujeto', error);
      return NextResponse.json(
        { error: 'Error al crear sujeto' },
        { status: 500 }
      );
    }

    // Generar token seguro y registrar en subject_tokens
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const { error: tokenError } = await supabase
      .from('subject_tokens')
      .insert({
        subject_id: subject.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('[Service] Error creando token de sujeto', tokenError);
      return NextResponse.json(
        { error: 'Error al generar token de acceso' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subject: {
        ...subject,
        token,
        token_expires_at: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Service] Error en subjects API (POST)', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
