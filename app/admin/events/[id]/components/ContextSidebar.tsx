'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Camera,
  ShoppingCart,
  DollarSign,
  Activity,
  Calendar,
  MapPin,
  RefreshCw,
  CheckCircle2,
  Eye,
  Zap,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EventMetrics, EventPhase } from '@/lib/stores/event-workflow-store';

interface ContextSidebarProps {
  eventInfo: any;
  metrics: EventMetrics;
  currentPhase: EventPhase;
  healthScore: number;
}

export function ContextSidebar({
  eventInfo,
  metrics,
  healthScore,
}: ContextSidebarProps) {
  const recentActivities = [
    {
      id: 1,
      type: 'upload',
      message: 'Fotos subidas',
      count: 12,
      time: '2 min',
      icon: Camera,
      color: 'green',
    },
    {
      id: 2,
      type: 'tag',
      message: 'Auto-etiquetado IA',
      count: 8,
      time: '5 min',
      icon: Zap,
      color: 'blue',
    },
    {
      id: 3,
      type: 'order',
      message: 'Nuevo pedido',
      count: 1,
      time: '8 min',
      icon: ShoppingCart,
      color: 'purple',
    },
    {
      id: 4,
      type: 'access',
      message: 'Familia accedió',
      count: 3,
      time: '12 min',
      icon: Eye,
      color: 'orange',
    },
    {
      id: 5,
      type: 'system',
      message: 'QR generados',
      count: 5,
      time: '15 min',
      icon: Target,
      color: 'indigo',
    },
  ];

  const liveMetrics = [
    {
      label: 'Velocidad de fotos',
      value: '2.4/min',
      trend: 'up',
      color: 'green',
    },
    {
      label: 'Participación familias',
      value: `${Math.round(metrics.engagementRate * 100)}%`,
      trend:
        metrics.engagementRate > 0.5
          ? 'up'
          : metrics.engagementRate > 0.3
            ? 'stable'
            : 'down',
      color:
        metrics.engagementRate > 0.5
          ? 'green'
          : metrics.engagementRate > 0.3
            ? 'yellow'
            : 'red',
    },
    {
      label: 'Conversión promedio',
      value: `${Math.round(metrics.conversionRate * 100)}%`,
      trend:
        metrics.conversionRate > 0.4
          ? 'up'
          : metrics.conversionRate > 0.2
            ? 'stable'
            : 'down',
      color:
        metrics.conversionRate > 0.4
          ? 'green'
          : metrics.conversionRate > 0.2
            ? 'yellow'
            : 'red',
    },
    {
      label: 'Ingresos/hora',
      value: `$${Math.round(metrics.revenue / Math.max(1, Math.ceil((Date.now() - new Date(eventInfo.date).getTime()) / (1000 * 60 * 60))))}`,
      trend: 'up',
      color: 'green',
    },
  ];

  const trendIcons = {
    up: ArrowUp,
    down: ArrowDown,
    stable: Minus,
  };

  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    stable: 'text-blue-500',
  };

  return (
    <div className="glass-context-sidebar">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Event Summary */}
        <div className="glass-stat-card-ios26 p-4">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="mb-1 text-sm font-semibold">
                Información del Evento
              </h3>
              <p className="text-muted-foreground text-xs">
                {new Date(eventInfo.date).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`glass-label-ios26 ${
                healthScore > 80
                  ? 'border-green-300 text-green-700'
                  : healthScore > 60
                    ? 'border-yellow-300 text-yellow-700'
                    : 'border-red-300 text-red-700'
              }`}
            >
              {Math.round(healthScore)}/100
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="text-muted-foreground h-3 w-3" />
              <span className="text-muted-foreground">Creado hace</span>
              <span className="font-medium">
                {Math.ceil(
                  (Date.now() - new Date(eventInfo.created_at).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                días
              </span>
            </div>

            {eventInfo.location && (
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="text-muted-foreground h-3 w-3" />
                <span className="text-muted-foreground">
                  {eventInfo.location}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs">
              <Activity className="text-muted-foreground h-3 w-3" />
              <span className="text-muted-foreground">Estado:</span>
              <span
                className={`font-medium ${eventInfo.active ? 'text-green-600' : 'text-red-600'}`}
              >
                {eventInfo.active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Métricas en Vivo
            </h3>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
              <span className="text-muted-foreground text-xs">Tiempo real</span>
            </div>
          </div>

          <div className="space-y-2">
            {liveMetrics.map((metric, index) => {
              const TrendIcon = trendIcons[metric.trend];
              const trendColor = trendColors[metric.trend];

              return (
                <motion.div
                  key={metric.label}
                  className="glass-stat-card-ios26 p-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {metric.label}
                      </p>
                      <p className="gradient-text-ios26 text-lg font-bold">
                        {metric.value}
                      </p>
                    </div>
                    <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-purple-500" />
            Actividad Reciente
          </h3>

          <div className="max-h-60 space-y-2 overflow-y-auto">
            <AnimatePresence>
              {recentActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  className="glass-stat-card-ios26 cursor-pointer p-3 transition-colors hover:bg-white/10"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 bg-${activity.color}-500/10 flex-shrink-0`}
                    >
                      <activity.icon
                        className={`h-3 w-3 text-${activity.color}-500`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {activity.message}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600">
                          +{activity.count}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          hace {activity.time}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Estadísticas Rápidas
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div className="glass-stat-card-ios26 p-3 text-center">
              <Users className="mx-auto mb-1 h-4 w-4 text-purple-500" />
              <p className="gradient-text-ios26 text-lg font-bold">
                {metrics.totalSubjects}
              </p>
              <p className="text-muted-foreground text-xs">Familias</p>
            </div>

            <div className="glass-stat-card-ios26 p-3 text-center">
              <Camera className="mx-auto mb-1 h-4 w-4 text-blue-500" />
              <p className="gradient-text-ios26 text-lg font-bold">
                {metrics.totalPhotos}
              </p>
              <p className="text-muted-foreground text-xs">Fotos</p>
            </div>

            <div className="glass-stat-card-ios26 p-3 text-center">
              <ShoppingCart className="mx-auto mb-1 h-4 w-4 text-green-500" />
              <p className="gradient-text-ios26 text-lg font-bold">
                {metrics.totalOrders}
              </p>
              <p className="text-muted-foreground text-xs">Pedidos</p>
            </div>

            <div className="glass-stat-card-ios26 p-3 text-center">
              <DollarSign className="mx-auto mb-1 h-4 w-4 text-emerald-500" />
              <p className="gradient-text-ios26 text-lg font-bold">
                ${(metrics.revenue / 1000).toFixed(1)}k
              </p>
              <p className="text-muted-foreground text-xs">Ingresos</p>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="glass-stat-card-ios26 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <RefreshCw className="h-4 w-4 text-blue-500" />
            Estado del Sistema
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Base de datos
              </span>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">Operativo</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Almacenamiento
              </span>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">Normal</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Sincronización
              </span>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">Activa</span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  Última actualización
                </span>
                <span className="text-xs font-medium">
                  {new Date().toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
