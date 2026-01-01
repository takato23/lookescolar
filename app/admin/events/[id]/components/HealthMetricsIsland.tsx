'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Target,
  Zap,
} from 'lucide-react';
// Removed unused Card imports
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EventMetrics, EventPhase } from '@/lib/stores/event-workflow-store';

type OnViewDetails = (id: string) => void;

interface HealthMetricsIslandProps {
  metrics: EventMetrics;
  healthScore: number;
  currentPhase: EventPhase;
  onViewDetails: OnViewDetails;
}

export const HealthMetricsIsland = memo(function HealthMetricsIsland({
  metrics,
  healthScore,
  onViewDetails,
}: HealthMetricsIslandProps) {
  const healthConfig = {
    excellent: { color: 'green', label: 'Excelente', icon: CheckCircle2 },
    good: { color: 'blue', label: 'Bien', icon: TrendingUp },
    warning: { color: 'yellow', label: 'Atención', icon: AlertTriangle },
    critical: { color: 'red', label: 'Crítico', icon: AlertTriangle },
  };

  const { healthInfo } = useMemo(() => {
    const getHealthLevel = (score: number) => {
      if (score >= 85) return 'excellent';
      if (score >= 70) return 'good';
      if (score >= 50) return 'warning';
      return 'critical';
    };

    const level = getHealthLevel(healthScore);
    return {
      healthInfo: healthConfig[level],
    };
  }, [healthScore]);

  const metricCards = [
    {
      id: 'photos',
      title: 'Fotos',
      value: metrics.totalPhotos.toLocaleString(),
      subtitle:
        metrics.untaggedPhotos > 0
          ? `${metrics.untaggedPhotos} sin etiquetar`
          : 'Todas etiquetadas',
      icon: Camera,
      color: 'blue',
      progress:
        metrics.totalPhotos > 0
          ? ((metrics.totalPhotos - metrics.untaggedPhotos) /
              metrics.totalPhotos) *
            100
          : 0,
      trend:
        metrics.totalPhotos > 100
          ? 'up'
          : metrics.totalPhotos > 0
            ? 'stable'
            : 'down',
      actionable: metrics.untaggedPhotos > 0,
    },
    {
      id: 'families',
      title: 'Clientes',
      value: metrics.totalSubjects.toLocaleString(),
      subtitle: `${metrics.activeTokens} tokens activos`,
      icon: Users,
      color: 'purple',
      progress:
        metrics.totalSubjects > 0
          ? (metrics.activeTokens / metrics.totalSubjects) * 100
          : 0,
      trend:
        metrics.totalSubjects > 20
          ? 'up'
          : metrics.totalSubjects > 0
            ? 'stable'
            : 'down',
      actionable: metrics.totalSubjects === 0,
    },
    {
      id: 'orders',
      title: 'Pedidos',
      value: metrics.totalOrders.toLocaleString(),
      subtitle:
        metrics.pendingOrders > 0
          ? `${metrics.pendingOrders} pendientes`
          : 'Al día',
      icon: ShoppingCart,
      color: 'green',
      progress:
        metrics.totalSubjects > 0
          ? (metrics.totalOrders / metrics.totalSubjects) * 100
          : 0,
      trend:
        metrics.conversionRate > 0.3
          ? 'up'
          : metrics.conversionRate > 0.1
            ? 'stable'
            : 'down',
      actionable: metrics.pendingOrders > 0,
    },
    {
      id: 'revenue',
      title: 'Ingresos',
      value: `$${metrics.revenue.toLocaleString()}`,
      subtitle: `${Math.round(metrics.conversionRate * 100)}% conversión`,
      icon: DollarSign,
      color: 'emerald',
      progress: Math.min(metrics.conversionRate * 100, 100),
      trend:
        metrics.conversionRate > 0.4
          ? 'up'
          : metrics.conversionRate > 0.2
            ? 'stable'
            : 'down',
      actionable: metrics.conversionRate < 0.2 && metrics.totalSubjects > 10,
    },
  ];

  const trendIcons = {
    up: TrendingUp,
    stable: Target,
    down: AlertTriangle,
  };

  const trendColors = {
    up: 'text-green-500',
    stable: 'text-blue-500',
    down: 'text-red-500',
  };

  return (
    <motion.div
      className="glass-health-island"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Header with Overall Health */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <healthInfo.icon
              className={`h-6 w-6 text-${healthInfo.color}-500`}
            />
            <h2 className="gradient-text-ios26 text-xl font-bold">
              Estado del Evento
            </h2>
          </div>
          <Badge
            variant="outline"
            className={`glass-label-ios26 border-${healthInfo.color}-300 text-${healthInfo.color}-700`}
          >
            {healthInfo.label}
          </Badge>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="gradient-text-ios26 text-2xl font-bold">
              {Math.round(healthScore)}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">/100</span>
          </div>
          <Progress
            value={healthScore}
            className={`h-2 w-20 bg-${healthInfo.color}-100`}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metricCards.map((metric, index) => {
          const TrendIcon = trendIcons[metric.trend];
          const trendColor = trendColors[metric.trend];

          return (
            <motion.div
              key={metric.id}
              className={`glass-stat-card-ios26 group cursor-pointer ${
                metric.actionable ? 'gentle-glow' : ''
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
              onClick={() => onViewDetails(metric.id)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="mb-3 flex items-start justify-between">
                <div
                  className={`rounded-lg p-2 bg-${metric.color}-500/10 group-hover:bg-${metric.color}-500/20 transition-colors`}
                >
                  <metric.icon className={`h-5 w-5 text-${metric.color}-500`} />
                </div>
                <TrendIcon
                  className={`h-4 w-4 ${trendColor} opacity-60 transition-opacity group-hover:opacity-100`}
                />
              </div>

              <div className="mb-2">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  {metric.title}
                </p>
                <p className="gradient-text-ios26 text-2xl font-bold">
                  {metric.value}
                </p>
              </div>

              {metric.progress !== undefined && (
                <div className="mb-2">
                  <Progress
                    value={metric.progress}
                    className={`h-1.5 bg-${metric.color}-100/50`}
                  />
                </div>
              )}

              <p
                className={`text-xs ${
                  metric.actionable
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground'
                }`}
              >
                {metric.subtitle}
              </p>

              {metric.actionable && (
                <motion.div
                  className="absolute right-2 top-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500"></div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Quick Insights */}
      <motion.div
        className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Insights Rápidos</span>
        </div>

        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span className="text-gray-500 dark:text-gray-400">
              Participación:{' '}
              <span className="text-foreground font-medium">
                {Math.round(metrics.engagementRate * 100)}%
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-gray-500 dark:text-gray-400">
              Eficiencia:{' '}
              <span className="text-foreground font-medium">
                {metrics.totalPhotos > 0
                  ? Math.round(
                      ((metrics.totalPhotos - metrics.untaggedPhotos) /
                        metrics.totalPhotos) *
                        100
                    )
                  : 0}
                %
              </span>
            </span>
          </div>

          {metrics.totalSubjects > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span className="text-gray-500 dark:text-gray-400">
                Fotos por cliente:{' '}
                <span className="text-foreground font-medium">
                  {Math.round(metrics.totalPhotos / metrics.totalSubjects)}
                </span>
              </span>
            </div>
          )}

          {metrics.revenue > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <span className="text-gray-500 dark:text-gray-400">
                Ticket promedio:{' '}
                <span className="text-foreground font-medium">
                  $
                  {metrics.totalOrders > 0
                    ? Math.round(metrics.revenue / metrics.totalOrders)
                    : 0}
                </span>
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
});
