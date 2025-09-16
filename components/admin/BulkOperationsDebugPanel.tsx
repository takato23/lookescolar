'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Zap,
  Bug,
  Server,
  Wifi,
} from 'lucide-react';

interface DebugInfo {
  timestamp: string;
  performance_monitor: {
    recent_stats: {
      totalOperations: number;
      successfulOperations: number;
      failedOperations: number;
      averageDuration: number;
      slowestOperation: number;
      operationsPerSecond: number;
    };
    health_report: {
      healthScore: number;
      recommendations: string[];
    };
  };
  database_health: {
    folders_total: number;
    folders_published: number;
    bulk_function_available: boolean;
    bulk_function_error?: string;
  };
  system_status: {
    memory_usage: {
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    uptime: number;
  };
}

interface BulkOperationsDebugPanelProps {
  className?: string;
  onClose?: () => void;
}

export function BulkOperationsDebugPanel({
  className = '',
  onClose,
}: BulkOperationsDebugPanelProps) {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchDebugInfo = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/debug/bulk-operations');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDebugInfo(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch debug info';
      setError(errorMessage);
      console.error('[DEBUG] Failed to fetch debug info:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const runTest = useCallback(
    async (testType: string) => {
      try {
        const response = await fetch('/api/admin/debug/bulk-operations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test_type: testType }),
        });

        const result = await response.json();
        console.log(`[DEBUG] Test ${testType} result:`, result);

        // Refresh debug info after test
        await fetchDebugInfo();
      } catch (err) {
        console.error(`[DEBUG] Test ${testType} failed:`, err);
      }
    },
    [fetchDebugInfo]
  );

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchDebugInfo, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDebugInfo]);

  // Initial load
  useEffect(() => {
    fetchDebugInfo();
  }, [fetchDebugInfo]);

  const formatMemory = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card className={`space-y-6 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-100 dark:bg-blue-950/30 p-2">
            <Bug className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              Panel de Debug - Operaciones Bulk
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Monitoreo en tiempo real del sistema
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'border-green-200 bg-green-50' : ''}
          >
            <Wifi
              className={`mr-1 h-4 w-4 ${autoRefresh ? 'text-green-600' : ''}`}
            />
            {autoRefresh ? 'Auto ON' : 'Auto OFF'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchDebugInfo}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Actualizar
          </Button>

          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && !debugInfo && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-500 dark:text-gray-400">Obteniendo información de debug...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <h4 className="font-medium text-red-800">
                Error al obtener información
              </h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Debug Information */}
      {debugInfo && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Performance Stats */}
          <Card className="p-4">
            <h4 className="mb-4 flex items-center gap-2 font-medium">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Estadísticas de Performance
            </h4>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Operaciones totales (última hora)
                </span>
                <Badge variant="outline">
                  {debugInfo.performance_monitor.recent_stats.totalOperations}
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Exitosas</span>
                <Badge className="bg-green-100 text-green-800">
                  {
                    debugInfo.performance_monitor.recent_stats
                      .successfulOperations
                  }
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Fallidas</span>
                <Badge
                  variant={
                    debugInfo.performance_monitor.recent_stats
                      .failedOperations > 0
                      ? 'destructive'
                      : 'outline'
                  }
                >
                  {debugInfo.performance_monitor.recent_stats.failedOperations}
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Tiempo promedio</span>
                <Badge variant="outline">
                  {debugInfo.performance_monitor.recent_stats.averageDuration}ms
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Ops/segundo</span>
                <Badge variant="outline">
                  {debugInfo.performance_monitor.recent_stats.operationsPerSecond.toFixed(
                    2
                  )}
                </Badge>
              </div>
            </div>

            {/* Health Score */}
            <div className="mt-4 border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Puntuación de Salud</span>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-16 rounded-full ${
                      debugInfo.performance_monitor.health_report.healthScore >
                      80
                        ? 'bg-green-500'
                        : debugInfo.performance_monitor.health_report
                              .healthScore > 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                  >
                    <div
                      className="h-2 rounded-full bg-white opacity-30"
                      style={{
                        width: `${100 - debugInfo.performance_monitor.health_report.healthScore}%`,
                      }}
                    />
                  </div>
                  <span className="font-semibold">
                    {debugInfo.performance_monitor.health_report.healthScore}
                    /100
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Database Health */}
          <Card className="p-4">
            <h4 className="mb-4 flex items-center gap-2 font-medium">
              <Database className="h-4 w-4 text-green-600" />
              Estado de la Base de Datos
            </h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total de carpetas</span>
                <Badge variant="outline">
                  {debugInfo.database_health.folders_total}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Carpetas publicadas
                </span>
                <Badge className="bg-blue-100 dark:bg-blue-950/30 text-blue-800">
                  {debugInfo.database_health.folders_published}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Función bulk disponible
                </span>
                <div className="flex items-center gap-1">
                  {debugInfo.database_health.bulk_function_available ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <Badge
                    variant={
                      debugInfo.database_health.bulk_function_available
                        ? 'default'
                        : 'destructive'
                    }
                  >
                    {debugInfo.database_health.bulk_function_available
                      ? 'Sí'
                      : 'No'}
                  </Badge>
                </div>
              </div>

              {debugInfo.database_health.bulk_function_error && (
                <div className="rounded bg-red-50 p-2 text-xs text-red-700">
                  Error: {debugInfo.database_health.bulk_function_error}
                </div>
              )}
            </div>
          </Card>

          {/* System Status */}
          <Card className="p-4">
            <h4 className="mb-4 flex items-center gap-2 font-medium">
              <Server className="h-4 w-4 text-purple-600" />
              Estado del Sistema
            </h4>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Memoria heap usada
                </span>
                <Badge variant="outline">
                  {formatMemory(debugInfo.system_status.memory_usage.heapUsed)}
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Memoria heap total
                </span>
                <Badge variant="outline">
                  {formatMemory(debugInfo.system_status.memory_usage.heapTotal)}
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Uptime del proceso
                </span>
                <Badge variant="outline">
                  {formatUptime(debugInfo.system_status.uptime)}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Test Actions */}
          <Card className="p-4">
            <h4 className="mb-4 flex items-center gap-2 font-medium">
              <Zap className="h-4 w-4 text-yellow-600" />
              Tests de Diagnóstico
            </h4>

            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => runTest('basic')}
                className="w-full justify-start"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Test Básico de Conectividad
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => runTest('bulk_function')}
                className="w-full justify-start"
              >
                <Database className="mr-2 h-4 w-4" />
                Test Función Bulk
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => runTest('folder_query')}
                className="w-full justify-start"
              >
                <Activity className="mr-2 h-4 w-4" />
                Test Consulta de Carpetas
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {debugInfo?.performance_monitor.health_report.recommendations.length >
        0 && (
        <Card className="border-yellow-200 bg-yellow-50 p-4">
          <h4 className="mb-3 flex items-center gap-2 font-medium text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            Recomendaciones
          </h4>
          <ul className="space-y-1">
            {debugInfo.performance_monitor.health_report.recommendations.map(
              (rec, index) => (
                <li key={index} className="text-sm text-yellow-700">
                  • {rec}
                </li>
              )
            )}
          </ul>
        </Card>
      )}

      {/* Timestamp */}
      {debugInfo && (
        <div className="flex items-center justify-center gap-1 text-center text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          Última actualización: {new Date(debugInfo.timestamp).toLocaleString()}
        </div>
      )}
    </Card>
  );
}
