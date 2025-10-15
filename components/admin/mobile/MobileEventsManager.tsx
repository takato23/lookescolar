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
  Filter,
  Search,
  MoreVertical,
  Settings,
  BarChart3,
  Download,
  Share,
  Copy,
  Archive,
  Star,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';

interface Event {
  id: string;
  name: string;
  date: Date;
  location?: string;
  status: 'active' | 'upcoming' | 'completed' | 'paused' | 'cancelled';
  photoCount: number;
  expectedPhotos: number;
  attendees?: number;
  description?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  budget?: number;
  organizer?: string;
  tags?: string[];
  progress?: number;
}

interface MobileEventsManagerProps {
  events: Event[];
  onEventSelect?: (event: Event) => void;
  onEventEdit?: (event: Event) => void;
  onEventDelete?: (event: Event) => void;
  onCreateEvent?: () => void;
  onEventArchive?: (event: Event) => void;
  onEventShare?: (event: Event) => void;
  className?: string;
  compact?: boolean;
  loading?: boolean;
  error?: string | null;
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
  cancelled: {
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: AlertCircle,
    label: 'Cancelado',
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
    color: 'bg-orange-100 text-orange-600',
    label: 'Alta',
  },
  urgent: {
    color: 'bg-red-100 text-red-600',
    label: 'Urgente',
  },
};

