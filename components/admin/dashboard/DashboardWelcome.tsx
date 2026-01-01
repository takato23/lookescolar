'use client';

import type { ReactNode } from 'react';
import {
  Calendar,
  Clock,
  AlertCircle,
  RefreshCw,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardWelcomeProps {
  currentTime: Date;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  onRefresh: () => void;
  lastUpdated: Date | null;
  actions?: ReactNode;
}

export function DashboardWelcome({
  currentTime,
  isLoading,
  isFetching,
  error,
  onRefresh,
  lastUpdated,
  actions,
}: DashboardWelcomeProps) {
  const formatTime = (date: Date) =>
    date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return '¡Buenos días!';
    if (hour < 18) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  };

  return (
    <section
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg transition-all duration-300 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-900'
      )}
    >
      {/* Background gradients */}
      <>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 opacity-15 blur-3xl transition-all duration-500 group-hover:opacity-25" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 opacity-15 blur-3xl transition-all duration-500 group-hover:opacity-25" />
      </>

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            {/* Icon container with gradient */}
            <div className="relative">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 transition-transform duration-300 group-hover:scale-105"
              >
                <Zap
                  className="h-7 w-7 text-white"
                  strokeWidth={2}
                />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                {getGreeting()}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Aquí tienes el resumen de tu estudio hoy
              </p>
            </div>
          </div>

          {/* Status badges */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-300">
              <Calendar className="h-4 w-4 text-violet-500" />
              {currentTime.toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-300">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="tabular-nums">{formatTime(currentTime)}</span>
            </span>
            {!!error && (
              <span className="inline-flex animate-pulse items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                <AlertCircle className="h-4 w-4" />
                Error al actualizar
              </span>
            )}
            {!error && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Sincronizado
              </span>
            )}
          </div>
        </div>

        {/* Refresh button */}
        <div className="flex flex-col gap-2.5 md:w-auto">
          <Button
            variant="secondary"
            className="group/btn relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/30 disabled:opacity-70"
            onClick={onRefresh}
            disabled={isLoading || isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 transition-transform duration-500 ${isLoading ? 'animate-spin' : 'group-hover/btn:rotate-180'}`}
            />
            <span className="ml-2">
              {isLoading || isFetching ? 'Actualizando...' : 'Actualizar'}
            </span>
          </Button>
          <div
            className="text-xs text-slate-600 dark:text-slate-400"
            aria-live="polite"
          >
            {lastUpdated ? (
              <span className="font-medium">
                Actualizado a las {formatTime(lastUpdated)}
              </span>
            ) : (
              <span className="font-medium">Aún sin datos</span>
            )}
            <span className="ml-1 text-slate-500 dark:text-slate-500">
              • Auto cada 30s
            </span>
          </div>
          {actions && (
            <div className="flex justify-end pt-1">
              {actions}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
