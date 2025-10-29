'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  CalendarDays,
  CircleDollarSign,
  Eye,
  Image,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  AdminEvent,
  EventListRow,
  EventQuickActionsDialog,
  EventStatsSummary,
  EventGridSkeleton,
  EventListSkeleton,
} from '@/components/admin/events';
import {
  formatEventDate,
  getEventDisplayName,
} from '@/components/admin/events/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;
};

type EventsPageClientProps = {
  events: AdminEvent[] | null;
  pagination?: Pagination | null;
  error: {
    type: 'warning' | 'error';
    message: string;
    details?: string;
  } | null;
};

const STATUS_LABELS: Record<string, string> = {
  active: 'activos',
  completed: 'completados',
  draft: 'en borrador',
  archived: 'archivados',
  inactive: 'inactivos',
  paused: 'pausados',
  error: 'con errores',
};

const DEFAULT_PAGE_SIZE = 24;
const FETCH_TIMEOUT_MS = 10000;

const clampPercentage = (value: number | null | undefined): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  const asPercent = value <= 1 ? value * 100 : value;
  if (!Number.isFinite(asPercent)) return null;
  return Math.max(0, Math.min(100, asPercent));
};

interface EventShowcaseCardProps {
  event: AdminEvent;
  onQuickView: (event: AdminEvent) => void;
  onDelete: (event: AdminEvent) => void;
  isDeleting: boolean;
}

