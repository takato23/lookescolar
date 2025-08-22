'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  DollarSign,
  MoreVertical,
  Camera,
  Users,
  ShoppingCart,
  Download,
  Edit3,
  Trash2,
  FileText,
  QrCode,
  Eye,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  User,
  Image,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';

interface Event {
  id: string;
  school: string;
  date: string;
  active: boolean | null;
  photo_price?: number;
  created_at: string | null;
  updated_at: string | null;
  // Computed stats (could come from API or be computed client-side)
  stats?: {
    totalPhotos: number;
    totalSubjects: number;
    totalOrders: number;
    revenue: number;
    untaggedPhotos: number;
    pendingOrders: number;
  };
}

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
  onView?: (event: Event) => void;
  className?: string;
  compact?: boolean;
}

const statusConfig = {
  draft: {
    label: 'Borrador',
    variant: 'secondary' as const,
    icon: AlertCircle,
    color: 'gray',
  },
  active: {
    label: 'Activo',
    variant: 'secondary' as const,
    icon: CheckCircle2,
    color: 'green',
  },
  completed: {
    label: 'Completado',
    variant: 'outline' as const,
    icon: CheckCircle2,
    color: 'blue',
  },
};

export function EventCard({
  event,
  onEdit,
  onDelete,
  onView,
  className,
  compact = false,
}: EventCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const status = event.active ? statusConfig.active : statusConfig.draft;
  const eventDate = new Date(event.date);
  const isUpcoming = eventDate > new Date();
  const isPast = eventDate < new Date();

  const handleAction = async (action: () => void) => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  };

  // Color scheme for neural glass effect
  const getColorScheme = () => {
    if (event.active) {
      return {
        primary: 'from-emerald-500 to-teal-600',
        secondary: 'from-emerald-400 to-teal-500',
        accent: 'text-emerald-600',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        statIcon: 'text-emerald-500',
        gradient: 'bg-gradient-to-br from-emerald-50/50 to-teal-50/50',
      };
    }
    
    return {
      primary: 'from-blue-500 to-indigo-600',
      secondary: 'from-blue-400 to-indigo-500',
      accent: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      statIcon: 'text-blue-500',
      gradient: 'bg-gradient-to-br from-blue-50/50 to-indigo-50/50',
    };
  };

  const colorScheme = getColorScheme();

  // Calculate progress percentage for photo tagging
  const photoTaggingProgress = event.stats?.totalPhotos 
    ? Math.round(((event.stats.totalPhotos - (event.stats.untaggedPhotos || 0)) / event.stats.totalPhotos) * 100)
    : 0;

  return (
    <div
      className={cn(
        'neural-glass-card group relative overflow-hidden transition-all duration-500',
        'hover:scale-[1.02] hover:shadow-xl hover:-translate-y-2',
        compact ? 'neural-event-card-compact' : 'min-h-[320px]',
        className
      )}
    >
      {/* Neural refractive background */}
      <div className={`absolute inset-0 ${colorScheme.gradient} opacity-40`} />
      
      {/* Status accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorScheme.primary}`} />

      {/* Main Content */}
      <div className={cn(
        "relative flex flex-col h-full",
        compact ? "p-4" : "p-5 sm:p-6"
      )}>
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.variant} className={`neural-glass-card text-xs ${colorScheme.badge}`}>
                <status.icon className="mr-1 h-3 w-3" />
                {status.label}
              </Badge>
              {isUpcoming && (
                <Badge
                  variant="outline"
                  className="neural-glass-card text-xs border-orange-200 text-orange-600 bg-orange-50/50"
                >
                  Próximo
                </Badge>
              )}
              {event.stats?.untaggedPhotos && event.stats.untaggedPhotos > 0 && (
                <Badge
                  variant="outline"
                  className="neural-glass-card text-xs border-amber-200 text-amber-600 bg-amber-50/50"
                >
                  {event.stats.untaggedPhotos} pendientes
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <h3 className={cn(
                "neural-title font-bold transition-colors group-hover:text-blue-700",
                compact ? "text-lg line-clamp-1" : "text-xl line-clamp-2"
              )}>
                {event.school}
              </h3>
              {!compact && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {eventDate.toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    weekday: 'short',
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="neural-glass-card opacity-0 transition-opacity group-hover:opacity-100 p-2 rounded-xl hover:bg-white/20 border-white/20"
                onClick={(e) => e.stopPropagation()}
                disabled={isLoading}
              >
                <MoreVertical className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="neural-glass-card border-white/20 w-56">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView && onView(event); }}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/photos?eventId=${event.id}`} onClick={(e) => e.stopPropagation()}>
                  <Camera className="mr-2 h-4 w-4" />
                  Administrar fotos
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/publish`} onClick={(e) => e.stopPropagation()}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Compartir salón
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/20" />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit && onEdit(event); }}>
                <Edit3 className="mr-2 h-4 w-4" />
                Editar evento
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={(e) => { e.stopPropagation(); onDelete && onDelete(event); }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar evento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Quick Info Section */}
        {!compact && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
            <div className="flex items-center text-gray-600 dark:text-gray-300">
              <Calendar className="mr-2 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {eventDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {eventDate.toLocaleDateString('es-AR', { weekday: 'long' })}
                </div>
              </div>
            </div>

            {event.photo_price && (
              <div className="flex items-center text-gray-600 dark:text-gray-300">
                <DollarSign className="mr-2 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    ${event.photo_price.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">por foto</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compact Date Info */}
        {compact && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-3">
            <Calendar className="mr-2 h-4 w-4" />
            <span className="font-medium">
              {eventDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}

        {/* Stats Grid */}
        {event.stats && (
          <div className={cn(
            "grid gap-3 border-t pt-3 mb-3 border-white/20",
            compact ? "grid-cols-3" : "grid-cols-3"
          )}>
            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <Image className={`h-4 w-4 ${colorScheme.statIcon}`} />
              </div>
              <div className={cn(
                "font-bold text-gray-900 dark:text-white",
                compact ? "text-sm" : "text-lg"
              )}>
                {event.stats.totalPhotos || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Fotos</div>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <User className="h-4 w-4 text-purple-500" />
              </div>
              <div className={cn(
                "font-bold text-gray-900 dark:text-white",
                compact ? "text-sm" : "text-lg"
              )}>
                {event.stats.totalSubjects || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Familias</div>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-green-500" />
              </div>
              <div className={cn(
                "font-bold text-gray-900 dark:text-white",
                compact ? "text-sm" : "text-lg"
              )}>
                {event.stats.totalOrders || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Pedidos</div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {event.stats && event.stats.totalPhotos > 0 && (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-300">Progreso</span>
              <span className="font-medium text-gray-900 dark:text-white">{photoTaggingProgress}%</span>
            </div>
            <div className="progress-bar-ios26 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${photoTaggingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Revenue Display */}
        {event.stats?.revenue && event.stats.revenue > 0 && (
          <div className="neural-metric-display p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Ingresos</span>
              </div>
              <span className="font-bold text-green-600 dark:text-green-400">
                ${event.stats.revenue.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons - Bottom */}
        <div className="mt-auto flex flex-col gap-3 border-t pt-3 border-white/20">
          {!compact && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Creado {event.created_at ? new Date(event.created_at).toLocaleDateString('es-AR') : 'N/A'}
            </div>
          )}

          <div className="flex gap-2">
            <Link href={`/admin/events/${event.id}`} className="flex-1">
              <Button className="neural-glass-card w-full border-white/20 hover:bg-white/20" size={compact ? "sm" : "default"}>
                <Eye className="h-4 w-4 mr-2" />
                Gestionar
              </Button>
            </Link>
            <Link href={`/gallery/${event.id}`}>
              <Button
                variant="outline"
                className="neural-glass-card border-white/20 hover:bg-white/20"
                size={compact ? "sm" : "default"}
              >
                <Eye className="h-3 w-3" />
                {compact ? '' : 'Vista'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}