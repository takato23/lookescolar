'use client';

import { useEffect, useMemo, useState, type ElementType } from 'react';
import Link from 'next/link';
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
import { Badge } from '@/components/ui/badge';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { useKeyboardShortcuts } from '@/components/admin/hooks/useKeyboardShortcuts';
import { formatCurrency } from '@/lib/utils';
import { MobileDashboardLayout } from './MobileDashboardLayout';

interface ActivityItem {
  id: string;
  type:
    | 'event_created'
    | 'photos_uploaded'
    | 'order_created'
    | 'order_completed';
  message: string;
  timestamp: string;
}

interface EventSummary {
  id: string;
  name: string;
  location: string | null;
  date: string | null;
  totalStudents: number;
  photosUploaded: number;
  expectedPhotos: number;
  status: 'planning' | 'in_progress' | 'processing' | 'completed';
}

interface QuickAccessSummary {
  lastEvent: string;
  lastEventDate: string | null;
  photosToProcess: number;
  pendingUploads: number;
  recentActivity: string;
}

interface PhotoManagementSummary {
  totalPhotos: number;
  processedToday: number;
  pendingProcessing: number;
  publishedGalleries: number;
  lastUploadAt: string | null;
}

interface OrdersSummary {
  newOrders: number;
  pendingDelivery: number;
  totalRevenueCents: number;
  todayOrders: number;
}

interface BusinessMetricsSummary {
  monthlyRevenueCents: number;
  activeClients: number;
  completionRate: number;
  avgOrderValueCents: number;
}

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
  recentActivity: ActivityItem[];
  eventSummaries: EventSummary[];
  quickAccess: QuickAccessSummary;
  photoManagement: PhotoManagementSummary;
  ordersSummary: OrdersSummary;
  businessMetrics: BusinessMetricsSummary;
}

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
  };
}

interface ShortcutCard {
  id: string;
  href: string;
  title: string;
  description: string;
  icon: ElementType;
}

interface HighlightMetric {
  id: string;
  label: string;
  value: string;
  helper: string;
  icon: ElementType;
}

interface AlertItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  tone: 'info' | 'warning' | 'danger' | 'success';
  icon: ElementType;
}