const EventShowcaseCard = ({
  event,
  onQuickView,
  onDelete,
  isDeleting,
}: EventShowcaseCardProps) => {
  const displayName = getEventDisplayName(event);
  const eventDateLabel = formatEventDate(event.date);
  const totalPhotos = event.stats?.totalPhotos ?? 0;
  const totalSubjects = event.stats?.totalSubjects ?? 0;
  const totalRevenue = event.stats?.totalRevenue ?? 0;

  const completionRate = clampPercentage(event.stats?.completionRate);
  const conversionRate = clampPercentage(event.stats?.conversionRate);

  const completionLabel =
    completionRate !== null ? `${Math.round(completionRate)}%` : 'Sin datos';
  const conversionLabel =
    conversionRate !== null ? `${Math.round(conversionRate)}%` : 'Pendiente';

  const metrics = [
    {
      label: 'Fotos',
      value: totalPhotos.toLocaleString('es-AR'),
      icon: Image,
    },
    {
      label: 'Estudiantes',
      value: totalSubjects.toLocaleString('es-AR'),
      icon: Users,
    },
    {
      label: 'Ingresos',
      value: new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
      }).format(totalRevenue),
      icon: CircleDollarSign,
    },
    {
      label: 'Actualizado',
      value: formatEventDate(event.updated_at ?? event.created_at),
      icon: TrendingUp,
    },
  ];

  const statusTone: Record<string, string> = {
    active:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-500/10 dark:text-emerald-200',
    draft:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-500/10 dark:text-amber-200',
    completed:
      'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-500/10 dark:text-sky-200',
    archived:
      'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/40 dark:text-slate-300',
    inactive:
      'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/40 dark:text-slate-300',
    paused:
      'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-700/40 dark:bg-purple-500/10 dark:text-purple-200',
  };

  const normalizedStatus = event.status?.toString().toLowerCase();
  const statusClassName =
    normalizedStatus && statusTone[normalizedStatus]
      ? statusTone[normalizedStatus]
      : 'border-[#d0d5dd] bg-white/70 text-[#1f2a44] dark:border-slate-700/40 dark:bg-slate-900/70 dark:text-slate-100';

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] border border-white/40 bg-white/85 p-6 shadow-[0_32px_90px_-45px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-800/40 dark:bg-slate-950/70',
        'transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_36px_110px_-44px_rgba(31,42,68,0.55)]'
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#1f2a44]/12 via-transparent to-[#62e2a2]/16 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:border-slate-700/50" />
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#4b5563] dark:text-slate-400">
              {eventDateLabel}
            </p>
            <h3 className="mt-2 truncate text-xl font-semibold text-[#0f172a] dark:text-white">
              {displayName}
            </h3>
            <p className="mt-1 text-sm text-[#475467] dark:text-slate-300">
              {event.location ?? event.school ?? 'Evento LookEscolar'}
            </p>
          </div>
          {event.status && (
            <Badge
              className={cn(
                'rounded-full px-3 py-1 text-xs capitalize shadow-sm backdrop-blur',
                statusClassName
              )}
            >
              {event.status}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-[#1f2937] sm:grid-cols-4">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner transition-colors duration-200 hover:border-[#62e2a2]/60 hover:bg-white dark:border-slate-700/50 dark:bg-slate-900/70"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#4b5563] dark:text-slate-400">
                <Icon className="h-4 w-4 text-[#62e2a2]" aria-hidden />
                {label}
              </div>
              <span className="mt-2 block text-lg font-semibold text-[#0f172a] dark:text-white">
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4b5563] dark:text-slate-400">
              <span>Finalización</span>
              <span className="text-[#1f2a44] dark:text-white">{completionLabel}</span>
            </div>
            <Progress value={completionRate ?? 0} className="h-2 bg-[#e2e8f0] dark:bg-slate-800" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4b5563] dark:text-slate-400">
              <span>Conversión Pixieset</span>
              <span className="text-[#1f2a44] dark:text-white">{conversionLabel}</span>
            </div>
            <Progress value={conversionRate ?? 0} className="h-2 bg-[#e2e8f0] dark:bg-slate-800" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/40 pt-4 dark:border-slate-700/40">
          <div className="flex items-center gap-2 text-xs text-[#4b5563] dark:text-slate-300">
            <CalendarDays className="h-4 w-4 text-[#1f2a44] dark:text-white" aria-hidden />
            <span>{eventDateLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/events/${event.id}/unified`} className="flex items-center gap-2 rounded-full border border-transparent bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
              <Eye className="h-4 w-4" aria-hidden />
              <span>Abrir evento</span>
            </Link>
            <Link href={`/admin/events/${event.id}/unified#photos`} className="flex items-center gap-2 rounded-full border border-transparent bg-transparent px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white/80 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-900">
              <Image className="h-4 w-4" aria-hidden />
              <span>Biblioteca</span>
            </Link>
            <Link href={`/admin/store-settings?eventId=${event.id}`} className="flex items-center gap-2 rounded-full border border-transparent bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              <Store className="h-4 w-4" aria-hidden />
              <span>Tienda Pixieset</span>
            </Link>
            <Button
              variant="modern"
              modernTone="ghost"
              size="sm"
              onClick={() => onQuickView(event)}
              className="text-[#1f2a44] hover:text-[#0f172a]"
            >
              Vista rápida
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(event)}
              loading={isDeleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Eliminar
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};

function withErrorBoundary<P>(Component: React.ComponentType<P>): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    try {
      return <Component {...props} />;
    } catch (err) {
      console.error('Events page failed to render', err);
      return (
        <div className="px-6 py-12">
          <Card className="mx-auto max-w-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5" aria-hidden />
              <div>
                <h2 className="text-lg font-semibold">Error al renderizar eventos</h2>
                <p className="mt-1 text-sm">
                  Recargá la página o contactá al equipo técnico si el problema persiste.
                </p>
              </div>
            </div>
          </Card>
        </div>
      );
    }
  };
}

