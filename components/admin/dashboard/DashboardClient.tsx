'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  StatsCard,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { useKeyboardShortcuts } from '@/components/admin/hooks/useKeyboardShortcuts';
import { QuickActions } from './QuickActions';
import { DashboardSkeleton } from './DashboardSkeleton';
import {
  Calendar,
  Camera,
  Users,
  DollarSign,
  Package,
  Activity,
  Monitor,
  Clock,
  ArrowUpRight,
  Eye,
  Search,
  Tag,
  AlertCircle,
  RefreshCw,
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
    storageUsed:
      (data?.storage?.estimated_size_gb ?? 0) * 1024 * 1024 * 1024,
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
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <AlertCircle className="text-destructive mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-semibold">
                Error al cargar el dashboard
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">
                No se pudieron cargar las estadísticas del dashboard.
              </p>
              <Button
                onClick={() => refetch()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido de vuelta! Hoy es{' '}
            {currentTime.toLocaleDateString('es-ES')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="liquid-glass-button-ios26 rounded-lg px-4 py-2 text-sm">
            {formatTime(currentTime)}
          </div>
          <Button
            variant="glass-ios26"
            onClick={() => refetch()}
            aria-label="Actualizar datos"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          variant="glass-ios26"
          title="Eventos Activos"
          value={dashboardStats.activeEvents}
          description="Eventos en curso"
          icon={<Calendar className="h-6 w-6" />}
          trend="up"
          trendValue="+2"
        />
        <StatsCard
          variant="glass-ios26"
          title="Fotos Totales"
          value={dashboardStats.totalPhotos.toLocaleString()}
          description="Fotos procesadas"
          icon={<Camera className="h-6 w-6" />}
          trend="up"
          trendValue="+12%"
        />
        <StatsCard
          variant="glass-ios26"
          title="Familias"
          value={dashboardStats.registeredFamilies.toLocaleString()}
          description="Familias registradas"
          icon={<Users className="h-6 w-6" />}
          trend="up"
          trendValue="+8%"
        />
        <StatsCard
          variant="glass-ios26"
          title="Ventas"
          value={`$${(dashboardStats.totalSales / 100).toLocaleString()}`}
          description="Ingresos totales"
          icon={<DollarSign className="h-6 w-6" />}
          trend="up"
          trendValue="+15%"
        />
      </div>

      {/* Quick Actions and Performance */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card variant="glass-ios26" className="h-full">
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickActions />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card variant="glass-ios26" className="h-full">
            <CardHeader>
              <CardTitle>Rendimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hoy - Subidas</span>
                  <span className="font-medium">
                    {dashboardStats.todayUploads}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hoy - Pedidos</span>
                  <span className="font-medium">
                    {dashboardStats.todayOrders}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hoy - Pagos</span>
                  <span className="font-medium">
                    {dashboardStats.todayPayments}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pedidos Pendientes</span>
                  <span className="font-medium">
                    {dashboardStats.pendingOrders}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity and Storage */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card variant="glass-ios26">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardStats.recentActivity.length > 0 ? (
                dashboardStats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="liquid-glass-button-ios26 mt-1 flex h-8 w-8 items-center justify-center rounded-full">
                      {activity.type === 'event_created' && (
                        <Calendar className="h-4 w-4" />
                      )}
                      {activity.type === 'photos_uploaded' && (
                        <Camera className="h-4 w-4" />
                      )}
                      {activity.type === 'order_created' && (
                        <Package className="h-4 w-4" />
                      )}
                      {activity.type === 'order_completed' && (
                        <DollarSign className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center">
                  No hay actividad reciente
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="glass-ios26">
          <CardHeader>
            <CardTitle>Uso de Almacenamiento</CardTitle>
          </CardHeader>
          <CardContent>
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
                <div className="liquid-glass-button-ios26 h-2 rounded-full">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500"
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
              <div className="grid grid-cols-2 gap-4">
                <Button variant="glass-ios26" className="w-full">
                  <Monitor className="mr-2 h-4 w-4" />
                  Monitorear
                </Button>
                <Button variant="glass-ios26" className="w-full">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalles
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
        <CommandPalette onClose={() => setShowCommandPalette(false)} />
      )}
    </div>
  );
}