const toneStyles: Record<AlertItem['tone'], string> = {
  info: 'border-blue-200/60 bg-blue-50/70 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
  warning:
    'border-amber-200/60 bg-amber-50/70 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  danger:
    'border-red-200/60 bg-red-50/70 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
  success:
    'border-emerald-200/60 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
};

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
    };

  const storageUsagePercent = useMemo(() => {
    if (!dashboardStats.storageLimit) {
      return 0;
    }
    const raw =
      (dashboardStats.storageUsed / dashboardStats.storageLimit) * 100;
    return Math.min(100, Math.round(raw));
  }, [dashboardStats.storageLimit, dashboardStats.storageUsed]);

  const shortcuts: ShortcutCard[] = [
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

  const highlightMetrics: HighlightMetric[] = [
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

  const alertItems: AlertItem[] = [
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
  ].filter(Boolean) as AlertItem[];

  const formatTime = useMemo(
    () => (date: Date) =>
      date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    []
  );

  const formatTimeAgo = useMemo(
    () => (timestamp: string) => {
      const created = new Date(timestamp);
      const diffMinutes = Math.floor(
        (Date.now() - created.getTime()) / (1000 * 60)
      );

      if (diffMinutes < 1) return 'Hace unos segundos';
      if (diffMinutes === 1) return 'Hace 1 minuto';
      if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;
      const hours = Math.floor(diffMinutes / 60);
      if (hours === 1) return 'Hace 1 hora';
      if (hours < 24) return `Hace ${hours} horas`;
      return created.toLocaleDateString('es-AR');
    },
    []
  );

  const recentActivity = dashboardStats.recentActivity.slice(0, 5);

  return (
    <>
      <MobileDashboardLayout stats={dashboardStats} currentTime={currentTime} />

      <div className="hidden min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/40 dark:from-slate-950 dark:via-indigo-950/20 dark:to-blue-950/30 lg:block">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
          {/* Hero Header with enhanced liquid glass */}
          <section className="liquid-glass-intense group relative overflow-hidden rounded-[2rem] p-8 shadow-2xl transition-all duration-500 hover:shadow-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent opacity-60 dark:from-blue-500/20 dark:via-purple-500/10"></div>
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-gradient-to-tr from-indigo-400/20 to-pink-400/20 blur-2xl"></div>
            
            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <div className="liquid-glass group/icon relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-10 group-hover/icon:opacity-20"></div>
                    <Camera className="relative z-10 h-7 w-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h1 className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-white dark:via-blue-100 dark:to-white">
                      Panel de Operaciones
                    </h1>
                    <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
                      Gestión completa de tu estudio fotográfico
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 flex flex-wrap items-center gap-2.5">
                  <span className="liquid-glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm dark:text-slate-200">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    {currentTime.toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                  <span className="liquid-glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm dark:text-slate-200">
                    <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="tabular-nums">{formatTime(currentTime)}</span>
                  </span>
                  {error && (
                    <span className="inline-flex animate-pulse items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                      <AlertCircle className="h-4 w-4" />
                      Error al actualizar
                    </span>
                  )}
                  {!error && (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
                      En vivo
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 md:w-72">
                <Button
                  variant="secondary"
                  className="liquid-glass group/btn relative overflow-hidden rounded-xl px-6 py-3.5 text-sm font-semibold shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                  onClick={() => setShowCommandPalette(true)}
                >
                  <span className="flex flex-1 items-center gap-2.5">
                    <Search className="h-4 w-4" />
                    Buscador inteligente
                  </span>
                  <kbd className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono dark:bg-slate-800">
                    ⌘K
                  </kbd>
                </Button>
                <Button
                  variant="secondary"
                  className="liquid-glass group/btn relative overflow-hidden rounded-xl px-6 py-3.5 text-sm font-semibold shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 transition-transform duration-500 ${isLoading ? 'animate-spin' : 'group-hover/btn:rotate-180'}`}
                  />
                  <span className="ml-2">
                    {isLoading ? 'Actualizando...' : 'Actualizar datos'}
                  </span>
                </Button>
              </div>
            </div>
          </section>

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
              {shortcuts.map((shortcut, index) => {
                const Icon = shortcut.icon;
                const gradients = [
                  'from-blue-500 to-cyan-500',
                  'from-purple-500 to-pink-500',
                  'from-orange-500 to-red-500',
                  'from-emerald-500 to-teal-500',
                ];
                const gradient = gradients[index % gradients.length];
                
                return (
                  <Link
                    key={shortcut.id}
                    href={shortcut.href}
                    className="liquid-glass group relative overflow-hidden rounded-2xl p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    {/* Animated gradient background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-10`}></div>
                    
                    {/* Icon with glow effect */}
                    <div className="relative mb-4">
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} opacity-20 blur-xl transition-all duration-300 group-hover:opacity-40 group-hover:blur-2xl`}></div>
                      <div className={`liquid-glass relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} p-0.5`}>
                        <div className="flex h-full w-full items-center justify-center rounded-[0.6rem] bg-white/90 dark:bg-slate-900/90">
                          <Icon className={`h-6 w-6 bg-gradient-to-br ${gradient} bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-110`} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <h3 className="text-lg font-bold text-slate-900 transition-colors duration-300 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                        {shortcut.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {shortcut.description}
                      </p>
                    </div>
                    
                    {/* Arrow indicator */}
                    <div className="absolute bottom-6 right-6 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
                      <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
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
              {highlightMetrics.map((metric, index) => {
                const Icon = metric.icon;
                const colors = [
                  { bg: 'from-blue-500/20 to-cyan-500/20', icon: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500/50' },
                  { bg: 'from-purple-500/20 to-pink-500/20', icon: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-500/50' },
                  { bg: 'from-emerald-500/20 to-teal-500/20', icon: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/50' },
                ];
                const color = colors[index % colors.length];
                
                return (
                  <div
                    key={metric.id}
                    className="liquid-glass-intense group relative overflow-hidden rounded-2xl p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                  >
                    {/* Animated background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${color.bg} opacity-50 transition-opacity duration-300 group-hover:opacity-70`}></div>
                    
                    <div className="relative">
                      <div className="flex items-start justify-between">
                        {/* Icon with animated glow */}
                        <div className="relative">
                          <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${color.bg} blur-lg transition-all duration-300 group-hover:blur-xl`}></div>
                          <div className={`liquid-glass relative flex h-12 w-12 items-center justify-center rounded-xl ring-2 ${color.ring} transition-all duration-300 group-hover:scale-110`}>
                            <Icon className={`h-6 w-6 ${color.icon}`} />
                          </div>
                        </div>
                        
                        {/* Helper badge */}
                        <Badge 
                          variant="outline" 
                          className="liquid-glass border-0 text-xs font-medium shadow-sm"
                        >
                          {metric.helper}
                        </Badge>
                      </div>
                      
                      {/* Metric label */}
                      <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        {metric.label}
                      </p>
                      
                      {/* Metric value with gradient */}
                      <p className="mt-2 bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-4xl font-bold tabular-nums text-transparent dark:from-white dark:to-slate-300">
                        {metric.value}
                      </p>
                      
                      {/* Progress indicator line */}
                      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-200/50 dark:bg-slate-700/50">
                        <div 
                          className={`h-full bg-gradient-to-r ${color.bg.replace('/20', '')} transition-all duration-1000`}
                          style={{ width: `${Math.min(100, (index + 1) * 33)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
                    {alertItems.map((item, index) => {
                      const Icon = item.icon;
                      const toneColors = {
                        info: 'from-blue-500 to-cyan-500',
                        warning: 'from-amber-500 to-orange-500',
                        danger: 'from-red-500 to-pink-500',
                        success: 'from-emerald-500 to-teal-500',
                      };
                      const gradientColor = toneColors[item.tone];
                      
                      return (
                        <div
                          key={item.id}
                          className={`liquid-glass group relative flex items-start gap-4 overflow-hidden rounded-xl p-4 transition-all duration-300 hover:-translate-x-1 hover:shadow-lg ${toneStyles[item.tone]}`}
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          {/* Animated side indicator */}
                          <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${gradientColor}`}></div>
                          
                          {/* Icon with glow */}
                          <div className="relative flex-shrink-0">
                            <div className={`absolute inset-0 rounded-lg bg-gradient-to-br ${gradientColor} opacity-30 blur-md`}></div>
                            <div className={`liquid-glass relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${gradientColor} p-0.5`}>
                              <div className="flex h-full w-full items-center justify-center rounded-[0.4rem] bg-white/90 dark:bg-slate-900/90">
                                <Icon className="h-5 w-5" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-bold">{item.title}</p>
                            <p className="mt-0.5 text-sm opacity-90">{item.description}</p>
                          </div>
                          
                          <Badge 
                            variant="outline" 
                            className="flex-shrink-0 border-current/30 bg-white/30 text-xs font-semibold dark:bg-black/20"
                          >
                            {item.badge}
                          </Badge>
                        </div>
                      );
                    })}
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
                  <div className="space-y-2.5">
                    {recentActivity.map((item, index) => (
                      <div
                        key={item.id}
                        className="liquid-glass group relative flex items-start gap-3 overflow-hidden rounded-xl p-3.5 transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        {/* Timeline dot */}
                        <div className="relative mt-1.5 flex-shrink-0">
                          <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/50"></div>
                          <div className="relative h-2 w-2 rounded-full bg-gradient-to-br from-blue-500 to-purple-500"></div>
                        </div>
                        
                        {/* Activity icon */}
                        <div className="flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-2">
                          <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight text-slate-900 dark:text-white">
                            {item.message}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {formatTimeAgo(item.timestamp)}
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

      {showCommandPalette && (
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
        />
      )}
    </>
  );
}
