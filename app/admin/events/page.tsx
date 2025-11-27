import CleanEventsPage from '@/components/admin/events/CleanEventsPage';
import { absoluteUrl } from '@/lib/absoluteUrl';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

type SearchParams = Record<string, string | string[]>;

type AdminEventStats = {
  totalPhotos: number;
  totalSubjects: number;
  totalRevenue: number;
  completionRate: number;
  totalOrders: number;
  conversionRate: number;
};

type AdminEvent = {
  id: string;
  name: string | null;
  school: string | null;
  location: string | null;
  date: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  price_per_photo: number | null;
  stats: AdminEventStats;
  cover_url?: string | null;
};

type EventsPagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;
};

type EventsError =
  | {
      type: 'warning';
      message: string;
      details?: string;
    }
  | {
      type: 'error';
      message: string;
      details?: string;
      timestamp: string;
    };

type EventsResult = {
  events: AdminEvent[] | null;
  pagination: EventsPagination | null;
  error: EventsError | null;
};

const PRIMARY_TIMEOUT_MS = 15000;
const FALLBACK_TIMEOUT_MS = 10000;
const ALLOWED_SORT_FIELDS = new Set(['created_at', 'date', 'name', 'status']);

// Normaliza la respuesta de los distintos orígenes para la UI
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toFiniteNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const parseInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
};

const parsePositiveInteger = (value: unknown): number | null => {
  const parsed = parseInteger(value);
  if (parsed === null || parsed <= 0) return null;
  return parsed;
};

const parseNonNegativeInteger = (value: unknown): number | null => {
  const parsed = parseInteger(value);
  if (parsed === null || parsed < 0) return null;
  return parsed;
};

const readStat = (
  sources: Array<Record<string, unknown>>,
  keys: string[]
): number => {
  for (const source of sources) {
    for (const key of keys) {
      if (key in source) {
        return toFiniteNumber(source[key]);
      }
    }
  }
  return 0;
};

const normalizeEvent = (raw: unknown): AdminEvent | null => {
  if (!isRecord(raw)) return null;

  const id = toTrimmedString(raw.id);
  if (!id) return null;

  const statsSources: Record<string, unknown>[] = [];
  if (isRecord(raw.stats)) statsSources.push(raw.stats);
  if (isRecord(raw.metrics)) statsSources.push(raw.metrics);
  statsSources.push(raw);

  const status =
    toTrimmedString(raw.status) ??
    (typeof raw.active === 'boolean'
      ? raw.active
        ? 'active'
        : 'inactive'
      : null);

  const pricePerPhotoValue =
    raw.price_per_photo ?? raw.photo_price ?? raw.pricePerPhoto;

  const pricePerPhoto =
    pricePerPhotoValue === undefined || pricePerPhotoValue === null
      ? null
      : toFiniteNumber(pricePerPhotoValue);

  const coverUrl =
    toTrimmedString((raw as any).cover_url) ??
    toTrimmedString((raw as any).cover) ??
    null;

  return {
    id,
    name: toTrimmedString(raw.name),
    school:
      toTrimmedString(raw.school) ??
      toTrimmedString(raw.location) ??
      toTrimmedString(raw.name),
    location: toTrimmedString(raw.location),
    date: toTrimmedString(raw.date),
    status,
    created_at: toTrimmedString(raw.created_at),
    updated_at: toTrimmedString(raw.updated_at),
    price_per_photo: pricePerPhoto,
    cover_url: coverUrl,
    stats: {
      totalPhotos: readStat(statsSources, ['totalPhotos', 'total_photos']),
      totalSubjects: readStat(statsSources, [
        'totalSubjects',
        'total_subjects',
      ]),
      totalRevenue: readStat(statsSources, [
        'totalRevenue',
        'total_revenue',
        'revenue',
      ]),
      completionRate: readStat(statsSources, [
        'completionRate',
        'completion_rate',
        'completion_rate_percent',
      ]),
      totalOrders: readStat(statsSources, ['totalOrders', 'total_orders']),
      conversionRate: readStat(statsSources, [
        'conversionRate',
        'conversion_rate',
        'conversion_rate_percent',
      ]),
    },
  };
};

