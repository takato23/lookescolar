'use client';

import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  Clock,
  ArrowRight,
  Calendar,
  Users,
  DollarSign,
  Zap,
} from 'lucide-react';

interface MobileDashboardLayoutProps {
  stats: {
    activeEvents: number;
    totalPhotos: number;
    registeredFamilies: number;
    totalSales: number;
    todayUploads: number;
    todayOrders: number;
  };
  currentTime: Date;
}

export function MobileDashboardLayout({
  stats,
  currentTime,
}: MobileDashboardLayoutProps) {
  const quickActions = [
    {
      href: '/admin/events/new',
      icon: Calendar,
      title: 'Nuevo Evento',
      color: 'bg-blue-500',
    },
    {
      href: '/admin/photos',
      icon: Camera,
      title: 'Subir Fotos',
      color: 'bg-purple-500',
    },
    {
      href: '/admin/quick-flow',
      icon: Zap,
      title: 'Flujo Rápido',
      color: 'bg-pink-500',
    },
  ];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 lg:hidden">
      {/* Mobile Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Estudio</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {currentTime.toLocaleDateString('es-ES', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="rounded-lg bg-primary/10 px-3 py-1">
            <span className="text-sm font-medium">{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>

      {/* Quick Status Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card variant="glass-ios26" className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-xl font-bold">{stats.activeEvents}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Eventos</div>
            </div>
          </div>
        </Card>
        
        <Card variant="glass-ios26" className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-2">
              <Camera className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-xl font-bold">{stats.todayUploads}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Hoy</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions Mobile */}
      <Card variant="glass-ios26" className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.href}
                variant="glass-ios26"
                className="h-20 flex-col gap-2"
              >
                <a href={action.href} className="flex flex-col items-center gap-2">
                  <div className={`rounded-lg p-2 ${action.color}/10`}>
                    <action.icon className={`h-5 w-5 ${action.color.replace('bg-', 'text-')}`} />
                  </div>
                  <span className="text-xs">{action.title}</span>
                </a>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's Summary */}
      <Card variant="glass-ios26" className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Resumen de Hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Fotos subidas</span>
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-700">
                {stats.todayUploads}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pedidos nuevos</span>
              <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                {stats.todayOrders}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Total familias</span>
              <span className="font-medium">{stats.registeredFamilies}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Ventas totales</span>
              <span className="font-medium">
                ${(stats.totalSales / 100).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <Card variant="glass-ios26">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Navegación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-between"
            >
              <a href="/admin/events" className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4" />
                  <span>Ver todos los eventos</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-between"
            >
              <a href="/admin/orders" className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4" />
                  <span>Gestionar pedidos</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-between"
            >
              <a href="/admin/subjects" className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4" />
                  <span>Administrar familias</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
