'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  Monitor,
  Network,
  Server,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Wifi,
  Timer,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PerformanceMetrics {
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
    loadAverage: number[];
  };
  database: {
    connectionCount: number;
    queryTime: number;
    cacheHitRate: number;
    activeQueries: number;
  };
  storage: {
    totalSize: number;
    usedSize: number;
    freeSize: number;
    uploadSpeed: number;
    downloadSpeed: number;
  };
  application: {
    responseTime: number;
    errorRate: number;
    requestsPerMinute: number;
    activeUsers: number;
    sessionCount: number;
  };
  network: {
    latency: number;
    bandwidth: number;
    packetLoss: number;
    connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  resolved?: boolean;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const intervalRef = useRef<NodeJS.Timeout>();

  // Mock data generation for demo
  const generateMockMetrics = (): PerformanceMetrics => ({
    system: {
      cpuUsage: Math.random() * 100,
      memoryUsage: 60 + Math.random() * 30,
      diskUsage: 45 + Math.random() * 20,
      uptime: 86400 * 7 + Math.random() * 86400, // ~7 days
      loadAverage: [1.2, 1.5, 1.8],
    },
    database: {
      connectionCount: Math.floor(10 + Math.random() * 40),
      queryTime: 50 + Math.random() * 100,
      cacheHitRate: 85 + Math.random() * 10,
      activeQueries: Math.floor(Math.random() * 10),
    },
    storage: {
      totalSize: 5 * 1024 * 1024 * 1024, // 5GB
      usedSize: 2.5 * 1024 * 1024 * 1024 + Math.random() * 1024 * 1024 * 1024,
      freeSize: 2.5 * 1024 * 1024 * 1024,
      uploadSpeed: 10 + Math.random() * 20, // MB/s
      downloadSpeed: 15 + Math.random() * 25, // MB/s
    },
    application: {
      responseTime: 100 + Math.random() * 200,
      errorRate: Math.random() * 2,
      requestsPerMinute: 50 + Math.random() * 100,
      activeUsers: Math.floor(5 + Math.random() * 25),
      sessionCount: Math.floor(10 + Math.random() * 50),
    },
    network: {
      latency: 20 + Math.random() * 80,
      bandwidth: 100 + Math.random() * 900, // Mbps
      packetLoss: Math.random() * 0.1,
      connectionQuality: ['excellent', 'good', 'fair', 'poor'][
        Math.floor(Math.random() * 4)
      ] as any,
    },
  });

  // Check for alerts based on metrics
  const checkAlerts = (newMetrics: PerformanceMetrics) => {
    const newAlerts: Alert[] = [];

    // CPU usage alert
    if (newMetrics.system.cpuUsage > 80) {
      newAlerts.push({
        id: 'cpu-high',
        type: 'warning',
        title: 'Alto uso de CPU',
        message: `Uso de CPU: ${newMetrics.system.cpuUsage.toFixed(1)}%`,
        timestamp: new Date(),
      });
    }

    // Memory usage alert
    if (newMetrics.system.memoryUsage > 85) {
      newAlerts.push({
        id: 'memory-high',
        type: 'warning',
        title: 'Alto uso de memoria',
        message: `Uso de memoria: ${newMetrics.system.memoryUsage.toFixed(1)}%`,
        timestamp: new Date(),
      });
    }

    // Storage alert
    const storageUsagePercent =
      (newMetrics.storage.usedSize / newMetrics.storage.totalSize) * 100;
    if (storageUsagePercent > 80) {
      newAlerts.push({
        id: 'storage-low',
        type: storageUsagePercent > 90 ? 'error' : 'warning',
        title: 'Espacio de almacenamiento bajo',
        message: `Uso: ${storageUsagePercent.toFixed(1)}% del espacio total`,
        timestamp: new Date(),
      });
    }

    // Response time alert
    if (newMetrics.application.responseTime > 1000) {
      newAlerts.push({
        id: 'response-slow',
        type: 'warning',
        title: 'Respuesta lenta',
        message: `Tiempo de respuesta: ${newMetrics.application.responseTime.toFixed(0)}ms`,
        timestamp: new Date(),
      });
    }

    // Error rate alert
    if (newMetrics.application.errorRate > 1) {
      newAlerts.push({
        id: 'error-rate-high',
        type: 'error',
        title: 'Alta tasa de errores',
        message: `Tasa de errores: ${newMetrics.application.errorRate.toFixed(2)}%`,
        timestamp: new Date(),
      });
    }

    // Update alerts, avoiding duplicates
    setAlerts((prev) => {
      const existingIds = prev.map((a) => a.id);
      const uniqueNewAlerts = newAlerts.filter(
        (a) => !existingIds.includes(a.id)
      );
      return [...prev, ...uniqueNewAlerts].slice(-10); // Keep last 10 alerts
    });
  };

  useEffect(() => {
    if (isMonitoring) {
      const fetchMetrics = () => {
        // In a real application, this would fetch from an API
        const newMetrics = generateMockMetrics();
        setMetrics(newMetrics);
        checkAlerts(newMetrics);
      };

      fetchMetrics(); // Initial fetch
      intervalRef.current = setInterval(fetchMetrics, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isMonitoring, refreshInterval]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (
    value: number,
    thresholds: { good: number; warning: number }
  ) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (
    value: number,
    thresholds: { good: number; warning: number }
  ) => {
    if (value <= thresholds.good)
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (value <= thresholds.warning)
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const resolveAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, resolved: true } : alert
      )
    );
  };

  const clearResolvedAlerts = () => {
    setAlerts((prev) => prev.filter((alert) => !alert.resolved));
  };

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
          <p className="text-muted-foreground">
            Cargando métricas del sistema...
          </p>
        </CardContent>
      </Card>
    );
  }

  const storageUsagePercent =
    (metrics.storage.usedSize / metrics.storage.totalSize) * 100;

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Monitor de Performance
              </CardTitle>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-2 w-2 animate-pulse rounded-full',
                    isMonitoring ? 'bg-green-500' : 'bg-gray-400'
                  )}
                />
                <span className="text-muted-foreground text-sm">
                  {isMonitoring ? 'Monitoreando' : 'Pausado'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-background rounded-lg border px-3 py-1 text-sm"
              >
                <option value={1000}>1s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
              </select>

              <Button
                variant={isMonitoring ? 'outline' : 'default'}
                size="sm"
                onClick={() => setIsMonitoring(!isMonitoring)}
              >
                {isMonitoring ? 'Pausar' : 'Iniciar'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alerts */}
      {alerts.filter((a) => !a.resolved).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Alertas Activas ({alerts.filter((a) => !a.resolved).length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={clearResolvedAlerts}>
                Limpiar resueltas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts
                .filter((a) => !a.resolved)
                .slice(-5)
                .map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-3',
                      alert.type === 'error' && 'border-red-200 bg-red-50',
                      alert.type === 'warning' &&
                        'border-yellow-200 bg-yellow-50',
                      alert.type === 'info' && 'border-blue-200 bg-blue-50'
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {alert.type === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      {alert.type === 'warning' && (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      )}
                      {alert.type === 'info' && (
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      )}
                    </div>

                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{alert.title}</h4>
                      <p className="text-muted-foreground text-sm">
                        {alert.message}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolver
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* CPU Usage */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <span className="font-medium">CPU</span>
              </div>
              {getStatusIcon(metrics.system.cpuUsage, {
                good: 50,
                warning: 80,
              })}
            </div>

            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>Uso</span>
                  <span
                    className={getStatusColor(metrics.system.cpuUsage, {
                      good: 50,
                      warning: 80,
                    })}
                  >
                    {metrics.system.cpuUsage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all duration-500',
                      metrics.system.cpuUsage <= 50
                        ? 'bg-green-500'
                        : metrics.system.cpuUsage <= 80
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    )}
                    style={{
                      width: `${Math.min(metrics.system.cpuUsage, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="text-muted-foreground text-xs">
                Load:{' '}
                {metrics.system.loadAverage.map((l) => l.toFixed(2)).join(', ')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-600" />
                <span className="font-medium">Memoria</span>
              </div>
              {getStatusIcon(metrics.system.memoryUsage, {
                good: 70,
                warning: 85,
              })}
            </div>

            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>Uso</span>
                  <span
                    className={getStatusColor(metrics.system.memoryUsage, {
                      good: 70,
                      warning: 85,
                    })}
                  >
                    {metrics.system.memoryUsage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all duration-500',
                      metrics.system.memoryUsage <= 70
                        ? 'bg-green-500'
                        : metrics.system.memoryUsage <= 85
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    )}
                    style={{
                      width: `${Math.min(metrics.system.memoryUsage, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-purple-600" />
                <span className="font-medium">Storage</span>
              </div>
              {getStatusIcon(storageUsagePercent, { good: 60, warning: 80 })}
            </div>

            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>Uso</span>
                  <span
                    className={getStatusColor(storageUsagePercent, {
                      good: 60,
                      warning: 80,
                    })}
                  >
                    {storageUsagePercent.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all duration-500',
                      storageUsagePercent <= 60
                        ? 'bg-green-500'
                        : storageUsagePercent <= 80
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    )}
                    style={{ width: `${Math.min(storageUsagePercent, 100)}%` }}
                  />
                </div>
              </div>

              <div className="text-muted-foreground text-xs">
                {formatBytes(metrics.storage.usedSize)} /{' '}
                {formatBytes(metrics.storage.totalSize)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network Status */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5 text-orange-600" />
                <span className="font-medium">Red</span>
              </div>
              {getStatusIcon(metrics.network.latency, {
                good: 50,
                warning: 100,
              })}
            </div>

            <div className="space-y-3">
              <div className="text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span>Latencia</span>
                  <span
                    className={getStatusColor(metrics.network.latency, {
                      good: 50,
                      warning: 100,
                    })}
                  >
                    {metrics.network.latency.toFixed(0)}ms
                  </span>
                </div>
              </div>

              <div className="text-muted-foreground text-xs">
                <div className="flex items-center justify-between">
                  <span>Calidad:</span>
                  <span
                    className={cn(
                      'capitalize',
                      metrics.network.connectionQuality === 'excellent' &&
                        'text-green-600',
                      metrics.network.connectionQuality === 'good' &&
                        'text-blue-600',
                      metrics.network.connectionQuality === 'fair' &&
                        'text-yellow-600',
                      metrics.network.connectionQuality === 'poor' &&
                        'text-red-600'
                    )}
                  >
                    {metrics.network.connectionQuality}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>Ancho de banda:</span>
                  <span>{metrics.network.bandwidth.toFixed(0)} Mbps</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Application Metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Métricas de Aplicación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-muted-foreground mb-1 text-sm">
                  Tiempo de Respuesta
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-lg font-semibold',
                      getStatusColor(metrics.application.responseTime, {
                        good: 200,
                        warning: 500,
                      })
                    )}
                  >
                    {metrics.application.responseTime.toFixed(0)}ms
                  </span>
                  {getStatusIcon(metrics.application.responseTime, {
                    good: 200,
                    warning: 500,
                  })}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground mb-1 text-sm">
                  Tasa de Errores
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-lg font-semibold',
                      getStatusColor(metrics.application.errorRate, {
                        good: 0.5,
                        warning: 1,
                      })
                    )}
                  >
                    {metrics.application.errorRate.toFixed(2)}%
                  </span>
                  {getStatusIcon(metrics.application.errorRate, {
                    good: 0.5,
                    warning: 1,
                  })}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground mb-1 text-sm">
                  Requests/min
                </div>
                <div className="text-foreground text-lg font-semibold">
                  {metrics.application.requestsPerMinute.toFixed(0)}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground mb-1 text-sm">
                  Usuarios Activos
                </div>
                <div className="text-foreground text-lg font-semibold">
                  {metrics.application.activeUsers}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-muted-foreground mb-1 text-sm">
                Uptime del Sistema
              </div>
              <div className="text-lg font-semibold text-green-600">
                {formatUptime(metrics.system.uptime)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Base de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-muted-foreground mb-1 text-sm">
                  Conexiones
                </div>
                <div className="text-foreground text-lg font-semibold">
                  {metrics.database.connectionCount}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground mb-1 text-sm">
                  Queries Activas
                </div>
                <div className="text-foreground text-lg font-semibold">
                  {metrics.database.activeQueries}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground mb-1 text-sm">
                  Tiempo de Query
                </div>
                <div className="text-lg font-semibold text-blue-600">
                  {metrics.database.queryTime.toFixed(0)}ms
                </div>
              </div>

              <div>
                <div className="text-muted-foreground mb-1 text-sm">
                  Cache Hit Rate
                </div>
                <div className="text-lg font-semibold text-green-600">
                  {metrics.database.cacheHitRate.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-muted-foreground mb-2 text-sm">
                Velocidades de Transfer
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <TrendingUp className="mr-1 inline h-4 w-4 text-blue-600" />
                  Upload: {metrics.storage.uploadSpeed.toFixed(1)} MB/s
                </div>
                <div>
                  <TrendingDown className="mr-1 inline h-4 w-4 text-green-600" />
                  Download: {metrics.storage.downloadSpeed.toFixed(1)} MB/s
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
