import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { signedUrlForKey } from '@/lib/storage/signedUrl';
import { Soft60per10m } from '@/lib/limits/rateLimit';
import { bumpRequest, bumpUnique } from '@/lib/metrics/egress';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // rate limit por token + IP
    const ip =
      request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const { token } = await params;
    const key = `gal-simple:${token}:${ip}`;
    const { allowed } = await Soft60per10m.check(key);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes' },
        { status: 429 }
      );
    }
    // token ya resuelto arriba

    // Validar token formato básico
    if (!token || token.length < 20) {
      // Soporte de mock en desarrollo
      const { searchParams } = new URL(request.url);
      if (
        process.env.NODE_ENV !== 'production' &&
        searchParams.get('mock') === '1'
      ) {
        const mockPhotos = Array.from({ length: 12 }).map((_, i) => ({
          id: `mock-${i + 1}`,
          filename: `mock-${i + 1}.jpg`,
          preview_url: `https://picsum.photos/seed/lookescolar-${i}/600/600?grayscale`,
          size: 150_000,
          width: 600,
          height: 600,
          created_at: new Date().toISOString(),
        }));
        return NextResponse.json({
          success: true,
          subject: {
            id: 'mock',
            name: 'Tu galería',
            grade_section: null,
            event: null,
          },
          photos: mockPhotos,
          pagination: {
            page: 1,
            limit: 12,
            total: 12,
            total_pages: 1,
            has_more: false,
          },
        });
      }
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const supabase = await createServerSupabaseServiceClient();

    // Resolver token en tres esquemas: folders.share_token, codes.token y subject_tokens.token
    let mode: 'folder' | 'code' | 'subject' | null = null;
    let folderId: string | null = null;
    let codeId: string | null = null;
    let eventId: string | null = null;
    let subjectId: string | null = null;

    // FIRST: Check for folder token (new system)
    const { data: folderTok } = await supabase
      .from('folders')
      .select('id, name, event_id, is_published, photo_count')
      .eq('share_token', token)
      .single();

    if (folderTok) {
      mode = 'folder';
      folderId = folderTok.id as string;
      eventId = folderTok.event_id as string;
      if (folderTok.is_published === false) {
        return NextResponse.json(
          { error: 'Este enlace no está publicado' },
          { status: 403 }
        );
      }
    } else {
      // SECOND: Check codes table (legacy system)
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
          return NextResponse.json(
            { error: 'Este enlace no está publicado' },
            { status: 403 }
          );
        }
      } else {
        // THIRD: Check subject_tokens table (individual student access)
        const { data: tokenRow } = await supabase
          .from('subject_tokens')
          .select('subject_id, expires_at')
          .eq('token', token)
          .single();

        if (!tokenRow) {
          return NextResponse.json(
            { error: 'Token no válido' },
            { status: 404 }
          );
        }

        if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
          return NextResponse.json(
            { error: 'Token expirado' },
            { status: 401 }
          );
        }

        subjectId = tokenRow.subject_id as string;

        const { data: subj } = await supabase
          .from('subjects')
          .select('id, event_id')
          .eq('id', subjectId)
          .single();
        if (!subj) {
          return NextResponse.json(
            { error: 'Sujeto no encontrado' },
            { status: 404 }
          );
        }
        eventId = subj.event_id as string;
        mode = 'subject';
      }
    }

    // Cargar evento (opcional)
    let eventInfo: {
      id: string;
      name: string;
      school_name?: string;
      theme?: string;
    } | null = null;
    if (eventId) {
      const { data: eventData } = await supabase
        .from('events')
        .select('id, name, school_name:school, theme')
        .eq('id', eventId)
        .single();
      if (eventData)
        eventInfo = {
          id: (eventData as any).id,
          name: (eventData as any).name,
          school_name: (eventData as any).school_name,
          theme: (eventData as any).theme || 'default',
        };
    }

    // Paginación
    const { searchParams } = new URL(request.url);
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '60', 10), 1),
      100
    );
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = Number.isNaN(limitParam) ? 60 : limitParam;
    const offset = (page - 1) * limit;

    // Obtener fotos según modo
    let photos: any[] = [];
    if (mode === 'folder' && folderId) {
      // Fotos de la carpeta (nuevo sistema basado en assets)
      const { data: folderPhotos, error: photosError } = await supabase
        .from('assets')
        .select(
          'id, filename, original_path, preview_path, file_size, created_at, folder_id'
        )
        .eq('folder_id', folderId)
        .eq('status', 'ready')
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (photosError) {
        console.error('Error fetching folder photos:', photosError);
        return NextResponse.json(
          { error: 'Error obteniendo fotos de la carpeta' },
          { status: 500 }
        );
      }
      photos = folderPhotos || [];
    } else if (mode === 'code' && codeId) {
      // Fotos por code_id
      // Intentar con filtro approved=true; si falla, repetir sin filtro
      const res = await supabase
        .from('assets')
        .select(
          'id, event_id, original_filename, storage_path, preview_path, watermark_path, file_size, width, height, created_at, code_id'
        )
        .eq('code_id', codeId)
        .eq('approved', true)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);
      if (res.error) {
        const res2 = await supabase
          .from('assets')
          .select(
            'id, event_id, original_filename, storage_path, preview_path, watermark_path, file_size, width, height, created_at, code_id'
          )
          .eq('code_id', codeId)
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1);
        photos = (res2.data as any[]) || [];
      } else {
        photos = (res.data as any[]) || [];
      }
    } else if (mode === 'subject' && subjectId) {
      const { data: rows, error: photosError } = await supabase
        .from('photo_subjects')
        .select(
          `
          photos!inner (
            id,
            event_id,
            original_filename,
            storage_path,
            preview_path,
            watermark_path,
            file_size,
            width,
            height,
            created_at,
            approved
          )
        `
        )
        .eq('subject_id', subjectId)
        .eq('photos.approved', true)
        .range(offset, offset + limit - 1);
      if (photosError) {
        console.error('Error fetching photos:', photosError);
        return NextResponse.json(
          { error: 'Error obteniendo fotos' },
          { status: 500 }
        );
      }
      photos = (rows ?? []).map((r: any) => r.photos).filter(Boolean);
    }

    // Generar URLs firmadas para cada foto
    const photosWithUrls = await Promise.all(
      (photos || []).map(async (photo: any) => {
        let key: string | null = null;
        let filename: string | null = null;
        let fileSize: number | null = null;

        if (mode === 'folder') {
          // Nuevo sistema: assets table
          key = photo.preview_path || photo.original_path;
          filename = photo.filename;
          fileSize = photo.file_size;
        } else {
          // Sistema legacy: photos table
          key = photo.watermark_path || photo.preview_path;
          filename = photo.original_filename;
          fileSize = photo.file_size;
        }

        const preview_url = key ? await signedUrlForKey(key, 900) : null;
        if (!preview_url) return null;

        return {
          id: photo.id,
          filename: filename ?? null,
          preview_url,
          size: fileSize ?? null,
          width: photo.width || null,
          height: photo.height || null,
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
      } else if (mode === 'folder') {
        await bumpUnique(eventId, dateISO, token);
      }
    }

    // Calcular subject payload según modo
    let subjectPayload;
    if (mode === 'subject' && subjectId) {
      subjectPayload = {
        id: subjectId,
        name: 'Tu galería',
        grade_section: null,
        event: eventInfo,
      };
    } else if (mode === 'folder' && folderId) {
      subjectPayload = {
        id: folderId,
        name: folderTok?.name || 'Galería de clase',
        grade_section: null,
        event: eventInfo,
      };
    } else {
      subjectPayload = {
        id: codeId || 'code',
        name: `Código ${codeTok?.code_value ?? ''}`.trim(),
        grade_section: null,
        event: eventInfo,
      };
    }

    // Total para paginación (consulta rápida por cuenta)
    let total = 0;
    if (mode === 'folder' && folderId) {
      const { count } = await supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('folder_id', folderId)
        .eq('status', 'ready');
      total = count || 0;
    } else if (mode === 'code' && codeId) {
      const { count } = await supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('code_id', codeId)
        .eq('approved', true);
      total = count || 0;
    } else if (mode === 'subject' && subjectId) {
      const { count } = await supabase
        .from('photo_subjects')
        .select('photo_id, photos!inner(id)', { count: 'exact', head: true })
        .eq('subject_id', subjectId)
        .eq('photos.approved', true);
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
