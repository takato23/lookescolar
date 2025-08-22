'use client';

import Link from 'next/link';
import { Plus, Calendar, ArrowLeft, Home, Sparkles, TrendingUp, ChevronRight, Filter, Search, Grid3X3, List, Settings2, Eye, MoreHorizontal } from 'lucide-react';
import { EventCard } from '@/components/admin/EventCard';
import { EmptyState } from '@/components/ui/empty-state';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useAdaptiveGrid, useGridVariables, useStaggeredAnimation } from '@/hooks/useAdaptiveGrid';
import { useNeuralEventsStore } from '@/lib/stores/useNeuralEventsStore';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EventsPageClientProps {
  events: any[] | null;
  error: any;
}

export function EventsPageClient({ events, error }: EventsPageClientProps) {
  const router = useRouter();
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Adaptive grid and responsive design
  const { breakpoint, gridColumns, isLargeScreen, isUltraWide } = useAdaptiveGrid();
  const gridVariables = useGridVariables();
  
  // Neural events store
  const {
    viewMode,
    sortBy,
    filterBy,
    compactMode,
    showStatsPanel,
    setViewMode,
    setSortBy,
    setFilterBy,
    toggleCompactMode,
    toggleStatsPanel,
    getFilteredEvents,
    getSortedEvents,
    getTotalStats,
    setEvents,
    setSearchQuery: setStoreSearchQuery,
  } = useNeuralEventsStore();
  
  // Initialize store with events
  useEffect(() => {
    if (events) {
      setEvents(events);
    }
  }, [events, setEvents]);
  
  // Handle search
  useEffect(() => {
    setStoreSearchQuery(searchQuery);
  }, [searchQuery, setStoreSearchQuery]);
  
  // Process events through store filters and sorting
  const processedEvents = useMemo(() => {
    const filtered = getFilteredEvents();
    return getSortedEvents(filtered);
  }, [getFilteredEvents, getSortedEvents]);
  
  // Calculate statistics
  const stats = useMemo(() => {
    const totalStats = getTotalStats();
    return {
      totalEvents: processedEvents.length,
      totalPhotos: totalStats.totalPhotos,
      totalRevenue: totalStats.totalRevenue,
      avgCompletionRate: totalStats.totalEvents > 0 
        ? Math.round(totalStats.avgCompletionRate / totalStats.totalEvents)
        : 0,
    };
  }, [processedEvents, getTotalStats]);

  const handleDeleteEvent = async (event: any) => {
    const hasPhotos = event.stats?.totalPhotos > 0;
    const hasSubjects = event.stats?.totalSubjects > 0;
    
    let confirmMessage = `¿Estás seguro de que quieres eliminar el evento "${event.school || event.name}"?\n\n`;
    
    if (hasPhotos || hasSubjects) {
      confirmMessage += "⚠️ ATENCIÓN: Este evento contiene datos que se eliminarán:\n";
      if (hasPhotos) {
        confirmMessage += `• ${event.stats.totalPhotos} fotos (se borrarán del almacenamiento)\n`;
      }
      if (hasSubjects) {
        confirmMessage += `• ${event.stats.totalSubjects} estudiantes/familias\n`;
      }
      confirmMessage += "\n";
    }
    
    confirmMessage += "Esta acción NO se puede deshacer.\n\n¿Continuar con la eliminación?";

    if (!confirm(confirmMessage)) {
      return;
    }

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
      alert('Evento eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar el evento');
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleEditEvent = (event: any) => {
    console.log('Edit event:', event);
    alert('Funcionalidad de edición pendiente de implementar');
  };

  const handleViewEvent = (event: any) => {
    router.push(`/admin/events/${event.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto space-y-6 lg:space-y-8">
        {/* Enhanced Neural Header */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl" />
          <div className="relative neural-glass-surface p-6 sm:p-8">
            {/* Breadcrumbs */}
            <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Link
                href="/admin"
                className="flex items-center gap-1 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">Eventos</span>
            </nav>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Title and Description */}
              <div className="flex items-start gap-4">
                <Link href="/admin">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="neural-glass-card shrink-0 rounded-full hover:bg-white/10"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="space-y-2">
                  <h1 className="neural-title text-2xl sm:text-3xl md:text-4xl font-bold">
                    Eventos
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300 sm:text-base max-w-2xl">
                    Gestiona tus sesiones fotográficas con la nueva interfaz neural optimizada para pantallas grandes
                  </p>
                </div>
              </div>
              
              {/* Control Panel */}
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar eventos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="neural-glass-card pl-10 w-64 border-white/20"
                  />
                </div>
                
                {/* View Controls */}
                <div className="flex gap-2">
                  {/* View Mode Toggle */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="neural-glass-card border-white/20">
                        {viewMode === 'grid' ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="neural-glass-card border-white/20">
                      <DropdownMenuItem onClick={() => setViewMode('grid')}>
                        <Grid3X3 className="mr-2 h-4 w-4" />
                        Vista de cuadrícula
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setViewMode('list')}>
                        <List className="mr-2 h-4 w-4" />
                        Vista de lista
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Filters */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="neural-glass-card border-white/20">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="neural-glass-card border-white/20">
                      <DropdownMenuItem onClick={() => setFilterBy('all')}>
                        Todos los eventos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterBy('active')}>
                        Solo activos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterBy('draft')}>
                        Borradores
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/20" />
                      <DropdownMenuItem onClick={() => setSortBy('date_desc')}>
                        Más recientes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('revenue_desc')}>
                        Mayor ingreso
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Settings */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="neural-glass-card border-white/20">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="neural-glass-card border-white/20">
                      <DropdownMenuItem onClick={toggleCompactMode}>
                        {compactMode ? 'Modo estándar' : 'Modo compacto'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={toggleStatsPanel}>
                        {showStatsPanel ? 'Ocultar estadísticas' : 'Mostrar estadísticas'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Create Event Button */}
                <Link href="/admin/events/new">
                  <Button className="neural-fab relative overflow-hidden">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="font-semibold">Nuevo Evento</span>
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Enhanced Stats Dashboard */}
            {showStatsPanel && events && events.length > 0 && (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="neural-metric-display">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100/50 dark:bg-blue-900/30">
                      <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Total Eventos</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalEvents}</p>
                    </div>
                  </div>
                </div>
                
                <div className="neural-metric-display">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/30">
                      <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Fotos Totales</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPhotos}</p>
                    </div>
                  </div>
                </div>
                
                <div className="neural-metric-display">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100/50 dark:bg-green-900/30">
                      <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Ingresos Totales</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="neural-metric-display">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100/50 dark:bg-orange-900/30">
                      <Eye className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Progreso Promedio</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgCompletionRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Responsive Grid Info */}
            {isLargeScreen && (
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span>
                  Optimizado para pantallas grandes • {gridColumns} columnas • {breakpoint.name} ({breakpoint.minWidth}px+)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="neural-glass-card animate-slide-up border-red-200 bg-red-50/50 dark:bg-red-900/20 p-4 border">
            <p className="text-sm text-red-700 dark:text-red-300">
              Error al cargar eventos: {error.message}
            </p>
          </div>
        )}

        {/* Events Content */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {!processedEvents || processedEvents.length === 0 ? (
            <div className="neural-glass-card p-8 text-center">
              <EmptyState
                icon={Calendar}
                title={searchQuery ? "No se encontraron eventos" : "No hay eventos creados"}
                description={
                  searchQuery 
                    ? `No hay eventos que coincidan con "${searchQuery}"`
                    : "Crea tu primer evento para comenzar a organizar tus sesiones fotográficas."
                }
              >
                {!searchQuery && (
                  <Link href="/admin/events/new" className="inline-block">
                    <Button className="neural-fab">
                      <span className="font-medium">Crear primer evento</span>
                    </Button>
                  </Link>
                )}
              </EmptyState>
            </div>
          ) : (
            <div 
              className={cn(
                "neural-events-grid",
                compactMode && "neural-events-grid-compact",
                viewMode === 'list' && "neural-events-list"
              )}
              style={gridVariables}
            >
              {processedEvents.map((event, index) => {
                const staggered = useStaggeredAnimation(index);
                return (
                  <div
                    key={event.id}
                    className="neural-card-enter"
                    style={{
                      ...staggered.style,
                      animationDelay: staggered.animationDelay,
                    }}
                  >
                    <EventCard 
                      event={event} 
                      onDelete={handleDeleteEvent}
                      onEdit={handleEditEvent}
                      onView={handleViewEvent}
                      className={cn(
                        "h-full flex flex-col",
                        compactMode && "neural-event-card-compact",
                        deletingEventId === event.id && "opacity-50 pointer-events-none"
                      )}
                      compact={compactMode || isUltraWide}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Grid Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 neural-glass-card p-3 text-xs font-mono">
            <div>Breakpoint: {breakpoint.name}</div>
            <div>Columns: {gridColumns}</div>
            <div>Screen: {typeof window !== 'undefined' ? window.innerWidth : 0}px</div>
            <div>Events: {processedEvents?.length || 0}</div>
          </div>
        )}
      </div>
    </div>
  );
}