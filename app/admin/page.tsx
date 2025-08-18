'use client';

import { StatsCard } from '@/components/ui/card';
import { StatsCardSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  usePullToRefresh,
  PullToRefreshIndicator,
} from '@/hooks/usePullToRefresh';
import { formatPrice, formatNumber } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';
import {
  Calendar,
  Camera,
  Users,
  DollarSign,
  Plus,
  Upload,
  Package,
  Activity,
  TrendingUp,
  Zap,
  Star,
  RefreshCw,
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const {
    stats,
    activity,
    performance,
    isLoading,
    statsLoading,
    activityLoading,
    performanceLoading,
    error,
    refreshAll,
    refreshCritical,
  } = useDashboardData();

  // Track last update time
  useEffect(() => {
    if (!isLoading && stats) {
      setLastUpdated(new Date());
    }
  }, [isLoading, stats]);

  // Pull to refresh para mobile
  const { containerRef, isPulling, isRefreshing, pullDistance, pullStyle } =
    usePullToRefresh({
      onRefresh: refreshAll,
      disabled: isLoading,
    });

  return (
    <div
      className="liquid-glass-app min-h-screen"
      ref={containerRef}
      style={pullStyle}
    >
      {/* Pull to refresh indicator */}
      <PullToRefreshIndicator
        isPulling={isPulling}
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
      />

      <div className="container mx-auto space-y-6 lg:space-y-8 p-6">
        {/* Header with Liquid Glass Gradient */}
        <div className="relative mb-6 animate-fade-in sm:mb-8 lg:mb-12">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-3xl" />
          <div className="relative liquid-card p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="liquid-title mb-2 text-2xl sm:mb-3 sm:text-3xl md:text-4xl lg:text-5xl">
                  Panel de Administración
                </h1>
                <p className="liquid-subtitle hidden max-w-2xl text-sm sm:block sm:text-base lg:text-lg">
                  Bienvenida, Melisa. Gestiona tu negocio fotográfico con
                  elegancia y eficiencia.
                </p>
                {lastUpdated && (
                  <p className="liquid-description mt-2 text-sm">
                    Última actualización:{' '}
                    {lastUpdated.toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <SimpleTooltip
                  text="Actualizar todos los datos del dashboard"
                  side="bottom"
                >
                  <button
                    onClick={refreshAll}
                    disabled={isLoading}
                    className="liquid-button hidden items-center gap-2 md:flex px-4 py-2"
                    aria-label="Actualizar dashboard"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                    />
                    <span className="liquid-button-text">Actualizar</span>
                  </button>
                </SimpleTooltip>

                {/* Mobile refresh button */}
                <SimpleTooltip text="Actualizar" side="bottom">
                  <button
                    onClick={refreshAll}
                    disabled={isLoading}
                    className="liquid-button p-2 md:hidden"
                    aria-label="Actualizar dashboard"
                  >
                    <RefreshCw
                      className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
                    />
                  </button>
                </SimpleTooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="liquid-card border-red-200 bg-red-50/50 dark:bg-red-900/20 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/50">
                <RefreshCw className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">
                  Error al cargar datos
                </p>
                <p className="text-xs text-red-600">
                  Algunos datos podrían estar desactualizados.
                </p>
              </div>
              <button
                onClick={refreshAll}
                className="liquid-button text-red-600 hover:bg-red-100 px-3 py-1 text-sm"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions - Mobile First (solo visible en mobile) */}
        <div className="block lg:hidden">
          <Card
            variant="glass"
            className="noise animate-slide-up overflow-hidden"
          >
            <CardHeader gradient>
              <CardTitle as="h2" className="flex items-center gap-3">
                <Zap className="h-6 w-6 text-accent-500" />
                Acciones Principales
              </CardTitle>
            </CardHeader>

            <CardContent padding="lg">
              <div className="grid grid-cols-2 gap-4">
                {/* Create Event Action - Mobile */}
                <button
                  onClick={() => router.push('/admin/events/new')}
                  className="group relative flex flex-col items-center justify-center rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100 p-4 transition-all duration-300 hover:scale-105 hover:border-primary-400 hover:shadow-xl dark:border-primary-700 dark:from-primary-900/40 dark:to-primary-800/30"
                >
                  <div className="mb-2 rounded-xl bg-primary-500/10 p-3 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary-500/20">
                    <Calendar className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Crear Evento
                  </h3>
                  <p className="text-center text-xs text-neutral-600 dark:text-neutral-400">
                    Nueva sesión
                  </p>
                </button>

                {/* Upload Photos Action - Mobile */}
                <button
                  onClick={() => router.push('/admin/photos')}
                  className="group relative flex flex-col items-center justify-center rounded-xl border border-secondary-200 bg-gradient-to-br from-secondary-50 to-secondary-100 p-4 transition-all duration-300 hover:scale-105 hover:border-secondary-400 hover:shadow-xl dark:border-secondary-700 dark:from-secondary-900/40 dark:to-secondary-800/30"
                >
                  <div className="mb-2 rounded-xl bg-secondary-500/10 p-3 transition-all duration-300 group-hover:scale-110 group-hover:bg-secondary-500/20">
                    <Camera className="h-6 w-6 text-secondary-600 dark:text-secondary-400" />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Subir Fotos
                  </h3>
                  <p className="text-center text-xs text-neutral-600 dark:text-neutral-400">
                    Con watermark
                  </p>
                </button>

                {/* Tagging Action - Mobile */}
                <button
                  onClick={() => router.push('/admin/tagging')}
                  className="group relative flex flex-col items-center justify-center rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-4 transition-all duration-300 hover:scale-105 hover:border-amber-400 hover:shadow-xl dark:border-amber-700 dark:from-amber-900/40 dark:to-amber-800/30"
                >
                  <div className="mb-2 rounded-xl bg-amber-500/20 p-3 transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-500/30">
                    <Users className="h-6 w-6 text-amber-700 dark:text-amber-400" />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Asignar Fotos
                  </h3>
                  <p className="text-center text-xs text-neutral-600 dark:text-neutral-400">
                    Vincular QR
                  </p>
                </button>

                {/* Orders Action - Mobile */}
                <button
                  onClick={() => router.push('/admin/orders')}
                  className="group relative flex flex-col items-center justify-center rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-4 transition-all duration-300 hover:scale-105 hover:border-green-400 hover:shadow-xl dark:border-green-700 dark:from-green-900/40 dark:to-green-800/30"
                >
                  <div className="mb-2 rounded-xl bg-green-500/10 p-3 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                    <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Ver Pedidos
                  </h3>
                  <p className="text-center text-xs text-neutral-600 dark:text-neutral-400">
                    Gestionar ventas
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview with Glass Cards */}
        <div className="grid animate-slide-up grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))
          ) : stats ? (
            <>
              <SimpleTooltip text="Click para ver todos los eventos" side="top">
                <StatsCard
                  title="Eventos activos"
                  value={formatNumber(stats.activeEvents)}
                  description="Este mes"
                  trend={stats.activeEvents > 0 ? 'up' : 'neutral'}
                  trendValue={
                    stats.activeEvents > 0
                      ? '+' + stats.activeEvents
                      : 'Sin eventos'
                  }
                  icon={<Calendar className="h-5 w-5" />}
                  className="cursor-pointer hover:scale-105"
                  onClick={() => router.push('/admin/events')}
                />
              </SimpleTooltip>

              <SimpleTooltip text="Click para gestionar fotos" side="top">
                <StatsCard
                  title="Fotos subidas"
                  value={formatNumber(stats.totalPhotos)}
                  description={`${formatNumber(stats.todayUploads)} subidas hoy`}
                  trend={stats.todayUploads > 0 ? 'up' : 'neutral'}
                  trendValue={
                    stats.todayUploads > 0
                      ? '+' + stats.todayUploads + ' hoy'
                      : 'Sin nuevas'
                  }
                  icon={<Camera className="h-5 w-5" />}
                  className="cursor-pointer hover:scale-105"
                  onClick={() => router.push('/admin/photos')}
                />
              </SimpleTooltip>

              <SimpleTooltip text="Familias con tokens activos" side="top">
                <StatsCard
                  title="Familias registradas"
                  value={formatNumber(stats.registeredFamilies)}
                  description="Con acceso activo"
                  trend={stats.registeredFamilies > 0 ? 'up' : 'neutral'}
                  trendValue={
                    stats.registeredFamilies > 0
                      ? '+' + stats.registeredFamilies
                      : 'Sin familias'
                  }
                  icon={<Users className="h-5 w-5" />}
                  className="hover:scale-105"
                />
              </SimpleTooltip>

              <SimpleTooltip
                text="Click para gestionar pedidos y ventas"
                side="top"
              >
                <StatsCard
                  title="Ventas"
                  value={formatPrice(stats.totalSales)}
                  description={`${formatNumber(stats.pendingOrders)} pedidos pendientes`}
                  trend={stats.totalSales > 0 ? 'up' : 'neutral'}
                  trendValue={
                    stats.totalSales > 0
                      ? formatPrice(stats.totalSales)
                      : 'Sin ventas'
                  }
                  icon={<DollarSign className="h-5 w-5" />}
                  className="cursor-pointer hover:scale-105"
                  onClick={() => router.push('/admin/orders')}
                />
              </SimpleTooltip>
              <SimpleTooltip text="Flujo rápido de trabajo" side="top">
                <StatsCard
                  title="Flujo rápido"
                  value="4 pasos"
                  description="Generar, subir, agrupar, publicar"
                  trend={'neutral'}
                  trendValue={'Atajo' }
                  icon={<Zap className="h-5 w-5" />}
                  className="cursor-pointer hover:scale-105"
                  onClick={() => router.push('/admin/quick-flow')}
                />
              </SimpleTooltip>
            </>
          ) : (
            // Error state
            Array.from({ length: 4 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))
          )}
        </div>

        {/* Quick Actions Glass Card - Solo Desktop */}
        <Card
          variant="glass"
          className="noise hidden animate-slide-up overflow-hidden lg:block"
          style={{ animationDelay: '0.2s' }}
        >
          <CardHeader gradient>
            <CardTitle as="h2" className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-accent-500" />
              Acciones Principales
            </CardTitle>
          </CardHeader>

          <CardContent padding="lg">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Create Event Action - Mejorado */}
              <button
                onClick={() => router.push('/admin/events/new')}
                className="group relative flex flex-col items-center justify-center rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100 p-6 transition-all duration-300 hover:scale-105 hover:border-primary-400 hover:shadow-xl dark:border-primary-700 dark:from-primary-900/40 dark:to-primary-800/30"
              >
                <div className="mb-4 rounded-2xl bg-primary-500/10 p-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary-500/20">
                  <Calendar className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Crear Evento
                </h3>
                <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
                  Nueva sesión fotográfica
                </p>
              </button>

              {/* Upload Photos Action - Unificado y mejorado */}
              <button
                onClick={() => router.push('/admin/photos')}
                className="group relative flex flex-col items-center justify-center rounded-2xl border border-secondary-200 bg-gradient-to-br from-secondary-50 to-secondary-100 p-6 transition-all duration-300 hover:scale-105 hover:border-secondary-400 hover:shadow-xl dark:border-secondary-700 dark:from-secondary-900/40 dark:to-secondary-800/30"
              >
                <div className="mb-4 rounded-2xl bg-secondary-500/10 p-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-secondary-500/20">
                  <Camera className="h-8 w-8 text-secondary-600 dark:text-secondary-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Subir Fotos
                </h3>
                <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
                  Procesar con watermark
                </p>
              </button>

              {/* Tagging Action - Nuevo */}
              <button
                onClick={() => router.push('/admin/tagging')}
                className="group relative flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-6 transition-all duration-300 hover:scale-105 hover:border-amber-400 hover:shadow-xl dark:border-amber-700 dark:from-amber-900/40 dark:to-amber-800/30"
              >
                <div className="mb-4 rounded-2xl bg-amber-500/20 p-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-500/30">
                  <Users className="h-8 w-8 text-amber-700 dark:text-amber-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Asignar Fotos
                </h3>
                <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
                  Vincular con QR codes
                </p>
              </button>

              {/* Orders Action - Mejorado */}
              <button
                onClick={() => router.push('/admin/orders')}
                className="group relative flex flex-col items-center justify-center rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-6 transition-all duration-300 hover:scale-105 hover:border-green-400 hover:shadow-xl dark:border-green-700 dark:from-green-900/40 dark:to-green-800/30"
              >
                <div className="mb-4 rounded-2xl bg-green-500/10 p-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                  <Package className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Ver Pedidos
                </h3>
                <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
                  Gestionar ventas
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & Performance */}
        <div
          className="grid animate-slide-up grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-8"
          style={{ animationDelay: '0.4s' }}
        >
          {/* Recent Activity */}
          <ActivityFeed
            activities={activity || []}
            isLoading={activityLoading}
            error={error ? new Error('Error al cargar actividad') : null}
            onRefresh={refreshCritical}
          />

          {/* Performance Insights - Usando el PerformanceMonitor existente pero simplificado */}
          <div className="space-y-6">
            {performanceLoading ? (
              <Card variant="glass" className="noise">
                <CardHeader>
                  <CardTitle as="h2" className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-accent-500" />
                    Rendimiento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-muted/30 h-8 w-8 animate-pulse rounded-lg" />
                          <div className="space-y-1">
                            <div className="bg-muted/30 h-4 w-24 animate-pulse rounded" />
                            <div className="bg-muted/30 h-3 w-32 animate-pulse rounded" />
                          </div>
                        </div>
                        <div className="bg-muted/30 h-6 w-12 animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card variant="glass" className="noise">
                <CardHeader>
                  <CardTitle
                    as="h2"
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-accent-500" />
                      Rendimiento
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/admin/performance')}
                      className="text-xs"
                    >
                      Ver detalles
                    </Button>
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-100 p-2">
                          <Star className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-foreground text-sm font-medium">
                            Sistema Activo
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {performance?.system?.status === 'healthy'
                              ? 'Funcionando correctamente'
                              : performance?.system?.status === 'warning'
                                ? 'Con advertencias'
                                : 'Cargando...'}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`h-2 w-2 animate-pulse rounded-full ${
                          performance?.system?.status === 'healthy'
                            ? 'bg-green-500'
                            : performance?.system?.status === 'warning'
                              ? 'bg-amber-500'
                              : performance?.system?.status === 'critical'
                                ? 'bg-red-500'
                                : 'bg-muted'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2">
                          <Package className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-foreground text-sm font-medium">
                            Storage Usado
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {stats
                              ? `${((stats.storageUsed / stats.storageLimit) * 100).toFixed(1)}% usado`
                              : 'Cargando...'}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-blue-600">
                        {stats
                          ? `${((stats.storageLimit - stats.storageUsed) / (1024 * 1024 * 1024)).toFixed(1)}GB libre`
                          : '-'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-purple-100 p-2">
                          <Camera className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-foreground text-sm font-medium">
                            Procesamiento
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {performance?.apiMetrics?.responseTime
                              ? `${performance.apiMetrics.responseTime}ms respuesta`
                              : 'Listo para recibir fotos'}
                          </p>
                        </div>
                      </div>
                      <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
