/**
 * Operational Dashboard
 * Comprehensive monitoring and observability dashboard for production
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  // Activity,
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
  // TrendingDown,
  AlertCircle,
  Wifi,
  // Timer,
  // BarChart3,
  // PieChart,
  Eye,
  Download,
  Upload,
  // Users,
  // ShoppingCart,
  // Camera,
  FileText,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Types
interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
  lastCheck?: string;
  details?: Record<string, any>;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: HealthCheck[];
  uptime: number;
  version: string;
  alerts?: Alert[];
}

interface Alert {
  id: string;
  rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved?: string;
}

interface EgressMetrics {
  totalBytes: number;
  totalRequests: number;
  cacheHitRate: number;
  topOperations: Array<{
    operation: string;
    bytes: number;
    requests: number;
    percentage: number;
  }>;
  byDate: Array<{
    date: string;
    bytes: number;
    requests: number;
  }>;
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
}

export function OperationalDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [egressMetrics, setEgressMetrics] = useState<EgressMetrics | null>(
    null
  );
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch data
  const fetchData = async () => {
    try {
      const [healthRes, egressRes, cacheRes] = await Promise.allSettled([
        fetch('/api/health?detailed=true'),
        fetch('/api/admin/metrics/egress'),
        fetch('/api/admin/metrics/cache'),
      ]);

      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        const health = await healthRes.value.json();
        setSystemHealth(health);
      }

      if (egressRes.status === 'fulfilled' && egressRes.value.ok) {
        const egress = await egressRes.value.json();
        setEgressMetrics(egress);
      }

      if (cacheRes.status === 'fulfilled' && cacheRes.value.ok) {
        const cache = await cacheRes.value.json();
        setCacheStats(cache);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto refresh effect
  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, refreshInterval * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Utility functions
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'unhealthy':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
          <p className="text-gray-500 dark:text-gray-400">
            Cargando dashboard operacional...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Dashboard Operacional
              </CardTitle>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 animate-pulse rounded-full ${
                    systemHealth?.overall === 'healthy'
                      ? 'bg-green-500'
                      : systemHealth?.overall === 'degraded'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                />
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  Sistema {systemHealth?.overall || 'desconocido'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-background rounded-lg border px-3 py-1 text-sm"
              >
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
              </select>

              <Button
                variant={autoRefresh ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw
                  className={`mr-1 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`}
                />
                {autoRefresh ? 'Auto' : 'Manual'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
              >
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Estado General
                </p>
                <p
                  className={`text-2xl font-bold ${getStatusColor(systemHealth?.overall || 'unknown')}`}
                >
                  {systemHealth?.overall || 'Desconocido'}
                </p>
              </div>
              {getStatusIcon(systemHealth?.overall || 'unknown')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Uptime
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {systemHealth ? formatUptime(systemHealth.uptime) : '0m'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Cache Hit Rate
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {cacheStats ? `${cacheStats.hitRate.toFixed(1)}%` : '0%'}
                </p>
              </div>
              <Zap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Alertas Activas
                </p>
                <p
                  className={`text-2xl font-bold ${
                    systemHealth?.alerts && systemHealth.alerts.length > 0
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {systemHealth?.alerts?.length || 0}
                </p>
              </div>
              {systemHealth?.alerts && systemHealth.alerts.length > 0 ? (
                <AlertTriangle className="h-8 w-8 text-red-600" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {systemHealth?.alerts && systemHealth.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Alertas Activas ({systemHealth.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemHealth.alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    alert.severity === 'critical'
                      ? 'border-red-200 bg-red-50'
                      : alert.severity === 'high'
                        ? 'border-primary-200 bg-primary-50'
                        : alert.severity === 'medium'
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {alert.severity === 'critical' && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    {alert.severity === 'high' && (
                      <AlertTriangle className="h-4 w-4 text-primary-600" />
                    )}
                    {alert.severity === 'medium' && (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    {alert.severity === 'low' && (
                      <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{alert.message}</h4>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>

                  <div
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      alert.severity === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : alert.severity === 'high'
                          ? 'bg-primary-50 text-primary-800'
                          : alert.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {alert.severity.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Checks Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {systemHealth?.checks.map((check) => (
          <Card key={check.name}>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {check.name === 'database' && (
                    <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  )}
                  {check.name === 'storage' && (
                    <HardDrive className="h-5 w-5 text-purple-600" />
                  )}
                  {check.name === 'api_performance' && (
                    <Network className="h-5 w-5 text-green-600" />
                  )}
                  {check.name === 'memory' && (
                    <Server className="h-5 w-5 text-primary-600" />
                  )}
                  {check.name === 'cache' && (
                    <Zap className="h-5 w-5 text-yellow-600" />
                  )}
                  {check.name === 'egress_bandwidth' && (
                    <Wifi className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium capitalize">
                    {check.name.replace(/_/g, ' ')}
                  </span>
                </div>
                {getStatusIcon(check.status)}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Estado:</span>
                  <span
                    className={`font-medium ${getStatusColor(check.status)}`}
                  >
                    {check.status}
                  </span>
                </div>

                {check.latency && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Latencia:</span>
                    <span className="font-medium">
                      {check.latency.toFixed(0)}ms
                    </span>
                  </div>
                )}

                {check.details &&
                  Object.entries(check.details).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="font-medium">
                        {typeof value === 'number' && key.includes('Bytes')
                          ? formatBytes(value)
                          : typeof value === 'number' && key.includes('Percent')
                            ? `${value}%`
                            : String(value)}
                      </span>
                    </div>
                  ))}
              </div>

              {check.message && (
                <div className="mt-4 rounded bg-muted p-2 text-xs text-gray-500 dark:text-gray-400">
                  {check.message}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Egress Metrics */}
      {egressMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Métricas de Transferencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm">
                  Total Transferido
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatBytes(egressMetrics.totalBytes)}
                </p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm">
                  Total Requests
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {egressMetrics.totalRequests.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm">
                  Cache Hit Rate
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {egressMetrics.cacheHitRate.toFixed(1)}%
                </p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm">
                  Avg per Request
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatBytes(
                    egressMetrics.totalBytes / egressMetrics.totalRequests || 0
                  )}
                </p>
              </div>
            </div>

            {/* Top Operations */}
            <div className="space-y-3">
              <h4 className="font-medium">Top Operaciones</h4>
              {egressMetrics.topOperations.slice(0, 5).map((op) => (
                <div
                  key={op.operation}
                  className="flex items-center justify-between rounded bg-muted p-3"
                >
                  <div className="flex items-center gap-2">
                    {op.operation === 'photo_view' && (
                      <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                    {op.operation === 'photo_download' && (
                      <Download className="h-4 w-4 text-green-600" />
                    )}
                    {op.operation === 'qr_pdf' && (
                      <FileText className="h-4 w-4 text-purple-600" />
                    )}
                    {op.operation === 'admin_export' && (
                      <Upload className="h-4 w-4 text-primary-600" />
                    )}
                    <span className="font-medium capitalize">
                      {op.operation.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="font-medium">{formatBytes(op.bytes)}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-sm">
                      {op.requests} requests ({op.percentage.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm">Versión</p>
              <p className="font-medium">{systemHealth?.version || '1.0.0'}</p>
            </div>

            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm">
                Última Verificación
              </p>
              <p className="font-medium">
                {systemHealth
                  ? new Date(systemHealth.timestamp).toLocaleString()
                  : 'Nunca'}
              </p>
            </div>

            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm">
                Servicios Monitoreados
              </p>
              <p className="font-medium">{systemHealth?.checks.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
