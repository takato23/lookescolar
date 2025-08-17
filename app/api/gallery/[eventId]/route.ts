import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { signedUrlForKey } from '@/lib/storage/signedUrl';

const eventIdSchema = z.object({
  eventId: z.string().uuid('Invalid event ID format'),
});

const queryParamsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(parseInt(val, 10), 50) : 24)), // Max 50 per page
});

// Rate limiting básico
const accessLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minuto
  const maxRequests = 30; // 30 requests por minuto por IP

  const record = accessLimiter.get(ip);

  if (!record || now > record.resetTime) {
    accessLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * API público para galería de evento (MVP)
 * Permite ver todas las fotos del evento sin autenticación
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';

  try {
    // Rate limiting básico por IP
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Validar parámetros (Next puede entregar params como Promise)
    const resolvedParams = await params;
    const { eventId } = eventIdSchema.parse(resolvedParams);
    const { searchParams } = new URL(request.url);
    const { page, limit } = queryParamsSchema.parse(
      Object.fromEntries(searchParams)
    );

    // Log acceso enmascarado
    console.log(
      `Public gallery access - Event: ${eventId}, IP: ${ip.replace(/\d+$/, '***')}, Page: ${page}`
    );

    // Crear cliente Supabase con service role
    const supabase = await createServerSupabaseServiceClient();

    // Verificar que el evento existe (tolerante a esquemas: no exigir status/active)
    let event: any = null;
    {
      const res = await supabase
        .from('events')
        .select('id, name, school, date, status, active, created_at')
        .eq('id', eventId)
        .maybeSingle();
      if (!res.error && res.data) {
        event = res.data;
      } else {
        const res2 = await supabase
          .from('events')
          .select('id, name, created_at')
          .eq('id', eventId)
          .maybeSingle();
        event = res2.data || null;
      }
    }
    if (!event) {
      return NextResponse.json({ error: 'Event not found or not available' }, { status: 404 });
    }

    // Si se requiere flag, validar en DB; por compatibilidad, omitimos check cuando falta columna

    // Obtener total de fotos aprobadas del evento
    const { count: totalPhotos, error: countError } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('approved', true);

    if (countError) {
      console.error('Error getting photos count:', countError);
      return NextResponse.json(
        { error: 'Error loading gallery' },
        { status: 500 }
      );
    }

    // Obtener fotos del evento con paginación
    const offset = (page - 1) * limit;
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id, storage_path, preview_path, watermark_path, width, height, created_at')
      .eq('event_id', eventId)
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (photosError) {
      console.error('Error fetching photos:', photosError);
      return NextResponse.json(
        { error: 'Error loading photos' },
        { status: 500 }
      );
    }

    // Generar URLs firmadas priorizando watermark/preview (baja calidad)
    type PhotoRow = {
      id: string;
      storage_path: string;
      preview_path: string | null;
      watermark_path: string | null;
      width: number | null;
      height: number | null;
      created_at: string;
    };

    const photosWithUrls = await Promise.all(
      (photos as PhotoRow[] | null | undefined || []).map(async (photo: PhotoRow) => {
        try {
          const key = photo.watermark_path || photo.preview_path;
          if (!key) {
            return null;
          }
          const signedUrl = await signedUrlForKey(key, 900);

          return {
            id: photo.id,
            storage_path: photo.storage_path,
            width: photo.width,
            height: photo.height,
            created_at: photo.created_at,
            signed_url: signedUrl,
          };
        } catch (error) {
          console.error('[Service] PublicGallery signed URL error:', error);
          return null;
        }
      })
    );

    // Filtrar fotos que no pudieron generar URL
    const validPhotos = photosWithUrls.filter((photo) => photo !== null);

    const duration = Date.now() - startTime;
    const total = totalPhotos || 0;
    const has_more = offset + limit < total;

    // Log performance
    console.log(
      `Public gallery API - Event: ${eventId}, Photos: ${validPhotos.length}/${total}, Duration: ${duration}ms`
    );

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        school: event.school,
        date: event.date,
        created_at: event.created_at,
      },
      photos: validPhotos,
      pagination: {
        page,
        limit,
        total,
        has_more,
        total_pages: Math.ceil(total / limit),
      },
      metadata: {
        generated_at: new Date().toISOString(),
        photos_with_urls: validPhotos.length,
        photos_failed: (photos?.length || 0) - validPhotos.length,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `Public gallery API error - Duration: ${duration}ms, Error:`,
      error
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
