'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from '@/components/ui/card';
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

interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  totalStudents: number;
  photosUploaded: number;
  expectedPhotos: number;
  status: 'planning' | 'in_progress' | 'processing' | 'completed';
}

interface BusinessMetrics {
  monthlyRevenue: number;
  activeClients: number;
  completionRate: number;
  avgOrderValue: number;
}

// Datos realistas para eventos activos
const mockEvents: Event[] = [
  {
    id: '1',
    name: 'Escuela Primaria San Juan',
    date: '2025-01-03',
    location: 'Aula 12',
    totalStudents: 180,
    photosUploaded: 178,
    expectedPhotos: 180,
    status: 'in_progress',
  },
  {
    id: '2',
    name: 'Jardín de Infantes Los Peques',
    date: '2025-01-04',
    location: 'Patio Principal',
    totalStudents: 95,
    photosUploaded: 95,
    expectedPhotos: 95,
    status: 'completed',
  },
];

// Datos de ejemplo para métricas de negocio
const mockBusinessData = {
  monthlyRevenue: 2850,
  activeClients: 156,
  completionRate: 94,
  avgOrderValue: 18.50,
};

export function EventProgressWidget() {
  const [activeEvents, setActiveEvents] = useState<Event[]>(mockEvents);

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'planning':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'in_progress':
        return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'processing':
        return 'bg-purple-500/10 text-purple-700 border-purple-200';
      case 'completed':
        return 'bg-green-500/10 text-green-700 border-green-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: Event['status']) => {
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
  };

  const getStatusText = (status: Event['status']) => {
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
  };

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
            const progress = (event.photosUploaded / event.expectedPhotos) * 100;
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
                <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {event.totalStudents} estudiantes
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Fotos: {event.photosUploaded}/{event.expectedPhotos}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </div>
            );
          })}
          {activeEvents.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <Camera className="mx-auto mb-2 h-8 w-8" />
              <p>No hay eventos activos</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function QuickAccessWidget() {
  const [quickAccessData, setQuickAccessData] = useState({
    lastEvent: 'Escuela Primaria San Juan',
    photosToProcess: 23,
    pendingUploads: 8,
    recentActivity: '2 familias accedieron a la galería',
  });

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
          {/* Último Evento */}
          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Último Evento</span>
            </div>
            <p className="text-sm">{quickAccessData.lastEvent}</p>
            <Button variant="ghost" size="sm" className="mt-2 w-full">
              Continuar Trabajando
            </Button>
          </div>

          {/* Fotos Pendientes */}
          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Fotos Pendientes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-purple-600">
                {quickAccessData.photosToProcess}
              </span>
              <Button variant="ghost" size="sm">
                Procesar
              </Button>
            </div>
          </div>

          {/* Carga Automática */}
          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Carga Automática</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{quickAccessData.pendingUploads} fotos</span>
              <Button variant="ghost" size="sm">
                Ver Detalles
              </Button>
            </div>
          </div>

          {/* Actividad Reciente */}
          <div className="text-center text-xs text-muted-foreground">
            {quickAccessData.recentActivity}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OrdersSummaryWidget() {
  const [ordersData, setOrdersData] = useState({
    newOrders: 5,
    pendingDelivery: 12,
    totalRevenue: 2850,
    todayOrders: 8,
  });

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
          {/* Nuevas Órdenes */}
          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Nuevas Órdenes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">
                {ordersData.newOrders}
              </span>
              <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                Hoy
              </Badge>
            </div>
          </div>

          {/* Pedidos Pendientes */}
          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Pendientes de Entrega</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-amber-600">
                {ordersData.pendingDelivery}
              </span>
              <Button variant="ghost" size="sm">
                Gestionar
              </Button>
            </div>
          </div>

          {/* Ingresos */}
          <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Ingresos del Mes</span>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-blue-600">
                ${ordersData.totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Acceso Rápido */}
          <Button variant="glass-ios26" className="w-full">
            Ver Todas las Órdenes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PhotoManagementWidget() {
  const [photoData, setPhotoData] = useState({
    totalPhotos: 3247,
    processedToday: 156,
    pendingProcessing: 23,
    publishedGalleries: 8,
    lastUpload: 'Hace 15 min',
  });

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
              {/* Total de Fotos */}
              <div className="rounded-lg border bg-white/5 p-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-primary">
                  {photoData.totalPhotos.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Total de fotos</div>
              </div>

              {/* Procesadas Hoy */}
              <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Procesadas hoy</span>
                  <span className="text-lg font-bold text-green-600">
                    {photoData.processedToday}
                  </span>
                </div>
              </div>

              {/* Pendientes de Procesar */}
              <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pendientes</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-amber-600">
                      {photoData.pendingProcessing}
                    </span>
                    <Button variant="ghost" size="sm">
                      Procesar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Galerías Publicadas */}
              <div className="rounded-lg border bg-white/5 p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Galerías activas</span>
                  <span className="text-lg font-bold text-blue-600">
                    {photoData.publishedGalleries}
                  </span>
                </div>
              </div>

              {/* Última Actividad */}
              <div className="text-center text-xs text-muted-foreground">
                Última carga: {photoData.lastUpload}
              </div>

              {/* Acceso Rápido */}
              <Button variant="glass-ios26" className="w-full">
                Gestionar Fotos
              </Button>
            </div>
          </CardContent>
        </Card>
  );
}

export function BusinessMetricsWidget() {
  const [businessData, setBusinessData] = useState({
    monthlyRevenue: 2850,
    activeClients: 156,
    completionRate: 94,
    avgOrderValue: 18.50,
  });



  return (
    <Card variant="glass-ios26" className="h-full">
      <CardHeader>
                  <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Métricas del Negocio
          </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Ingresos Mensuales */}
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              ${businessData.monthlyRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Ingresos del mes</div>
            <Badge 
              variant="secondary" 
              className="mt-2 bg-green-500/10 text-green-700"
            >
              +12% vs mes anterior
            </Badge>
          </div>

          {/* Métricas Clave */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Clientes Activos</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-600">
                  {businessData.activeClients}
                </span>
                <div className="h-2 w-12 rounded-full bg-blue-500/10">
                  <div 
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${(businessData.activeClients / 200) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Tasa de Completado</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-emerald-600">
                  {businessData.completionRate}%
                </span>
                <div className="h-2 w-12 rounded-full bg-emerald-500/10">
                  <div 
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${businessData.completionRate}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Valor Promedio</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-purple-600">
                  ${businessData.avgOrderValue}
                </span>
                <div className="h-2 w-12 rounded-full bg-purple-500/10">
                  <div 
                    className="h-full rounded-full bg-purple-500"
                    style={{ width: `${(businessData.avgOrderValue / 25) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            Actualizado hace 2 min
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
