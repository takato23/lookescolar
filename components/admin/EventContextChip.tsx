'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, ImageIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  event_date?: string;
  school_name?: string;
}

interface EventContextChipProps {
  event: Event;
  photoCount?: number;
  filteredCount?: number;
  onRemoveFilter?: () => void;
  showBackToEvent?: boolean;
  compact?: boolean;
  className?: string;
}

export default function EventContextChip({
  event,
  photoCount,
  filteredCount,
  onRemoveFilter,
  showBackToEvent = true,
  compact = false,
  className
}: EventContextChipProps) {
  const router = useRouter();

  const handleBackToEvent = () => {
    router.push(`/admin/events/${event.id}`);
  };

  const handleRemoveFilter = () => {
    if (onRemoveFilter) {
      onRemoveFilter();
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge 
          variant="outline" 
          className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 px-3 py-1"
        >
          <ImageIcon className="h-3 w-3 mr-2" />
          📸 {event.name}
          {onRemoveFilter && (
            <button
              onClick={handleRemoveFilter}
              className="ml-2 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-sm p-0.5 transition-colors"
              aria-label="Quitar filtro de evento"
            >
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </Badge>
        
        {showBackToEvent && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToEvent}
            className="h-7 px-2 text-xs text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Volver
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link 
          href="/admin/events" 
          className="flex items-center gap-1 transition-colors hover:text-primary-600 dark:hover:text-primary-400"
        >
          <Home className="h-4 w-4" />
          Eventos
        </Link>
        <span>/</span>
        <Link
          href={`/admin/events/${event.id}`}
          className="transition-colors hover:text-primary-600 dark:hover:text-primary-400 max-w-[200px] truncate"
          title={event.name}
        >
          {event.name}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Fotos</span>
      </nav>

      {/* Event Context Card */}
      <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-900/20 dark:to-indigo-900/15 border border-blue-200/50 dark:border-blue-700/50 rounded-lg p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Event Icon and Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground dark:text-gray-100 text-lg">
                  📸 Fotos de {event.name}
                </h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground dark:text-gray-400">
                  {event.event_date && (
                    <span>{new Date(event.event_date).toLocaleDateString('es-ES')}</span>
                  )}
                  {photoCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-foreground dark:text-gray-100">
                        {filteredCount !== undefined && filteredCount !== photoCount 
                          ? `${filteredCount} de ${photoCount}` 
                          : photoCount
                        }
                      </span>
                      foto{(filteredCount || photoCount) !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onRemoveFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveFilter}
                className="text-muted-foreground dark:text-gray-400 border-border dark:border-gray-600 hover:bg-muted dark:hover:bg-gray-800/50"
              >
                <XIcon className="h-4 w-4 mr-2" />
                Ver todas las fotos
              </Button>
            )}
            
            {showBackToEvent && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToEvent}
                className="text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al evento
              </Button>
            )}
          </div>
        </div>

        {/* Optional Progress Indicator */}
        {photoCount !== undefined && filteredCount !== undefined && filteredCount !== photoCount && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-gray-400 mb-1">
              <span>Mostrando {filteredCount} de {photoCount} fotos</span>
              <span>{Math.round((filteredCount / photoCount) * 100)}%</span>
            </div>
            <div className="w-full bg-muted dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(filteredCount / photoCount) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}