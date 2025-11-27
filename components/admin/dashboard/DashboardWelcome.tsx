'use client';

import {
  Camera,
  Calendar,
  Clock,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardWelcomeProps {
  currentTime: Date;
  isLoading: boolean;
  error: unknown;
  onRefresh: () => void;
}

export function DashboardWelcome({
  currentTime,
  isLoading,
  error,
  onRefresh,
}: DashboardWelcomeProps) {
  const formatTime = (date: Date) =>
    date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  return (
    <section className="liquid-glass-intense group relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-2xl transition-all duration-500 hover:shadow-3xl">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent opacity-60 dark:from-blue-500/20 dark:via-purple-500/10"></div>
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"></div>
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-gradient-to-tr from-indigo-400/20 to-pink-400/20 blur-2xl"></div>

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className="liquid-glass group/icon relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-10 group-hover/icon:opacity-20"></div>
              <Sparkles className="relative z-10 h-7 w-7 text-blue-400" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-4xl font-bold tracking-tight text-transparent">
                ¡Hola de nuevo!
              </h1>
              <p className="mt-1 text-base text-slate-300">
                Aquí tienes el resumen de tu estudio hoy
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <span className="liquid-glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm dark:text-slate-200">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              {currentTime.toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
            <span className="liquid-glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm dark:text-slate-200">
              <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="tabular-nums">{formatTime(currentTime)}</span>
            </span>
            {!!error && (
              <span className="inline-flex animate-pulse items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                <AlertCircle className="h-4 w-4" />
                Error al actualizar
              </span>
            )}
            {!error && (
              <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
                Sincronizado
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 md:w-auto">
          <Button
            variant="secondary"
            className="liquid-glass group/btn relative overflow-hidden rounded-xl px-6 py-3.5 text-sm font-semibold shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 transition-transform duration-500 ${isLoading ? 'animate-spin' : 'group-hover/btn:rotate-180'}`}
            />
            <span className="ml-2">
              {isLoading ? 'Actualizando...' : 'Actualizar datos'}
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
}
