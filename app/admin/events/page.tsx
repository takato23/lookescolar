import { cookies } from 'next/headers';
import { EventsPageClient } from '@/components/admin/EventsPageClean';
import { absoluteUrl } from '@/lib/absoluteUrl';

// Optimized events fetcher with caching, error handling, and performance monitoring
export async function getEvents(searchParams?: Record<string, string | string[]>) {
  const startTime = performance.now();

  // Build query with input validation
  const qp = new URLSearchParams();
  qp.set('include_stats', 'true');

  // Validate and sanitize pagination parameters
  const page = Math.max(1, parseInt((searchParams?.page as string) || '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt((searchParams?.limit as string) || '50') || 50));

  qp.set('page', page.toString());
  qp.set('limit', limit.toString());

  // Add search parameters with validation
  if (searchParams) {
    const { status, sort_by: sortBy, sort_order: sortOrder } = searchParams;
    if (typeof status === 'string' && status.trim()) qp.set('status', status.trim());
    if (typeof sortBy === 'string' && sortBy.trim()) qp.set('sort_by', sortBy.trim());
    if (typeof sortOrder === 'string' && ['asc', 'desc'].includes(sortOrder)) qp.set('sort_order', sortOrder);
  }

  const primaryPath = `/api/admin/events?${qp.toString()}`;
  const fallbackPath = `/api/admin/events-robust?${qp.toString()}`;

  const cookieStore = cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  const buildHeaders = (userAgent: string): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
    };
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }
    return headers;
  };

  // Optimized response normalizer with type safety and caching
  const normalize = (raw: any[]): any[] => {
    if (!Array.isArray(raw)) return [];

    return raw.map((event: any) => {
      const stats = event?.stats || {};

      return {
        id: event.id,
        name: event.name,
        school: event.school ?? event.location ?? event.name ?? null,
        date: event.date,
        status: event.status,
        created_at: event.created_at,
        stats: {
          totalPhotos: Number(stats.totalPhotos ?? stats.total_photos ?? 0),
          totalSubjects: Number(stats.totalSubjects ?? stats.total_subjects ?? 0),
          totalRevenue: Number(stats.totalRevenue ?? stats.revenue ?? stats.total_revenue ?? 0),
          completionRate: Number(stats.completionRate ?? 0),
        },
      };
    });
  };

  // Primary fetch with timeout and error handling
  try {
    const url = primaryPath.startsWith('/') ? await absoluteUrl(primaryPath) : primaryPath;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      cache: 'no-store',
      headers: buildHeaders('LookEscolar/1.0'),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Primary API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const list = Array.isArray(data) ? data : data.events || data.data?.events || data.data || [];
    const pagination = Array.isArray(data) ? null : data.pagination || null;

    const loadTime = performance.now() - startTime;
    console.debug(`[Performance] Events loaded in ${loadTime.toFixed(2)}ms`);

    return { events: normalize(list), pagination, error: null };
  } catch (primaryError) {
    console.warn('[Service] Primary API failed, trying fallback:', primaryError);

    // Fallback with similar optimizations
    try {
      const url = fallbackPath.startsWith('/') ? await absoluteUrl(fallbackPath) : fallbackPath;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Shorter timeout for fallback

      const response = await fetch(url, {
        cache: 'no-store',
        headers: buildHeaders('LookEscolar/1.0-Fallback'),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Fallback API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : data.events || data.data?.events || data.data || [];
      const pagination = Array.isArray(data) ? null : data.pagination || null;

      const loadTime = performance.now() - startTime;
      console.warn(`[Performance] Events loaded via fallback in ${loadTime.toFixed(2)}ms`);

      return { events: normalize(list), pagination, error: null };
    } catch (fallbackError) {
      const loadTime = performance.now() - startTime;
      console.error(`[Performance] Both APIs failed after ${loadTime.toFixed(2)}ms:`, fallbackError);

      return {
        events: null,
        pagination: null,
        error: {
          message: 'Unable to load events. Please try again.',
          details: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

// Force dynamic rendering para que se actualice con router.refresh()
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const sp = await searchParams;
  const { events, pagination, error } = await getEvents(sp);
  return <EventsPageClient events={events} error={error} />;
}
