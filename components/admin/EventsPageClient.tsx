'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */

import Link from 'next/link';
import {
  Plus,
  Calendar,
  ArrowLeft,
  Home,
  Sparkles,
  TrendingUp,
  ChevronRight,
  Filter,
  Search,
  Grid3X3,
  List,
  Settings2,
  Eye,
  MoreHorizontal,
  CalendarDays,
  DollarSign,
  BarChart,
  Users,
  Activity,
  Clock,
  CheckSquare,
  Archive,
  RefreshCw,
  Download,
  Upload,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  X,
  MousePointer,
  Layers,
  Star,
  Heart,
  Bookmark,
  Share2,
  ExternalLink,
  Copy,
  FileDown,
  Monitor,
  Cpu,
  Gauge,
} from 'lucide-react';
import { AdvancedSearch } from '@/components/admin/AdvancedSearch';
import { DragDropProvider, DropZone } from '@/components/ui/DragDrop';
import {
  NotificationBell,
  useNotifications,
  showSuccessNotification,
  showErrorNotification,
  showEventUpdateNotification,
} from '@/components/ui/NotificationSystem';
import {
  useShortcuts,
  commonShortcuts,
  AriaLiveRegion,
  SkipToContent,
} from '@/components/ui/KeyboardShortcuts';
import { EmptyState } from '@/components/ui/empty-state';
import {
  VirtualEventGrid,
  VirtualGridStats,
} from '@/components/ui/VirtualEventGrid';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import {
  useAdaptiveGrid,
  useGridVariables,
  useStaggeredAnimation,
} from '@/hooks/useAdaptiveGrid';
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

// Performance and optimization imports
import {
  PerformanceMonitor,
  useDebouncedState,
  useMemoizedCalculation,
  useMemoryMonitoring,
  useIntersectionObserver,
  withPerformanceMonitoring,
} from '@/lib/utils/performance';

// Lazy loaded components for bundle optimization
import {
  LazyEventPreviewModal,
  LazyExportSystem,
  LazyAdvancedAnalyticsDashboard,
  ComponentPreloader,
} from '@/lib/utils/lazy-loading';

interface EventsPageClientProps {
  events: any[] | null;
  error: any;
}

