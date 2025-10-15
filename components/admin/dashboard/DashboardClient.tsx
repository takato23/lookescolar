'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { PremiumGlassButton, PremiumIconButton } from '@/components/ui/premium-glass-button';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { useKeyboardShortcuts } from '@/components/admin/hooks/useKeyboardShortcuts';
import { formatCurrency } from '@/lib/utils';
import { QuickActions } from './QuickActions';
import { DashboardSkeleton } from './DashboardSkeleton';
import {
  EventProgressWidget,
  QuickAccessWidget,
  OrdersSummaryWidget,
  PhotoManagementWidget,
  BusinessMetricsWidget,
} from './PhotographyWidgets';
import { MobileDashboardLayout } from './MobileDashboardLayout';
import {
  Calendar,
  Camera,
  Users,
  DollarSign,
  Package,
  Activity,
  Monitor,
  Clock,
  Search,
  AlertCircle,
  RefreshCw,
  CloudUpload,
  FolderOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Lazy load performance monitor for better initial load
const PerformanceMonitor = dynamic(
  () =>
    import('@/components/admin/PerformanceMonitor').then((m) => ({
      default: m.PerformanceMonitor,
    })),
  {
    ssr: false,
    loading: () => <div className="bg-muted h-32 animate-pulse rounded" />,
  }
);

interface DashboardStats {
  activeEvents: number;
  totalPhotos: number;
  registeredFamilies: number;
  totalSales: number;
  todayUploads: number;
  todayOrders: number;
  todayPayments: number;
  pendingOrders: number;
  storageUsed: number;
  storageLimit: number;
  recentActivity: Activity[];
}

interface Activity {
  id: string;
  type:
    | 'event_created'
    | 'photos_uploaded'
    | 'order_created'
    | 'order_completed';
  message: string;
  timestamp: string;
  eventId?: string;
  count?: number;
}

interface StatCardConfig {
  id: string;
  label: string;
  value: string;
  description: string;
  chip: string;
  icon: LucideIcon;
  accent: string;
}

type FocusTone = 'success' | 'warning' | 'alert' | 'info' | 'muted';

interface FocusArea {
  id: string;
  title: string;
  description: string;
  badge: string;
  tone: FocusTone;
  icon: LucideIcon;
}

interface TodayHighlight {
  id: string;
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}

interface UpcomingMilestone {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

// Fetch dashboard stats from unified Admin Stats API and map to expected shape
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

  // Map server response to DashboardClient shape
  const mapped: DashboardStats = {
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
    recentActivity: (data?.recent_activity || []).map((a: any) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      timestamp: a.timestamp,
    })),
  };

  return mapped;
}

