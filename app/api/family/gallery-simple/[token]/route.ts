import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { signedUrlForKey } from '@/lib/storage/signedUrl';
import { Soft60per10m } from '@/lib/limits/rateLimit';
import { bumpRequest, bumpUnique } from '@/lib/metrics/egress';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // rate limit por token + IP
    const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const key = `gal-simple:${params.token}:${ip}`;
    const { allowed } = await Soft60per10m.check(key);
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
    }
    const { token } = params;

    // Validar token formato básico
    if (!token || token.length < 20) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const supabase = await createServerSupabaseServiceClient();

    // Resolver token en dos esquemas: codes.token y subject_tokens.token
    let mode: 'code' | 'subject' | null = null;
    let codeId: string | null = null;
    let eventId: string | null = null;
    let subjectId: string | null = null;

    const { data: codeTok } = await supabase
      .from('codes' as any)
      .select('id, event_id, code_value, is_published')
      .eq('token', token)
      .single();

    if (codeTok) {
      mode = 'code';
      codeId = codeTok.id as string;
      eventId = codeTok.event_id as string;
      if (codeTok.is_published === false) {
        return NextResponse.json({ error: 'Este enlace no está publicado' }, { status: 403 });
      }
    } else {
      const { data: tokenRow } = await supabase
        .from('subject_tokens')
        .select('subject_id, expires_at')
        .eq('token', token)
        .single();

      if (!tokenRow) {
        return NextResponse.json({ error: 'Token no válido' }, { status: 404 });
      }

      if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Token expirado' }, { status: 401 });
      }

      subjectId = tokenRow.subject_id as string;

      const { data: subj } = await supabase
        .from('subjects')
        .select('id, event_id')
        .eq('id', subjectId)
        .single();
      if (!subj) {
        return NextResponse.json({ error: 'Sujeto no encontrado' }, { status: 404 });
      }
      eventId = subj.event_id as string;
      mode = 'subject';
    }

    // Cargar evento (opcional)
    let eventInfo: { id: string; name: string; school_name?: string } | null = null;
    if (eventId) {
      const { data: eventData } = await supabase
        .from('events')
        .select('id, name, school_name')
        .eq('id', eventId)
        .single();
      if (eventData) eventInfo = eventData as any;
    }

    // Paginación
    const { searchParams } = new URL(request.url);
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = Math.min(Math.max(parseInt(searchParams.get('limit') || '60', 10), 1), 100);
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = Number.isNaN(limitParam) ? 60 : limitParam;
    const offset = (page - 1) * limit;

    // Obtener fotos según modo
    let photos: any[] = [];
    if (mode === 'code' && codeId) {
      // Fotos por code_id
      // Intentar con filtro approved=true; si falla, repetir sin filtro
      let res = await supabase
        .from('photos')
        .select('id, event_id, original_filename, storage_path, file_size, width, height, created_at, code_id')
        .eq('code_id', codeId)
        .eq('approved', true)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);
      if (res.error) {
        const res2 = await supabase
          .from('photos')
          .select('id, event_id, original_filename, storage_path, file_size, width, height, created_at, code_id')
          .eq('code_id', codeId)
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1);
        photos = (res2.data as any[]) || [];
      } else {
        photos = (res.data as any[]) || [];
      }
    } else if (mode === 'subject' && subjectId) {
      const { data: psubs, error: photosError } = await supabase
        .from('photo_subjects')
        .select(
          `
          photos (
            id,
            event_id,
            original_filename,
            storage_path,
            file_size,
            width,
            height,
            created_at
          )
        `
        )
        .eq('subject_id', subjectId)
        .range(offset, offset + limit - 1);
      if (photosError) {
        console.error('Error fetching photos:', photosError);
        return NextResponse.json({ error: 'Error obteniendo fotos' }, { status: 500 });
      }
      photos = (psubs || []).map((row: any) => row.photos).filter(Boolean);
    }

    // Generar URLs firmadas para cada foto
    const photosWithUrls = await Promise.all(
      (photos || []).map(async (photo: any) => {
        // preferir watermark/preview si existen, fallback storage_path
        const key = photo.watermark_path || photo.preview_path || photo.storage_path;
        const preview_url = key ? await signedUrlForKey(key, 3600) : null;
        return {
          id: photo.id,
          filename: (photo as any).original_filename ?? null,
          preview_url,
          size: (photo as any).file_size ?? null,
          width: photo.width,
          height: photo.height,
          created_at: photo.created_at,
        };
      })
    );

    // Filtrar nulls
    const validPhotos = photosWithUrls.filter((p) => p !== null);

    // Métricas aproximadas de egress
    const dateISO = new Date().toISOString().slice(0, 10);
    const approx = Number(process.env.APPROX_PREVIEW_BYTES || '200000');
    const approxBytes = approx * validPhotos.length;
    if (eventId) {
      await bumpRequest(eventId, dateISO, 1, approxBytes);
      if (mode === 'code') {
        await bumpUnique(eventId, dateISO, token);
      }
    }

    // Calcular grade_section si no existe
    const subjectPayload = mode === 'subject' && subjectId
      ? (() => {
          // Cargar datos mínimos de subject para el encabezado
          return { id: subjectId, name: 'Tu galería', grade_section: null, event: eventInfo };
        })()
      : { id: codeId || 'code', name: `Código ${codeTok?.code_value ?? ''}`.trim(), grade_section: null, event: eventInfo };

    // Total para paginación (consulta rápida por cuenta)
    let total = 0;
    if (mode === 'code' && codeId) {
      const { count } = await supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('code_id', codeId)
        .eq('approved', true);
      total = count || 0;
    } else if (mode === 'subject' && subjectId) {
      const { count } = await supabase
        .from('photo_subjects')
        .select('photo_id', { count: 'exact', head: true })
        .eq('subject_id', subjectId);
      total = count || 0;
    }

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasMore = page < totalPages;

    return NextResponse.json({
      success: true,
      subject: subjectPayload,
      photos: validPhotos,
      total,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_more: hasMore,
      },
    });
  } catch (error) {
    console.error('Gallery error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
