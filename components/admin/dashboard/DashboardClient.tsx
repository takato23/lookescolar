'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { PremiumGlassButton, PremiumIconButton } from '@/components/ui/premium-glass-button';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { useKeyboardShortcuts } from '@/components/admin/hooks/useKeyboardShortcuts';
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
  Eye,
  Search,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Zap,
  BarChart3,
  CloudUpload,
  FolderOpen,
} from 'lucide-react';

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

  // Use fallback data if no stats
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="container mx-auto hidden px-6 py-8 lg:block">
          {/* Enhanced Header */}
          <div className="mb-10">
            <div className="glass-card-ios26 rounded-3xl p-8 backdrop-blur-xl">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="glass-button-ios26 rounded-2xl p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                      <Camera className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Panel de Control
                    </h1>
                  </div>
                  <p className="text-muted-foreground dark:text-gray-400 text-lg">
                    Gestión completa de fotografía escolar
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    {currentTime.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="glass-button-ios26 rounded-xl px-6 py-3 text-lg font-medium">
                    <Clock className="inline h-5 w-5 mr-2" />
                    {formatTime(currentTime)}
                  </div>
                  <div className="flex gap-2">
                    <PremiumGlassButton
                      onClick={() => setShowCommandPalette(true)}
                      variant="primary"
                    >
                      <Search className="h-4 w-4" />
                      Buscar (⌘K)
                    </PremiumGlassButton>
                    <PremiumIconButton
                      onClick={() => refetch()}
                      variant="primary"
                      aria-label="Actualizar datos"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </PremiumIconButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Grid */}
          <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Active Events Card */}
            <div className="glass-card-ios26 rounded-2xl p-6 backdrop-blur-xl hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="glass-button-ios26 rounded-xl p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                  +2
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold mb-1">{dashboardStats.activeEvents}</p>
                <p className="text-muted-foreground dark:text-gray-400 text-sm">Eventos Activos</p>
              </div>
            </div>

            {/* Total Photos Card */}
            <div className="glass-card-ios26 rounded-2xl p-6 backdrop-blur-xl hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="glass-button-ios26 rounded-xl p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                  <Camera className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                  +12%
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold mb-1">{dashboardStats.totalPhotos.toLocaleString()}</p>
                <p className="text-muted-foreground dark:text-gray-400 text-sm">Fotos Totales</p>
              </div>
            </div>

            {/* Families Card */}
            <div className="glass-card-ios26 rounded-2xl p-6 backdrop-blur-xl hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="glass-button-ios26 rounded-xl p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                  +8%
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold mb-1">{dashboardStats.registeredFamilies.toLocaleString()}</p>
                <p className="text-muted-foreground dark:text-gray-400 text-sm">Familias Registradas</p>
              </div>
            </div>

            {/* Sales Card */}
            <div className="glass-card-ios26 rounded-2xl p-6 backdrop-blur-xl hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="glass-button-ios26 rounded-xl p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
                  <DollarSign className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                  +15%
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold mb-1">${(dashboardStats.totalSales / 100).toLocaleString()}</p>
                <p className="text-muted-foreground dark:text-gray-400 text-sm">Ventas Totales</p>
              </div>
            </div>
          </div>

          {/* Quick Actions and Performance */}
          <div className="mb-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="glass-card-ios26 rounded-2xl p-6 backdrop-blur-xl h-full">
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  Acciones Rápidas
                </h3>
                <QuickActions />
              </div>
            </div>
            <div>
              <div className="glass-card-ios26 rounded-2xl p-6 backdrop-blur-xl h-full">
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Actividad de Hoy
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 glass-button-ios26 rounded-xl">
                    <div className="flex items-center gap-2">
                      <CloudUpload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm">Fotos Subidas</span>
                    </div>
                    <span className="font-semibold text-lg">
                      {dashboardStats.todayUploads}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 glass-button-ios26 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm">Pedidos</span>
                    </div>
                    <span className="font-semibold text-lg">
                      {dashboardStats.todayOrders}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 glass-button-ios26 rounded-xl">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm">Pagos Recibidos</span>
                    </div>
                    <span className="font-semibold text-lg">
                      {dashboardStats.todayPayments}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 glass-button-ios26 rounded-xl border-2 border-primary-200 dark:border-primary-800">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm">Pendientes</span>
                    </div>
                    <span className="font-semibold text-lg text-primary-600 dark:text-primary-400">
                      {dashboardStats.pendingOrders}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Photography Specialized Widgets */}
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <EventProgressWidget />
            <QuickAccessWidget />
            <OrdersSummaryWidget />
            <PhotoManagementWidget />
            <BusinessMetricsWidget />
          </div>

          {/* Activity and Storage */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass-card-ios26 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Actividad Reciente
              </h3>
              <div className="space-y-4">
                {dashboardStats.recentActivity.length > 0 ? (
                  dashboardStats.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 glass-button-ios26 rounded-xl hover:scale-[1.02] transition-transform">
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
                        <p className="text-sm font-medium">{activity.message}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="glass-button-ios26 rounded-xl p-4 inline-block mb-3">
                      <Activity className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      No hay actividad reciente
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card-ios26 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Almacenamiento
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>
                      {Math.round(
                        (dashboardStats.storageUsed / 1024 / 1024 / 1024) * 100
                      ) / 100}{' '}
                      GB
                    </span>
                    <span>
                      {Math.round(
                        (dashboardStats.storageLimit / 1024 / 1024 / 1024) * 100
                      ) / 100}{' '}
                      GB
                    </span>
                  </div>
                  <div className="h-3 glass-button-ios26 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (dashboardStats.storageUsed /
                            dashboardStats.storageLimit) *
                            100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <PremiumGlassButton variant="primary">
                    <Monitor className="h-4 w-4" />
                    Monitorear
                  </PremiumGlassButton>
                  <PremiumGlassButton variant="secondary">
                    <Eye className="h-4 w-4" />
                    Ver Detalles
                  </PremiumGlassButton>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Monitor */}
          {showPerformanceMonitor && (
            <div className="mt-8">
              <PerformanceMonitor
                onClose={() => setShowPerformanceMonitor(false)}
              />
            </div>
          )}

          {/* Command Palette */}
          {showCommandPalette && (
            <CommandPalette 
              isOpen={showCommandPalette}
              onClose={() => setShowCommandPalette(false)} 
            />
          )}
        </div>
      </div>
    </>
  );
}
