'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Camera,
  DollarSign,
  Package,
  DownloadCloud,
  Bell,
  AlertCircle,
  Activity,
  Settings,
} from 'lucide-react';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { useKeyboardShortcuts } from '@/components/admin/hooks/useKeyboardShortcuts';
import { BulkGalleryCreator } from '@/components/admin/BulkGalleryCreator';
import { cn, formatCurrency } from '@/lib/utils';
import { MobileDashboardLayout } from './MobileDashboardLayout';
import { ShortcutCard } from './ShortcutCard';
import { HighlightMetric } from './HighlightMetric';
import { AlertItem } from './AlertItem';
import { DashboardWelcome } from './DashboardWelcome';
import { ActivityItem } from './ActivityItem';
import { QuickUploadWidget } from './QuickUploadWidget';
import { DraggableWidgetGrid, Widget } from './DraggableWidgetGrid';
import type {
  DashboardStats,
  ShortcutCardProps,
  HighlightMetricProps,
  AlertItemProps,
} from '@/types/dashboard';
import { Button } from '@/components/ui/button';

// Default empty stats - defined outside component to prevent recreation
const DEFAULT_STATS: DashboardStats = {
  activeEvents: 0,
  totalPhotos: 0,
  registeredFamilies: 0,
  totalSales: 0,
  todayUploads: 0,
  todayOrders: 0,
  todayPayments: 0,
  pendingOrders: 0,
  storageUsed: 0,
  storageLimit: 5 * 1024 * 1024 * 1024,
  recentActivity: [],
  eventSummaries: [],
  quickAccess: {
    lastEvent: 'Sin eventos activos',
    lastEventDate: null,
    photosToProcess: 0,
    pendingUploads: 0,
    recentActivity: 'Aún no hay actividad registrada.',
  },
  photoManagement: {
    totalPhotos: 0,
    processedToday: 0,
    pendingProcessing: 0,
    publishedGalleries: 0,
    lastUploadAt: null,
  },
  ordersSummary: {
    newOrders: 0,
    pendingDelivery: 0,
    totalRevenueCents: 0,
    todayOrders: 0,
  },
  businessMetrics: {
    monthlyRevenueCents: 0,
    activeClients: 0,
    completionRate: 0,
    avgOrderValueCents: 0,
  },
  revenueHistory: [],
  activityHistory: [],
};

// Static shortcuts config - outside component
const SHORTCUTS: ShortcutCardProps[] = [
  {
    id: 'events',
    href: '/admin/events',
    title: 'Eventos',
    description: 'Organizá jornadas y galerías',
    icon: Calendar,
  },
  {
    id: 'photos',
    href: '/admin/photos',
    title: 'Fotos',
    description: 'Subí y clasificá contenido',
    icon: Camera,
  },
  {
    id: 'publish',
    href: '/admin/publish',
    title: 'Publicar',
    description: 'Compartí con clientes',
    icon: DownloadCloud,
  },
  {
    id: 'orders',
    href: '/admin/orders',
    title: 'Pedidos',
    description: 'Seguimiento de ventas y entregas',
    icon: Package,
  },
];

// Default widget configuration for draggable dashboard
const DEFAULT_WIDGETS: Widget[] = [
  {
    id: 'shortcuts',
    title: 'Accesos Rápidos',
    size: 'full',
    visible: true,
    order: 0,
  },
  {
    id: 'alerts',
    title: 'Alertas',
    size: 'full',
    visible: true,
    order: 1,
  },
  {
    id: 'quick-upload',
    title: 'Subida Rápida',
    size: 'medium',
    visible: true,
    order: 2,
  },
  {
    id: 'metrics',
    title: 'Métricas Clave',
    size: 'medium',
    visible: true,
    order: 3,
  },
];

