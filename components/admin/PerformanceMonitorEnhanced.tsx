'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Clock,
  Database,
  Gauge,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Zap,
  Eye,
  Download,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebVitals {
  CLS: number;
  FCP: number;
  LCP: number;
  TTFB: number;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'needs-improvement' | 'poor';
  threshold: { good: number; poor: number };
}

interface DatabaseMetrics {
  queryTime: number;
  connectionCount: number;
  cacheHitRatio: number;
  slowQueries: number;
}

interface ServerMetrics {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  activeConnections: number;
  errorRate: number;
}

interface BundleMetrics {
  totalSize: number;
  jsSize: number;
  cssSize: number;
  imageSize: number;
  loadTime: number;
}

export function PerformanceMonitorEnhanced() {
  const [webVitals, setWebVitals] = useState<WebVitals | null>(null);
  const [dbMetrics, setDbMetrics] = useState<DatabaseMetrics | null>(null);
  const [serverMetrics, setServerMetrics] = useState<ServerMetrics | null>(
    null
  );
  const [bundleMetrics, setBundleMetrics] = useState<BundleMetrics | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Fetch metrics from API
  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);

      const [webVitalsRes, dbRes, serverRes, bundleRes] = await Promise.all([
        fetch('/api/admin/metrics/web-vitals'),
        fetch('/api/admin/metrics/database'),
        fetch('/api/admin/metrics/server'),
        fetch('/api/admin/metrics/bundle'),
      ]);

      const [webVitalsData, dbData, serverData, bundleData] = await Promise.all(
        [webVitalsRes.json(), dbRes.json(), serverRes.json(), bundleRes.json()]
      );

      setWebVitals(webVitalsData);
      setDbMetrics(dbData);
      setServerMetrics(serverData);
      setBundleMetrics(bundleData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize Web Vitals collection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('web-vitals').then(
        ({ getCLS, getFCP, getLCP, getTTFB }) => {
          const vitals: Partial<WebVitals> = {};

          getCLS((metric) => {
            vitals.CLS = metric.value;
            setWebVitals((prev) => ({ ...prev, ...vitals }) as WebVitals);
          });

          getFCP((metric) => {
            vitals.FCP = metric.value;
            setWebVitals((prev) => ({ ...prev, ...vitals }) as WebVitals);
          });

          getLCP((metric) => {
            vitals.LCP = metric.value;
            setWebVitals((prev) => ({ ...prev, ...vitals }) as WebVitals);
          });

          getTTFB((metric) => {
            vitals.TTFB = metric.value;
            setWebVitals((prev) => ({ ...prev, ...vitals }) as WebVitals);
          });
        }
      );
    }

    // Fetch initial metrics
    fetchMetrics();

    // Set up polling
    intervalRef.current = setInterval(fetchMetrics, 30000); // Every 30 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchMetrics]);

  // Calculate performance metrics
  const performanceMetrics = useMemo<PerformanceMetric[]>(() => {
    if (!webVitals) return [];

    return [
      {
        name: 'Largest Contentful Paint',
        value: webVitals.LCP,
        unit: 'ms',
        trend: webVitals.LCP < 2500 ? 'down' : 'up',
        status:
          webVitals.LCP < 2500
            ? 'good'
            : webVitals.LCP < 4000
              ? 'needs-improvement'
              : 'poor',
        threshold: { good: 2500, poor: 4000 },
      },
      {
        name: 'Cumulative Layout Shift',
        value: webVitals.CLS,
        unit: '',
        trend: webVitals.CLS < 0.1 ? 'down' : 'up',
        status:
          webVitals.CLS < 0.1
            ? 'good'
            : webVitals.CLS < 0.25
              ? 'needs-improvement'
              : 'poor',
        threshold: { good: 0.1, poor: 0.25 },
      },
      {
        name: 'First Contentful Paint',
        value: webVitals.FCP,
        unit: 'ms',
        trend: webVitals.FCP < 1800 ? 'down' : 'up',
        status:
          webVitals.FCP < 1800
            ? 'good'
            : webVitals.FCP < 3000
              ? 'needs-improvement'
              : 'poor',
        threshold: { good: 1800, poor: 3000 },
      },
      {
        name: 'Time to First Byte',
        value: webVitals.TTFB,
        unit: 'ms',
        trend: webVitals.TTFB < 800 ? 'down' : 'up',
        status:
          webVitals.TTFB < 800
            ? 'good'
            : webVitals.TTFB < 1800
              ? 'needs-improvement'
              : 'poor',
        threshold: { good: 800, poor: 1800 },
      },
    ];
  }, [webVitals]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'needs-improvement':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'poor':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'ms') {
      return `${Math.round(value)}ms`;
    }
    if (unit === '%') {
      return `${Math.round(value)}%`;
    }
    if (unit === 'MB') {
      return `${(value / 1024 / 1024).toFixed(1)}MB`;
    }
    return `${value.toFixed(2)}${unit}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitor de Rendimiento</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Métricas en tiempo real del sistema LookEscolar
          </p>
        </div>
        <Button onClick={fetchMetrics} disabled={isLoading} variant="outline">
          <RefreshCw
            className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')}
          />
          Actualizar
        </Button>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          Última actualización: {lastUpdated.toLocaleTimeString('es-AR')}
        </div>
      )}

      <Tabs defaultValue="web-vitals" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="web-vitals">
            <Eye className="mr-2 h-4 w-4" />
            Web Vitals
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="mr-2 h-4 w-4" />
            Base de Datos
          </TabsTrigger>
          <TabsTrigger value="server">
            <Server className="mr-2 h-4 w-4" />
            Servidor
          </TabsTrigger>
          <TabsTrigger value="bundle">
            <Download className="mr-2 h-4 w-4" />
            Bundle
          </TabsTrigger>
        </TabsList>

        {/* Web Vitals Tab */}
        <TabsContent value="web-vitals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {performanceMetrics.map((metric) => (
              <Card key={metric.name} className="relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.name}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(metric.status)}
                    {getTrendIcon(metric.trend)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatValue(metric.value, metric.unit)}
                  </div>
                  <Progress
                    value={Math.min(
                      (metric.value / metric.threshold.poor) * 100,
                      100
                    )}
                    className="mt-2"
                  />
                  <div className="text-gray-500 dark:text-gray-400 mt-1 flex justify-between text-xs">
                    <span>
                      Bueno: &lt;
                      {formatValue(metric.threshold.good, metric.unit)}
                    </span>
                    <span>
                      Malo: &gt;
                      {formatValue(metric.threshold.poor, metric.unit)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Puntuación General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">
                    {
                      performanceMetrics.filter((m) => m.status === 'good')
                        .length
                    }
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm">Buenas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-500">
                    {
                      performanceMetrics.filter(
                        (m) => m.status === 'needs-improvement'
                      ).length
                    }
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm">
                    Mejorables
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-500">
                    {
                      performanceMetrics.filter((m) => m.status === 'poor')
                        .length
                    }
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm">Pobres</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          {dbMetrics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Tiempo de Query
                  </CardTitle>
                  <Clock className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dbMetrics.queryTime}ms
                  </div>
                  <Badge
                    variant={
                      dbMetrics.queryTime < 100 ? 'default' : 'destructive'
                    }
                  >
                    {dbMetrics.queryTime < 100 ? 'Óptimo' : 'Lento'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Conexiones Activas
                  </CardTitle>
                  <Activity className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dbMetrics.connectionCount}
                  </div>
                  <Progress
                    value={(dbMetrics.connectionCount / 100) * 100}
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Cache Hit Ratio
                  </CardTitle>
                  <Zap className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(dbMetrics.cacheHitRatio * 100).toFixed(1)}%
                  </div>
                  <Badge
                    variant={
                      dbMetrics.cacheHitRatio > 0.8 ? 'default' : 'secondary'
                    }
                  >
                    {dbMetrics.cacheHitRatio > 0.8 ? 'Excelente' : 'Mejorable'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Queries Lentas
                  </CardTitle>
                  <AlertTriangle className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dbMetrics.slowQueries}
                  </div>
                  <Badge
                    variant={
                      dbMetrics.slowQueries === 0 ? 'default' : 'destructive'
                    }
                  >
                    {dbMetrics.slowQueries === 0 ? 'Perfecto' : 'Revisar'}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Server Tab */}
        <TabsContent value="server" className="space-y-4">
          {serverMetrics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Uso de CPU
                  </CardTitle>
                  <Activity className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {serverMetrics.cpuUsage}%
                  </div>
                  <Progress value={serverMetrics.cpuUsage} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Uso de Memoria
                  </CardTitle>
                  <Database className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {serverMetrics.memoryUsage}%
                  </div>
                  <Progress
                    value={serverMetrics.memoryUsage}
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Tiempo de Respuesta
                  </CardTitle>
                  <Clock className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {serverMetrics.responseTime}ms
                  </div>
                  <Badge
                    variant={
                      serverMetrics.responseTime < 200 ? 'default' : 'secondary'
                    }
                  >
                    {serverMetrics.responseTime < 200 ? 'Rápido' : 'Aceptable'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Conexiones Activas
                  </CardTitle>
                  <Activity className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {serverMetrics.activeConnections}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Tasa de Error
                  </CardTitle>
                  <AlertTriangle className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(serverMetrics.errorRate * 100).toFixed(2)}%
                  </div>
                  <Badge
                    variant={
                      serverMetrics.errorRate < 0.01 ? 'default' : 'destructive'
                    }
                  >
                    {serverMetrics.errorRate < 0.01 ? 'Bajo' : 'Alto'}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Bundle Tab */}
        <TabsContent value="bundle" className="space-y-4">
          {bundleMetrics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Tamaño Total
                  </CardTitle>
                  <Download className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatValue(bundleMetrics.totalSize, 'MB')}
                  </div>
                  <Badge
                    variant={
                      bundleMetrics.totalSize < 1024 * 1024
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {bundleMetrics.totalSize < 1024 * 1024
                      ? 'Óptimo'
                      : 'Grande'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    JavaScript
                  </CardTitle>
                  <Activity className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatValue(bundleMetrics.jsSize, 'MB')}
                  </div>
                  <Progress
                    value={
                      (bundleMetrics.jsSize / bundleMetrics.totalSize) * 100
                    }
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CSS</CardTitle>
                  <Activity className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatValue(bundleMetrics.cssSize, 'MB')}
                  </div>
                  <Progress
                    value={
                      (bundleMetrics.cssSize / bundleMetrics.totalSize) * 100
                    }
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Imágenes
                  </CardTitle>
                  <Activity className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatValue(bundleMetrics.imageSize, 'MB')}
                  </div>
                  <Progress
                    value={
                      (bundleMetrics.imageSize / bundleMetrics.totalSize) * 100
                    }
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Tiempo de Carga
                  </CardTitle>
                  <Clock className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {bundleMetrics.loadTime}s
                  </div>
                  <Badge
                    variant={
                      bundleMetrics.loadTime < 3 ? 'default' : 'secondary'
                    }
                  >
                    {bundleMetrics.loadTime < 3 ? 'Rápido' : 'Lento'}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
