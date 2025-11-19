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

import { DashboardStats } from '@/types/dashboard';

interface MobileDashboardLayoutProps {
  stats: DashboardStats;
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
    <div className="flex min-h-screen flex-col gap-6 p-4 lg:hidden">
      {/* Mobile Header */}
      <div className="liquid-glass-intense sticky top-4 z-30 flex items-center justify-between rounded-2xl border border-white/20 px-5 py-4 shadow-lg backdrop-blur-xl">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Estudio
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {currentTime.toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <div className="liquid-glass rounded-xl px-3 py-1.5 shadow-sm">
          <span className="text-xs font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card variant="glass-ios26" className="p-4 transition-transform active:scale-95">
          <div className="flex flex-col gap-3">
            <div className="self-start rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.activeEvents}
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Eventos Activos
              </div>
            </div>
          </div>
        </Card>

        <Card variant="glass-ios26" className="p-4 transition-transform active:scale-95">
          <div className="flex flex-col gap-3">
            <div className="self-start rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.todayUploads}
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Fotos Hoy
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions Mobile */}
      <Card variant="glass-ios26" className="overflow-hidden">
        <CardHeader className="border-b border-white/10 pb-3">
          <CardTitle className="text-base font-bold">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="group flex flex-col items-center gap-2 rounded-xl p-2 transition-colors hover:bg-white/5 active:scale-95"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:-translate-y-1 ${action.color}/10`}
                >
                  <action.icon
                    className={`h-6 w-6 ${action.color.replace('bg-', 'text-')}`}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                  {action.title}
                </span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's Summary */}
      <Card variant="glass-ios26">
        <CardHeader className="border-b border-white/10 pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Clock className="h-4 w-4 text-indigo-500" />
            Resumen del Día
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Fotos subidas
            </span>
            <Badge
              variant="secondary"
              className="bg-purple-500/10 text-purple-700 dark:text-purple-300"
            >
              {stats.todayUploads}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Pedidos nuevos
            </span>
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            >
              {stats.todayOrders}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Total familias
            </span>
            <span className="font-bold tabular-nums text-slate-900 dark:text-white">
              {stats.registeredFamilies}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              Ventas totales
            </span>
            <span className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
              ${(stats.totalSales / 100).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <Card variant="glass-ios26" className="mb-20">
        <CardHeader className="border-b border-white/10 pb-3">
          <CardTitle className="text-base font-bold">Navegación</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-1">
            <a
              href="/admin/events"
              className="flex w-full items-center justify-between rounded-xl p-3 transition-colors hover:bg-white/5 active:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Ver todos los eventos
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </a>
            <a
              href="/admin/orders"
              className="flex w-full items-center justify-between rounded-xl p-3 transition-colors hover:bg-white/5 active:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Gestionar pedidos
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </a>
            <a
              href="/admin/subjects"
              className="flex w-full items-center justify-between rounded-xl p-3 transition-colors hover:bg-white/5 active:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
                  <Users className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Administrar familias
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