// Optimized fetch function (keeping local for now to minimize breakage risk during migration)
async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch('/api/admin/stats', {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch admin stats');

  const { data } = await response.json();
  if (!data) return DEFAULT_STATS;

  return {
    activeEvents: data.events?.active ?? 0,
    totalPhotos: data.photos?.total ?? 0,
    registeredFamilies: data.subjects?.total ?? 0,
    totalSales: data.orders?.total_revenue_cents ?? 0,
    todayUploads: data.photos?.uploaded_today ?? 0,
    todayOrders: data.activity?.recent_orders ?? 0,
    todayPayments: data.activity?.recent_payments ?? 0,
    pendingOrders: data.orders?.pending ?? 0,
    storageUsed: (data.storage?.estimated_size_gb ?? 0) * 1073741824, // 1024^3
    storageLimit: 5368709120, // 5GB
    recentActivity: data.recent_activity ?? [],
    eventSummaries: data.events_summary ?? [],
    quickAccess: data.quick_access ?? DEFAULT_STATS.quickAccess,
    photoManagement: data.photo_management ?? DEFAULT_STATS.photoManagement,
    ordersSummary: data.orders_summary ?? DEFAULT_STATS.ordersSummary,
    businessMetrics: data.business_metrics ?? DEFAULT_STATS.businessMetrics,
    revenueHistory: data.revenue_history ?? [],
    activityHistory: data.activity_history ?? [],
  };
}

export function DashboardClient() {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [quickUploadFiles, setQuickUploadFiles] = useState<File[]>([]);
  const [quickUploadEventId, setQuickUploadEventId] = useState<string | null>(
    null
  );
  const [isBulkCreatorOpen, setIsBulkCreatorOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useKeyboardShortcuts({
    onOpenCommandPalette: useCallback(() => setShowCommandPalette(true), []),
  });

  const handleWidgetsChange = useCallback((newWidgets: Widget[]) => {
    setWidgets(newWidgets);
  }, []);

  const handleQuickUpload = useCallback(
    ({ files, eventId }: { files: File[]; eventId: string }) => {
      setQuickUploadFiles(files);
      setQuickUploadEventId(eventId);
      setIsBulkCreatorOpen(true);
    },
    []
  );

  const handleCloseBulkCreator = useCallback(() => {
    setIsBulkCreatorOpen(false);
    setQuickUploadFiles([]);
    setQuickUploadEventId(null);
  }, []);

  const handleCloseCommandPalette = useCallback(() => {
    setShowCommandPalette(false);
  }, []);

  const handleCustomize = useCallback(() => {
    setIsEditMode(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const {
    data: stats,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000,
    staleTime: 60000,
  });

  const dashboardStats = stats ?? DEFAULT_STATS;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : undefined;

  // Memoize computed values
  const storageUsagePercent = useMemo(() => {
    if (!dashboardStats.storageLimit) return 0;
    return Math.min(
      100,
      Math.round(
        (dashboardStats.storageUsed / dashboardStats.storageLimit) * 100
      )
    );
  }, [dashboardStats.storageUsed, dashboardStats.storageLimit]);

  const highlightMetrics = useMemo(
    (): HighlightMetricProps[] => [
      {
        id: 'active-events',
        label: 'Eventos activos',
        value: dashboardStats.activeEvents.toLocaleString('es-AR'),
        helper: dashboardStats.quickAccess.lastEvent,
        icon: Calendar,
      },
      {
        id: 'pending-orders',
        label: 'Pedidos pendientes',
        value: dashboardStats.pendingOrders.toLocaleString('es-AR'),
        helper: `${dashboardStats.ordersSummary.todayOrders.toLocaleString('es-AR')} pedidos hoy`,
        icon: Package,
      },
      {
        id: 'total-sales',
        label: 'Ventas acumuladas',
        value: formatCurrency(dashboardStats.totalSales / 100),
        helper: `${dashboardStats.todayPayments.toLocaleString('es-AR')} pagos hoy`,
        icon: DollarSign,
      },
    ],
    [
      dashboardStats.activeEvents,
      dashboardStats.quickAccess.lastEvent,
      dashboardStats.pendingOrders,
      dashboardStats.ordersSummary.todayOrders,
      dashboardStats.totalSales,
      dashboardStats.todayPayments,
    ]
  );

  const alertItems = useMemo((): AlertItemProps[] => {
    const items: AlertItemProps[] = [];
    if (dashboardStats.pendingOrders > 0) {
      items.push({
        id: 'orders',
        title: 'Pedidos para revisar',
        description: `Tenés ${dashboardStats.pendingOrders.toLocaleString('es-AR')} pedidos que necesitan revisión.`,
        badge: 'Revisar ahora',
        tone: dashboardStats.pendingOrders > 5 ? 'danger' : 'warning',
        icon: Package,
        actions: [
          {
            label: 'Ver lista',
            href: '/admin/orders',
            variant: 'primary',
          },
        ],
      });
    }
    if (dashboardStats.todayUploads === 0) {
      items.push({
        id: 'uploads',
        title: 'Sin subidas hoy',
        description: 'Aún no se registraron fotos nuevas en la jornada.',
        badge: 'Seguimiento',
        tone: 'info',
        icon: Camera,
        actions: [
          {
            label: 'Subir fotos',
            href: '/admin/photos',
            variant: 'primary',
          },
        ],
      });
    }
    if (storageUsagePercent >= 85) {
      items.push({
        id: 'storage',
        title: 'Espacio casi lleno',
        description: `Usaste ${storageUsagePercent}% de la capacidad disponible.`,
        badge: 'Planificar descarga',
        tone: storageUsagePercent > 92 ? 'danger' : 'warning',
        icon: DownloadCloud,
        actions: [
          {
            label: 'Revisar ajustes',
            href: '/admin/settings',
            variant: 'primary',
          },
        ],
      });
    }
    return items;
  }, [
    dashboardStats.pendingOrders,
    dashboardStats.todayUploads,
    storageUsagePercent,
  ]);

  // Widget content renderer
  const renderWidgetContent = useCallback(
    (widget: Widget) => {
      switch (widget.id) {
        case 'shortcuts':
          return (
            <div className="dashboard-surface h-full rounded-3xl p-5 shadow-xl">
              <header className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Accesos Rápidos</h2>
                  <p className="text-sm text-slate-500">Herramientas principales</p>
                </div>
              </header>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {SHORTCUTS.map((shortcut, index) => (
                  <ShortcutCard
                    key={shortcut.id}
                    {...shortcut}
                    index={index}
                  />
                ))}
              </div>
            </div>
          );

        case 'quick-upload':
          return (
            <div className="dashboard-surface h-full rounded-3xl p-5 shadow-xl">
              <header className="mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Subida Rápida</h2>
              </header>
              <QuickUploadWidget
                events={dashboardStats.eventSummaries}
                onUpload={handleQuickUpload}
              />
            </div>
          );

        case 'metrics':
          return (
            <div className="dashboard-surface h-full rounded-3xl p-5 shadow-xl">
              <header className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Métricas del Día</h2>
              </header>
              <div className="grid gap-4 sm:grid-cols-1">
                {highlightMetrics.map((metric, index) => (
                  <HighlightMetric
                    key={metric.id}
                    {...metric}
                    index={index}
                  />
                ))}
              </div>
            </div>
          );

        case 'alerts':
          return (
            <div className="dashboard-surface relative h-full overflow-hidden rounded-3xl p-5 shadow-xl">
              <header className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Alertas</h2>
                  <p className="text-sm text-slate-500">Acciones prioritarias</p>
                </div>
              </header>

              <div className="relative space-y-3">
                {alertItems.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500">No hay alertas pendientes.</p>
                  </div>
                  ) : (
                    alertItems.map((item, index) => (
                      <AlertItem
                        key={item.id}
                        {...item}
                        index={index}
                      />
                  ))
                )}
              </div>
            </div>
          );

        case 'recent-activity':
          return (
            <div className="dashboard-surface relative h-full overflow-hidden rounded-3xl p-5 shadow-xl">
              <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 bg-gradient-to-br from-sky-500/10 to-blue-500/10 blur-3xl" />
              <header
                className={cn(
                  'relative mb-4',
                  'px-1'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl',
                        'bg-gradient-to-br from-sky-500 to-blue-600 text-white'
                      )}
                    >
                      <Activity
                        className="h-5 w-5 text-white"
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Actividad Reciente
                      </h2>
                      <p className="text-sm text-slate-700 dark:text-slate-400">
                        Últimos eventos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      En vivo
                    </span>
                  </div>
                </div>
              </header>
              <div className="relative">
                {dashboardStats.recentActivity.length === 0 ? (
                  <div className="liquid-glass rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/50">
                    <Activity className="mx-auto mb-3 h-8 w-8 text-slate-500 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Sin actividad reciente
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                      Los eventos aparecerán aquí
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardStats.recentActivity.map((activity, index) => (
                      <ActivityItem
                        key={activity.id}
                        activity={activity}
                        index={index}
                        isLast={index === dashboardStats.recentActivity.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );

        default:
          return null;
      }
    },
    [
      dashboardStats.eventSummaries,
      handleQuickUpload,
      highlightMetrics,
      alertItems,
      SHORTCUTS,
      dashboardStats.recentActivity
    ]
  );

  return (
    <>
      <MobileDashboardLayout stats={dashboardStats} currentTime={currentTime} />

      <div className="hidden min-h-screen bg-transparent lg:block">
        <div className="flex w-full flex-col gap-4 py-4">
          <DashboardWelcome
            currentTime={currentTime}
            isLoading={isLoading || isFetching}
            error={error}
            onRefresh={refetch}
            lastUpdated={lastUpdated}
            isFetching={isFetching}
            actions={
              !isEditMode ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCustomize}
                  className="h-8 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  <Settings className="h-4 w-4" />
                  <span className="ml-2">Personalizar</span>
                </Button>
              ) : null
            }
          />

          {error && (
            <div
              role="alert"
              className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm"
            >
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-5 w-5" aria-hidden />
              </div>
              <div className="space-y-1 text-sm">
                <div className="font-semibold">No pudimos actualizar el panel.</div>
                {error instanceof Error && (
                  <p className="text-amber-800">
                    {error.message}
                  </p>
                )}
                <p className="text-xs text-amber-700">
                  Verifica tu conexión o intenta nuevamente.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    Reintentar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-amber-800 hover:text-amber-900"
                    onClick={() => window.location.reload()}
                  >
                    Recargar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Draggable Widget Grid */}
          <DraggableWidgetGrid
            widgets={widgets}
            onWidgetsChange={handleWidgetsChange}
            storageKey="dashboard-widgets-v2"
            isEditMode={isEditMode}
            onEditModeChange={setIsEditMode}
            showIdleControls={false}
          >
            {renderWidgetContent}
          </DraggableWidgetGrid>
        </div>
      </div>

      <BulkGalleryCreator
        isOpen={isBulkCreatorOpen}
        onClose={handleCloseBulkCreator}
        eventId={quickUploadEventId || ''}
        initialFiles={quickUploadFiles}
        onComplete={() => {
          refetch();
        }}
      />

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={handleCloseCommandPalette}
      />
    </>
  );
}
