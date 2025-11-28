'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Camera,
  DollarSign,
  Package,
  Users,
  Activity,
  DownloadCloud,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { useKeyboardShortcuts } from '@/components/admin/hooks/useKeyboardShortcuts';
import { formatCurrency } from '@/lib/utils';
import { MobileDashboardLayout } from './MobileDashboardLayout';
import { ShortcutCard } from './ShortcutCard';
import { HighlightMetric } from './HighlightMetric';
import { AlertItem } from './AlertItem';
import { DashboardWelcome } from './DashboardWelcome';
import type {
  DashboardStats,
  ShortcutCardProps,
  HighlightMetricProps,
  AlertItemProps,
} from '@/types/dashboard';

// Lazy load charts - they're heavy and not above the fold
const RevenueChart = dynamic(
  () => import('./RevenueChart').then((m) => ({ default: m.RevenueChart })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);
const ActivityChart = dynamic(
  () => import('./ActivityChart').then((m) => ({ default: m.ActivityChart })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);

// Chart skeleton for loading state
const ChartSkeleton = memo(() => (
  <div className="liquid-glass-intense h-[380px] animate-pulse rounded-3xl border border-white/10 bg-black/20" />
));
ChartSkeleton.displayName = 'ChartSkeleton';

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
    id: 'orders',
    href: '/admin/orders',
    title: 'Pedidos',
    description: 'Seguimiento de ventas y entregas',
    icon: Package,
  },
  {
    id: 'families',
    href: '/admin/subjects',
    title: 'Familias',
    description: 'Gestioná accesos y contactos',
    icon: Users,
  },
];

// Optimized fetch function
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

// Memoized activity item component
const ActivityItem = memo(
  ({
    activity,
    index,
    isLast,
  }: {
    activity: DashboardStats['recentActivity'][0];
    index: number;
    isLast: boolean;
  }) => (
    <div className="group relative flex gap-4 rounded-xl p-3 transition-all duration-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
      <div className="relative mt-1">
        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-sm" />
        <div className="relative flex h-2 w-2 rounded-full bg-blue-500" />
        {!isLast && (
          <div className="absolute left-1 top-3 h-full w-px bg-slate-200 dark:bg-slate-700" />
        )}
      </div>
      <div className="flex-1 pb-1">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
          {activity.message}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {new Date(activity.timestamp).toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
);
ActivityItem.displayName = 'ActivityItem';

export function DashboardClient() {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useKeyboardShortcuts({
    onOpenCommandPalette: useCallback(() => setShowCommandPalette(true), []),
  });

  // Update time every minute instead of every second (saves 59 renders/min)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000,
    staleTime: 60000,
    gcTime: 300000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const dashboardStats = stats ?? DEFAULT_STATS;

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
      });
    }
    return items;
  }, [
    dashboardStats.pendingOrders,
    dashboardStats.todayUploads,
    storageUsagePercent,
  ]);

  const recentActivity = useMemo(
    () => dashboardStats.recentActivity.slice(0, 5),
    [dashboardStats.recentActivity]
  );
  const revenueData = dashboardStats.revenueHistory;
  const activityData = dashboardStats.activityHistory;

  const handleCloseCommandPalette = useCallback(
    () => setShowCommandPalette(false),
    []
  );

  return (
    <>
      <MobileDashboardLayout stats={dashboardStats} currentTime={currentTime} />

      <div className="hidden min-h-screen bg-transparent lg:block">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
          <DashboardWelcome
            currentTime={currentTime}
            isLoading={isLoading}
            error={error}
            onRefresh={refetch}
          />

          {/* Quick Access Cards */}
          <section>
            <header className="mb-5 px-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Accesos Rápidos
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Accede directamente a las funciones principales de tu estudio
              </p>
            </header>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {SHORTCUTS.map((shortcut, index) => (
                <ShortcutCard key={shortcut.id} {...shortcut} index={index} />
              ))}
            </div>
          </section>

          {/* Metrics Cards */}
          <section>
            <header className="mb-5 px-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Métricas Clave
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Indicadores principales de tu negocio en tiempo real
              </p>
            </header>
            <div className="grid gap-5 sm:grid-cols-3">
              {highlightMetrics.map((metric, index) => (
                <HighlightMetric key={metric.id} {...metric} index={index} />
              ))}
            </div>
          </section>

          {/* Charts Section - Lazy loaded */}
          <section className="grid gap-6 lg:grid-cols-2">
            <RevenueChart data={revenueData} />
            <ActivityChart data={activityData} />
          </section>

          {/* Alerts and Recent Activity */}
          <section className="grid gap-5 xl:grid-cols-[1.5fr,1fr]">
            {/* Alerts Panel */}
            <div className="liquid-glass-intense relative overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-6 shadow-xl backdrop-blur-xl">
              <div className="absolute right-0 top-0 h-40 w-40 bg-gradient-to-br from-orange-500/10 to-red-500/10 blur-3xl" />
              <header className="relative mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Alertas y Notificaciones
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Prioridades que requieren tu atención
                  </p>
                </div>
                {alertItems.length > 0 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-xs font-bold text-white shadow-lg">
                    {alertItems.length}
                  </div>
                )}
              </header>
              <div className="relative">
                {alertItems.length === 0 ? (
                  <div className="liquid-glass group relative overflow-hidden rounded-xl border-2 border-emerald-500/30 p-6 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10" />
                    <div className="relative">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500">
                        <svg
                          className="h-6 w-6 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                        ¡Todo está al día!
                      </p>
                      <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                        No hay alertas pendientes
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alertItems.map((item, index) => (
                      <AlertItem key={item.id} {...item} index={index} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity Panel */}
            <div className="liquid-glass-intense relative overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-6 shadow-xl backdrop-blur-xl">
              <div className="absolute right-0 top-0 h-40 w-40 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-3xl" />
              <header className="relative mb-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Actividad Reciente
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      En vivo
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Últimos eventos del sistema
                </p>
              </header>
              <div className="relative">
                {recentActivity.length === 0 ? (
                  <div className="liquid-glass rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
                    <Activity className="mx-auto mb-3 h-8 w-8 text-slate-400 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Sin actividad reciente
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Los eventos aparecerán aquí
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <ActivityItem
                        key={activity.id}
                        activity={activity}
                        index={index}
                        isLast={index === recentActivity.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={handleCloseCommandPalette}
      />
    </>
  );
}
