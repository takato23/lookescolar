'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Calendar,
  Users,
  Image,
  DollarSign,
  Grid3X3,
  List,
  Filter,
  RefreshCw,
  Trash2,
  Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDebounce } from '@/hooks/useDebounce';
import { FixedSizeList as VirtualList } from 'react-window';

// Error boundary wrapper component
function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function WrappedComponent(props: P) {
    try {
      return <Component {...props} />;
    } catch (error) {
      console.error('Component error:', error);
      return (
        <div className="p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="font-medium text-red-800">Error de componente</h3>
            <p className="mt-1 text-sm text-red-600">
              Hubo un problema al cargar esta sección. Por favor, recarga la
              página.
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="mt-3 border-red-300 text-red-700 hover:bg-red-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Recargar página
            </Button>
          </div>
        </div>
      );
    }
  };
}

interface Event {
  id: string;
  name?: string;
  school?: string;
  date?: string;
  status?: string;
  stats?: {
    totalPhotos?: number;
    totalSubjects?: number;
    totalRevenue?: number;
    completionRate?: number;
  };
  created_at?: string;
}

interface EventsPageClientProps {
  events: Event[] | null;
  error: any;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_more: boolean;
  } | null;
}

// Base component
function EventsPageClientBase({ events, error, pagination: initialPagination }: EventsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const debouncedQuery = useDebounce(searchQuery, 250);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [list, setList] = useState<Event[]>(events || []);
  const [pagination, setPagination] = useState(initialPagination || null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingFirstPage, setLoadingFirstPage] = useState(false);

  useEffect(() => {
    setList(events || []);
    setPagination(initialPagination || null);
  }, [events, initialPagination]);

  // Sync query params (q, status) to URL and reset page
  useEffect(() => {
    const sp = new URLSearchParams(Array.from(searchParams.entries()));
    if (debouncedQuery) sp.set('q', debouncedQuery); else sp.delete('q');
    if (statusFilter && statusFilter !== 'all') sp.set('status', statusFilter); else sp.delete('status');
    sp.delete('page');
    router.replace(`?${sp.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, statusFilter]);

  // Optimized filtering with memoization and performance tracking
  const filteredEvents = useMemo(() => {
    if (!events || !Array.isArray(list)) return [];
    
    const startTime = performance.now();
    const query = (debouncedQuery || '').toLowerCase().trim();
    
    const filtered = list.filter((event) => {
      if (!event || typeof event !== 'object') return false;
      
      // Optimized search matching
      const searchFields = [
        event.school,
        event.name,
        event.location
      ].filter(Boolean).map(field => field.toLowerCase());
      
      const matchesSearch = !query || searchFields.some(field => field.includes(query));
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
    
    const filterTime = performance.now() - startTime;
    if (filterTime > 10) {
      console.debug(`[Performance] Event filtering took ${filterTime.toFixed(2)}ms for ${list.length} events`);
    }
    
    return filtered;
  }, [list, debouncedQuery, statusFilter, events]);

  // Calculate summary stats
  const stats = useMemo(() => {
    return {
      total: filteredEvents.length,
      totalPhotos: filteredEvents.reduce(
        (sum, event) => sum + (event.stats?.totalPhotos || 0),
        0
      ),
      totalSubjects: filteredEvents.reduce(
        (sum, event) => sum + (event.stats?.totalSubjects || 0),
        0
      ),
      totalRevenue: filteredEvents.reduce(
        (sum, event) => sum + (event.stats?.totalRevenue || 0),
        0
      ),
    };
  }, [filteredEvents]);

  const handleDeleteEvent = async (event: Event) => {
    const hasPhotos = event.stats?.totalPhotos && event.stats?.totalPhotos > 0;
    const hasSubjects =
      event.stats?.totalSubjects && event.stats?.totalSubjects > 0;

    let confirmMessage = `¿Eliminar el evento "${event.school || event.name}"?`;

    if (hasPhotos || hasSubjects) {
      confirmMessage += `\n\n⚠️ Contiene:\n`;
      if (hasPhotos) confirmMessage += `• ${event.stats?.totalPhotos} fotos\n`;
      if (hasSubjects)
        confirmMessage += `• ${event.stats?.totalSubjects} estudiantes\n`;
      confirmMessage += '\nEsta acción no se puede deshacer.';
    }

    if (!confirm(confirmMessage)) return;

    setDeletingEventId(event.id);

    try {
      const response = await fetch(`/api/admin/events/${event.id}?force=true`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar el evento');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error al eliminar el evento. Por favor, intenta de nuevo.');
    } finally {
      setDeletingEventId(null);
    }
  };

  // Type-safe status color mapping with theme consistency
  const getStatusColor = useCallback((status?: Event['status']): string => {
    const statusColors: Record<NonNullable<Event['status']>, string> = {
      active: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
      completed: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      archived: 'bg-muted text-foreground border-border dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
    };

    return statusColors[status as keyof typeof statusColors] || 
           'bg-muted text-muted-foreground border-border dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
  }, []);
  
  // Enhanced currency formatter with locale support
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="font-medium text-red-800">Error al cargar eventos</h3>
          <p className="mt-1 text-sm text-red-600">
            {error.message || 'Error desconocido al obtener los datos'}
          </p>
          <Button
            onClick={() => router.refresh()}
            variant="outline"
            size="sm"
            className="mt-3 border-red-300 text-red-700 hover:bg-red-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const hasMore = pagination?.has_more ?? false;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreCb = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadMore();
    }
  }, [loadingMore, hasMore]);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreCb();
        }
      },
      { root: null, rootMargin: '200px', threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMoreCb]);

  const loadFirstPage = async (status: string) => {
    if (loadingFirstPage) return; // Prevent concurrent requests
    
    setLoadingFirstPage(true);
    const startTime = performance.now();
    
    try {
      const qp = new URLSearchParams();
      qp.set('include_stats', 'true');
      qp.set('page', '1');
      qp.set('limit', String(Math.min(100, pagination?.limit || 50)));
      
      if (status && status !== 'all' && typeof status === 'string') {
        qp.set('status', status.trim());
      }
      
      // Enhanced error handling with retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await fetch(`/api/admin/events?${qp.toString()}`, { 
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Validate and normalize response
      const eventsList = Array.isArray(data) ? data : data.events || data.data?.events || data.data || [];
      const newPagination = Array.isArray(data) ? null : data.pagination || null;
      
      if (Array.isArray(eventsList)) {
        setList(eventsList);
        setPagination(newPagination);
        
        const loadTime = performance.now() - startTime;
        console.debug(`[Performance] First page loaded in ${loadTime.toFixed(2)}ms (${eventsList.length} events)`);
      } else {
        throw new Error('Invalid response format');
      }
      
    } catch (e) {
      const loadTime = performance.now() - startTime;
      console.error(`[Performance] First page failed after ${loadTime.toFixed(2)}ms:`, e);
      
      // Don't show error to user for background operations, but maintain state consistency
      if (e instanceof Error && e.name === 'AbortError') {
        console.warn('First page request was aborted due to timeout');
      }
    } finally {
      setLoadingFirstPage(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !pagination) return;
    
    setLoadingMore(true);
    const startTime = performance.now();
    
    try {
      const nextPage = pagination.page + 1;
      const qp = new URLSearchParams();
      qp.set('include_stats', 'true');
      qp.set('page', String(nextPage));
      qp.set('limit', String(Math.min(100, pagination.limit || 50)));
      
      if (statusFilter && statusFilter !== 'all' && typeof statusFilter === 'string') {
        qp.set('status', statusFilter.trim());
      }
      
      // Optimized fetch with shorter timeout for pagination
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const res = await fetch(`/api/admin/events?${qp.toString()}`, { 
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`Pagination failed: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Validate response and prevent duplicates
      const moreEvents = Array.isArray(data) ? data : data.events || data.data?.events || data.data || [];
      const newPagination = Array.isArray(data) ? null : data.pagination || null;
      
      if (Array.isArray(moreEvents)) {
        const existingIds = new Set(list.map(event => event.id));
        const uniqueEvents = moreEvents.filter(event => !existingIds.has(event.id));
        
        setList(prev => [...prev, ...uniqueEvents]);
        setPagination(newPagination);
        
        const loadTime = performance.now() - startTime;
        console.debug(`[Performance] Page ${nextPage} loaded in ${loadTime.toFixed(2)}ms (${uniqueEvents.length} new events)`);
      } else {
        throw new Error('Invalid pagination response format');
      }
      
    } catch (e) {
      const loadTime = performance.now() - startTime;
      console.error(`[Performance] Load more failed after ${loadTime.toFixed(2)}ms:`, e);
      
      // Don't show error to user for background operations
      if (e instanceof Error && e.name === 'AbortError') {
        console.warn('Load more request was aborted due to timeout');
      }
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // si cambian filtros/búsqueda, recargar página 1 desde el servidor
    loadFirstPage(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, debouncedQuery]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Gestiona tus eventos escolares y fotografías
          </p>
        </div>

        <Link href="/admin/events/new">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Evento
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Eventos</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.total}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Fotografías</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalPhotos.toLocaleString()}
                </p>
              </div>
              <Image className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Estudiantes</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalSubjects.toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="Buscar por escuela o nombre del evento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Estado
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                Todos los estados
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                Activos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('draft')}>
                Borrador
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('completed')}>
                Completados
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('archived')}>
                Archivados
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Events Content */}
      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-foreground">
                {searchQuery
                  ? 'No se encontraron eventos'
                  : 'No hay eventos todavía'}
              </h3>
              <p className="mb-4 text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Comienza creando tu primer evento escolar'}
              </p>
              {!searchQuery && (
                <Link href="/admin/events/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Evento
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 h-[600px] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 gap-4 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    viewMode={viewMode}
                    onDelete={handleDeleteEvent}
                    isDeleting={deletingEventId === event.id}
                  />
                ))}
              </div>
              {hasMore && (
                <>
                  <div ref={sentinelRef} className="h-6" />
                  <div className="pb-4 pt-2 flex justify-center">
                    <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? 'Cargando…' : 'Cargar más'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 h-[600px] overflow-y-auto pr-2">
              <VirtualList
                height={600}
                itemCount={filteredEvents.length}
                itemSize={116}
                width={'100%'}
              >
                {({ index, style }) => {
                  const event = filteredEvents[index];
                  return (
                    <div style={style} className="pb-3">
                      <EventCard
                        key={event.id}
                        event={event}
                        viewMode={viewMode}
                        onDelete={handleDeleteEvent}
                        isDeleting={deletingEventId === event.id}
                      />
                    </div>
                  );
                }}
              </VirtualList>
              {hasMore && (
                <>
                  <div ref={sentinelRef} className="h-6" />
                  <div className="pb-4 pt-2 flex justify-center">
                    <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? 'Cargando…' : 'Cargar más'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface EventCardProps {
  event: Event;
  viewMode: 'grid' | 'list';
  onDelete: (event: Event) => void;
  isDeleting: boolean;
}

function EventCard({ event, viewMode, onDelete, isDeleting }: EventCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Sin fecha';
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'archived':
        return 'bg-muted text-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (viewMode === 'list') {
    return (
      <Card className="border border-border transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-3">
                <h3 className="truncate font-medium text-foreground">
                  {event.school || event.name || 'Sin nombre'}
                </h3>
                {event.status && (
                  <Badge className={`text-xs ${getStatusColor(event.status)}`}>
                    {event.status}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 text-sm text-gray-500 dark:text-gray-400 sm:grid-cols-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(event.date)}
                </div>
                <div className="flex items-center gap-1">
                  <Image className="h-4 w-4" />
                  {event.stats?.totalPhotos || 0} fotos
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {event.stats?.totalSubjects || 0} estudiantes
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />$
                  {(event.stats?.totalRevenue || 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="ml-4 flex items-center gap-2">
              <Link href={`/admin/events/${event.id}`}>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={isDeleting}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/events/${event.id}`}>Ver detalles</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/store-settings?eventId=${event.id}`}>
                      <Settings className="mr-2 h-4 w-4" />
                      Configurar tienda
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(event)}
                    className="text-red-600"
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view

  return (
    <Card className="border border-border bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 truncate text-sm font-semibold leading-tight text-foreground">
              {event.school || event.name || 'Sin nombre'}
            </h3>
            <p className="mb-2 text-xs text-gray-500">
              {formatDate(event.date)}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={isDeleting}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/events/${event.id}/unified`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalles
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/events/${event.id}/unified`}>
                  <Image className="mr-2 h-4 w-4" />
                  Gestionar fotos
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/store-settings?eventId=${event.id}`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurar tienda
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(event)}
                className="text-red-600"
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {event.status && (
          <Badge className={`mb-3 text-xs ${getStatusColor(event.status)}`}>
            {event.status}
          </Badge>
        )}

        {/* Stats Grid */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted p-2 text-center">
            <Image className="mx-auto mb-1 h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-xs font-medium text-foreground">
              {event.stats?.totalPhotos || 0}
            </p>
            <p className="text-xs text-gray-500">Fotos</p>
          </div>

          <div className="rounded-lg bg-muted p-2 text-center">
            <Users className="mx-auto mb-1 h-4 w-4 text-green-600" />
            <p className="text-xs font-medium text-foreground">
              {event.stats?.totalSubjects || 0}
            </p>
            <p className="text-xs text-gray-500">Estudiantes</p>
          </div>

          <div className="col-span-2 rounded-lg bg-muted p-2 text-center">
            <DollarSign className="mx-auto mb-1 h-4 w-4 text-primary-600" />
            <p className="text-xs font-medium text-foreground">
              ${(event.stats?.totalRevenue || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Ingresos</p>
          </div>
        </div>

        <Link href={`/admin/events/${event.id}/unified`} className="w-full">
          <Button variant="outline" size="sm" className="h-8 w-full text-xs">
            <Eye className="mr-2 h-3 w-3" />
            Ver detalles
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// Export wrapped with error boundary
export const EventsPageClient = withErrorBoundary(EventsPageClientBase);
