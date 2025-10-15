import { EventsPageClient } from '@/components/admin/EventsPageClean';
import { absoluteUrl } from '@/lib/absoluteUrl';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

type SearchParams = Record<string, string | string[]>;

const PRIMARY_TIMEOUT_MS = 15000;
const FALLBACK_TIMEOUT_MS = 10000;
const ALLOWED_SORT_FIELDS = new Set(['created_at', 'date', 'name', 'status']);

// Normaliza la respuesta de los distintos orígenes para la UI
const normalizeEvents = (raw: any[]): any[] => {
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
        totalRevenue: Number(
          stats.totalRevenue ?? stats.revenue ?? stats.total_revenue ?? 0
        ),
        completionRate: Number(stats.completionRate ?? 0),
      },
    };
  });
};

const pickFirst = (value?: string | string[]): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number,
  hasMoreOverride?: boolean
) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    total_pages: totalPages,
    has_more:
      typeof hasMoreOverride === 'boolean'
        ? hasMoreOverride
        : page < totalPages,
  };
};

async function fetchEventsFromApi(
  path: string,
  timeoutMs: number,
  userAgent: string
) {
  const url = path.startsWith('/') ? await absoluteUrl(path) : path;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const list = Array.isArray(data)
      ? data
      : data.events || data.data?.events || data.data || [];
    const pagination = Array.isArray(data) ? null : data.pagination || null;

    return { events: normalizeEvents(list), pagination };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchEventsDirect(options: {
  page: number;
  limit: number;
  offset: number;
  status?: string;
  paginated: boolean;
}) {
  const { page, limit, offset, status, paginated } = options;
  const supabase = await createServerSupabaseServiceClient();
  const rangeStart = paginated ? offset : 0;
  const rangeEnd = paginated ? offset + limit - 1 : limit - 1;

  try {
    let query = supabase
      .from('events')
      .select(
        'id, name, location, date, status, price_per_photo, created_at, updated_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (status === 'active') {
      query = query.eq('status', 'active');
    } else if (status === 'inactive') {
      query = query.eq('status', 'inactive');
    }

    if (paginated) {
      query = query.range(rangeStart, rangeEnd);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const events = (data || []).map((event) => ({
      ...event,
      school: event.location ?? event.school ?? event.name ?? null,
    }));

    const total =
      typeof count === 'number' ? count : offset + events.length;
    const hasMore =
      typeof count === 'number'
        ? page * limit < count
        : events.length === limit;

    return {
      events: normalizeEvents(events),
      pagination: paginated
        ? buildPaginationMeta(total, page, limit, hasMore)
        : null,
    };
  } catch (newSchemaError) {
    console.warn(
      '[Service] Direct Supabase fetch (new schema) failed, trying legacy fields',
      newSchemaError
    );

    let legacyQuery = supabase
      .from('events')
      .select('id, name, school, date, active, created_at, updated_at', {
        count: 'exact',
      })
      .order('created_at', { ascending: false });

    if (status === 'active') {
      legacyQuery = legacyQuery.eq('active', true);
    } else if (status === 'inactive') {
      legacyQuery = legacyQuery.eq('active', false);
    }

    if (paginated) {
      legacyQuery = legacyQuery.range(rangeStart, rangeEnd);
    }

    const { data: legacyData, error: legacyError, count: legacyCount } =
      await legacyQuery;

    if (legacyError) {
      throw legacyError;
    }

    const events = (legacyData || []).map((event) => ({
      id: event.id,
      name: event.name,
      school: event.school ?? event.name ?? null,
      location: event.school ?? null,
      date: event.date,
      status:
        typeof event.active === 'boolean'
          ? event.active
            ? 'active'
            : 'inactive'
          : undefined,
      created_at: event.created_at,
      updated_at: event.updated_at,
    }));

    const total =
      typeof legacyCount === 'number'
        ? legacyCount
        : offset + events.length;
    const hasMore =
      typeof legacyCount === 'number'
        ? page * limit < legacyCount
        : events.length === limit;

    return {
      events: normalizeEvents(events),
      pagination: paginated
        ? buildPaginationMeta(total, page, limit, hasMore)
        : null,
    };
  }
}

// Optimized events fetcher with multi-layer fallbacks
export async function getEvents(
  searchParams: SearchParams = {}
): Promise<{
  events: any[] | null;
  pagination: any;
  error: any;
}> {
  const startTime = performance.now();

  const rawPage = pickFirst(searchParams['page']);
  const rawLimit = pickFirst(searchParams['limit']);
  const rawStatus = pickFirst(searchParams['status']);
  const rawSortBy = pickFirst(searchParams['sort_by']);
  const rawSortOrder = pickFirst(searchParams['sort_order']);

  const page = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(rawLimit ?? '50', 10) || 50)
  );
  const offset = (page - 1) * limit;
  const status =
    rawStatus && rawStatus !== 'all' ? rawStatus.trim() : undefined;
  const sortBy =
    rawSortBy && ALLOWED_SORT_FIELDS.has(rawSortBy.trim())
      ? rawSortBy.trim()
      : undefined;
  const sortOrder =
    rawSortOrder && ['asc', 'desc'].includes(rawSortOrder.trim())
      ? rawSortOrder.trim()
      : undefined;

  const qp = new URLSearchParams();
  qp.set('include_stats', 'true');
  qp.set('page', page.toString());
  qp.set('limit', limit.toString());
  if (status) qp.set('status', status);
  if (sortBy) qp.set('sort_by', sortBy);
  if (sortOrder) qp.set('sort_order', sortOrder);

  const primaryPath = `/api/admin/events?${qp.toString()}`;
  const fallbackParams = new URLSearchParams(qp);
  fallbackParams.set('include_stats', 'false');
  const fallbackPath = `/api/admin/events-robust?${fallbackParams.toString()}`;

  let lastError: unknown = null;

  try {
    const result = await fetchEventsFromApi(
      primaryPath,
      PRIMARY_TIMEOUT_MS,
      'LookEscolar/1.0'
    );
    const loadTime = performance.now() - startTime;
    console.debug(
      `[Performance] Events loaded in ${loadTime.toFixed(2)}ms via primary API`
    );
    return { ...result, error: null };
  } catch (primaryError) {
    lastError = primaryError;
    console.warn(
      '[Service] Primary events API failed, trying fallback',
      primaryError
    );
  }

  try {
    const result = await fetchEventsFromApi(
      fallbackPath,
      FALLBACK_TIMEOUT_MS,
      'LookEscolar/1.0-Fallback'
    );
    const loadTime = performance.now() - startTime;
    console.warn(
      `[Service] Events loaded via robust fallback (sin estadísticas) en ${loadTime.toFixed(2)}ms`
    );
    return {
      ...result,
      error: {
        type: 'warning',
        message:
          'Mostrando eventos en modo fallback. Algunas métricas pueden no estar disponibles.',
        details:
          lastError instanceof Error
            ? lastError.message
            : String(lastError ?? 'Primary API unavailable'),
      },
    };
  } catch (fallbackError) {
    lastError = fallbackError;
    console.error(
      '[Service] Fallback events API failed, trying direct Supabase fetch',
      fallbackError
    );
  }

  try {
    const result = await fetchEventsDirect({
      page,
      limit,
      offset,
      status,
      paginated: true,
    });
    const loadTime = performance.now() - startTime;
    console.warn(
      `[Service] Events loaded via direct Supabase fallback en ${loadTime.toFixed(
        2
      )}ms`
    );
    return {
      ...result,
      error: {
        type: 'warning',
        message:
          'Se cargaron los eventos en modo degradado. Algunas estadísticas se muestran como 0.',
        details:
          lastError instanceof Error
            ? lastError.message
            : String(lastError ?? 'Fallback API unavailable'),
      },
    };
  } catch (directError) {
    const loadTime = performance.now() - startTime;
    console.error(
      `[Performance] All event fetch strategies failed after ${loadTime.toFixed(
        2
      )}ms`,
      directError
    );
    return {
      events: null,
      pagination: null,
      error: {
        type: 'error',
        message: 'Unable to load events. Please try again.',
        details:
          directError instanceof Error
            ? directError.message
            : String(directError),
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// Force dynamic rendering para que se actualice con router.refresh()
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EventsPage({
  searchParams = {},
}: {
  searchParams?: SearchParams;
}) {
  const { events, pagination, error } = await getEvents(searchParams);
  return (
    <EventsPageClient events={events} pagination={pagination} error={error} />
  );
}
