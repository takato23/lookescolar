'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  HardDrive,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  Database,
  Zap,
  Image as ImageIcon,
  Camera,
  School,
  Calendar,
  Target,
  Gauge,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StorageStats {
  totalPhotos: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  averageSizeKB: number;
  optimizedPhotos: number;
  compressionRatio: number;
  freetierUsagePercent: number;
  estimatedPhotosRemaining: number;
  monthlyUploadTrend: number;
  lastUpdated: string;
}

interface MonthlyStats {
  month: string;
  photosUploaded: number;
  sizeUploadedMB: number;
  averageOptimization: number;
}

interface ProjectionData {
  currentTrend: number;
  projectedMonthlyPhotos: number;
  projectedMonthlySizeMB: number;
  monthsUntilFull: number;
  recommendedActions: string[];
}

interface StorageOptimizationMonitorProps {
  eventId?: string;
  className?: string;
}

const FREE_TIER_LIMIT_GB = 1;
const FREE_TIER_LIMIT_BYTES = FREE_TIER_LIMIT_GB * 1024 * 1024 * 1024;
const TARGET_SIZE_KB = 35;
const ESTIMATED_MAX_PHOTOS = Math.floor(FREE_TIER_LIMIT_BYTES / (TARGET_SIZE_KB * 1024));

export function StorageOptimizationMonitor({
  eventId,
  className
}: StorageOptimizationMonitorProps) {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [projection, setProjection] = useState<ProjectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStorageStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const endpoint = eventId 
        ? `/api/admin/events/${eventId}/storage-stats`
        : '/api/admin/storage/stats';

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Failed to fetch storage stats');
      }

      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setMonthlyStats(data.monthlyStats || []);
        setProjection(data.projection || null);
        setLastRefresh(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch storage stats');
      }
    } catch (error) {
      console.error('Error fetching storage stats:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchStorageStats();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchStorageStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStorageStats]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('es-AR').format(num);
  };

  const getUsageStatus = (percent: number): {
    color: string;
    icon: React.ComponentType<any>;
    message: string;
  } => {
    if (percent >= 90) {
      return {
        color: 'text-red-600',
        icon: AlertTriangle,
        message: 'Crítico - Cerca del límite'
      };
    } else if (percent >= 75) {
      return {
        color: 'text-yellow-600',
        icon: Info,
        message: 'Advertencia - Uso alto'
      };
    } else if (percent >= 50) {
      return {
        color: 'text-blue-600',
        icon: TrendingUp,
        message: 'Normal - Uso moderado'
      };
    } else {
      return {
        color: 'text-green-600',
        icon: CheckCircle2,
        message: 'Óptimo - Uso bajo'
      };
    }
  };

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Cargando estadísticas de almacenamiento...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-full border-red-200', className)}>
        <CardContent className="flex items-center justify-between py-8">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            <span>Error: {error}</span>
          </div>
          <Button onClick={fetchStorageStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="text-center py-8 text-gray-500">
          No hay datos de almacenamiento disponibles
        </CardContent>
      </Card>
    );
  }

  const usageStatus = getUsageStatus(stats.freetierUsagePercent);
  const StatusIcon = usageStatus.icon;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Storage Overview */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              {eventId ? 'Almacenamiento del Evento' : 'Almacenamiento Global'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {lastRefresh.toLocaleTimeString()}
              </Badge>
              <Button onClick={fetchStorageStats} variant="ghost" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Usage Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon className={cn('h-5 w-5', usageStatus.color)} />
                <span className="font-medium">{usageStatus.message}</span>
              </div>
              <span className="text-sm text-gray-500">
                {stats.totalSizeMB.toFixed(1)} MB / {FREE_TIER_LIMIT_GB * 1024} MB
              </span>
            </div>
            
            <Progress 
              value={stats.freetierUsagePercent} 
              className="h-3"
              // Color based on usage level
            />
            
            <div className="text-center">
              <span className="text-2xl font-bold">
                {stats.freetierUsagePercent.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-600 ml-2">del plan gratuito utilizado</span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(stats.totalPhotos)}
              </div>
              <div className="text-xs text-blue-700 flex items-center justify-center gap-1">
                <ImageIcon className="h-3 w-3" />
                Total fotos
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.averageSizeKB.toFixed(0)} KB
              </div>
              <div className="text-xs text-green-700 flex items-center justify-center gap-1">
                <Zap className="h-3 w-3" />
                Tamaño promedio
              </div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.compressionRatio.toFixed(0)}%
              </div>
              <div className="text-xs text-purple-700 flex items-center justify-center gap-1">
                <Target className="h-3 w-3" />
                Compresión
              </div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {formatNumber(stats.estimatedPhotosRemaining)}
              </div>
              <div className="text-xs text-orange-700 flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Fotos restantes
              </div>
            </div>
          </div>

          {/* Optimization Status */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                <Gauge className="h-4 w-4" />
                Estado de Optimización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Fotos optimizadas:</span>
                <Badge variant="secondary">
                  {stats.optimizedPhotos} / {stats.totalPhotos}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Ahorro de espacio:</span>
                <span className="font-medium text-green-600">
                  {((1 - stats.compressionRatio / 100) * 100).toFixed(0)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Objetivo por foto:</span>
                <span className="font-medium">{TARGET_SIZE_KB} KB</span>
              </div>
              
              <div className="text-xs text-green-600 bg-white p-2 rounded border">
                💡 El optimizador está funcionando correctamente. 
                Todas las fotos se comprimen automáticamente con watermarks.
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      {monthlyStats.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendencias Mensuales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyStats.slice(-6).map((month, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{month.month}</div>
                    <div className="text-sm text-gray-600">
                      {formatNumber(month.photosUploaded)} fotos • {month.sizeUploadedMB.toFixed(1)} MB
                    </div>
                  </div>
                  <Badge variant="outline">
                    {month.averageOptimization.toFixed(0)}% optimización
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projections & Recommendations */}
      {projection && (
        <Card className="border-blue-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Database className="h-5 w-5" />
              Proyecciones y Recomendaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {formatNumber(projection.projectedMonthlyPhotos)}
                </div>
                <div className="text-xs text-blue-700">Fotos/mes proyectadas</div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {projection.projectedMonthlySizeMB.toFixed(1)} MB
                </div>
                <div className="text-xs text-blue-700">Crecimiento/mes</div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {projection.monthsUntilFull > 12 ? '12+' : projection.monthsUntilFull.toFixed(0)}
                </div>
                <div className="text-xs text-blue-700">Meses restantes</div>
              </div>
            </div>

            {projection.recommendedActions.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Recomendaciones
                </h4>
                <ul className="space-y-1 text-sm text-yellow-700">
                  {projection.recommendedActions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-yellow-500">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Technical Details */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <School className="h-4 w-4" />
            Detalles Técnicos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium mb-2">Configuración de Optimización</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• Objetivo: {TARGET_SIZE_KB} KB por foto</li>
                <li>• Formato: WebP optimizado</li>
                <li>• Watermarks: "LOOK ESCOLAR"</li>
                <li>• Originales: No almacenados</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium mb-2">Límites del Plan Gratuito</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• Almacenamiento: {FREE_TIER_LIMIT_GB} GB total</li>
                <li>• Capacidad estimada: ~{formatNumber(ESTIMATED_MAX_PHOTOS)} fotos</li>
                <li>• Transferencia: 2 GB/mes</li>
                <li>• Base de datos: 500 MB</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}