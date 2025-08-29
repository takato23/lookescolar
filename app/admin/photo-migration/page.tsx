'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3Icon,
  UsersIcon,
  FolderIcon,
  ImageIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
} from 'lucide-react';
import {
  currentMigrationStatus,
  PhotoManagementPreferences,
  photoManagementConfig,
} from '@/lib/photo-management-config';
import PhotoSystemComparison from '@/components/admin/PhotoSystemComparison';

interface UsageStats {
  totalUsers: number;
  legacyUsers: number;
  advancedUsers: number;
  eventsUsingAdvanced: number;
  totalEvents: number;
  photosInAdvancedLibrary: number;
  totalPhotos: number;
}

export default function PhotoMigrationDashboard() {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data - in real implementation, this would come from analytics
  useEffect(() => {
    const mockStats: UsageStats = {
      totalUsers: 45,
      legacyUsers: 28,
      advancedUsers: 17,
      eventsUsingAdvanced: 12,
      totalEvents: 35,
      photosInAdvancedLibrary: 2400,
      totalPhotos: 15600,
    };

    setTimeout(() => {
      setUsageStats(mockStats);
      setLoading(false);
    }, 1000);
  }, []);

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'planning':
        return 'bg-gray-100 text-gray-800';
      case 'soft-launch':
        return 'bg-blue-100 text-blue-800';
      case 'gradual-rollout':
        return 'bg-yellow-100 text-yellow-800';
      case 'full-migration':
        return 'bg-green-100 text-green-800';
      case 'legacy-deprecation':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-1/3 rounded bg-gray-200"></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 rounded bg-gray-200"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard de Migración - Gestión de Fotos
            </h1>
            <p className="mt-2 text-gray-600">
              Monitoreo del proceso de unificación entre sistema tradicional y
              biblioteca avanzada
            </p>
          </div>
          <Badge className={getPhaseColor(currentMigrationStatus.phase)}>
            {currentMigrationStatus.phase.replace('-', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Migration Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              Estado de Migración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progreso General</span>
              <span className="text-sm text-gray-600">
                {currentMigrationStatus.currentProgress}%
              </span>
            </div>
            <Progress
              value={currentMigrationStatus.currentProgress}
              className="w-full"
            />

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-900">
                  Bloqueadores Actuales
                </h4>
                <ul className="space-y-1">
                  {currentMigrationStatus.blockers.map((blocker, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <AlertTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                      {blocker}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-900">
                  Próximos Pasos
                </h4>
                <ul className="space-y-1">
                  {currentMigrationStatus.nextSteps.map((step, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <ArrowRightIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Usuarios Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UsersIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {usageStats?.totalUsers}
                  </div>
                  <p className="text-xs text-gray-500">
                    {usageStats?.advancedUsers} usando biblioteca avanzada
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Eventos Migrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FolderIcon className="h-8 w-8 text-emerald-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {usageStats?.eventsUsingAdvanced}/{usageStats?.totalEvents}
                  </div>
                  <p className="text-xs text-gray-500">
                    {Math.round(
                      ((usageStats?.eventsUsingAdvanced || 0) /
                        (usageStats?.totalEvents || 1)) *
                        100
                    )}
                    % migrados
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Fotos en Nueva Biblioteca
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {usageStats?.photosInAdvancedLibrary?.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500">
                    {Math.round(
                      ((usageStats?.photosInAdvancedLibrary || 0) /
                        (usageStats?.totalPhotos || 1)) *
                        100
                    )}
                    % del total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Adopción
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUpIcon className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {Math.round(
                      ((usageStats?.advancedUsers || 0) /
                        (usageStats?.totalUsers || 1)) *
                        100
                    )}
                    %
                  </div>
                  <p className="text-xs text-gray-500">
                    Usuarios usando nueva biblioteca
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3Icon className="h-5 w-5" />
              Comparación de Sistemas
            </CardTitle>
            <CardDescription>
              Análisis detallado de características entre sistema tradicional y
              biblioteca avanzada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PhotoSystemComparison currentSystem="legacy" />
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Migración</CardTitle>
            <CardDescription>
              Configuración actual del proceso de unificación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Biblioteca de Eventos Habilitada
                  </span>
                  <Badge
                    variant={
                      photoManagementConfig.enableEventLibrary
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {photoManagementConfig.enableEventLibrary ? 'Sí' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Enlaces Cruzados Activos
                  </span>
                  <Badge
                    variant={
                      photoManagementConfig.enableCrossLinking
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {photoManagementConfig.enableCrossLinking ? 'Sí' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Mostrar Notificaciones
                  </span>
                  <Badge
                    variant={
                      photoManagementConfig.showUnificationNotices
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {photoManagementConfig.showUnificationNotices ? 'Sí' : 'No'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Preferir Nueva Biblioteca
                  </span>
                  <Badge
                    variant={
                      photoManagementConfig.preferNewLibraryForEvents
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {photoManagementConfig.preferNewLibraryForEvents
                      ? 'Sí'
                      : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Fallback a Sistema Tradicional
                  </span>
                  <Badge
                    variant={
                      photoManagementConfig.allowLegacyFallback
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {photoManagementConfig.allowLegacyFallback ? 'Sí' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Tiempo de Notificación
                  </span>
                  <Badge variant="outline">
                    {photoManagementConfig.defaultNotificationDismissalTime}{' '}
                    días
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Cronograma de Migración</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Lanzamiento Suave</h4>
                  <p className="text-sm text-gray-600">
                    Sistema avanzado disponible para eventos específicos
                  </p>
                  <p className="text-xs text-gray-500">
                    Completado el {currentMigrationStatus.startDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <ClockIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Rollout Gradual (Actual)</h4>
                  <p className="text-sm text-gray-600">
                    Migración progresiva con feedback de usuarios
                  </p>
                  <p className="text-xs text-gray-500">
                    En progreso - {currentMigrationStatus.currentProgress}%
                    completado
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                  <ClockIcon className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Migración Completa</h4>
                  <p className="text-sm text-gray-600">
                    Todos los eventos usando biblioteca avanzada
                  </p>
                  <p className="text-xs text-gray-500">
                    Previsto para {currentMigrationStatus.targetCompletionDate}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
