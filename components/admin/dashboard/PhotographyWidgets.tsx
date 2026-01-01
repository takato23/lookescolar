'use client';

import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  Clock,
  Calendar,
  Users,
  MapPin,
  Upload,
  Zap,
  TrendingUp,
  Package,
  DollarSign,
  PlayCircle,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

type EventStatus = 'planning' | 'in_progress' | 'processing' | 'completed';

export interface EventSummary {
  id: string;
  name: string;
  location: string | null;
  date: string | null;
  totalStudents: number;
  photosUploaded: number;
  expectedPhotos: number;
  status: EventStatus;
}

export interface QuickAccessSummary {
  lastEvent: string;
  lastEventDate: string | null;
  photosToProcess: number;
  pendingUploads: number;
  recentActivity: string;
}

export interface PhotoManagementSummary {
  totalPhotos: number;
  processedToday: number;
  pendingProcessing: number;
  publishedGalleries: number;
  lastUploadAt: string | null;
}

export interface OrdersSummary {
  newOrders: number;
  pendingDelivery: number;
  totalRevenueCents: number;
  todayOrders: number;
}

export interface BusinessMetricsSummary {
  monthlyRevenueCents: number;
  activeClients: number;
  completionRate: number;
  avgOrderValueCents: number;
}

function formatEventDate(date: string | null) {
  if (!date) return 'Sin fecha registrada';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return 'Sin fecha registrada';
  }
  return parsed.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

function getStatusColor(status: EventStatus) {
  switch (status) {
    case 'planning':
      return 'bg-blue-500/10 text-blue-700 border-blue-200';
    case 'in_progress':
      return 'bg-primary-500/10 text-primary-700 border-primary-200';
    case 'processing':
      return 'bg-purple-500/10 text-purple-700 border-purple-200';
    case 'completed':
      return 'bg-green-500/10 text-green-700 border-green-200';
    default:
      return 'bg-gray-500/10 text-foreground border-border';
  }
}

