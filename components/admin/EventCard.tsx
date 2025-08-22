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

  // Color coding for different hierarchy levels
  const getColorScheme = () => {
    // For now, we'll use a default color scheme for events
    // In the future, this could be based on event type or other factors
    return {
      primary: 'from-blue-500 to-blue-600',
      secondary: 'from-blue-400 to-blue-500',
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
        'liquid-glass-card-ios26 group relative overflow-hidden transition-all duration-300 rounded-2xl border border-white/20 shadow-lg',
        'hover:scale-[1.02] hover:shadow-xl',
        className
      )}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.gradient} opacity-50`} />
      
      {/* Color accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorScheme.primary}`} />

      <div className="relative pb-4 p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.variant} className={`glass-label-ios26 ${colorScheme.badge}`}>
                <status.icon className="mr-1 h-3 w-3" />
                {status.label}
              </Badge>
              {isUpcoming && (
                <Badge
                  variant="outline"
                  className="glass-label-ios26 border-orange-200 text-orange-600 bg-orange-50"
                >
                  Próximo
                </Badge>
              )}
              {event.stats?.untaggedPhotos &&
                event.stats.untaggedPhotos > 0 && (
                  <Badge
                    variant="outline"
                    className="glass-label-ios26 border-amber-200 text-amber-600 bg-amber-50"
                  >
                    {event.stats.untaggedPhotos} sin etiquetar
                  </Badge>
                )}
            </div>

            <div className="space-y-1">
              <h3 className="gradient-text-ios26 line-clamp-1 text-xl font-bold transition-colors group-hover:text-blue-700">
                {event.school}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {eventDate.toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="liquid-glass-button-ios26 opacity-0 transition-opacity group-hover:opacity-100 p-2 rounded-xl hover:bg-white/10"
                onClick={(e) => e.stopPropagation()}
                disabled={isLoading}
              >
                <MoreVertical className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="liquid-glass-card-ios26 border border-white/20 w-56">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onView && onView(event);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/admin/photos?eventId=${event.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Administrar fotos
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/admin/publish`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Compartir salón
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/20" />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit(event);
                }}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Editar evento
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const res = await fetch('/api/admin/photos/watermark', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ eventId: event.id }),
                    });
                    if (!res.ok) throw new Error('Error');
                    alert('Generación de watermarks iniciada');
                  } catch {
                    alert('No se pudo iniciar la generación de watermarks');
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Generar previews
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/20" />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete(event);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar evento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="relative space-y-4 pt-0 px-5 sm:px-6 pb-6">
        {/* Event Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div className="flex items-center text-gray-600 dark:text-gray-300">
              <Calendar className="mr-2 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {eventDate.toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {eventDate.toLocaleDateString('es-AR', { weekday: 'long' })}
                </div>
              </div>
            </div>

            {event.school && (
              <div className="flex items-center text-gray-600 dark:text-gray-300">
                <MapPin className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate font-medium text-gray-900 dark:text-white">{event.school}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
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

            {event.stats?.revenue && event.stats.revenue > 0 && (
              <div className="flex items-center text-gray-600 dark:text-gray-300">
                <TrendingUp className="mr-2 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium text-green-600 dark:text-green-400">
                    ${event.stats.revenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">recaudado</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid with Hierarchy Icons */}
        {event.stats && (
          <div className="border-border/50 grid grid-cols-3 gap-3 border-t pt-4 border-white/20">
            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <Image className={`h-5 w-5 ${colorScheme.statIcon}`} />
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {event.stats.totalPhotos || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Fotos</div>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <User className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {event.stats.totalSubjects || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Familias</div>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {event.stats.totalOrders || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Pedidos</div>
            </div>
          </div>
        )}

        {/* Progress Bar for Photo Tagging */}
        {event.stats && event.stats.totalPhotos > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-300">Progreso de etiquetado</span>
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

        {/* Action Area - Simplified */}
        <div className="border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4 border-white/20">
          <div className="text-xs text-gray-600 dark:text-gray-300">
            Creado {event.created_at ? new Date(event.created_at).toLocaleDateString('es-AR') : 'N/A'}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Link href={`/admin/events/${event.id}`} className="flex-1">
              <button className="liquid-glass-button-ios26 w-full text-xs px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium hover:bg-white/10 transition-colors">
                <Eye className="h-4 w-4" />
                <span>Gestionar</span>
              </button>
            </Link>
            <Link href={`/gallery/${event.id}`}>
              <button
                className="liquid-glass-button-ios26 text-xs px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-white/10 transition-colors"
                aria-label="Vista cliente"
              >
                <Eye className="h-3 w-3" />
                <span>Vista</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}