const EventsPageClientBase: React.FC<EventsPageClientProps> = ({
  events,
  pagination: initialPagination,
  error,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const resolvedInitialEvents = useMemo(() => events ?? [], [events]);

  const [list, setList] = useState<AdminEvent[]>(resolvedInitialEvents);
  const [pagination, setPagination] = useState<Pagination | null>(() => {
    if (initialPagination) return initialPagination;
    if (resolvedInitialEvents.length === 0) return null;
    return {
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      total: resolvedInitialEvents.length,
      total_pages: 1,
      has_more: false,
    };
  });

  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') ?? 'all'
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    searchParams.get('view') === 'list' ? 'list' : 'grid'
  );
  const [searchTerm, setSearchTerm] = useState<string>(
    searchParams.get('q') ?? ''
  );
  const [startDate, setStartDate] = useState<string>(
    searchParams.get('from') ?? ''
  );
  const [endDate, setEndDate] = useState<string>(
    searchParams.get('to') ?? ''
  );
  const [loadingFirstPage, setLoadingFirstPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [quickViewEvent, setQuickViewEvent] = useState<AdminEvent | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const debouncedQuery = useDebounce(searchTerm, 300);
  const initialLoadRef = useRef(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setList(resolvedInitialEvents);
  }, [resolvedInitialEvents]);

  useEffect(() => {
    if (initialPagination) {
      setPagination(initialPagination);
    } else if (resolvedInitialEvents.length > 0 && !pagination) {
      setPagination({
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        total: resolvedInitialEvents.length,
        total_pages: 1,
        has_more: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPagination, resolvedInitialEvents.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    if (debouncedQuery) params.set('q', debouncedQuery);
    else params.delete('q');

    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    else params.delete('status');

    if (startDate) params.set('from', startDate);
    else params.delete('from');

    if (endDate) params.set('to', endDate);
    else params.delete('to');

    params.delete('page');
    params.delete('offset');
    params.set('view', viewMode);

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [debouncedQuery, endDate, router, startDate, statusFilter, viewMode]);

  const startDateValue = useMemo(
    () => (startDate ? new Date(`${startDate}T00:00:00`) : null),
    [startDate]
  );
  const endDateValue = useMemo(
    () => (endDate ? new Date(`${endDate}T23:59:59.999`) : null),
    [endDate]
  );

  const filteredEvents = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    const desiredStatus = statusFilter.toLowerCase();

    return list.filter((event) => {
      const statusNormalized = event.status?.toString().toLowerCase();
      const matchesStatus =
        desiredStatus === 'all' || statusNormalized === desiredStatus;

      const matchesQuery =
        !query ||
        [event.name, event.school, event.location]
          .filter(
            (field): field is string =>
              typeof field === 'string' && field.trim().length > 0
          )
          .some((field) => field.toLowerCase().includes(query));

      if (!matchesStatus || !matchesQuery) return false;

      if (!startDateValue && !endDateValue) return true;

      if (!event.date) return false;
      const currentDate = new Date(event.date);
      if (Number.isNaN(currentDate.getTime())) return false;

      if (startDateValue && currentDate < startDateValue) return false;
      if (endDateValue && currentDate > endDateValue) return false;

      return true;
    });
  }, [debouncedQuery, endDateValue, list, startDateValue, statusFilter]);

  const totals = useMemo(
    () =>
      filteredEvents.reduce(
        (acc, event) => {
          acc.totalPhotos += event.stats?.totalPhotos ?? 0;
          acc.totalSubjects += event.stats?.totalSubjects ?? 0;
          acc.totalRevenue += event.stats?.totalRevenue ?? 0;
          return acc;
        },
        { totalPhotos: 0, totalSubjects: 0, totalRevenue: 0 }
      ),
    [filteredEvents]
  );

  const hasFilters =
    statusFilter !== 'all' ||
    Boolean(debouncedQuery) ||
    Boolean(startDate) ||
    Boolean(endDate);

  const showSkeleton = loadingFirstPage && list.length === 0;
  const isEmptyState = !loadingFirstPage && filteredEvents.length === 0;

  const fetchEventsPage = useCallback(
    async (pageNumber: number) => {
      const params = new URLSearchParams();
      params.set('include_stats', 'true');
      params.set('page', String(pageNumber));
      const effectiveLimit = pagination?.limit ?? DEFAULT_PAGE_SIZE;
      params.set('limit', String(effectiveLimit));

      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(`/api/admin/events?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const rawList =
          Array.isArray(payload)
            ? payload
            : payload.events ?? payload.data?.events ?? payload.data ?? [];
        const normalizedEvents: AdminEvent[] = Array.isArray(rawList)
          ? rawList.map((entry) => entry as AdminEvent)
          : [];

        const paginationPayload = Array.isArray(payload)
          ? null
          : (payload.pagination as Pagination | null | undefined) ?? null;

        return { events: normalizedEvents, pagination: paginationPayload };
      } finally {
        window.clearTimeout(timeout);
      }
    },
    [debouncedQuery, endDate, pagination?.limit, startDate, statusFilter]
  );

  const loadFirstPage = useCallback(async () => {
    setLoadingFirstPage(true);
    setClientError(null);
    try {
      const result = await fetchEventsPage(1);
      if (!result) return;

      setList(result.events);
      setPagination((prev) => {
        if (result.pagination) return result.pagination;
        if (result.events.length === 0) return null;
        const fallbackLimit = prev?.limit ?? DEFAULT_PAGE_SIZE;
        return {
          page: 1,
          limit: fallbackLimit,
          total: result.events.length,
          total_pages: 1,
          has_more: result.events.length >= fallbackLimit,
        };
      });
      setQuickViewOpen(false);
      setQuickViewEvent(null);
    } catch (err) {
      console.error('Failed to refresh events', err);
      setClientError('No pudimos actualizar la lista de eventos. Intenta nuevamente.');
    } finally {
      setLoadingFirstPage(false);
    }
  }, [fetchEventsPage]);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      if (resolvedInitialEvents.length === 0) {
        void loadFirstPage();
      }
      return;
    }
    void loadFirstPage();
  }, [loadFirstPage, resolvedInitialEvents.length]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !pagination?.has_more) return;
    setLoadingMore(true);
    setClientError(null);

    try {
      const nextPage = (pagination?.page ?? 1) + 1;
      const result = await fetchEventsPage(nextPage);
      if (!result) return;

      let appended = 0;
      setList((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const unique = result.events.filter(
          (item) => item && item.id && !existingIds.has(item.id)
        );
        appended = unique.length;
        if (unique.length === 0) return prev;
        return [...prev, ...unique];
      });

      setPagination((prev) => {
        if (result.pagination) return result.pagination;
        if (!prev) {
          return {
            page: nextPage,
            limit: DEFAULT_PAGE_SIZE,
            total: appended,
            total_pages: nextPage,
            has_more: appended >= DEFAULT_PAGE_SIZE,
          };
        }
        return {
          ...prev,
          page: nextPage,
          total: prev.total + appended,
          has_more:
            appended > 0 && appended >= (prev.limit ?? DEFAULT_PAGE_SIZE),
        };
      });
    } catch (err) {
      console.error('Failed to load more events', err);
      setClientError('No pudimos cargar más eventos.');
    } finally {
      setLoadingMore(false);
    }
  }, [fetchEventsPage, loadingMore, pagination]);

  useEffect(() => {
    if (!pagination?.has_more) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: '240px' }
    );
    const current = sentinelRef.current;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
      observer.disconnect();
    };
  }, [loadMore, pagination?.has_more]);

  const handleQuickView = useCallback((event: AdminEvent) => {
    setQuickViewEvent(event);
    setQuickViewOpen(true);
  }, []);

  const handleDeleteEvent = useCallback(
    async (event: AdminEvent) => {
      const name = getEventDisplayName(event);
      const totalPhotos = event.stats?.totalPhotos ?? 0;
      const totalSubjects = event.stats?.totalSubjects ?? 0;

      const warningLines = [
        totalPhotos > 0
          ? `• ${totalPhotos.toLocaleString('es-AR')} fotos`
          : null,
        totalSubjects > 0
          ? `• ${totalSubjects.toLocaleString('es-AR')} estudiantes`
          : null,
      ].filter(Boolean);

      const confirmMessage = [
        `¿Eliminar el evento "${name}"?`,
        warningLines.length ? '' : null,
        warningLines.length ? 'Esta acción eliminará:' : null,
        ...warningLines,
        warningLines.length ? '' : null,
        'No se puede deshacer.',
      ]
        .filter(Boolean)
        .join('\n');

      if (!window.confirm(confirmMessage)) return;

      setDeletingEventId(event.id);
      try {
        const response = await fetch(`/api/admin/events/${event.id}?force=true`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? 'No se pudo eliminar el evento.');
        }

        setList((prev) => prev.filter((item) => item.id !== event.id));
        setPagination((prev) =>
          prev
            ? {
                ...prev,
                total: Math.max(0, prev.total - 1),
              }
            : prev
        );

        if (quickViewEvent?.id === event.id) {
          setQuickViewOpen(false);
          setQuickViewEvent(null);
        }

        toast.success('Evento eliminado');
        router.refresh();
      } catch (err) {
        console.error('Error deleting event', err);
        toast.error(
          err instanceof Error
            ? err.message
            : 'Error al eliminar el evento. Intenta nuevamente.'
        );
      } finally {
        setDeletingEventId(null);
      }
    },
    [quickViewEvent?.id, router]
  );

  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
  }, []);

  const hasSearch = debouncedQuery.trim().length > 0;
  const hasDateFilters = Boolean(startDate || endDate);
  const hasStatusFilters = statusFilter !== 'all';
  const activeFiltersCount = [hasSearch, hasStatusFilters, hasDateFilters].filter(Boolean).length;

  const statusLabelText = STATUS_LABELS[statusFilter] ?? statusFilter;
  const formattedStartDate = startDate
    ? new Date(`${startDate}T00:00:00`).toLocaleDateString('es-AR', {
        dateStyle: 'medium',
      })
    : null;
  const formattedEndDate = endDate
    ? new Date(`${endDate}T23:59:59`).toLocaleDateString('es-AR', {
        dateStyle: 'medium',
      })
    : null;

  const heroEyebrow = hasSearch
    ? 'Resultados de búsqueda'
    : hasStatusFilters
      ? `Eventos ${statusLabelText}`
      : hasDateFilters
        ? 'Eventos filtrados por fecha'
        : 'Eventos Pixieset';

  const heroTitle = hasSearch
    ? `Encontramos ${filteredEvents.length} evento${filteredEvents.length === 1 ? '' : 's'} para “${debouncedQuery}”`
    : hasStatusFilters
      ? `Gestioná tus eventos ${statusLabelText}`
      : hasDateFilters
        ? `Eventos entre ${formattedStartDate ?? 'todas las fechas'} y ${formattedEndDate ?? 'hoy'}`
        : 'Gestioná tus eventos como una galería premium';

  const heroSubtitle = hasSearch
    ? 'Refiná los filtros o crea un evento nuevo si necesitás iniciar una campaña desde cero.'
    : hasStatusFilters
      ? 'Supervisá el estado operativo, accedé a tus bibliotecas y activá la tienda Pixieset sin abandonar este tablero.'
      : hasDateFilters
        ? 'Explorá la actividad de tus eventos según su calendario y toma decisiones en contexto.'
        : 'Visualizá métricas clave, dispara workflows y mantené tu operación siempre alineada con la experiencia Pixieset.';

  const totalEvents = list.length;
  const visibleRatioLabel = totalEvents > 0 ? `${filteredEvents.length} / ${totalEvents}` : String(filteredEvents.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7fa] via-[#eef2ff] to-[#f4f8ff] dark:from-slate-950 dark:via-indigo-950/20 dark:to-blue-950/25">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-8 px-5 pb-24 pt-8 sm:px-8 lg:px-12 xl:px-16">
        <section className="relative overflow-hidden rounded-[36px] border border-white/40 bg-white/80 px-8 py-10 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-800/40 dark:bg-slate-950/70">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1f2a44]/12 via-transparent to-[#62e2a2]/16" />
          <div className="relative z-10 flex flex-col gap-10 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex-1 space-y-6">
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#4b5563] dark:text-slate-400">
                <Sparkles className="h-4 w-4 text-[#62e2a2]" aria-hidden />
                <span>{heroEyebrow}</span>
                {activeFiltersCount > 0 && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-[#62e2a2]/40 bg-[#62e2a2]/10 px-3 py-1 text-[11px] font-semibold normal-case tracking-normal text-[#0f172a] dark:border-[#62e2a2]/30 dark:bg-[#62e2a2]/10 dark:text-[#f8fafc]"
                  >
                    {activeFiltersCount} filtro{activeFiltersCount === 1 ? '' : 's'} activo{activeFiltersCount === 1 ? '' : 's'}
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-[#101828] dark:text-white">
                  {heroTitle}
                </h1>
                <p className="text-base text-[#475467] dark:text-slate-300">
                  {heroSubtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-medium text-[#0f172a] shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100">
                  Visibles: {visibleRatioLabel}
                </Badge>
                {hasStatusFilters && (
                  <Badge variant="outline" className="rounded-full border-[#62e2a2]/40 bg-[#62e2a2]/10 px-3 py-1 text-xs font-medium text-[#0f172a] dark:border-[#62e2a2]/40 dark:text-[#62e2a2]">
                    Estado: {statusLabelText}
                  </Badge>
                )}
                {hasSearch && (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
                    “{debouncedQuery}”
                  </Badge>
                )}
                {hasDateFilters && (
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium text-[#475467] dark:text-slate-200">
                    {formattedStartDate ?? 'Todas las fechas'} → {formattedEndDate ?? 'Hoy'}
                  </Badge>
                )}
              </div>

              {(error || clientError) && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold">
                      {error?.message ?? clientError}
                    </p>
                    {(error?.details || clientError) && (
                      <p className="mt-1 text-xs text-amber-600/90 dark:text-amber-200/80">
                        {error?.details ?? 'Probá actualizando la vista o ajustá los filtros.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

             <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto xl:flex-col xl:items-end">
               <Link 
                 href="/admin/events/new"
                 className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-base font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 sm:w-auto xl:w-full"
               >
                 <Plus className="h-5 w-5" aria-hidden />
                 <span>Crear evento</span>
               </Link>

               <Link 
                 href="/admin/store-settings"
                 className="flex w-full items-center justify-center gap-2 rounded-full border border-transparent bg-slate-100 px-5 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:w-auto xl:w-full"
               >
                 <Store className="h-5 w-5" aria-hidden />
                 <span>Activar tienda Pixieset</span>
               </Link>

              {activeFiltersCount > 0 && (
                <Button
                  variant="modern"
                  modernTone="ghost"
                  size="lg"
                  className="w-full sm:w-auto xl:w-full"
                  onClick={handleResetFilters}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>
        </section>

        <EventStatsSummary
          totalEvents={filteredEvents.length}
          totalPhotos={totals.totalPhotos}
          totalSubjects={totals.totalSubjects}
          totalRevenue={totals.totalRevenue}
          isLoading={showSkeleton}
        />

        <section className="sticky top-6 z-30 rounded-[28px] border border-white/40 bg-white/85 px-5 py-5 shadow-[0_30px_90px_-70px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/40 dark:bg-slate-950/70">
          <div className="grid gap-4 xl:grid-cols-[minmax(320px,1fr)_auto] xl:items-center">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" aria-hidden />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por escuela, evento o lugar"
                className="h-11 w-full rounded-full border-[#d0d5dd] bg-white/80 pl-12 text-sm text-[#101828] focus-visible:border-[#62e2a2] focus-visible:ring-[#62e2a2]/40"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 w-[160px] rounded-full border-[#d0d5dd] bg-white/80 text-sm">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="w-[180px]">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="completed">Completados</SelectItem>
                  <SelectItem value="archived">Archivados</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                  <SelectItem value="paused">Pausados</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-11 w-[150px] rounded-full border-[#d0d5dd] bg-white/80 text-sm"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-11 w-[150px] rounded-full border-[#d0d5dd] bg-white/80 text-sm"
              />
              <Button
                variant="modern"
                modernTone="ghost"
                size="sm"
                className="h-11 px-5 text-sm"
                onClick={handleResetFilters}
                disabled={!hasFilters}
              >
                Limpiar filtros
              </Button>
              <Button
                variant="modern"
                modernTone="ghost"
                size="sm"
                className="h-11 px-5 text-sm"
                onClick={() => loadFirstPage()}
                loading={loadingFirstPage}
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                Actualizar
              </Button>
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list')} className="rounded-full border border-[#d0d5dd] bg-white/80 p-1">
                <TabsList className="grid h-9 grid-cols-2 rounded-full bg-transparent">
                  <TabsTrigger value="grid" className="rounded-full text-sm">
                    Grid
                  </TabsTrigger>
                  <TabsTrigger value="list" className="rounded-full text-sm">
                    Lista
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#475467] dark:text-slate-300">
            <Badge className="rounded-full border border-[#d0d5dd] bg-[#62e2a2]/15 px-3 py-1 text-[#0f172a] dark:border-slate-700 dark:bg-[#62e2a2]/20 dark:text-white">
              {filteredEvents.length} evento{filteredEvents.length === 1 ? '' : 's'} visibles
            </Badge>
            {hasFilters && (
              <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1 font-medium text-[#1f2a44] shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200">
                Filtrando sobre {list.length} registro{list.length === 1 ? '' : 's'} totales
              </span>
            )}
          </div>
        </section>

        <section className="space-y-6">
          {showSkeleton ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <EventGridSkeleton key={index} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <EventListSkeleton key={index} />
                ))}
              </div>
            )
          ) : isEmptyState ? (
            <Card className="flex flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-[#d0d5dd] bg-transparent p-12 text-center shadow-none dark:border-slate-700/60">
              <Sparkles className="h-12 w-12 text-[#62e2a2]" aria-hidden />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[#0f172a] dark:text-white">
                  No encontramos eventos para los filtros seleccionados
                </h3>
                <p className="text-sm text-[#475467] dark:text-slate-300">
                  Ajustá la búsqueda o creá un nuevo evento para comenzar.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="modern"
                  modernTone="secondary"
                  size="sm"
                  onClick={handleResetFilters}
                >
                  Reiniciar filtros
                </Button>
                <Link 
                  href="/admin/events/new" 
                  className="flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  <span>Crear evento</span>
                </Link>
              </div>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
              {filteredEvents.map((event) => (
                <EventShowcaseCard
                  key={event.id}
                  event={event}
                  onQuickView={handleQuickView}
                  onDelete={handleDeleteEvent}
                  isDeleting={deletingEventId === event.id}
                />
              ))}
              {loadingMore &&
                Array.from({ length: Math.min(3, filteredEvents.length || 1) }).map((_, index) => (
                  <EventGridSkeleton key={`more-grid-${index}`} />
                ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <EventListRow
                  key={event.id}
                  event={event}
                  onQuickView={handleQuickView}
                  onDeleteRequest={handleDeleteEvent}
                  isDeleting={deletingEventId === event.id}
                />
              ))}
              {loadingMore &&
                Array.from({ length: 3 }).map((_, index) => (
                  <EventListSkeleton key={`more-list-${index}`} />
                ))}
            </div>
          )}
          <div ref={sentinelRef} />
        </section>
      </div>

      <EventQuickActionsDialog
        event={quickViewEvent}
        open={quickViewOpen}
        onOpenChange={(open) => {
          setQuickViewOpen(open);
          if (!open) setQuickViewEvent(null);
        }}
        onDeleteRequest={handleDeleteEvent}
      />
    </div>
  );
};

export const EventsPageClient = withErrorBoundary(EventsPageClientBase);
