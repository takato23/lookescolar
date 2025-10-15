'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Camera,
  DollarSign,
  Calendar,
  Target,
  Activity,
  Zap,
  Eye,
  Star,
  Clock,
  ArrowUp,
  ArrowDown,
  Filter,
  Download,
  RefreshCw,
  PieChart,
  LineChart,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AnalyticsData {
  totalEvents: number;
  totalPhotos: number;
  totalRevenue: number;
  totalClients: number;
  averagePhotosPerEvent: number;
  averageRevenuePerEvent: number;
  averageRevenuePerPhoto: number;
  completionRate: number;
  growthRate: number;
  monthlyData: {
    month: string;
    events: number;
    photos: number;
    revenue: number;
    clients: number;
  }[];
  categoryData: {
    category: string;
    events: number;
    revenue: number;
    percentage: number;
  }[];
  performanceMetrics: {
    topEvents: {
      name: string;
      photos: number;
      revenue: number;
      completion: number;
    }[];
    recentActivity: {
      date: string;
      type: 'event_created' | 'photos_uploaded' | 'order_completed';
      description: string;
      value?: number;
    }[];
  };
}

interface AdvancedAnalyticsDashboardProps {
  data: AnalyticsData;
  className?: string;
  timeRange?: '7d' | '30d' | '90d' | '1y';
  onTimeRangeChange?: (range: '7d' | '30d' | '90d' | '1y') => void;
}

