import { EventsPageClient } from '@/components/admin/EventsPageClean';
import { absoluteUrl } from '@/lib/absoluteUrl';

// Obtiene eventos desde el backend con fallback robusto y normalización de datos.
export async function getEvents(searchParams?: Record<string, string | string[]>) {
  // Construir query conservando compatibilidad con el API actual
  const qp = new URLSearchParams();
  qp.set('include_stats', 'true');
  // paginación por defecto
  const page = (searchParams && typeof searchParams['page'] === 'string') ? Number(searchParams['page']) : 1;
  const limit = (searchParams && typeof searchParams['limit'] === 'string') ? Number(searchParams['limit']) : 50;
  qp.set('page', String(isNaN(page) ? 1 : page));
  qp.set('limit', String(isNaN(limit) ? 50 : Math.min(100, Math.max(1, limit))));

  if (searchParams) {
    const status = searchParams['status'];
    const sortBy = searchParams['sort_by'];
    const sortOrder = searchParams['sort_order'];
    if (typeof status === 'string' && status) qp.set('status', status);
    if (typeof sortBy === 'string' && sortBy) qp.set('sort_by', sortBy);
    if (typeof sortOrder === 'string' && sortOrder) qp.set('sort_order', sortOrder);
  }

  const primaryPath = `/api/admin/events?${qp.toString()}`;
  const fallbackPath = `/api/admin/events-robust?${qp.toString()}`;

  // Helper para normalizar respuesta cualquiera sea su forma
  const normalize = (raw: any[]) => {
    return (raw || []).map((e: any) => {
      // Normalizar stats de snake_case a camelCase si vienen del endpoint robusto
      const stats = e?.stats || {};
      const normalizedStats = {
        totalPhotos: stats.totalPhotos ?? stats.total_photos ?? 0,
        totalSubjects: stats.totalSubjects ?? stats.total_subjects ?? 0,
        totalRevenue:
          stats.totalRevenue ?? stats.revenue ?? stats.total_revenue ?? 0,
      };

      return {
        ...e,
        school: e.school ?? e.location ?? e.name ?? null,
        stats: normalizedStats,
      };
    });
  };

  try {
    const url = primaryPath.startsWith('/')
      ? await absoluteUrl(primaryPath)
      : primaryPath;

    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Primary events API failed');

    const data = await response.json();
    const list = Array.isArray(data) ? data : data.events || data.data?.events || data.data || [];
    const pagination = Array.isArray(data) ? null : data.pagination || null;
    return { events: normalize(list), pagination, error: null };
  } catch (primaryError) {
    console.warn('[Service] Fallback to robust events API due to:', primaryError);
    try {
      const url = fallbackPath.startsWith('/')
        ? await absoluteUrl(fallbackPath)
        : fallbackPath;

      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Fallback events API failed');

      const data = await response.json();
      const list = Array.isArray(data) ? data : data.events || data.data?.events || data.data || [];
      const pagination = Array.isArray(data) ? null : data.pagination || null;
      return { events: normalize(list), pagination, error: null };
    } catch (fallbackError) {
      console.error('[Service] Error obteniendo eventos (fallback):', fallbackError);
      return { events: null, pagination: null, error: fallbackError };
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
  return <EventsPageClient events={events} error={error} pagination={pagination} />;
}
