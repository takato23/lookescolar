import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { signedUrlForKey } from '@/lib/storage/signedUrl';
import {
  createErrorResponse,
  createSuccessResponse,
  parsePaginationParams,
  createPaginationMeta,
  logDevRequest,
} from '@/lib/utils/api-response';

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
  const requestId = crypto.randomUUID();
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';

  try {
    // Rate limiting básico por IP
    if (!checkRateLimit(ip)) {
      return createErrorResponse(
        'Too many requests. Please try again later.',
        'Rate limit exceeded',
        429,
        requestId
      );
    }

    // Validar parámetros (Next puede entregar params como Promise)
    const resolvedParams = await params;
    const { eventId } = eventIdSchema.parse(resolvedParams);
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = parsePaginationParams(searchParams);

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
      return createErrorResponse(
        'Event not found or not available',
        'Event does not exist or is not accessible',
        404,
        requestId
      );
    }

    // Obtener total de fotos aprobadas del evento
    const { count: totalPhotos, error: countError } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('approved', true);

    if (countError) {
      console.error('Error getting photos count:', countError);
      return createErrorResponse(
        'Error loading gallery',
        countError.message,
        500,
        requestId
      );
    }

    // Obtener fotos del evento con paginación
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id, storage_path, watermark_path, width, height, created_at')
      .eq('event_id', eventId)
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (photosError) {
      console.error('Error fetching photos:', photosError);
      return createErrorResponse(
        'Error loading photos',
        photosError.message,
        500,
        requestId
      );
    }

    // Generar URLs firmadas SOLO para watermarks (NUNCA originales)
    type PhotoRow = {
      id: string;
      storage_path: string;
      watermark_path: string | null;
      width: number | null;
      height: number | null;
      created_at: string;
    };

    const photosWithUrls = await Promise.all(
      (photos || []).map(async (photo: any) => {
        try {
          // SEGURIDAD: SOLO watermark, NUNCA storage_path (original)
          const key = photo.watermark_path;
          if (!key) {
            console.warn(`Photo ${photo.id} has no watermark_path, skipping for security`);
            return null;
          }
          
          // Verificar que el key es realmente un watermark/preview
          if (!key.includes('watermark') && !key.includes('preview')) {
            console.warn(`Photo ${photo.id} key "${key}" doesn't look like watermark/preview, skipping`);
            return null;
          }

          const signedUrl = await signedUrlForKey(key, 900);

          return {
            id: photo.id,
            // NO exponer storage_path (original) en respuesta pública
            width: photo.width,
            height: photo.height,
            created_at: photo.created_at,
            signed_url: signedUrl,
            is_watermarked: true, // Indicar que es versión protegida
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
    const paginationMeta = createPaginationMeta(page, limit, total);

    // Log development request
    logDevRequest(requestId, 'GET', `/api/gallery/${event.id}`, duration, 200);

    return createSuccessResponse(
      {
        event: {
          id: event.id,
          name: event.name,
          school: event.school,
          date: event.date,
          created_at: event.created_at,
        },
        photos: validPhotos,
        metadata: {
          generated_at: new Date().toISOString(),
          photos_with_urls: validPhotos.length,
          photos_failed: (photos?.length || 0) - validPhotos.length,
        },
      },
      paginationMeta,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    logDevRequest(requestId, 'GET', `/api/gallery/${eventId}`, duration, 'error');

    if (error instanceof z.ZodError) {
      return createErrorResponse(
        'Invalid parameters',
        error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        400,
        requestId
      );
    }

    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error',
      500,
      requestId
    );
  }
}
