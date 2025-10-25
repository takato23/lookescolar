import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import {
  galleryService,
  GalleryServiceError,
  type GalleryResult,
} from '@/lib/services/gallery.service';
import { Soft60per10m } from '@/lib/limits/rateLimit';
import { bumpRequest, bumpUnique } from '@/lib/metrics/egress';

function mapLegacySubject(result: GalleryResult) {
  const baseEvent = result.event
    ? {
        id: result.event.id,
        name: result.event.name ?? 'Evento',
        school_name: (result.event as any).school_name ?? null,
      }
    : null;

  if (result.subject) {
    return {
      id: result.subject.id,
      name: result.subject.name ?? 'Galería familiar',
      grade_section: [
        (result.subject as any).grade ?? null,
        (result.subject as any).section ?? null,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() || null,
      event: baseEvent,
    };
  }

  if (result.student) {
    return {
      id: result.student.id,
      name: result.student.name ?? 'Galería familiar',
      grade_section: [
        (result.student as any).grade ?? null,
        (result.student as any).section ?? null,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() || null,
      event: baseEvent,
    };
  }

  if (result.folder) {
    return {
      id: result.folder.id,
      name: result.folder.name ?? 'Galería de clase',
      grade_section: null,
      event: baseEvent,
    };
  }

  return {
    id: result.token.token,
    name: baseEvent?.name ?? 'Galería',
    grade_section: null,
    event: baseEvent,
  };
}

function mapLegacyPhotos(result: GalleryResult) {
  return result.items
    .map((item) => {
      const preview =
        item.signedUrl || item.previewUrl || item.downloadUrl || null;
      if (!preview) return null;
      return {
        id: item.id,
        filename: item.filename,
        preview_url: preview,
        size: item.size ?? null,
        width: (item.metadata as any)?.width ?? null,
        height: (item.metadata as any)?.height ?? null,
        created_at: item.createdAt,
      };
    })
    .filter(Boolean);
}

function extractEventId(result: GalleryResult): string | null {
  return (
    result.event?.id ||
    (result.folder as any)?.event_id ||
    (result.subject as any)?.event_id ||
    (result.student as any)?.event_id ||
    null
  );
}

export async function GET(
  request: NextRequest, context: RouteContext<{ token: string }>) {
  const params = await context.params;
  try {
    const { token } = params;

    // rate limit por token + IP (compatibilidad legacy)
    const ip =
      request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const key = `gal-simple:${token}:${ip}`;
    const { allowed } = await Soft60per10m.check(key);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes' },
        { status: 429 }
      );
    }

    // Modo mock para desarrollo con tokens cortos
    if (!token || token.length < 20) {
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

    const { searchParams } = new URL(request.url);
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = parseInt(searchParams.get('limit') || '60', 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = Math.min(
      100,
      Math.max(Number.isFinite(limitParam) ? limitParam : 60, 1)
    );

    const result = await galleryService.getGallery({
      token,
      page,
      limit,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') ?? undefined,
      skipRateLimit: true,
    });

    const photos = mapLegacyPhotos(result);
    const subjectPayload = mapLegacySubject(result);
    const eventPayload = result.event
      ? {
          id: result.event.id,
          name: result.event.name ?? 'Evento',
          school_name: (result.event as any).school_name ?? null,
        }
      : subjectPayload?.event ?? null;

    // Métricas aproximadas de egress (compatibilidad con pipelines vigentes)
    const eventId = extractEventId(result);
    if (eventId) {
      const dateISO = new Date().toISOString().slice(0, 10);
      const approx = Number(process.env.APPROX_PREVIEW_BYTES || '200000');
      const approxBytes = approx * photos.length;
      await bumpRequest(eventId, dateISO, 1, approxBytes);
      await bumpUnique(eventId, dateISO, token);
    }

    return NextResponse.json({
      success: true,
      subject: subjectPayload,
      event: eventPayload,
      photos,
      total: result.pagination.total,
      pagination: {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        total_pages: result.pagination.totalPages,
        has_more: result.pagination.hasMore,
      },
    });
  } catch (error) {
    if (error instanceof GalleryServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('Gallery simple error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
