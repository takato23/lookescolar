'use client';

/**
 * Storage Optimization Dashboard
 * Shows storage usage metrics and optimization recommendations
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  Users,
  Image,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

// Types
interface StorageMetrics {
  photosCount: number;
  estimatedStorageUsed: string;
  percentageOfFreeTier: number;
  lastUpdated: string;
}

interface ProjectAnalysis {
  totalPhotos: number;
  estimatedStorageGB: number;
  fitsInFreeTier: boolean;
  recommendations: string[];
}

interface OptimizationMetrics {
  targetSizeKB: number;
  maxDimension: number;
  estimatedPhotosForFreeTier: number;
}

export default function StorageOptimizationDashboard() {
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demonstration
  const projectAnalysis: ProjectAnalysis = {
    totalPhotos: 15000,
    estimatedStorageGB: 0.75,
    fitsInFreeTier: true,
    recommendations: [
      'Consider implementing photo compression for better storage efficiency',
      'Enable automatic cleanup of duplicate photos',
      'Set up retention policies for old photos',
    ],
  };

  const optimizationMetrics: OptimizationMetrics = {
    targetSizeKB: 150,
    maxDimension: 1920,
    estimatedPhotosForFreeTier: 6826,
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from an API
      // const response = await fetch('/api/admin/metrics/storage');
      // const data = await response.json();

      // Mock data
      const data: StorageMetrics = {
        photosCount: 12500,
        estimatedStorageUsed: '750 MB',
        percentageOfFreeTier: 75,
        lastUpdated: new Date().toISOString(),
      };

      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage < 70) return 'bg-green-500';
    if (percentage < 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage < 90)
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <AlertTriangle className="h-5 w-5 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Estado del Almacenamiento Supabase
          </CardTitle>
          <CardDescription>
            Monitoreo del uso de almacenamiento para el plan gratuito (1GB
            límite)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-600">
              Error cargando métricas: {error}
              <button
                onClick={fetchMetrics}
                className="ml-4 text-blue-600 dark:text-blue-400 underline"
              >
                Reintentar
              </button>
            </div>
          ) : metrics ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(metrics.percentageOfFreeTier)}
                  <span className="font-medium">
                    {metrics.estimatedStorageUsed}
                  </span>
                  <span className="text-gray-500">de 1GB</span>
                </div>
                <Badge
                  variant={
                    metrics.percentageOfFreeTier < 90
                      ? 'default'
                      : 'destructive'
                  }
                >
                  {metrics.percentageOfFreeTier}% usado
                </Badge>
              </div>

              <Progress
                value={Math.min(metrics.percentageOfFreeTier, 100)}
                className="h-3"
              />

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <div className="text-2xl font-bold">
                    {metrics.photosCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Fotos almacenadas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {Math.floor(
                      optimizationMetrics.estimatedPhotosForFreeTier -
                        metrics.photosCount
                    ).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    Fotos restantes disponibles
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Project Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Análisis del Proyecto
          </CardTitle>
          <CardDescription>
            Evaluación para 1,000 estudiantes × 20 fotos cada uno
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {projectAnalysis.totalPhotos.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total de fotos</div>
              </div>

              <div className="rounded-lg bg-muted p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {projectAnalysis.estimatedStorageGB} GB
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Almacenamiento estimado
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {optimizationMetrics.targetSizeKB} KB
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Tamaño objetivo por foto
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {optimizationMetrics.maxDimension}px
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Dimensión máxima</div>
              </div>
            </div>

            <div
              className="flex items-center gap-2 rounded-lg p-4"
              style={{
                backgroundColor: projectAnalysis.fitsInFreeTier
                  ? '#f0f9ff'
                  : '#fef2f2',
              }}
            >
              {projectAnalysis.fitsInFreeTier ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span
                className={
                  projectAnalysis.fitsInFreeTier
                    ? 'text-green-700'
                    : 'text-red-700'
                }
              >
                {projectAnalysis.fitsInFreeTier
                  ? '✅ El proyecto cabe en el plan gratuito de Supabase'
                  : '⚠️ El proyecto excede el plan gratuito de Supabase'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Configuración de Optimización
          </CardTitle>
          <CardDescription>
            Configuración actual para maximizar el uso del plan gratuito
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold text-green-700">
                  ✅ Optimizaciones Activas
                </h4>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Formato WebP (mejor compresión)</li>
                  <li>• Calidad reducida a 50% (vs 72% estándar)</li>
                  <li>
                    • Dimensiones máximas: {optimizationMetrics.maxDimension}px
                  </li>
                  <li>• Watermark integrado</li>
                  <li>• Sin almacenamiento de originales</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="font-semibold text-blue-700 dark:text-blue-300">
                  📊 Métricas de Rendimiento
                </h4>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>
                    • Objetivo: {optimizationMetrics.targetSizeKB}KB por foto
                  </li>
                  <li>
                    • Capacidad teórica:{' '}
                    {optimizationMetrics.estimatedPhotosForFreeTier.toLocaleString()}{' '}
                    fotos
                  </li>
                  <li>• Compresión progresiva automática</li>
                  <li>• Monitoreo en tiempo real</li>
                </ul>
              </div>
            </div>

            {projectAnalysis.recommendations.length > 0 && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <h4 className="mb-2 font-semibold text-yellow-700">
                  💡 Recomendaciones
                </h4>
                <ul className="space-y-1 text-sm text-yellow-700">
                  {projectAnalysis.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