const normalizeEvents = (raw: unknown): AdminEvent[] => {
  if (!Array.isArray(raw)) return [];

  const normalized: AdminEvent[] = [];
  for (const event of raw) {
    const parsed = normalizeEvent(event);
    if (parsed) normalized.push(parsed);
  }
  return normalized;
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
): EventsPagination => {
  const safeLimit = Math.max(1, limit);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const hasMore =
    typeof hasMoreOverride === 'boolean'
      ? hasMoreOverride
      : page < totalPages;

  return {
    page,
    limit: safeLimit,
    total,
    total_pages: totalPages,
    has_more: hasMore,
  };
};

const extractEventList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) return [];

  if (Array.isArray(payload.events)) {
    return payload.events;
  }

  if (isRecord(payload.data)) {
    const data = payload.data;
    if (Array.isArray(data.events)) return data.events;
    if (Array.isArray(data.data)) return data.data;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};

const normalizePagination = (value: unknown): EventsPagination | null => {
  if (!isRecord(value)) return null;

  const page = parsePositiveInteger(value.page) ?? 1;
  const limit = parsePositiveInteger(value.limit) ?? 50;
  const total = parseNonNegativeInteger(value.total) ?? 0;
  const totalPages =
    parsePositiveInteger(value.total_pages ?? value.totalPages) ??
    Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const hasMoreRaw =
    value.has_more ?? value.hasMore ?? value.hasMorePages ?? undefined;
  const hasMore =
    typeof hasMoreRaw === 'boolean' ? hasMoreRaw : page < totalPages;

  return {
    page,
    limit,
    total,
    total_pages: totalPages,
    has_more: hasMore,
  };
};

const extractPagination = (payload: unknown): EventsPagination | null => {
  if (!isRecord(payload)) return null;

  const direct = normalizePagination(payload.pagination);
  if (direct) return direct;

  if (isRecord(payload.data)) {
    const nested = normalizePagination(payload.data.pagination);
    if (nested) return nested;
  }

  return null;
};

async function fetchEventsFromApi(
  path: string,
  timeoutMs: number,
  userAgent: string
): Promise<{ events: AdminEvent[]; pagination: EventsPagination | null }> {
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

    const data = (await response.json()) as unknown;
    const list = extractEventList(data);
    const pagination = Array.isArray(data) ? null : extractPagination(data);

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
}): Promise<{ events: AdminEvent[]; pagination: EventsPagination | null }> {
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

    const events = (data || []).map((event: Record<string, unknown>) => ({
      ...event,
      school: (event.location ?? event.name ?? null) as string | null,
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

    const events = (legacyData || []).map((event: Record<string, unknown>) => ({
      id: event.id as string,
      name: event.name as string | null,
      school: ((event.school ?? event.name ?? null) as string | null),
      location: (event.school as string | null) ?? null,
      date: event.date as string | null,
      status:
        typeof event.active === 'boolean'
          ? event.active
            ? 'active'
            : 'inactive'
          : undefined,
      created_at: event.created_at as string | null,
      updated_at: event.updated_at as string | null,
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
async function getEvents(
  searchParams: SearchParams = {}
): Promise<EventsResult> {
  const startTime = performance.now();

  const rawPage = pickFirst(searchParams.page);
  const rawLimit = pickFirst(searchParams.limit);
  const rawStatus = pickFirst(searchParams.status);
  const rawSortBy = pickFirst(searchParams.sort_by);
  const rawSortOrder = pickFirst(searchParams.sort_order);

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
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { events, pagination, error } = await getEvents(resolvedSearchParams ?? {});

  return <CleanEventsPage events={events} error={error} />;
}