export function MobileEventsManager({
  events,
  onEventSelect,
  onEventEdit,
  onEventDelete,
  onCreateEvent,
  onEventArchive,
  onEventShare,
  className,
  compact = false,
  loading = false,
  error = null,
}: MobileEventsManagerProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'priority' | 'name'>('date');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showEventActions, setShowEventActions] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  // Filter and sort events
  const filteredEvents = events.filter(event => {
    const matchesSearch = searchTerm === '' ||
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === 'all' || event.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'status':
        const statusOrder = { active: 0, upcoming: 1, paused: 2, completed: 3, cancelled: 4 };
        return statusOrder[a.status] - statusOrder[b.status];
      case 'priority':
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    onEventSelect?.(event);
  };

  const formatDate = (date: Date) => {
    try {
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
          year: 'numeric'
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Fecha inválida';
    }
  };

  const formatTime = (date: Date) => {
    try {
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '--:--';
    }
  };

  const getEventStats = () => {
    const active = events.filter(e => e.status === 'active').length;
    const upcoming = events.filter(e => e.status === 'upcoming').length;
    const completed = events.filter(e => e.status === 'completed').length;
    const totalPhotos = events.reduce((sum, e) => sum + (Number(e.photoCount) || 0), 0);

    return { active, upcoming, completed, totalPhotos };
  };

  const stats = getEventStats();

  // Loading state
  if (loading) {
    return (
      <div className={clsx('flex items-center justify-center py-12', className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando eventos...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={clsx('text-center py-12', className)}>
        <div className="rounded-full bg-destructive/10 p-6 mx-auto w-fit mb-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          Error al cargar eventos
        </h3>
        <p className="text-muted-foreground mb-4">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Reintentar</span>
        </button>
      </div>
    );
  }

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

  const EventCard = ({ event, index }: { event: Event; index: number }) => {
    // Ensure required fields exist with defaults
    const safeEvent = {
      status: event.status || 'active',
      priority: event.priority || 'normal',
      photoCount: Number(event.photoCount) || 0,
      expectedPhotos: Number(event.expectedPhotos) || 0,
      name: event.name || 'Evento sin nombre',
      date: event.date instanceof Date ? event.date : new Date(event.date || Date.now()),
      ...event
    };

    const statusInfo = statusConfig[safeEvent.status] || statusConfig.active;
    const StatusIcon = statusInfo.icon;
    const progress = safeEvent.expectedPhotos > 0 ? Math.min((safeEvent.photoCount / safeEvent.expectedPhotos * 100), 100) : 0;

    // Safe access to priority config with fallback
    const priorityInfo = priorityConfig[safeEvent.priority] || priorityConfig.normal;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          delay: index * 0.08,
          type: "spring",
          stiffness: 100,
          damping: 15
        }}
        onClick={() => handleEventClick(safeEvent)}
        className={clsx(
          'bg-gradient-to-br from-white via-white to-gray-50/50 rounded-2xl p-5 shadow-sm ring-1 transition-all duration-300',
          'hover:shadow-lg hover:shadow-primary/10 hover:ring-primary/20 active:scale-[0.98]',
          'mobile-touch-target border border-border/80',
          'relative overflow-hidden',
          selectedEvent?.id === safeEvent.id && 'ring-2 ring-primary-500 shadow-lg shadow-primary/20'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-foreground truncate mb-1">
              {safeEvent.name}
            </h3>
            <div className="flex items-center space-x-2">
              <span className={clsx(
                'inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm',
                statusInfo.color,
                statusInfo.textColor,
                'backdrop-blur-sm'
              )}>
                <StatusIcon className="h-3.5 w-3.5" />
                <span>{statusInfo.label}</span>
              </span>
              <span className={clsx(
                'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                priorityInfo.color
              )}>
                {priorityInfo.label}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 ml-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEventActions(showEventActions === event.id ? null : event.id);
              }}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-all duration-200"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-4">
          {/* Date and Location */}
          <div className="bg-muted/80 rounded-lg p-3 space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 text-blue-600">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">{formatDate(safeEvent.date)}</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center space-x-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatTime(safeEvent.date)}</span>
              </div>
            </div>
            {safeEvent.location && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="truncate">{safeEvent.location}</span>
              </div>
            )}
          </div>

          {/* Photo Progress */}
          <div className="bg-blue-50/50 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-100 rounded-full">
                  <Camera className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">
                    {safeEvent.photoCount} / {safeEvent.expectedPhotos} fotos
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {safeEvent.expectedPhotos > 0 ? `${Math.round(progress)}% completado` : 'Sin objetivo'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  {Math.round(progress)}%
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={clsx(
                  'h-2.5 rounded-full transition-all duration-700 ease-out',
                  safeEvent.status === 'completed' ? 'bg-green-500' :
                  safeEvent.status === 'active' ? 'bg-blue-500' : 'bg-muted'
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* Attendees and Budget */}
          <div className="flex items-center justify-between text-sm">
            {safeEvent.attendees && (
              <div className="flex items-center space-x-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{safeEvent.attendees} asistentes</span>
              </div>
            )}
            {safeEvent.budget && (
              <div className="text-muted-foreground">
                Presupuesto: ${safeEvent.budget.toLocaleString()}
              </div>
            )}
          </div>

          {/* Description */}
          {safeEvent.description && !compact && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {safeEvent.description}
            </p>
          )}

          {/* Tags */}
          {safeEvent.tags && safeEvent.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {safeEvent.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {safeEvent.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{safeEvent.tags.length - 3} más
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <button
            onClick={() => handleEventClick(safeEvent)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-foreground px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>Ver fotos</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEventEdit?.(safeEvent);
            }}
            className="p-2.5 bg-muted hover:bg-muted text-muted-foreground rounded-lg transition-colors duration-200"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Actions dropdown */}
        <AnimatePresence>
          {showEventActions === safeEvent.id && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50"
                onClick={() => setShowEventActions(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-16 right-3 z-50 bg-card border border-border rounded-xl shadow-xl p-1 min-w-[200px] backdrop-blur-sm"
              >
                <button
                  onClick={() => {
                    onEventEdit?.(safeEvent);
                    setShowEventActions(null);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm hover:bg-muted rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Editar evento</span>
                </button>
                <button
                  onClick={() => {
                    onEventShare?.(safeEvent);
                    setShowEventActions(null);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm hover:bg-muted rounded-lg transition-colors"
                >
                  <Share className="h-4 w-4" />
                  <span>Compartir</span>
                </button>
                <button
                  onClick={() => {
                    onEventArchive?.(safeEvent);
                    setShowEventActions(null);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent rounded-md"
                >
                  <Archive className="h-4 w-4" />
                  <span>Archivar</span>
                </button>
                <button
                  onClick={() => {
                    onEventDelete?.(safeEvent);
                    setShowEventActions(null);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent rounded-md text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Eliminar</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className={clsx('w-full space-y-4', className)}>
      {/* Header with stats */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center ring-1 ring-green-200/50"
        >
          <div className="text-2xl font-bold text-green-700">{stats.active}</div>
          <div className="text-xs text-green-600">Activos</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center ring-1 ring-blue-200/50"
        >
          <div className="text-2xl font-bold text-blue-700">{stats.upcoming}</div>
          <div className="text-xs text-blue-600">Próximos</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center ring-1 ring-gray-200/50"
        >
          <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
          <div className="text-xs text-muted-foreground">Completados</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center ring-1 ring-purple-200/50"
        >
          <div className="text-2xl font-bold text-purple-700">{stats.totalPhotos}</div>
          <div className="text-xs text-purple-600">Fotos Totales</div>
        </motion.div>
      </div>

      {/* Mobile-Optimized Controls */}
      <div className="space-y-4">
        {/* Title and Create Button */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            Eventos ({events.length})
          </h2>
          {onCreateEvent && (
            <button
              onClick={onCreateEvent}
              className="flex items-center space-x-2 bg-primary-600 text-foreground px-4 py-2.5 rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              <Plus className="h-5 w-5" />
              <span>Nuevo</span>
            </button>
          )}
        </div>

        {/* Sort and Filter Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-medium min-w-[140px]"
            >
              <option value="date">Por fecha</option>
              <option value="status">Por estado</option>
              <option value="priority">Por prioridad</option>
              <option value="name">Por nombre</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm min-w-[120px]"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="upcoming">Próximos</option>
              <option value="completed">Completados</option>
              <option value="paused">Pausados</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre, ubicación..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-sm"
        >
          <Filter className="h-4 w-4" />
          <span>Filtros</span>
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex-1 overflow-hidden"
            >
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="upcoming">Próximos</option>
                <option value="completed">Completados</option>
                <option value="paused">Pausados</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedEvents.map((event, index) => (
            <EventCard key={event.id} event={event} index={index} />
          ))}
        </AnimatePresence>
      </div>

      {/* No Results */}
      {sortedEvents.length === 0 && (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No se encontraron eventos con los filtros aplicados
          </p>
        </div>
      )}
    </div>
  );
}
