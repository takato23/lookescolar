'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
}

// Base component
function EventsPageClientBase({ events, error }: EventsPageClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  // Filter events based on search and status
  const filteredEvents =
    events?.filter((event) => {
      const matchesSearch =
        (event.school?.toLowerCase() || '').includes(
          searchQuery.toLowerCase()
        ) ||
        (event.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || event.status === statusFilter;

      return matchesSearch && matchesStatus;
    }) || [];

  // Calculate summary stats
  const stats = {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
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
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

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

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
          <p className="mt-1 text-gray-600">
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
                <p className="text-sm text-gray-600">Total Eventos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fotografías</p>
                <p className="text-2xl font-bold text-gray-900">
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
                <p className="text-sm text-gray-600">Estudiantes</p>
                <p className="text-2xl font-bold text-gray-900">
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
                <p className="text-sm text-gray-600">Ingresos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-600" />
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
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                {searchQuery
                  ? 'No se encontraron eventos'
                  : 'No hay eventos todavía'}
              </h3>
              <p className="mb-4 text-gray-600">
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
              <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
            </div>
          ) : (
            <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 h-[600px] overflow-y-auto pr-2">
              <div className="space-y-3 pb-4">
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
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  if (viewMode === 'list') {
    return (
      <Card className="border border-gray-200 transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-3">
                <h3 className="truncate font-medium text-gray-900">
                  {event.school || event.name || 'Sin nombre'}
                </h3>
                {event.status && (
                  <Badge className={`text-xs ${getStatusColor(event.status)}`}>
                    {event.status}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 text-sm text-gray-600 sm:grid-cols-4">
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
    <Card className="border border-gray-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 truncate text-sm font-semibold leading-tight text-gray-900">
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
                <Link href={`/admin/events/${event.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalles
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/photos?eventId=${event.id}`}>
                  <Image className="mr-2 h-4 w-4" />
                  Gestionar fotos
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
          <div className="rounded-lg bg-gray-50 p-2 text-center">
            <Image className="mx-auto mb-1 h-4 w-4 text-blue-600" />
            <p className="text-xs font-medium text-gray-900">
              {event.stats?.totalPhotos || 0}
            </p>
            <p className="text-xs text-gray-500">Fotos</p>
          </div>

          <div className="rounded-lg bg-gray-50 p-2 text-center">
            <Users className="mx-auto mb-1 h-4 w-4 text-green-600" />
            <p className="text-xs font-medium text-gray-900">
              {event.stats?.totalSubjects || 0}
            </p>
            <p className="text-xs text-gray-500">Estudiantes</p>
          </div>

          <div className="col-span-2 rounded-lg bg-gray-50 p-2 text-center">
            <DollarSign className="mx-auto mb-1 h-4 w-4 text-amber-600" />
            <p className="text-xs font-medium text-gray-900">
              ${(event.stats?.totalRevenue || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Ingresos</p>
          </div>
        </div>

        <Link href={`/admin/events/${event.id}`} className="w-full">
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
