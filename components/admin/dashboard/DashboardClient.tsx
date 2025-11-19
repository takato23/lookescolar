'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Camera,
  Users,
  DollarSign,
  Package,
  Activity,
  Clock,
  RefreshCw,
  Search,
  AlertCircle,
  DownloadCloud,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { useKeyboardShortcuts } from '@/components/admin/hooks/useKeyboardShortcuts';
import { formatCurrency } from '@/lib/utils';
import { MobileDashboardLayout } from './MobileDashboardLayout';
import { ShortcutCard } from './ShortcutCard';
import { HighlightMetric } from './HighlightMetric';
import { AlertItem } from './AlertItem';
import { DashboardWelcome } from './DashboardWelcome';
import { RevenueChart } from './RevenueChart';
import { ActivityChart } from './ActivityChart';
import {
  DashboardStats,
  ShortcutCardProps,
  HighlightMetricProps,
  AlertItemProps,
} from '@/types/dashboard';

async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch('/api/admin/stats', {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch admin stats');
  }

  const json = await response.json();
  const data = json?.data;

  return {
    activeEvents: data?.events?.active ?? 0,
    totalPhotos: data?.photos?.total ?? 0,
    registeredFamilies: data?.subjects?.total ?? 0,
    totalSales: data?.orders?.total_revenue_cents ?? 0,
    todayUploads: data?.photos?.uploaded_today ?? 0,
    todayOrders: data?.activity?.recent_orders ?? 0,
    todayPayments: data?.activity?.recent_payments ?? 0,
    pendingOrders: data?.orders?.pending ?? 0,
    storageUsed: (data?.storage?.estimated_size_gb ?? 0) * 1024 * 1024 * 1024,
    storageLimit: 5 * 1024 * 1024 * 1024,
    recentActivity: (data?.recent_activity || []).map((item: any) => ({
      id: item.id,
      type: item.type,
      message: item.message,
      timestamp: item.timestamp,
    })),
    eventSummaries: (data?.events_summary || []).map((event: any) => ({
      id: event.id,
      name: event.name || 'Evento sin nombre',
      location: event.location ?? null,
      date: event.date ?? null,
      totalStudents: event.totalStudents ?? event.total_students ?? 0,
      photosUploaded: event.photosUploaded ?? event.photos_uploaded ?? 0,
      expectedPhotos: event.expectedPhotos ?? event.expected_photos ?? 0,
      status: event.status ?? 'planning',
    })),
    quickAccess: {
      lastEvent:
        data?.quick_access?.lastEvent ??
        data?.quick_access?.last_event ??
        'Sin eventos activos',
      lastEventDate:
        data?.quick_access?.lastEventDate ??
        data?.quick_access?.last_event_date ??
        null,
      photosToProcess:
        data?.quick_access?.photosToProcess ??
        data?.quick_access?.photos_to_process ??
        0,
      pendingUploads:
        data?.quick_access?.pendingUploads ??
        data?.quick_access?.pending_uploads ??
        0,
      recentActivity:
        data?.quick_access?.recentActivity ??
        data?.quick_access?.recent_activity ??
        'Aún no hay actividad registrada.',
    },
    photoManagement: {
      totalPhotos:
        data?.photo_management?.totalPhotos ??
        data?.photo_management?.total_photos ??
        0,
      processedToday:
        data?.photo_management?.processedToday ??
        data?.photo_management?.processed_today ??
        0,
      pendingProcessing:
        data?.photo_management?.pendingProcessing ??
        data?.photo_management?.pending_processing ??
        0,
      publishedGalleries:
        data?.photo_management?.publishedGalleries ??
        data?.photo_management?.published_galleries ??
        0,
      lastUploadAt:
        data?.photo_management?.lastUploadAt ??
        data?.photo_management?.last_upload_at ??
        null,
    },
    ordersSummary: {
      newOrders:
        data?.orders_summary?.newOrders ??
        data?.orders_summary?.new_orders ??
        0,
      pendingDelivery:
        data?.orders_summary?.pendingDelivery ??
        data?.orders_summary?.pending_delivery ??
        0,
      totalRevenueCents:
        data?.orders_summary?.totalRevenueCents ??
        data?.orders_summary?.total_revenue_cents ??
        0,
      todayOrders:
        data?.orders_summary?.todayOrders ??
        data?.orders_summary?.today_orders ??
        0,
    },
    businessMetrics: {
      monthlyRevenueCents:
        data?.business_metrics?.monthlyRevenueCents ??
        data?.business_metrics?.monthly_revenue_cents ??
        0,
      activeClients:
        data?.business_metrics?.activeClients ??
        data?.business_metrics?.active_clients ??
        0,
      completionRate: data?.business_metrics?.completionRate ?? 0,
      avgOrderValueCents:
        data?.business_metrics?.avgOrderValueCents ??
        data?.business_metrics?.avg_order_value_cents ??
        0,
    },
    revenueHistory: (data?.revenue_history || []).map((item: any) => ({
      date: item.date,
      revenue: item.revenue,
    })),
    activityHistory: (data?.activity_history || []).map((item: any) => ({
      date: item.date,
      uploads: item.uploads,
      orders: item.orders,
    })),
  };
}