export function EventsPageClient({ events, error }: EventsPageClientProps) {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const [lastAriaMessage, setLastAriaMessage] = useState<string>('');
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  // Optimized search with debouncing
  const [searchInput, debouncedSearchQuery, setSearchInput] = useDebouncedState(
    '',
    300
  );

  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [revenueFilter, setRevenueFilter] = useState<{
    min: number;
    max: number;
  }>({ min: 0, max: 0 });
  const [progressFilter, setProgressFilter] = useState<number>(0);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null);
  const [previewEvent, setPreviewEvent] = useState<any | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);

  // Performance monitoring
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);
  const memoryInfo = useMemoryMonitoring(3000);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  // Adaptive grid and responsive design with large display optimization
  const { breakpoint, gridColumns, isLargeScreen, isUltraWide } =
    useAdaptiveGrid();
  const gridVariables = useGridVariables();

  // Enhanced grid columns for large displays (27"+ screens)
  const optimizedGridColumns = useMemo(() => {
    if (typeof window === 'undefined') return gridColumns;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Ultra-wide displays (32"+ or 3440px+)
    if (width >= 3440) return 6;
    // Large displays (27" QHD/4K)
    if (width >= 2560) return 5;
    // Standard large (24-27")
    if (width >= 2048) return 4;
    // Desktop
    if (width >= 1536) return 3;
    if (width >= 1024) return 2;
    // Mobile/Tablet
    return 1;
  }, [gridColumns]);

  // Initialize performance monitoring
  useEffect(() => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.initializeObservers();
    ComponentPreloader.preloadCriticalComponents();

    return () => monitor.cleanup();
  }, []);

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

  // Handle optimized search with debouncing
  useEffect(() => {
    setStoreSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setStoreSearchQuery]);

  // Process events through store filters and sorting with memoized calculation
  const processedEvents = useMemoizedCalculation(
    events || [],
    (eventData) => {
      const filtered = getFilteredEvents();
      return getSortedEvents(filtered);
    },
    [getFilteredEvents, getSortedEvents, debouncedSearchQuery, filterBy, sortBy]
  );

  // Calculate statistics
  const stats = useMemo(() => {
    const totalStats = getTotalStats();
    return {
      totalEvents: processedEvents.length,
      totalPhotos: totalStats.totalPhotos,
      totalRevenue: totalStats.totalRevenue,
      avgCompletionRate:
        totalStats.totalEvents > 0
          ? Math.round(totalStats.avgCompletionRate / totalStats.totalEvents)
          : 0,
    };
  }, [processedEvents, getTotalStats]);

  // Optimized event handlers with performance monitoring
  const handleDeleteEvent = useCallback(
    withPerformanceMonitoring(async (event: any) => {
      const hasPhotos = event.stats?.totalPhotos > 0;
      const hasSubjects = event.stats?.totalSubjects > 0;

      let confirmMessage = `¿Estás seguro de que quieres eliminar el evento "${event.school || event.name}"?\n\n`;

      if (hasPhotos || hasSubjects) {
        confirmMessage +=
          '⚠️ ATENCIÓN: Este evento contiene datos que se eliminarán:\n';
        if (hasPhotos) {
          confirmMessage += `• ${event.stats.totalPhotos} fotos (se borrarán del almacenamiento)\n`;
        }
        if (hasSubjects) {
          confirmMessage += `• ${event.stats.totalSubjects} estudiantes/familias\n`;
        }
        confirmMessage += '\n';
      }

      confirmMessage +=
        'Esta acción NO se puede deshacer.\n\n¿Continuar con la eliminación?';

      if (!confirm(confirmMessage)) {
        return;
      }

      setDeletingEventId(event.id);

      try {
        const response = await fetch(
          `/api/admin/events/${event.id}?force=true`,
          {
            method: 'DELETE',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al eliminar el evento');
        }

        router.refresh();
        showSuccessNotification(
          addNotification,
          'Evento eliminado',
          `"${event.school}" ha sido eliminado correctamente`
        );
      } catch (error) {
        console.error('Error deleting event:', error);
        showErrorNotification(
          addNotification,
          'Error al eliminar',
          error instanceof Error ? error.message : 'Error al eliminar el evento'
        );
      } finally {
        setDeletingEventId(null);
      }
    }, 'delete-event'),
    [router, addNotification]
  );

  const handleEditEvent = useCallback((event: any) => {
    console.log('Edit event:', event);
    setLastAriaMessage(`Editando evento: ${event.school}`);
    alert('Funcionalidad de edición pendiente de implementar');
  }, []);

  const handleViewEvent = useCallback((event: any) => {
    setPreviewEvent(event);
    setShowPreviewModal(true);
    setLastAriaMessage(`Vista previa del evento: ${event.school}`);
  }, []);

  const handlePreviewClose = () => {
    setShowPreviewModal(false);
    setPreviewEvent(null);
  };

  const handlePreviewNext = () => {
    if (!previewEvent) return;
    const currentIndex = processedEvents.findIndex(
      (e) => e.id === previewEvent.id
    );
    if (currentIndex < processedEvents.length - 1) {
      setPreviewEvent(processedEvents[currentIndex + 1]);
    }
  };

  const handlePreviewPrevious = () => {
    if (!previewEvent) return;
    const currentIndex = processedEvents.findIndex(
      (e) => e.id === previewEvent.id
    );
    if (currentIndex > 0) {
      setPreviewEvent(processedEvents[currentIndex - 1]);
    }
  };

  const handleReorderEvents = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    try {
      // Optimistically update the UI
      const draggedIndex = processedEvents.findIndex((e) => e.id === draggedId);
      const targetIndex = processedEvents.findIndex((e) => e.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      // Here you would typically call an API to update the order
      // For now, we'll just show a success message
      const draggedEvent = processedEvents[draggedIndex];
      const targetEvent = processedEvents[targetIndex];

      if (draggedEvent && targetEvent) {
        showSuccessNotification(
          addNotification,
          'Eventos reordenados',
          `"${draggedEvent.school}" movido a posición de "${targetEvent.school}"`
        );
      }

      // In a real implementation, you would:
      // await fetch('/api/admin/events/reorder', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ draggedId, targetId, newOrder: [...newOrder] })
      // });
    } catch (error) {
      console.error('Error reordering events:', error);
      showErrorNotification(
        addNotification,
        'Error de reordenamiento',
        'No se pudieron reordenar los eventos'
      );
    }
  };

  // Bulk action handlers
  const handleSelectEvent = (event: any, selected: boolean) => {
    setSelectedEvents((prev) => {
      if (selected) {
        return [...prev, event.id];
      } else {
        return prev.filter((id) => id !== event.id);
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedEvents.length === processedEvents.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(processedEvents.map((e) => e.id));
    }
  };

  const handleBulkDelete = async () => {
    if (
      !confirm(
        `¿Estás seguro de que quieres eliminar ${selectedEvents.length} eventos?`
      )
    ) {
      return;
    }

    try {
      await Promise.all(
        selectedEvents.map((eventId) =>
          fetch(`/api/admin/events/${eventId}?force=true`, { method: 'DELETE' })
        )
      );
      setSelectedEvents([]);
      router.refresh();
      alert('Eventos eliminados exitosamente');
    } catch (error) {
      console.error('Error deleting events:', error);
      alert('Error al eliminar eventos');
    }
  };

  const handleBulkActivate = async () => {
    setIsProcessing(true);
    setLastAction('Activando eventos...');
    try {
      await Promise.all(
        selectedEvents.map((eventId) =>
          fetch(`/api/admin/events/${eventId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: true }),
          })
        )
      );
      setSelectedEvents([]);
      setLastAction('¡Eventos activados exitosamente!');
      showSuccessNotification(
        addNotification,
        'Eventos activados',
        `${selectedEvents.length} eventos han sido activados correctamente`
      );
      router.refresh();
    } catch (error) {
      console.error('Error activating events:', error);
      showErrorNotification(
        addNotification,
        'Error de activación',
        'No se pudieron activar algunos eventos'
      );
      setLastAction('Error al activar eventos');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setLastAction(null), 3000);
    }
  };

  const handleBulkArchive = async () => {
    setIsProcessing(true);
    setLastAction('Archivando eventos...');
    try {
      await Promise.all(
        selectedEvents.map((eventId) =>
          fetch(`/api/admin/events/${eventId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: false, archived: true }),
          })
        )
      );
      setSelectedEvents([]);
      setLastAction('¡Eventos archivados exitosamente!');
      showSuccessNotification(
        addNotification,
        'Eventos archivados',
        `${selectedEvents.length} eventos han sido archivados correctamente`
      );
      router.refresh();
    } catch (error) {
      console.error('Error archiving events:', error);
      showErrorNotification(
        addNotification,
        'Error de archivado',
        'No se pudieron archivar algunos eventos'
      );
      setLastAction('Error al archivar eventos');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setLastAction(null), 3000);
    }
  };

  const handleBulkExport = async () => {
    if (selectedEvents.length === 0) {
      setLastAriaMessage('Selecciona eventos para exportar');
      return;
    }

    setIsProcessing(true);
    setLastAction('Exportando eventos...');
    try {
      const eventsData = processedEvents.filter((e) =>
        selectedEvents.includes(e.id)
      );
      const csv = convertToCSV(eventsData);
      downloadCSV(
        csv,
        `eventos-seleccionados-${new Date().toISOString().split('T')[0]}.csv`
      );
      setLastAction('¡Eventos exportados exitosamente!');
      showSuccessNotification(
        addNotification,
        'Exportación completa',
        `Datos de ${selectedEvents.length} eventos exportados correctamente`
      );
    } catch (error) {
      console.error('Error exporting events:', error);
      showErrorNotification(
        addNotification,
        'Error de exportación',
        'No se pudieron exportar los datos de eventos'
      );
      setLastAction('Error al exportar eventos');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setLastAction(null), 3000);
    }
  };

  const convertToCSV = (data: any[]) => {
    const headers = ['Escuela', 'Fecha', 'Estado', 'Fotos', 'Ingresos'];
    const rows = data.map((event) => [
      event.school,
      new Date(event.date).toLocaleDateString(),
      event.active ? 'Activo' : 'Borrador',
      event.stats?.totalPhotos || 0,
      event.stats?.revenue || 0,
    ]);
    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'refresh':
        window.location.reload();
        break;
      case 'export-all':
        handleBulkExport();
        break;
      case 'compact-toggle':
        toggleCompactMode();
        break;
    }
  };

  const getPreviewNavigation = () => {
    if (!previewEvent) return { hasNext: false, hasPrevious: false };
    const currentIndex = processedEvents.findIndex(
      (e) => e.id === previewEvent.id
    );
    return {
      hasNext: currentIndex < processedEvents.length - 1,
      hasPrevious: currentIndex > 0,
    };
  };

  const toggleDragMode = () => {
    setIsDragMode(!isDragMode);
    setSelectedEvents([]); // Clear selections when entering/exiting drag mode
    setLastAriaMessage(
      isDragMode ? 'Modo arrastrar desactivado' : 'Modo arrastrar activado'
    );
  };

  // Register keyboard shortcuts
  useShortcuts(
    [
      commonShortcuts.search,
      commonShortcuts.newEvent,
      commonShortcuts.selectAll,
      commonShortcuts.refresh,
      commonShortcuts.toggleDragMode,
      commonShortcuts.export,
      {
        key: 'Escape',
        description: 'Cancelar selección',
        category: 'selection',
      },
      {
        key: 'Delete',
        description: 'Eliminar eventos seleccionados',
        category: 'actions',
      },
    ],
    [
      // Search focus
      () => {
        const searchInput = document.querySelector(
          'input[placeholder*="Buscar"]'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          setLastAriaMessage('Campo de búsqueda enfocado');
        }
      },
      // New event
      () => {
        router.push('/admin/events/new');
        setLastAriaMessage('Navegando a crear nuevo evento');
      },
      // Select all
      () => {
        if (processedEvents.length > 0) {
          handleSelectAll();
          setLastAriaMessage(
            `${selectedEvents.length === processedEvents.length ? 'Todos los eventos deseleccionados' : `${processedEvents.length} eventos seleccionados`}`
          );
        }
      },
      // Refresh
      () => {
        window.location.reload();
      },
      // Toggle drag mode
      toggleDragMode,
      // Export
      () => {
        if (selectedEvents.length > 0) {
          handleBulkExport();
        } else {
          setLastAriaMessage('Selecciona eventos para exportar');
        }
      },
      // Cancel selection
      () => {
        if (selectedEvents.length > 0) {
          setSelectedEvents([]);
          setLastAriaMessage('Selección cancelada');
        }
      },
      // Delete selected
      () => {
        if (selectedEvents.length > 0) {
          handleBulkDelete();
        } else {
          setLastAriaMessage('Selecciona eventos para eliminar');
        }
      },
    ]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <SkipToContent />
      <AriaLiveRegion>{lastAriaMessage}</AriaLiveRegion>

      <div
        className="container mx-auto space-y-6 lg:space-y-8"
        id="main-content"
      >
        {/* Enhanced Neural Header */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl" />
          <div className="neural-glass-surface relative p-6 sm:p-8">
            {/* Breadcrumbs */}
            <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-300">
              <Link
                href="/admin"
                className="flex items-center gap-1 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-foreground dark:text-white">
                Eventos
              </span>
            </nav>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Title and Description */}
              <div className="flex items-start gap-4">
                <Link href="/admin">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="neural-glass-card shrink-0 rounded-full hover:bg-white/10"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="space-y-2">
                  <h1 className="neural-title text-2xl font-bold sm:text-3xl md:text-4xl">
                    Eventos
                  </h1>
                  <p className="max-w-2xl text-sm text-muted-foreground dark:text-gray-300 sm:text-base">
                    Gestiona tus sesiones fotográficas con la nueva interfaz
                    neural optimizada para pantallas grandes
                  </p>
                </div>
              </div>

              {/* Control Panel */}
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                {/* Enhanced Bulk Actions Panel */}
                {selectedEvents.length > 0 && (
                  <div className="neural-glass-card animate-slide-down rounded-xl border border-blue-200/50 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-4 shadow-lg backdrop-blur-md">
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                      {/* Selection Info */}
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100/70 p-2 backdrop-blur-sm">
                          <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-blue-900">
                              {selectedEvents.length} evento(s) seleccionado(s)
                            </span>
                            {isProcessing && (
                              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                <span>{lastAction || 'Procesando...'}</span>
                              </div>
                            )}
                          </div>
                          {lastAction && !isProcessing && (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              {lastAction}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bulk Actions */}
                      <div className="ml-auto flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkActivate}
                          disabled={isProcessing}
                          className="border-green-200/70 bg-green-50/70 text-green-700 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-green-100"
                        >
                          <Zap className="mr-1 h-3 w-3" />
                          Activar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkArchive}
                          disabled={isProcessing}
                          className="border-primary-200/70 bg-primary-50/70 text-primary-700 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-primary-100"
                        >
                          <Archive className="mr-1 h-3 w-3" />
                          Archivar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkExport}
                          disabled={isProcessing}
                          className="border-purple-200/70 bg-purple-50/70 text-purple-700 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-purple-100"
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Exportar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkDelete}
                          disabled={isProcessing}
                          className="border-red-200/70 bg-red-50/70 text-red-700 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-red-100"
                        >
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Eliminar
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedEvents([])}
                          disabled={isProcessing}
                          className="backdrop-blur-sm transition-all duration-200 hover:bg-muted/70"
                        >
                          <X className="mr-1 h-3 w-3" />
                          Cancelar
                        </Button>
                      </div>
                    </div>

                    {/* Bulk Actions Progress Bar */}
                    {isProcessing && (
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-1.5 animate-pulse rounded-full bg-blue-500"
                          style={{ width: '100%' }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Actions Floating Panel */}
                <div className="fixed bottom-6 right-6 z-50">
                  <div className="flex flex-col gap-2">
                    {showQuickActions && (
                      <div className="neural-glass-card animate-slide-up rounded-xl border border-white/20 bg-white/10 p-2 backdrop-blur-md">
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleQuickAction('refresh')}
                            className="justify-start text-white hover:bg-white/20"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Actualizar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleQuickAction('export-all')}
                            className="justify-start text-white hover:bg-white/20"
                          >
                            <FileDown className="mr-2 h-4 w-4" />
                            Exportar todo
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleQuickAction('compact-toggle')}
                            className="justify-start text-white hover:bg-white/20"
                          >
                            <Layers className="mr-2 h-4 w-4" />
                            {compactMode ? 'Vista normal' : 'Vista compacta'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Quick Actions Trigger */}
                    <Button
                      onClick={() => setShowQuickActions(!showQuickActions)}
                      className="neural-fab h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-0 shadow-lg transition-all duration-300 hover:scale-110 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl"
                    >
                      <MousePointer className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                {/* Advanced Search */}
                <AdvancedSearch
                  onSearch={setSearchInput}
                  onFilterApply={(filters) => {
                    if (filters.dateRange) {
                      setDateRange(filters.dateRange);
                    }
                    if (filters.status) {
                      setFilterBy(filters.status);
                    }
                    if (filters.minRevenue) {
                      setRevenueFilter((prev) => ({
                        ...prev,
                        min: filters.minRevenue,
                      }));
                    }
                    if (filters.minPhotos) {
                      // Could add photo count filter here
                    }
                  }}
                  events={events || []}
                  className="w-64"
                  placeholder="Buscar eventos, escuelas, fechas..."
                />

                {/* View Controls */}
                <div className="flex gap-2">
                  {/* Drag Mode Toggle */}
                  <Button
                    variant={isDragMode ? 'default' : 'ghost'}
                    className={cn(
                      'neural-glass-card border-white/20',
                      isDragMode &&
                        'border-purple-200 bg-purple-100 text-purple-700'
                    )}
                    onClick={toggleDragMode}
                    title={
                      isDragMode
                        ? 'Salir del modo arrastrar'
                        : 'Activar modo arrastrar'
                    }
                    aria-label={
                      isDragMode
                        ? 'Salir del modo arrastrar'
                        : 'Activar modo arrastrar'
                    }
                    aria-pressed={isDragMode}
                  >
                    <MousePointer className="h-4 w-4" />
                  </Button>

                  {/* View Mode Toggle */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="neural-glass-card border-white/20"
                      >
                        {viewMode === 'grid' ? (
                          <Grid3X3 className="h-4 w-4" />
                        ) : (
                          <List className="h-4 w-4" />
                        )}
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

                  {/* Enhanced Filters */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="neural-glass-card relative border-white/20"
                      >
                        <Filter className="h-4 w-4" />
                        {(dateRange.start ||
                          revenueFilter.max > 0 ||
                          progressFilter > 0) && (
                          <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="neural-glass-card w-80 border-white/20 p-4">
                      <div className="space-y-4">
                        {/* Status Filters */}
                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Estado
                          </label>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={
                                filterBy === 'all' ? 'default' : 'outline'
                              }
                              onClick={() => setFilterBy('all')}
                              className="flex-1"
                            >
                              Todos
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                filterBy === 'active' ? 'default' : 'outline'
                              }
                              onClick={() => setFilterBy('active')}
                              className="flex-1"
                            >
                              Activos
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                filterBy === 'draft' ? 'default' : 'outline'
                              }
                              onClick={() => setFilterBy('draft')}
                              className="flex-1"
                            >
                              Borradores
                            </Button>
                          </div>
                        </div>

                        {/* Date Range */}
                        <div>
                          <label className="mb-2 block flex items-center gap-2 text-sm font-medium">
                            <CalendarDays className="h-4 w-4" />
                            Rango de fechas
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="date"
                              value={dateRange.start}
                              onChange={(e) =>
                                setDateRange((prev) => ({
                                  ...prev,
                                  start: e.target.value,
                                }))
                              }
                              className="neural-glass-card border-white/20"
                              placeholder="Desde"
                            />
                            <Input
                              type="date"
                              value={dateRange.end}
                              onChange={(e) =>
                                setDateRange((prev) => ({
                                  ...prev,
                                  end: e.target.value,
                                }))
                              }
                              className="neural-glass-card border-white/20"
                              placeholder="Hasta"
                            />
                          </div>
                        </div>

                        {/* Revenue Filter */}
                        <div>
                          <label className="mb-2 block flex items-center gap-2 text-sm font-medium">
                            <DollarSign className="h-4 w-4" />
                            Ingresos (mínimo)
                          </label>
                          <Input
                            type="number"
                            value={revenueFilter.min}
                            onChange={(e) =>
                              setRevenueFilter((prev) => ({
                                ...prev,
                                min: Number(e.target.value),
                              }))
                            }
                            className="neural-glass-card border-white/20"
                            placeholder="$0"
                          />
                        </div>

                        {/* Progress Filter */}
                        <div>
                          <label className="mb-2 block flex items-center gap-2 text-sm font-medium">
                            <BarChart className="h-4 w-4" />
                            Progreso mínimo: {progressFilter}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="10"
                            value={progressFilter}
                            onChange={(e) =>
                              setProgressFilter(Number(e.target.value))
                            }
                            className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted"
                          />
                        </div>

                        <DropdownMenuSeparator className="bg-white/20" />

                        {/* Sort Options */}
                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Ordenar por
                          </label>
                          <div className="space-y-1">
                            {[
                              {
                                value: 'date_desc',
                                label: 'Más recientes',
                                icon: Clock,
                              },
                              {
                                value: 'revenue_desc',
                                label: 'Mayor ingreso',
                                icon: DollarSign,
                              },
                              {
                                value: 'photos_desc',
                                label: 'Más fotos',
                                icon: Activity,
                              },
                              {
                                value: 'name_asc',
                                label: 'Nombre A-Z',
                                icon: Users,
                              },
                            ].map((option) => (
                              <Button
                                key={option.value}
                                variant={
                                  sortBy === option.value ? 'default' : 'ghost'
                                }
                                size="sm"
                                onClick={() => setSortBy(option.value as any)}
                                className="w-full justify-start"
                              >
                                <option.icon className="mr-2 h-4 w-4" />
                                {option.label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Clear Filters */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDateRange({ start: '', end: '' });
                            setRevenueFilter({ min: 0, max: 0 });
                            setProgressFilter(0);
                            setFilterBy('all');
                            setSortBy('date_desc');
                          }}
                          className="w-full"
                        >
                          Limpiar filtros
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Settings */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="neural-glass-card relative border-white/20"
                      >
                        <Settings2 className="h-4 w-4" />
                        {showPerformanceStats && (
                          <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-green-400" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="neural-glass-card border-white/20">
                      <DropdownMenuItem onClick={toggleCompactMode}>
                        <Layers className="mr-2 h-4 w-4" />
                        {compactMode ? 'Modo estándar' : 'Modo compacto'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={toggleStatsPanel}>
                        <BarChart className="mr-2 h-4 w-4" />
                        {showStatsPanel
                          ? 'Ocultar estadísticas'
                          : 'Mostrar estadísticas'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/20" />
                      <DropdownMenuItem
                        onClick={() =>
                          setShowPerformanceStats(!showPerformanceStats)
                        }
                      >
                        <Monitor className="mr-2 h-4 w-4" />
                        {showPerformanceStats
                          ? 'Ocultar rendimiento'
                          : 'Mostrar rendimiento'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const monitor = PerformanceMonitor.getInstance();
                          const metrics = {
                            renderTime: monitor.getAverageTime('render-events'),
                            memoryUsage: memoryInfo,
                            totalEvents: processedEvents.length,
                          };
                          setPerformanceMetrics(metrics);
                          console.log('Performance Metrics:', metrics);
                        }}
                      >
                        <Cpu className="mr-2 h-4 w-4" />
                        Analizar rendimiento
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Notification Bell */}
                  <NotificationBell />

                  {/* Lazy-loaded Export System */}
                  <Suspense
                    fallback={
                      <Button
                        variant="ghost"
                        className="neural-glass-card border-white/20 opacity-50"
                        disabled
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    }
                  >
                    <LazyExportSystem
                      events={processedEvents}
                      onExport={(options: { format: string }) => {
                        showSuccessNotification(
                          addNotification,
                          'Exportación iniciada',
                          `Generando archivo ${options.format.toUpperCase()}`
                        );
                      }}
                    />
                  </Suspense>
                </div>

                {/* Create Event Button */}
                <Link href="/admin/events/new">
                  <Button
                    className="neural-fab relative overflow-hidden"
                    aria-label="Crear nuevo evento"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    <span className="font-semibold">Nuevo Evento</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Enhanced Stats Dashboard */}
            {showStatsPanel && events && events.length > 0 && (
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="neural-metric-display">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100/50 p-2 dark:bg-blue-900/30">
                      <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground dark:text-gray-300">
                        Total Eventos
                      </p>
                      <p className="text-2xl font-bold text-foreground dark:text-white">
                        {stats.totalEvents}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="neural-metric-display">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-100/50 p-2 dark:bg-purple-900/30">
                      <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground dark:text-gray-300">
                        Fotos Totales
                      </p>
                      <p className="text-2xl font-bold text-foreground dark:text-white">
                        {stats.totalPhotos}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="neural-metric-display">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-100/50 p-2 dark:bg-green-900/30">
                      <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground dark:text-gray-300">
                        Ingresos Totales
                      </p>
                      <p className="text-2xl font-bold text-foreground dark:text-white">
                        ${stats.totalRevenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="neural-metric-display">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary-50/50 p-2 dark:bg-primary-950/30">
                      <Eye className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground dark:text-gray-300">
                        Progreso Promedio
                      </p>
                      <p className="text-2xl font-bold text-foreground dark:text-white">
                        {stats.avgCompletionRate}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Responsive Grid Info with Large Display Optimization */}
            {isLargeScreen && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="h-2 w-2 rounded-full bg-green-400"></div>
                  <span>
                    Optimizado para pantallas grandes • {optimizedGridColumns}{' '}
                    columnas • {breakpoint.name} ({breakpoint.minWidth}px+)
                  </span>
                  {isUltraWide && (
                    <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                      Ultra-wide optimizado
                    </span>
                  )}
                </div>

                {/* Performance indicator for large displays */}
                {processedEvents.length > 50 && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <Gauge className="h-3 w-3" />
                    <span>
                      Virtualización activada para {processedEvents.length}{' '}
                      eventos • Rendimiento optimizado
                    </span>
                  </div>
                )}

                {/* Memory usage indicator */}
                {memoryInfo && showPerformanceStats && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Cpu className="h-3 w-3" />
                    <span>
                      Memoria:{' '}
                      {Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)}MB /{' '}
                      {Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024)}MB
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Performance Stats Panel */}
        {showPerformanceStats && (
          <div className="neural-glass-card animate-slide-up border border-blue-200/50 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-blue-900">
                <Monitor className="h-5 w-5" />
                Monitor de Rendimiento
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPerformanceStats(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="neural-metric-display">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Eventos renderizados
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {processedEvents.length}
                </div>
              </div>

              <div className="neural-metric-display">
                <div className="text-sm text-gray-500 dark:text-gray-400">Columnas de grid</div>
                <div className="text-2xl font-bold text-purple-600">
                  {optimizedGridColumns}
                </div>
              </div>

              {memoryInfo && (
                <div className="neural-metric-display">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Uso de memoria</div>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)}MB
                  </div>
                </div>
              )}

              <div className="neural-metric-display">
                <div className="text-sm text-gray-500 dark:text-gray-400">Modo virtual</div>
                <div className="text-lg font-bold text-primary-600">
                  {processedEvents.length > 20 ? 'Activo' : 'Inactivo'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="neural-glass-card animate-slide-up border border-red-200 bg-red-50/50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-300">
              Error al cargar eventos: {error.message}
            </p>
          </div>
        )}

        {/* Optimized Events Content with Virtual Scrolling */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {!processedEvents || processedEvents.length === 0 ? (
            <div className="neural-glass-card p-8 text-center">
              <EmptyState
                icon={Calendar}
                title={
                  debouncedSearchQuery
                    ? 'No se encontraron eventos'
                    : 'No hay eventos creados'
                }
                description={
                  debouncedSearchQuery
                    ? `No hay eventos que coincidan con "${debouncedSearchQuery}"`
                    : 'Crea tu primer evento para comenzar a organizar tus sesiones fotográficas.'
                }
              >
                {!debouncedSearchQuery && (
                  <Link href="/admin/events/new" className="inline-block">
                    <Button className="neural-fab">
                      <span className="font-medium">Crear primer evento</span>
                    </Button>
                  </Link>
                )}
              </EmptyState>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Performance monitoring start */}
              <div
                ref={(el) => {
                  if (el) {
                    const monitor = PerformanceMonitor.getInstance();
                    monitor.startMeasurement('render-events');
                  }
                }}
              />

              <DragDropProvider onReorder={handleReorderEvents}>
                {/* Virtual Grid for optimal performance */}
                <VirtualEventGrid
                  events={processedEvents}
                  onEventSelect={handleSelectEvent}
                  onEventEdit={handleEditEvent}
                  onEventDelete={handleDeleteEvent}
                  onEventView={handleViewEvent}
                  selectedEvents={selectedEvents}
                  isDragMode={isDragMode}
                  compactMode={compactMode}
                  showProgress={true}
                  showPreview={true}
                  showAnalytics={true}
                  gridColumns={optimizedGridColumns}
                  itemHeight={compactMode ? 300 : 420}
                  className={cn(
                    'neural-events-grid-optimized',
                    viewMode === 'list' && 'neural-events-list',
                    isUltraWide && 'neural-events-ultrawide'
                  )}
                />
              </DragDropProvider>

              {/* Performance monitoring end */}
              <div
                ref={(el) => {
                  if (el) {
                    const monitor = PerformanceMonitor.getInstance();
                    monitor.endMeasurement('render-events');
                  }
                }}
              />

              {/* Virtual Grid Performance Stats */}
              {showPerformanceStats && processedEvents.length > 0 && (
                <VirtualGridStats
                  events={processedEvents}
                  visibleRange={{
                    startIndex: 0,
                    endIndex: Math.min(
                      optimizedGridColumns * 3,
                      processedEvents.length - 1
                    ),
                    visibleCount: optimizedGridColumns * 3,
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Lazy-loaded Preview Modal */}
        {showPreviewModal && previewEvent && (
          <Suspense
            fallback={
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="neural-glass-card p-6 text-center">
                  <div className="border-3 mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-blue-600 border-t-transparent" />
                  <p className="text-gray-500 dark:text-gray-400">Cargando vista previa...</p>
                </div>
              </div>
            }
          >
            <LazyEventPreviewModal
              event={previewEvent}
              isOpen={showPreviewModal}
              onClose={handlePreviewClose}
              onNext={handlePreviewNext}
              onPrevious={handlePreviewPrevious}
              navigation={getPreviewNavigation()}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