function getStatusIcon(status: EventStatus) {
  switch (status) {
    case 'planning':
      return <Calendar className="h-4 w-4" />;
    case 'in_progress':
      return <PlayCircle className="h-4 w-4" />;
    case 'processing':
      return <Upload className="h-4 w-4" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getStatusText(status: EventStatus) {
  switch (status) {
    case 'planning':
      return 'Planificando';
    case 'in_progress':
      return 'En Progreso';
    case 'processing':
      return 'Procesando';
    case 'completed':
      return 'Completado';
    default:
      return 'Desconocido';
  }
}

export function EventProgressWidget({ events }: { events: EventSummary[] }) {
  const activeEvents = events ?? [];

  return (
    <Card variant="glass-ios26" className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Eventos Activos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeEvents.map((event) => {
            const progress =
              event.expectedPhotos > 0
                ? Math.min(
                    100,
                    (event.photosUploaded / event.expectedPhotos) * 100
                  )
                : 0;

            return (
              <div
                key={event.id}
                className="rounded-lg border bg-white/5 p-4 backdrop-blur-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-medium">{event.name}</h4>
                  <Badge
                    variant="secondary"
                    className={`${getStatusColor(event.status)} flex items-center gap-1`}
                  >
                    {getStatusIcon(event.status)}
                    {getStatusText(event.status)}
                  </Badge>
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.location || 'Sin ubicación'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatEventDate(event.date)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {event.totalStudents.toLocaleString('es-AR')} estudiantes
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      Fotos: {event.photosUploaded.toLocaleString('es-AR')} /
                      {event.expectedPhotos.toLocaleString('es-AR')}
                    </span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </div>
            );
          })}
          {activeEvents.length === 0 && (
            <div className="py-8 text-center text-gray-600 dark:text-gray-400">
              <Camera className="mx-auto mb-2 h-8 w-8" />
              <p>No hay eventos activos</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function QuickAccessWidget({ data }: { data: QuickAccessSummary }) {
  return (
    <Card variant="glass-ios26" className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Accesos Rápidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Último Evento</span>
            </div>
            <p className="text-sm font-semibold">{data.lastEvent}</p>
            <p className="text-xs text-muted-foreground">
              {formatEventDate(data.lastEventDate)}
            </p>
            <Button variant="ghost" size="sm" className="mt-2 w-full">
              Continuar trabajando
            </Button>
          </div>

          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2">
              <Camera className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Fotos pendientes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-purple-600">
                {data.photosToProcess.toLocaleString('es-AR')}
              </span>
              <Button variant="ghost" size="sm">
                Procesar
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2">
              <Upload className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Carga automática</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {data.pendingUploads.toLocaleString('es-AR')} fotos
              </span>
              <Button variant="ghost" size="sm">
                Ver detalles
              </Button>
            </div>
          </div>

          <div className="text-center text-xs text-gray-600 dark:text-gray-400">
            {data.recentActivity}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OrdersSummaryWidget({ summary }: { summary: OrdersSummary }) {
  return (
    <Card variant="glass-ios26" className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Resumen de Órdenes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2">
              <Package className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Nuevas órdenes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">
                {summary.newOrders.toLocaleString('es-AR')}
              </span>
              <Badge
                variant="secondary"
                className="bg-green-500/10 text-green-700"
              >
                Últimas 24h
              </Badge>
            </div>
          </div>

          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-medium">Pendientes de entrega</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-primary">
                {summary.pendingDelivery.toLocaleString('es-AR')}
              </span>
              <Button variant="ghost" size="sm">
                Gestionar
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Ingresos confirmados</span>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(summary.totalRevenueCents / 100)}
              </span>
              <p className="text-xs text-muted-foreground">
                Órdenes completadas:{' '}
                {summary.todayOrders.toLocaleString('es-AR')}
              </p>
            </div>
          </div>

          <Button variant="glass-ios26" className="w-full">
            Ver todas las órdenes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PhotoManagementWidget({
  summary,
}: {
  summary: PhotoManagementSummary;
}) {
  return (
    <Card variant="glass-ios26" className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Gestión de Fotos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-lg border bg-white/5 p-3 text-center backdrop-blur-sm">
            <div className="text-2xl font-bold text-primary">
              {summary.totalPhotos.toLocaleString('es-AR')}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total de fotos
            </div>
          </div>

          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm">Procesadas hoy</span>
              <span className="text-lg font-bold text-green-600">
                {summary.processedToday.toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm">Pendientes</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">
                  {summary.pendingProcessing.toLocaleString('es-AR')}
                </span>
                <Button variant="ghost" size="sm">
                  Procesar
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm">Galerías activas</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {summary.publishedGalleries.toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          <div className="text-center text-xs text-gray-600 dark:text-gray-400">
            Última carga: {formatRelativeTime(summary.lastUploadAt)}
          </div>

          <Button variant="glass-ios26" className="w-full">
            Gestionar fotos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function BusinessMetricsWidget({
  metrics,
}: {
  metrics: BusinessMetricsSummary;
}) {
  const completion = Math.min(100, Math.max(0, metrics.completionRate));
  const avgOrderValue = metrics.avgOrderValueCents / 100;

  return (
    <Card variant="glass-ios26" className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Métricas del Negocio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(metrics.monthlyRevenueCents / 100)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Ingresos del mes
            </div>
            <Badge
              variant="secondary"
              className="mt-2 bg-green-500/10 text-green-700"
            >
              Datos actualizados
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Clientes activos</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {metrics.activeClients.toLocaleString('es-AR')}
                </span>
                <div className="h-2 w-12 rounded-full bg-blue-500/10">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${Math.min(100, (metrics.activeClients / 200) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Tasa de completado</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-emerald-600">
                  {completion.toLocaleString('es-AR')}%
                </span>
                <div className="h-2 w-12 rounded-full bg-emerald-500/10">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Valor promedio</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-purple-600">
                  {formatCurrency(avgOrderValue)}
                </span>
                <div className="h-2 w-12 rounded-full bg-purple-500/10">
                  <div
                    className="h-full rounded-full bg-purple-500"
                    style={{
                      width: `${Math.min(100, (avgOrderValue / 25) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center text-xs text-gray-600 dark:text-gray-400">
            Actualizado con datos en vivo
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
