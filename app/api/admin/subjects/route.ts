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

    const subjectsRaw = (data || []) as Array<{ id: string; name: string; event_id: string; created_at: string }>;

    // Adjuntar último token si existe (compatibilidad con UI)
    let tokensMap: Record<string, { token: string; expires_at: string } | undefined> = {};
    try {
      const subjectIds = subjectsRaw.map((s) => s.id);
      if (subjectIds.length > 0) {
        const { data: tokens } = await supabase
          .from('subject_tokens' as any)
          .select('subject_id, token, expires_at')
          .in('subject_id', subjectIds)
          .order('expires_at', { ascending: false });
        for (const t of tokens || []) {
          const sid = (t as any).subject_id as string;
          if (!tokensMap[sid]) {
            tokensMap[sid] = { token: (t as any).token as string, expires_at: (t as any).expires_at as string };
          }
        }
      }
    } catch {}

    const subjects = subjectsRaw.map((s) => ({
      id: s.id,
      name: s.name,
      event_id: s.event_id,
      created_at: s.created_at,
      token: tokensMap[s.id]?.token,
      token_expires_at: tokensMap[s.id]?.expires_at,
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

    // Generar token seguro y expiración por defecto (30 días)
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Intento 1: esquema moderno (sin columnas de token en subjects)
    const insertMinimal = await supabase
      .from('subjects')
      .insert({
        event_id,
        name: name.trim(),
      })
      .select()
      .single();

    let subject = insertMinimal.data as any | null;
    let creationError = insertMinimal.error as any | null;

    // Fallback: esquema legado requiere access_token y token_expires_at en subjects
    if (!subject && creationError) {
      const needsLegacyColumns =
        typeof creationError.message === 'string' &&
        (creationError.message.includes('access_token') || creationError.message.includes('token_expires_at') || creationError.message.toLowerCase().includes('null value in column'));

      if (needsLegacyColumns) {
        const legacyInsert = await supabase
          .from('subjects')
          .insert({
            event_id,
            name: name.trim(),
            access_token: token,
            token_expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        subject = legacyInsert.data as any;
        creationError = legacyInsert.error as any;
      }
    }

    if (!subject || creationError) {
      console.error('[Service] Error creando sujeto', creationError);
      return NextResponse.json(
        { error: 'Error al crear sujeto' },
        { status: 500 }
      );
    }

    // Registrar token en tabla subject_tokens (compatible con ambos esquemas)
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