export function DashboardClient() {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setShowCommandPalette(true),
  });

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch dashboard stats with React Query
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 60000, // Consider data stale after 1 minute
    gcTime: 5 * 60 * 1000, // Garbage collect after 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const dashboardStats = stats || {
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
  };

  // Format time functions
  const formatTime = useMemo(
    () => (date: Date) => {
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    },
    []
  );

  const formatTimeAgo = useMemo(
    () => (timestamp: string) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / (1000 * 60));

      if (minutes < 1) return 'Hace unos segundos';
      if (minutes === 1) return 'Hace 1 minuto';
      if (minutes < 60) return `Hace ${minutes} minutos`;

      const hours = Math.floor(minutes / 60);
      if (hours === 1) return 'Hace 1 hora';
      if (hours < 24) return `Hace ${hours} horas`;

      return date.toLocaleDateString('es-ES');
    },
    []
  );

  const formatTodayLabel = (value: number, singular: string, plural: string) => {
    if (!value) {
      return 'Sin actividad';
    }
    return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
  };

  const storageUsagePercent = useMemo(() => {
    if (!dashboardStats.storageLimit) {
      return 0;
    }
    return Math.min(
      100,
      Math.round((dashboardStats.storageUsed / dashboardStats.storageLimit) * 100)
    );
  }, [dashboardStats.storageLimit, dashboardStats.storageUsed]);

  const storageUsedGb = useMemo(() => {
    return dashboardStats.storageUsed / 1024 / 1024 / 1024;
  }, [dashboardStats.storageUsed]);

  const storageLimitGb = useMemo(() => {
    return dashboardStats.storageLimit / 1024 / 1024 / 1024;
  }, [dashboardStats.storageLimit]);

  const kpiCards = useMemo(() => {
    return [
      {
        id: 'events',
        label: 'Eventos activos',
        value: dashboardStats.activeEvents.toLocaleString(),
        description: 'Seguimiento de sesiones coordinadas con las escuelas.',
        chip: formatTodayLabel(dashboardStats.todayUploads, 'carga', 'cargas'),
        icon: Calendar,
        accent: 'from-sky-500/15 via-blue-500/10 to-indigo-500/20',
      },
      {
        id: 'photos',
        label: 'Fotos totales',
        value: dashboardStats.totalPhotos.toLocaleString(),
        description: 'Incluye galerías publicadas y en revisión.',
        chip: formatTodayLabel(
          dashboardStats.todayUploads,
          'nueva foto',
          'nuevas fotos'
        ),
        icon: Camera,
        accent: 'from-purple-500/15 via-fuchsia-500/10 to-pink-500/20',
      },
      {
        id: 'families',
        label: 'Familias registradas',
        value: dashboardStats.registeredFamilies.toLocaleString(),
        description: 'Contactos listos para recibir campañas y recordatorios.',
        chip: formatTodayLabel(dashboardStats.todayOrders, 'pedido', 'pedidos'),
        icon: Users,
        accent: 'from-emerald-500/15 via-teal-500/10 to-green-500/20',
      },
      {
        id: 'sales',
        label: 'Ventas acumuladas',
        value: formatCurrency(dashboardStats.totalSales / 100),
        description: `Pedidos pendientes: ${dashboardStats.pendingOrders}`,
        chip: formatTodayLabel(dashboardStats.todayPayments, 'pago', 'pagos'),
        icon: DollarSign,
        accent: 'from-amber-500/15 via-orange-500/10 to-yellow-500/20',
      },
    ] satisfies StatCardConfig[];
  }, [
    dashboardStats.activeEvents,
    dashboardStats.pendingOrders,
    dashboardStats.registeredFamilies,
    dashboardStats.todayOrders,
    dashboardStats.todayPayments,
    dashboardStats.todayUploads,
    dashboardStats.totalPhotos,
    dashboardStats.totalSales,
  ]);

  const focusAreas = useMemo(() => {
    const pendingTone: FocusTone =
      dashboardStats.pendingOrders > 5
        ? 'alert'
        : dashboardStats.pendingOrders > 0
        ? 'warning'
        : 'success';

    const uploadsTone: FocusTone = dashboardStats.todayUploads ? 'info' : 'muted';
    const paymentsTone: FocusTone = dashboardStats.todayPayments ? 'success' : 'muted';
    const storageTone: FocusTone =
      storageUsagePercent > 92
        ? 'alert'
        : storageUsagePercent > 80
        ? 'warning'
        : 'info';

    return [
      {
        id: 'orders',
        title: 'Pedidos para revisar',
        description:
          dashboardStats.pendingOrders > 0
            ? `Tenés ${dashboardStats.pendingOrders} pedidos que necesitan seguimiento.`
            : 'No hay pedidos en espera de revisión.',
        badge:
          dashboardStats.pendingOrders > 0
            ? `${dashboardStats.pendingOrders} pendientes`
            : 'Al día',
        tone: pendingTone,
        icon: Package,
      },
      {
        id: 'uploads',
        title: 'Subidas del día',
        description:
          dashboardStats.todayUploads > 0
            ? `${dashboardStats.todayUploads.toLocaleString()} fotos se cargaron en las últimas horas.`
            : 'Aún no se registraron subidas hoy.',
        badge: formatTodayLabel(dashboardStats.todayUploads, 'carga', 'cargas'),
        tone: uploadsTone,
        icon: CloudUpload,
      },
      {
        id: 'payments',
        title: 'Pagos confirmados',
        description:
          dashboardStats.todayPayments > 0
            ? `${dashboardStats.todayPayments.toLocaleString()} pagos acreditados hoy.`
            : 'Sin acreditaciones recientes.',
        badge: formatTodayLabel(dashboardStats.todayPayments, 'pago', 'pagos'),
        tone: paymentsTone,
        icon: DollarSign,
      },
      {
        id: 'storage',
        title: 'Capacidad utilizada',
        description:
          storageUsagePercent > 90
            ? 'Se acerca al límite. Considerá archivar galerías antiguas.'
            : storageUsagePercent > 75
            ? 'Buen ritmo: vigila que las próximas subidas no excedan el límite.'
            : 'Tenés espacio disponible para nuevas sesiones.',
        badge: `${storageUsagePercent}% usado`,
        tone: storageTone,
        icon: FolderOpen,
      },
    ] satisfies FocusArea[];
  }, [
    dashboardStats.pendingOrders,
    dashboardStats.todayPayments,
    dashboardStats.todayUploads,
    storageUsagePercent,
  ]);

  const todayHighlights = useMemo(() => {
    return [
      {
        id: 'uploads',
        label: 'Fotos subidas',
        value: dashboardStats.todayUploads.toLocaleString(),
        helper:
          dashboardStats.todayUploads > 0
            ? 'Sincronizadas durante el día.'
            : 'Coordina con los fotógrafos.',
        icon: CloudUpload,
      },
      {
        id: 'orders',
        label: 'Pedidos nuevos',
        value: dashboardStats.todayOrders.toLocaleString(),
        helper:
          dashboardStats.todayOrders > 0
            ? 'Listos para seguimiento de tienda.'
            : 'Promociona las galerías activas.',
        icon: Package,
      },
      {
        id: 'payments',
        label: 'Pagos confirmados',
        value: dashboardStats.todayPayments.toLocaleString(),
        helper:
          dashboardStats.todayPayments > 0
            ? 'Pagos acreditados en las últimas horas.'
            : 'Revisa métodos de pago si sigue en cero.',
        icon: DollarSign,
      },
      {
        id: 'pending',
        label: 'Pedidos pendientes',
        value: dashboardStats.pendingOrders.toLocaleString(),
        helper:
          dashboardStats.pendingOrders > 0
            ? 'Revisa aprobaciones y envíos.'
            : 'Todo al día.',
        icon: AlertCircle,
      },
    ] satisfies TodayHighlight[];
  }, [
    dashboardStats.pendingOrders,
    dashboardStats.todayOrders,
    dashboardStats.todayPayments,
    dashboardStats.todayUploads,
  ]);

  const upcomingMilestones = useMemo(() => {
    return [
      {
        id: 'orders',
        title: 'Confirmar pedidos pendientes',
        description:
          dashboardStats.pendingOrders > 0
            ? `Quedan ${dashboardStats.pendingOrders} pedidos por confirmar y entregar.`
            : 'Todos los pedidos están confirmados.',
        icon: Package,
      },
      {
        id: 'events',
        title: 'Coordinar próximas sesiones',
        description: `Hay ${dashboardStats.activeEvents.toLocaleString()} eventos activos esta semana.`,
        icon: Calendar,
      },
      {
        id: 'storage',
        title: 'Liberar espacio de almacenamiento',
        description:
          storageUsagePercent > 80
            ? 'Estás por encima del 80% de capacidad, revisa galerías antiguas.'
            : 'Aprovechá el espacio disponible para subir nuevas fotos.',
        icon: FolderOpen,
      },
    ] satisfies UpcomingMilestone[];
  }, [
    dashboardStats.activeEvents,
    dashboardStats.pendingOrders,
    storageUsagePercent,
  ]);

  const toneStyles: Record<FocusTone, string> = {
    success:
      'border-green-200/80 bg-green-500/10 text-green-700 dark:border-green-500/40 dark:text-green-300',
    warning:
      'border-amber-200/80 bg-amber-500/10 text-amber-700 dark:border-amber-500/40 dark:text-amber-300',
    alert:
      'border-red-200/80 bg-red-500/10 text-red-700 dark:border-red-500/40 dark:text-red-300',
    info:
      'border-blue-200/80 bg-blue-500/10 text-blue-700 dark:border-blue-500/40 dark:text-blue-300',
    muted:
      'border-slate-200/60 bg-slate-500/10 text-slate-600 dark:border-slate-500/40 dark:text-slate-300',
  };

  // Show loading skeleton
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Show error state
  if (error && !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card-ios26 w-full max-w-md rounded-3xl p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="glass-button-ios26 rounded-full p-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold">
              Error al cargar el dashboard
            </h3>
            <p className="text-muted-foreground dark:text-gray-400">
              No se pudieron cargar las estadísticas del dashboard.
            </p>
            <PremiumGlassButton
              onClick={() => refetch()}
              variant="primary"
              size="lg"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </PremiumGlassButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Layout */}
      <MobileDashboardLayout
        stats={{
          activeEvents: dashboardStats.activeEvents,
          totalPhotos: dashboardStats.totalPhotos,
          registeredFamilies: dashboardStats.registeredFamilies,
          totalSales: dashboardStats.totalSales,
          todayUploads: dashboardStats.todayUploads,
          todayOrders: dashboardStats.todayOrders,
        }}
        currentTime={currentTime}
      />
      

      {/* Desktop Layout */}
      <div className="hidden min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 lg:block">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-8 py-10">
          <section className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
            <div className="glass-card-ios26 relative overflow-hidden rounded-3xl border border-white/10 p-8">
              <div className="flex flex-col justify-between gap-6 lg:flex-row">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="glass-button-ios26 rounded-2xl p-3">
                      <Camera className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                    </div>
                    <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
                      Panel de Operaciones
                    </h1>
                  </div>
                  <p className="mt-3 max-w-xl text-base text-muted-foreground">
                    Visualiza el rendimiento diario, detecta bloqueos y activa los próximos pasos sin salir del dashboard.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-300/40 bg-white/60 px-4 py-2 backdrop-blur dark:border-white/20 dark:bg-white/10">
                      <Calendar className="h-4 w-4" />
                      {currentTime.toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-300/40 bg-white/60 px-4 py-2 backdrop-blur dark:border-white/20 dark:bg-white/10">
                      <Clock className="h-4 w-4" />
                      {formatTime(currentTime)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="glass-button-ios26 inline-flex items-center justify-between rounded-2xl px-6 py-4 text-sm font-medium">
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        Estado general
                      </span>
                      <span className="text-lg font-semibold text-slate-900 dark:text-white">
                        {dashboardStats.recentActivity.length > 0
                          ? 'Actividad en curso'
                          : 'Esperando novedades'}
                      </span>
                    </div>
                    <Activity className="h-5 w-5 text-primary-500" />
                  </div>
                  <PremiumGlassButton
                    onClick={() => setShowCommandPalette(true)}
                    className="justify-between rounded-2xl px-6 py-4 text-sm font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Abrir buscador inteligente
                    </span>
                    <span className="text-xs text-white/80">⌘K</span>
                  </PremiumGlassButton>
                  <PremiumGlassButton
                    onClick={() => refetch()}
                    className="justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-medium"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Actualizar datos
                  </PremiumGlassButton>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-32 -top-32 aspect-square w-72 rounded-full bg-gradient-to-tr from-blue-500/20 via-purple-500/10 to-transparent blur-3xl" />
            </div>

            <div className="glass-card-ios26 relative rounded-3xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Próximos hitos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Mantén la operación alineada con los objetivos diarios.
              </p>
              <div className="mt-5 space-y-4">
                {upcomingMilestones.map((milestone) => {
                  const Icon = milestone.icon;
                  return (
                    <div
                      key={milestone.id}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition-all"
                    >
                      <div className="glass-button-ios26 flex h-10 w-10 items-center justify-center rounded-xl">
                        <Icon className="h-5 w-5 text-primary-500 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {milestone.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className="glass-card-ios26 group rounded-3xl border border-white/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`glass-button-ios26 rounded-2xl bg-gradient-to-br ${card.accent} p-3`}
                    >
                      <Icon className="h-5 w-5 text-slate-900 dark:text-white" />
                    </div>
                    <span className="rounded-full border border-white/40 bg-white/60 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur dark:border-white/20 dark:bg-white/10 dark:text-white/80">
                      {card.chip}
                    </span>
                  </div>
                  <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                    {card.value}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.7fr,1fr]">
            <div className="space-y-6">
              <div className="glass-card-ios26 rounded-3xl border border-white/10 p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Tablero operativo
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Revisa los puntos críticos y resuelve bloqueos con un vistazo.
                    </p>
                  </div>
                  <PremiumGlassButton
                    onClick={() => setShowPerformanceMonitor((prev) => !prev)}
                    className="gap-2 rounded-2xl px-4 py-2 text-sm font-medium"
                  >
                    <Monitor className="h-4 w-4" />
                    {showPerformanceMonitor ? 'Ocultar monitor' : 'Ver monitor'}
                  </PremiumGlassButton>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {focusAreas.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition-colors"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="glass-button-ios26 flex h-10 w-10 items-center justify-center rounded-xl">
                              <Icon className="h-5 w-5 text-primary-500 dark:text-primary-400" />
                            </div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {item.title}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${toneStyles[item.tone]}`}
                          >
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card-ios26 rounded-3xl border border-white/10 p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Acciones rápidas
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Mantiene la operación en marcha
                  </span>
                </div>
                <QuickActions className="!mb-0" />
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <EventProgressWidget />
                <QuickAccessWidget />
                <PhotoManagementWidget />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <OrdersSummaryWidget />
                <BusinessMetricsWidget />
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-card-ios26 rounded-3xl border border-white/10 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Hoy en números
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Refresca para asegurarte de que el equipo está al día.
                    </p>
                  </div>
                  <PremiumIconButton onClick={() => refetch()} aria-label="Actualizar datos">
                    <RefreshCw className="h-4 w-4" />
                  </PremiumIconButton>
                </div>
                <div className="space-y-3">
                  {todayHighlights.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                      >
                        <div className="flex items-center gap-3">
                          <div className="glass-button-ios26 flex h-10 w-10 items-center justify-center rounded-xl">
                            <Icon className="h-5 w-5 text-primary-500 dark:text-primary-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {item.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.helper}
                            </p>
                          </div>
                        </div>
                        <span className="text-lg font-semibold text-slate-900 dark:text-white">
                          {item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card-ios26 rounded-3xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Actividad reciente
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Últimas acciones registradas en la plataforma.
                </p>
                <div className="space-y-4">
                  {dashboardStats.recentActivity.length > 0 ? (
                    dashboardStats.recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                      >
                        <div className="glass-button-ios26 mt-1 flex h-10 w-10 items-center justify-center rounded-xl">
                          {activity.type === 'event_created' && (
                            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          )}
                          {activity.type === 'photos_uploaded' && (
                            <Camera className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          )}
                          {activity.type === 'order_created' && (
                            <Package className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                          )}
                          {activity.type === 'order_completed' && (
                            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {activity.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-muted-foreground">
                      No hay actividad reciente registrada.
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card-ios26 rounded-3xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Uso de almacenamiento
                </h3>
                <p className="text-sm text-muted-foreground">
                  Controla la capacidad antes de cada jornada de fotos.
                </p>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200">
                    <span>Usado</span>
                    <span>
                      {storageUsedGb.toFixed(2)} GB / {storageLimitGb.toFixed(2)} GB
                    </span>
                  </div>
                  <div className="h-3 rounded-full border border-white/10 bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
                      style={{ width: `${storageUsagePercent}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {storageUsagePercent}%
                      </p>
                      <p className="mt-1">Capacidad utilizada</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {(storageLimitGb - storageUsedGb).toFixed(2)} GB
                      </p>
                      <p className="mt-1">Espacio disponible</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <PremiumGlassButton className="gap-2 rounded-2xl px-4 py-2 text-sm font-medium">
                      <FolderOpen className="h-4 w-4" />
                      Revisar galerías
                    </PremiumGlassButton>
                    <PremiumGlassButton className="gap-2 rounded-2xl px-4 py-2 text-sm font-medium">
                      <CloudUpload className="h-4 w-4" />
                      Planificar subidas
                    </PremiumGlassButton>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {showPerformanceMonitor && (
            <div className="glass-card-ios26 rounded-3xl border border-white/10 p-6">
              <PerformanceMonitor onClose={() => setShowPerformanceMonitor(false)} />
            </div>
          )}
        </div>
      </div>

      {showCommandPalette && (
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
        />
      )}
    </>
  );
}
