'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Users,
  Camera,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Eye,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';
import { clsx } from 'clsx';

interface Event {
  id: string;
  name: string;
  date: Date;
  location?: string;
  status: 'active' | 'upcoming' | 'completed' | 'paused';
  photoCount: number;
  expectedPhotos: number;
  attendees?: number;
  description?: string;
  priority: 'low' | 'normal' | 'high';
}

interface EventStatusCardsProps {
  events: Event[];
  onEventSelect?: (event: Event) => void;
  onEventEdit?: (event: Event) => void;
  onEventDelete?: (event: Event) => void;
  onCreateEvent?: () => void;
  className?: string;
  compact?: boolean;
}

const statusConfig = {
  active: {
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    icon: Play,
    label: 'Activo',
  },
  upcoming: {
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    icon: Clock,
    label: 'Próximo',
  },
  completed: {
    color: 'bg-muted0',
    bgColor: 'bg-muted',
    textColor: 'text-foreground',
    borderColor: 'border-border',
    icon: CheckCircle,
    label: 'Completado',
  },
  paused: {
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    icon: Pause,
    label: 'Pausado',
  },
};

const priorityConfig = {
  low: {
    color: 'bg-muted text-muted-foreground',
    label: 'Baja',
  },
  normal: {
    color: 'bg-blue-100 text-blue-600',
    label: 'Normal',
  },
  high: {
    color: 'bg-red-100 text-red-600',
    label: 'Alta',
  },
};

export function EventStatusCards({
  events,
  onEventSelect,
  onEventEdit,
  onEventDelete,
  onCreateEvent,
  className,
  compact = false,
}: EventStatusCardsProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'priority'>('date');

  // Sort events based on selected criteria
  const sortedEvents = [...events].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'status':
        const statusOrder = { active: 0, upcoming: 1, paused: 2, completed: 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      case 'priority':
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      default:
        return 0;
    }
  });

  const activeEvents = events.filter(e => e.status === 'active').length;
  const upcomingEvents = events.filter(e => e.status === 'upcoming').length;
  const completedEvents = events.filter(e => e.status === 'completed').length;

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    onEventSelect?.(event);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Mañana';
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (events.length === 0) {
    return (
      <div className={clsx('text-center py-12', className)}>
        <div className="rounded-full bg-muted p-6 mx-auto w-fit mb-4">
          <Calendar className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          No hay eventos
        </h3>
        <p className="text-muted-foreground mb-4">
          Crea tu primer evento para empezar a gestionar fotos
        </p>
        {onCreateEvent && (
          <button
            onClick={onCreateEvent}
            className="inline-flex items-center space-x-2 bg-primary-600 text-foreground px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Crear Evento</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Summary Cards */}
      {!compact && (
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 text-center ring-1 ring-green-200/50"
          >
            <div className="text-2xl font-bold text-green-700">{activeEvents}</div>
            <div className="text-xs text-green-600">Activos</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center ring-1 ring-blue-200/50"
          >
            <div className="text-2xl font-bold text-blue-700">{upcomingEvents}</div>
            <div className="text-xs text-blue-600">Próximos</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 text-center ring-1 ring-gray-200/50"
          >
            <div className="text-2xl font-bold text-foreground">{completedEvents}</div>
            <div className="text-xs text-muted-foreground">Completados</div>
          </motion.div>
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Mis Eventos ({events.length})
        </h2>
        <div className="flex items-center space-x-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 text-foreground"
          >
            <option value="date">Por fecha</option>
            <option value="status">Por estado</option>
            <option value="priority">Por prioridad</option>
          </select>
          {onCreateEvent && (
            <button
              onClick={onCreateEvent}
              className="mobile-touch-target bg-primary-600 text-foreground p-2 rounded-lg hover:bg-primary-700 transition-colors"
              aria-label="Crear nuevo evento"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        <AnimatePresence>
          {sortedEvents.map((event, index) => {
            const statusInfo = statusConfig[event.status];
            const StatusIcon = statusInfo.icon;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleEventClick(event)}
                className={clsx(
                  'bg-background rounded-xl p-4 shadow-sm ring-1 transition-all duration-200',
                  'hover:shadow-md hover:ring-border/80 active:scale-[0.98]',
                  'mobile-touch-target',
                  selectedEvent?.id === event.id && 'ring-2 ring-primary-500 shadow-md'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {event.name}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={clsx(
                        'inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        statusInfo.color,
                        statusInfo.textColor
                      )}>
                        <StatusIcon className="h-3 w-3" />
                        <span>{statusInfo.label}</span>
                      </span>
                      <span className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        priorityConfig[event.priority].color
                      )}>
                        {priorityConfig[event.priority].label}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventEdit?.(event);
                      }}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Editar evento"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventDelete?.(event);
                      }}
                      className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                      aria-label="Eliminar evento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Event Details */}
                <div className="space-y-2">
                  {/* Date and Location */}
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(event.date)}</span>
                      <span>•</span>
                      <span>{formatTime(event.date)}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Photo Progress */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {event.photoCount} / {event.expectedPhotos} fotos
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {Math.round((event.photoCount / event.expectedPhotos) * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={clsx(
                        'h-2 rounded-full transition-all duration-500',
                        event.status === 'completed' ? 'bg-green-500' :
                        event.status === 'active' ? 'bg-blue-500' : 'bg-muted'
                      )}
                      style={{
                        width: `${Math.min((event.photoCount / event.expectedPhotos) * 100, 100)}%`
                      }}
                    />
                  </div>

                  {/* Attendees */}
                  {event.attendees && (
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{event.attendees} asistentes</span>
                    </div>
                  )}

                  {/* Description */}
                  {event.description && !compact && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