export function AdvancedAnalyticsDashboard({
  data,
  className,
  timeRange = '30d',
  onTimeRangeChange,
}: AdvancedAnalyticsDashboardProps) {
  const [activeChart, setActiveChart] = useState<
    'revenue' | 'photos' | 'events' | 'clients'
  >('revenue');
  const [showComparison, setShowComparison] = useState(false);

  // Calculate derived metrics
  const metrics = useMemo(() => {
    const previousPeriodRevenue = data.totalRevenue * 0.85; // Mock previous period
    const revenueGrowth =
      ((data.totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) *
      100;

    const previousPeriodPhotos = data.totalPhotos * 0.92;
    const photosGrowth =
      ((data.totalPhotos - previousPeriodPhotos) / previousPeriodPhotos) * 100;

    const previousPeriodEvents = data.totalEvents * 0.88;
    const eventsGrowth =
      ((data.totalEvents - previousPeriodEvents) / previousPeriodEvents) * 100;

    return {
      revenueGrowth,
      photosGrowth,
      eventsGrowth,
      avgOrderValue: data.totalRevenue / Math.max(data.totalEvents, 1),
      photosPerDay: data.totalPhotos / 30,
      revenuePerDay: data.totalRevenue / 30,
      clientRetentionRate: 85, // Mock data
      conversionRate: 12.5, // Mock data
    };
  }, [data]);

  const timeRangeLabels = {
    '7d': 'Últimos 7 días',
    '30d': 'Últimos 30 días',
    '90d': 'Últimos 90 días',
    '1y': 'Último año',
  };

  // Simple chart components (since we don't have a chart library)
  const SimpleBarChart = ({
    data: chartData,
    color = '#3B82F6',
  }: {
    data: any[];
    color?: string;
  }) => (
    <div className="flex h-32 items-end justify-between px-2">
      {chartData.slice(-6).map((item, index) => {
        const height = Math.max(
          (item.value / Math.max(...chartData.map((d) => d.value))) * 100,
          5
        );
        return (
          <div key={index} className="flex flex-col items-center gap-2">
            <div
              className="w-8 rounded-t transition-all duration-500"
              style={{
                height: `${height}%`,
                background: `linear-gradient(to top, ${color}, ${color}99)`,
              }}
            />
            <span className="origin-bottom-left rotate-45 text-xs text-gray-500">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );

  const SimpleLineChart = ({
    data: chartData,
    color = '#10B981',
  }: {
    data: any[];
    color?: string;
  }) => (
    <div className="relative flex h-32 items-end">
      <svg className="absolute inset-0 h-full w-full">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={chartData
            .slice(-6)
            .map((item, index) => {
              const x = (index / (chartData.slice(-6).length - 1)) * 100;
              const y =
                100 -
                (item.value / Math.max(...chartData.map((d) => d.value))) * 80;
              return `${x},${y}`;
            })
            .join(' ')}
        />
      </svg>
      <div className="flex w-full justify-between px-2">
        {chartData.slice(-6).map((item, index) => (
          <div key={index} className="text-xs text-gray-500">
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Analytics Dashboard
          </h2>
          <p className="text-gray-500 dark:text-gray-400">Métricas y insights de tu negocio</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="neural-glass-card">
                <Clock className="mr-2 h-4 w-4" />
                {timeRangeLabels[timeRange]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="neural-glass-card">
              {Object.entries(timeRangeLabels).map(([value, label]) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => onTimeRangeChange?.(value as any)}
                  className={timeRange === value ? 'bg-blue-50' : ''}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" className="neural-glass-card">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>

          <Button variant="outline" className="neural-glass-card">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <div className="neural-glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos Totales</p>
              <p className="text-2xl font-bold text-foreground">
                ${data.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-green-100 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {metrics.revenueGrowth > 0 ? (
              <ArrowUp className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-600" />
            )}
            <span
              className={cn(
                'text-sm font-medium',
                metrics.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {Math.abs(metrics.revenueGrowth).toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500">vs período anterior</span>
          </div>
        </div>

        {/* Photos */}
        <div className="neural-glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fotos Totales</p>
              <p className="text-2xl font-bold text-foreground">
                {data.totalPhotos.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-blue-100 dark:bg-blue-950/30 p-3">
              <Camera className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">
              {metrics.photosGrowth.toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500">
              {metrics.photosPerDay.toFixed(0)}/día
            </span>
          </div>
        </div>

        {/* Events */}
        <div className="neural-glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Eventos Totales</p>
              <p className="text-2xl font-bold text-foreground">
                {data.totalEvents}
              </p>
            </div>
            <div className="rounded-xl bg-purple-100 p-3">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">
              {metrics.eventsGrowth.toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500">
              {data.completionRate}% completados
            </span>
          </div>
        </div>

        {/* Clients */}
        <div className="neural-glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Clientes</p>
              <p className="text-2xl font-bold text-foreground">
                {data.totalClients}
              </p>
            </div>
            <div className="rounded-xl bg-primary-50 p-3">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {metrics.clientRetentionRate}%
            </span>
            <span className="text-sm text-gray-500">retención</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Main Chart */}
        <div className="neural-glass-card p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Tendencias</h3>
            <div className="flex items-center gap-2">
              {(['revenue', 'photos', 'events', 'clients'] as const).map(
                (type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={activeChart === type ? 'default' : 'ghost'}
                    onClick={() => setActiveChart(type)}
                    className="text-xs"
                  >
                    {type === 'revenue' && 'Ingresos'}
                    {type === 'photos' && 'Fotos'}
                    {type === 'events' && 'Eventos'}
                    {type === 'clients' && 'Clientes'}
                  </Button>
                )
              )}
            </div>
          </div>

          <div className="mb-4">
            {activeChart === 'revenue' && (
              <SimpleLineChart
                data={data.monthlyData.map((d) => ({
                  label: d.month.slice(0, 3),
                  value: d.revenue,
                }))}
                color="#10B981"
              />
            )}
            {activeChart === 'photos' && (
              <SimpleBarChart
                data={data.monthlyData.map((d) => ({
                  label: d.month.slice(0, 3),
                  value: d.photos,
                }))}
                color="#3B82F6"
              />
            )}
            {activeChart === 'events' && (
              <SimpleBarChart
                data={data.monthlyData.map((d) => ({
                  label: d.month.slice(0, 3),
                  value: d.events,
                }))}
                color="#8B5CF6"
              />
            )}
            {activeChart === 'clients' && (
              <SimpleLineChart
                data={data.monthlyData.map((d) => ({
                  label: d.month.slice(0, 3),
                  value: d.clients,
                }))}
                color="#F59E0B"
              />
            )}
          </div>
        </div>

        {/* Category Performance */}
        <div className="neural-glass-card p-6">
          <h3 className="mb-6 text-lg font-semibold text-foreground">
            Rendimiento por Categoría
          </h3>
          <div className="space-y-4">
            {data.categoryData.map((category, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {category.category}
                  </span>
                  <span className="text-sm text-gray-500">
                    ${category.revenue.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{category.events} eventos</span>
                  <span>{category.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Performance Metrics */}
        <div className="neural-glass-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Métricas Clave
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium">
                  Valor promedio por evento
                </span>
              </div>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                ${metrics.avgOrderValue.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-green-50 p-3">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Fotos por evento</span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {data.averagePhotosPerEvent.toFixed(0)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-purple-50 p-3">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium">Tasa de conversión</span>
              </div>
              <span className="text-lg font-bold text-purple-600">
                {metrics.conversionRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Top Events */}
        <div className="neural-glass-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Eventos Destacados
          </h3>
          <div className="space-y-3">
            {data.performanceMetrics.topEvents
              .slice(0, 5)
              .map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted"
                >
                  <div>
                    <p className="truncate text-sm font-medium text-foreground">
                      {event.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {event.photos} fotos • {event.completion}% completado
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      ${event.revenue.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1">
                      {index < 3 ? (
                        <Star className="h-3 w-3 text-yellow-500" />
                      ) : (
                        <div className="h-3 w-3" />
                      )}
                      <span className="text-xs text-gray-500">
                        #{index + 1}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="neural-glass-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Actividad Reciente
          </h3>
          <div className="space-y-3">
            {data.performanceMetrics.recentActivity
              .slice(0, 6)
              .map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-100 dark:bg-blue-950/30 p-2">
                    {activity.type === 'event_created' && (
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                    {activity.type === 'photos_uploaded' && (
                      <Camera className="h-4 w-4 text-green-600" />
                    )}
                    {activity.type === 'order_completed' && (
                      <DollarSign className="h-4 w-4 text-purple-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {activity.description}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {activity.date}
                      </span>
                      {activity.value && (
                        <span className="text-xs font-medium text-green-600">
                          ${activity.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
