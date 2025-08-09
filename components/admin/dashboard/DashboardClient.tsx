'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { StatsCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
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

// Fetch dashboard stats from API
async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch('/api/admin/dashboard/stats', {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // Check if we got fallback data
    if (response.headers.get('X-Error') === 'true') {
      const data = await response.json();
      return data; // Use fallback data
    }
    throw new Error('Failed to fetch dashboard stats');
  }

  return response.json();
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
    <div className="bg-background min-h-screen">
      {/* Header */}
      <DashboardHeader
        currentTime={currentTime}
        formatTime={formatTime}
        onSearchClick={() => setShowCommandPalette(true)}
        onPerformanceClick={() =>
          setShowPerformanceMonitor(!showPerformanceMonitor)
        }
        showPerformanceMonitor={showPerformanceMonitor}
      />

      <div className="space-y-6 p-6">
        {/* Quick Actions - Mobile */}
        <QuickActions variant="mobile" />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Pedidos hoy"
            value={dashboardStats.todayOrders}
            description="Nuevos pedidos"
            icon={<Package className="h-5 w-5" />}
            className="transition-shadow hover:shadow-lg"
          />
          <StatsCard
            title="Pagos confirmados"
            value={`$${dashboardStats.todayPayments.toLocaleString()}`}
            description="Ingresado hoy"
            icon={<DollarSign className="h-5 w-5" />}
            className="transition-shadow hover:shadow-lg"
          />
          <StatsCard
            title="Pendientes"
            value={dashboardStats.pendingOrders}
            description="Por revisar"
            icon={<Activity className="h-5 w-5" />}
            className="transition-shadow hover:shadow-lg"
          />
          <StatsCard
            title="Fotos hoy"
            value={dashboardStats.todayUploads}
            description="Subidas hoy"
            icon={<Camera className="h-5 w-5" />}
            className="transition-shadow hover:shadow-lg"
          />
        </div>

        {/* Performance Monitor */}
        {showPerformanceMonitor && (
          <div className="animate-in fade-in duration-300">
            <PerformanceMonitor />
          </div>
        )}

        {/* Quick Actions - Desktop */}
        <QuickActions variant="desktop" />

        {/* Recent Activity */}
        <RecentActivity
          activities={dashboardStats.recentActivity}
          formatTimeAgo={formatTimeAgo}
        />

        {/* Keyboard Shortcuts Info */}
        <KeyboardShortcutsInfo />

        {/* Command Palette */}
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
        />
      </div>
    </div>
  );
}

// Dashboard Header Component
const DashboardHeader = React.memo(function DashboardHeader({
  currentTime,
  formatTime,
  onSearchClick,
  onPerformanceClick,
  showPerformanceMonitor,
}: {
  currentTime: Date;
  formatTime: (date: Date) => string;
  onSearchClick: () => void;
  onPerformanceClick: () => void;
  showPerformanceMonitor: boolean;
}) {
  return (
    <div className="border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-foreground text-2xl font-bold">
              Dashboard Profesional
            </h1>
            <p className="text-muted-foreground text-sm">
              {currentTime.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              <span>&nbsp;&bull;&nbsp;</span>
              {formatTime(currentTime)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            aria-label="Abrir buscador y atajos"
            variant="outline"
            size="sm"
            onClick={onSearchClick}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Buscar
            <kbd className="inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-xs">
              ⌘K
            </kbd>
          </Button>

          <Button
            aria-label={
              showPerformanceMonitor ? 'Ocultar rendimiento' : 'Ver rendimiento'
            }
            variant={showPerformanceMonitor ? 'secondary' : 'outline'}
            size="sm"
            onClick={onPerformanceClick}
          >
            <Monitor className="mr-2 h-4 w-4" />
            {showPerformanceMonitor ? 'Ocultar' : 'Ver'} rendimiento
          </Button>
        </div>
      </div>
    </div>
  );
});

// Recent Activity Component
const RecentActivity = React.memo(function RecentActivity({
  activities,
  formatTimeAgo,
}: {
  activities: Activity[];
  formatTimeAgo: (timestamp: string) => string;
}) {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'photos_uploaded':
        return Camera;
      case 'order_created':
        return Package;
      case 'order_completed':
        return DollarSign;
      case 'event_created':
        return Calendar;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'photos_uploaded':
        return 'text-blue-600 bg-blue-50';
      case 'order_created':
        return 'text-green-600 bg-green-50';
      case 'order_completed':
        return 'text-purple-600 bg-purple-50';
      case 'event_created':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Actividad Reciente
          </CardTitle>
          <Button variant="ghost" size="sm">
            <Eye className="mr-2 h-4 w-4" />
            Ver todo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const colorClass = getActivityColor(activity.type);

              return (
                <div
                  key={activity.id}
                  className="hover:bg-muted/50 flex items-start gap-3 rounded-lg p-3 transition-colors"
                >
                  <div className={`rounded-lg p-2 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground mb-1 text-sm font-medium">
                      {activity.message}
                    </p>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Activity className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <h3 className="text-foreground mb-2 font-medium">
              Sin actividad reciente
            </h3>
            <p className="text-muted-foreground text-sm">
              Cuando uses el sistema, aquí verás tu actividad reciente.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Keyboard Shortcuts Info Component
const KeyboardShortcutsInfo = React.memo(function KeyboardShortcutsInfo() {
  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="bg-muted rounded px-2 py-1 text-xs">⌘</kbd>
              <kbd className="bg-muted rounded px-2 py-1 text-xs">K</kbd>
              <span>Command Palette</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="bg-muted rounded px-2 py-1 text-xs">⌘</kbd>
              <kbd className="bg-muted rounded px-2 py-1 text-xs">N</kbd>
              <span>Nuevo Evento</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="bg-muted rounded px-2 py-1 text-xs">⌘</kbd>
              <kbd className="bg-muted rounded px-2 py-1 text-xs">U</kbd>
              <span>Subir Fotos</span>
            </div>
          </div>
          <div className="text-xs">
            Presiona <kbd className="bg-muted rounded px-1 py-0.5">⌘K</kbd> para
            ver todos los atajos
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
