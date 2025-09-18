'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Monitor } from 'lucide-react';

interface DashboardHeaderProps {
  onOpenCommandPalette: () => void;
  showPerformanceMonitor: boolean;
  onTogglePerformanceMonitor: () => void;
}

export function DashboardHeader({
  onOpenCommandPalette,
  showPerformanceMonitor,
  onTogglePerformanceMonitor,
}: DashboardHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="border-border bg-white dark:bg-gray-900 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-foreground text-2xl font-bold">
              Dashboard Profesional
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {currentTime.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              <span>&nbsp;•&nbsp;</span>
              {formatTime(currentTime)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            aria-label="Abrir buscador y atajos"
            variant="outline"
            size="sm"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Buscar</span>
            <kbd className="inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-xs">
              ⌘K
            </kbd>
          </Button>

          <Button
            aria-label={
              showPerformanceMonitor
                ? 'Ocultar rendimiento (avanzado)'
                : 'Ver rendimiento (avanzado)'
            }
            variant={showPerformanceMonitor ? 'secondary' : 'outline'}
            size="sm"
            onClick={onTogglePerformanceMonitor}
          >
            <Monitor className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline">
              {showPerformanceMonitor
                ? 'Ocultar rendimiento'
                : 'Ver rendimiento'}
            </span>
            <span className="lg:hidden">
              {showPerformanceMonitor ? 'Ocultar' : 'Monitor'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
