'use client';

import { useState, useEffect } from 'react';
import { AdvancedAnalyticsDashboard } from '@/components/admin/AdvancedAnalyticsDashboard';
import { ArrowLeft, Home, ChevronRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Mock data generator
function generateMockAnalyticsData() {
  const monthlyData = [
    { month: 'Enero', events: 45, photos: 1250, revenue: 87500, clients: 32 },
    {
      month: 'Febrero',
      events: 52,
      photos: 1580,
      revenue: 105600,
      clients: 38,
    },
    { month: 'Marzo', events: 48, photos: 1320, revenue: 92400, clients: 35 },
    { month: 'Abril', events: 61, photos: 1890, revenue: 128700, clients: 44 },
    { month: 'Mayo', events: 58, photos: 1750, revenue: 119500, clients: 41 },
    { month: 'Junio', events: 64, photos: 2100, revenue: 142800, clients: 47 },
  ];

  const categoryData = [
    { category: 'Graduaciones', events: 85, revenue: 195000, percentage: 45 },
    {
      category: 'Eventos Deportivos',
      events: 62,
      revenue: 142000,
      percentage: 32,
    },
    {
      category: 'Festivales Escolares',
      events: 48,
      revenue: 96000,
      percentage: 23,
    },
    { category: 'Ceremonias', events: 35, revenue: 78000, percentage: 18 },
    {
      category: 'Actividades Especiales',
      events: 28,
      revenue: 54000,
      percentage: 12,
    },
  ];

  const topEvents = [
    {
      name: 'Graduación Universidad Nacional',
      photos: 350,
      revenue: 25900,
      completion: 98,
    },
    {
      name: 'Torneo Intercolegial de Fútbol',
      photos: 280,
      revenue: 18400,
      completion: 95,
    },
    {
      name: 'Festival de Arte Primaria',
      photos: 220,
      revenue: 15800,
      completion: 92,
    },
    {
      name: 'Ceremonia de Fin de Año',
      photos: 190,
      revenue: 12600,
      completion: 88,
    },
    {
      name: 'Competencia de Natación',
      photos: 165,
      revenue: 10200,
      completion: 85,
    },
  ];

  const recentActivity = [
    {
      date: 'Hace 2 horas',
      type: 'photos_uploaded' as const,
      description: '45 fotos subidas a "Graduación 2024"',
      value: 3200,
    },
    {
      date: 'Hace 4 horas',
      type: 'order_completed' as const,
      description: 'Pedido completado - Familia González',
      value: 850,
    },
    {
      date: 'Hace 6 horas',
      type: 'event_created' as const,
      description: 'Nuevo evento: "Festival de Primavera"',
    },
    {
      date: 'Hace 8 horas',
      type: 'photos_uploaded' as const,
      description: '120 fotos subidas a "Evento Deportivo"',
      value: 1500,
    },
    {
      date: 'Hace 1 día',
      type: 'order_completed' as const,
      description: 'Pedido completado - Familia Martínez',
      value: 1200,
    },
    {
      date: 'Hace 1 día',
      type: 'event_created' as const,
      description: 'Nuevo evento: "Ceremonia de Graduación"',
    },
  ];

  return {
    totalEvents: 328,
    totalPhotos: 15420,
    totalRevenue: 876400,
    totalClients: 245,
    averagePhotosPerEvent: 47,
    averageRevenuePerEvent: 2673,
    averageRevenuePerPhoto: 57,
    completionRate: 92,
    growthRate: 15.8,
    monthlyData,
    categoryData,
    performanceMetrics: {
      topEvents,
      recentActivity,
    },
  };
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>(
    '30d'
  );
  const [analyticsData, setAnalyticsData] = useState(
    generateMockAnalyticsData()
  );
  const [isLoading, setIsLoading] = useState(false);

  // Simulate data loading when time range changes
  useEffect(() => {
    setIsLoading(true);
    const timer = globalThis.setTimeout(() => {
      // In a real app, you would fetch new data based on the time range
      setAnalyticsData(generateMockAnalyticsData());
      setIsLoading(false);
    }, 500);

    return () => globalThis.clearTimeout(timer);
  }, [timeRange]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto space-y-6 lg:space-y-8">
        {/* Enhanced Neural Header */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl" />
          <div className="neural-glass-surface relative p-6 sm:p-8">
            {/* Breadcrumbs */}
            <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-300">
              <Link
                href="/admin"
                className="flex items-center gap-1 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              >
                <Home className="h-4 w-4" />
                Admin
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="flex items-center gap-2 font-medium text-foreground dark:text-white">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </span>
            </nav>

            {/* Header Content */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Link href="/admin">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="neural-glass-card border-white/20"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                  <div>
                    <h1 className="neural-title text-2xl font-bold sm:text-3xl lg:text-4xl">
                      Dashboard de Analytics
                    </h1>
                    <p className="neural-subtitle mt-1 text-muted-foreground dark:text-gray-300">
                      Insights detallados sobre el rendimiento de tu negocio
                    </p>
                  </div>
                </div>

                {/* Quick Stats in Header */}
                <div className="mt-4 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full bg-green-400"></div>
                    <span className="text-muted-foreground dark:text-gray-300">
                      {analyticsData.totalEvents} eventos activos
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full bg-blue-400"></div>
                    <span className="text-muted-foreground dark:text-gray-300">
                      ${analyticsData.totalRevenue.toLocaleString()} en ingresos
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full bg-purple-400"></div>
                    <span className="text-muted-foreground dark:text-gray-300">
                      {analyticsData.completionRate}% tasa de finalización
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {isLoading ? (
            <div className="neural-glass-card p-12 text-center">
              <div className="inline-flex items-center gap-3">
                <div className="border-3 h-6 w-6 animate-spin rounded-full border-blue-600 border-t-transparent"></div>
                <span className="text-lg font-medium text-gray-500 dark:text-gray-400">
                  Cargando analytics...
                </span>
              </div>
            </div>
          ) : (
            <AdvancedAnalyticsDashboard
              data={analyticsData}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              className="mb-8"
            />
          )}
        </div>

        {/* Footer Info */}
        <div className="neural-glass-card p-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Los datos se actualizan cada 15 minutos. Última actualización:{' '}
            {new Date().toLocaleString('es-AR')}
          </p>
        </div>
      </div>
    </div>
  );
}