export function DashboardClient() {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useKeyboardShortcuts({
    onOpenCommandPalette: () => setShowCommandPalette(true),
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
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
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });

  const dashboardStats: DashboardStats =
    stats ?? {
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

  const storageUsagePercent = useMemo(() => {
    if (!dashboardStats.storageLimit) {
      return 0;
    }
    const raw =
      (dashboardStats.storageUsed / dashboardStats.storageLimit) * 100;
    return Math.min(100, Math.round(raw));
  }, [dashboardStats.storageLimit, dashboardStats.storageUsed]);

  // Mock data for charts (replace with real API data later)
  const revenueData = [
    { date: 'Lun', revenue: 120000 },
    { date: 'Mar', revenue: 150000 },
    { date: 'Mie', revenue: 180000 },
    { date: 'Jue', revenue: 140000 },
    { date: 'Vie', revenue: 200000 },
    { date: 'Sab', revenue: 250000 },
    { date: 'Dom', revenue: 190000 },
  ];

  const activityData = [
    { date: 'Lun', uploads: 45, orders: 12 },
    { date: 'Mar', uploads: 52, orders: 15 },
    { date: 'Mie', uploads: 38, orders: 18 },
    { date: 'Jue', uploads: 65, orders: 14 },
    { date: 'Vie', uploads: 48, orders: 22 },
    { date: 'Sab', uploads: 25, orders: 28 },
    { date: 'Dom', uploads: 15, orders: 20 },
  ];

  const shortcuts: ShortcutCardProps[] = [
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

  const highlightMetrics: HighlightMetricProps[] = [
    {
      id: 'active-events',
      label: 'Eventos activos',
      value: dashboardStats.activeEvents.toLocaleString('es-AR'),
      helper: `${dashboardStats.quickAccess.lastEvent}`,
      icon: Calendar,
    },
    {
      id: 'pending-orders',
      label: 'Pedidos pendientes',
      value: dashboardStats.pendingOrders.toLocaleString('es-AR'),
      helper: `${dashboardStats.ordersSummary.todayOrders.toLocaleString(
        'es-AR'
      )} pedidos hoy`,
      icon: Package,
    },
    {
      id: 'total-sales',
      label: 'Ventas acumuladas',
      value: formatCurrency(dashboardStats.totalSales / 100),
      helper: `${dashboardStats.todayPayments.toLocaleString(
        'es-AR'
      )} pagos hoy`,
      icon: DollarSign,
    },
  ];

  const alertItems: AlertItemProps[] = [
    dashboardStats.pendingOrders > 0
      ? {
        id: 'orders',
        title: 'Pedidos para revisar',
        description: `Tenés ${dashboardStats.pendingOrders.toLocaleString(
          'es-AR'
        )} pedidos que necesitan revisión.`,
        badge: 'Revisar ahora',
        tone: dashboardStats.pendingOrders > 5 ? 'danger' : 'warning',
        icon: Package,
      }
      : null,
    dashboardStats.todayUploads === 0
      ? {
        id: 'uploads',
        title: 'Sin subidas hoy',
        description:
          'Aún no se registraron fotos nuevas en la jornada. Confirmá que todo esté en orden.',
        badge: 'Seguimiento',
        tone: 'info',
        icon: Camera,
      }
      : null,
    storageUsagePercent >= 85
      ? {
        id: 'storage',
        title: 'Espacio casi lleno',
        description: `Usaste ${storageUsagePercent}% de la capacidad disponible.`,
        badge: 'Planificar descarga',
        tone: storageUsagePercent > 92 ? 'danger' : 'warning',
        icon: DownloadCloud,
      }
      : null,
  ].filter(Boolean) as AlertItemProps[];

  const formatTime = useMemo(
    () => (date: Date) =>
      date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    []
  );

  const recentActivity = dashboardStats.recentActivity.slice(0, 5);

  return (
    <>
      <MobileDashboardLayout stats={dashboardStats} currentTime={currentTime} />

      <div className="hidden min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/40 dark:from-slate-950 dark:via-indigo-950/20 dark:to-blue-950/30 lg:block">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
          <DashboardWelcome
            currentTime={currentTime}
            isLoading={isLoading}
            error={error}
            onRefresh={refetch}
          />

          {/* Quick Access Cards with improved design */}
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
              {shortcuts.map((shortcut, index) => (
                <ShortcutCard key={shortcut.id} {...shortcut} index={index} />
              ))}
            </div>
          </section>

          {/* Metrics Cards with enhanced visual design */}
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

          {/* Charts Section */}
          <section className="grid gap-6 lg:grid-cols-2">
            <RevenueChart data={revenueData} />
            <ActivityChart data={activityData} />
          </section>

          {/* Alerts and Recent Activity with enhanced design */}
          <section className="grid gap-5 xl:grid-cols-[1.5fr,1fr]">
            {/* Alerts Panel */}
            <div className="liquid-glass-intense relative overflow-hidden rounded-2xl p-6 shadow-xl">
              <div className="absolute right-0 top-0 h-40 w-40 bg-gradient-to-br from-orange-400/20 to-red-400/20 blur-3xl"></div>

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
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10"></div>
                    <div className="relative">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
            <div className="liquid-glass-intense relative overflow-hidden rounded-2xl p-6 shadow-xl">
              <div className="absolute right-0 top-0 h-40 w-40 bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"></div>

              <header className="relative mb-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Actividad Reciente
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
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
                      <div
                        key={activity.id}
                        className="group relative flex gap-4 rounded-xl p-3 transition-all duration-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="relative mt-1">
                          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-sm"></div>
                          <div className="relative flex h-2 w-2 rounded-full bg-blue-500"></div>
                          {index !== recentActivity.length - 1 && (
                            <div className="absolute left-1 top-3 h-full w-px bg-slate-200 dark:bg-slate-700"></div>
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
        onClose={() => setShowCommandPalette(false)}
      />
    </>
  );
}
