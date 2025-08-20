'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
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
  ExternalLink,
  Copy,
  Wrench,
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

  // Copy public gallery link to clipboard
  const copyPublicLink = async () => {
    const publicUrl = `${window.location.origin}/gallery/${event.id}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Link público copiado al portapapeles', {
        description: `Las familias pueden acceder en: /gallery/${event.id}`,
        duration: 4000
      });
    } catch (error) {
      toast.error('No se pudo copiar el link');
    }
  };

  // Repair photo previews with better feedback
  const repairPreviews = async () => {
    const loadingToast = toast.loading('Reparando previews...', {
      description: 'Regenerando watermarks para el evento'
    });
    
    try {
      const res = await fetch('/api/admin/photos/repair-previews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id }),
      });
      
      if (!res.ok) throw new Error('Error reparando previews');
      
      toast.success('Previews reparados exitosamente', {
        id: loadingToast,
        description: 'Se regeneraron los watermarks del evento',
        duration: 5000
      });
    } catch (error) {
      toast.error('No se pudo reparar los previews', {
        id: loadingToast,
        description: 'Intenta nuevamente o contacta soporte',
        duration: 5000
      });
    }
  };

  return (
    <div
      className={cn(
        'liquid-card liquid-shine group relative overflow-hidden transition-all duration-300',
        'hover:scale-[1.01] hover:shadow-xl',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 to-secondary-50/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative pb-4 p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <Badge variant={status.variant} className="shrink-0 liquid-label">
                <status.icon className="mr-1 h-3 w-3" />
                {status.label}
              </Badge>
              {isUpcoming && (
                <Badge
                  variant="outline"
                  className="border-orange-200 text-orange-600 liquid-label"
                >
                  Próximo
                </Badge>
              )}
              {event.stats?.untaggedPhotos &&
                event.stats.untaggedPhotos > 0 && (
                  <Badge
                    variant="outline"
                    className="border-amber-200 text-amber-600 liquid-label"
                  >
                    {event.stats.untaggedPhotos} sin etiquetar
                  </Badge>
                )}
            </div>

            <div className="space-y-1">
              <h3 className="liquid-title line-clamp-1 text-xl font-bold transition-colors group-hover:text-primary-700">
                {event.school}
              </h3>
            </div>
          </div>

          {/* Quick Actions - Always visible on hover */}
          <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            {/* Manage Photos */}
            <Link
              href={`/admin/photos?eventId=${event.id}`}
              onClick={(e) => e.stopPropagation()}
              className="liquid-button liquid-button-secondary p-2 rounded-xl"
              title="Administrar fotos"
            >
              <Camera className="h-4 w-4" />
            </Link>

            {/* Copy Public Link */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyPublicLink();
              }}
              className="liquid-button liquid-button-secondary p-2 rounded-xl"
              title="Copiar link público"
              disabled={isLoading}
            >
              <Copy className="h-4 w-4" />
            </button>

            {/* Options Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="liquid-button liquid-button-secondary p-2 rounded-xl"
                  onClick={(e) => e.stopPropagation()}
                  disabled={isLoading}
                  title="Más opciones"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onView?.(event);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalles
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href={`/gallery/${event.id}`}
                    onClick={(e) => e.stopPropagation()}
                    target="_blank"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir galería pública
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    repairPreviews();
                  }}
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  Reparar previews
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(event);
                  }}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Editar evento
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(event);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar evento
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="relative space-y-4 pt-0 px-6 pb-6">
        {/* Event Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div className="liquid-description flex items-center">
              <Calendar className="mr-2 h-4 w-4 shrink-0" />
              <div>
                <div className="liquid-nav-text font-medium">
                  {eventDate.toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-xs liquid-description">
                  {eventDate.toLocaleDateString('es-AR', { weekday: 'long' })}
                </div>
              </div>
            </div>

            {event.school && (
              <div className="liquid-description flex items-center">
                <MapPin className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate liquid-nav-text">{event.school}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {event.photo_price && (
              <div className="liquid-description flex items-center">
                <DollarSign className="mr-2 h-4 w-4 shrink-0" />
                <div>
                  <div className="liquid-number font-medium">
                    ${event.photo_price.toLocaleString()}
                  </div>
                  <div className="text-xs liquid-description">por foto</div>
                </div>
              </div>
            )}

            {event.stats?.revenue && event.stats.revenue > 0 && (
              <div className="liquid-description flex items-center">
                <TrendingUp className="mr-2 h-4 w-4 shrink-0" />
                <div>
                  <div className="liquid-number font-medium text-green-600">
                    ${event.stats.revenue.toLocaleString()}
                  </div>
                  <div className="text-xs liquid-description">recaudado</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        {event.stats && (
          <div className="border-border/50 grid grid-cols-3 gap-4 border-t pt-4">
            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <Camera className="h-4 w-4 text-blue-600" />
              </div>
              <div className="liquid-number text-lg font-bold">
                {event.stats.totalPhotos || 0}
              </div>
              <div className="liquid-description text-xs">Fotos</div>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div className="liquid-number text-lg font-bold">
                {event.stats.totalSubjects || 0}
              </div>
              <div className="liquid-description text-xs">Familias</div>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-green-600" />
              </div>
              <div className="liquid-number text-lg font-bold">
                {event.stats.totalOrders || 0}
              </div>
              <div className="liquid-description text-xs">Pedidos</div>
            </div>
          </div>
        )}

        {/* Quick Info and Primary Action */}
        <div className="border-border/50 flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-4 text-xs liquid-description">
            <span>Creado {new Date(event.created_at || '').toLocaleDateString('es-AR')}</span>
            {event.stats?.lastPhotoUploaded && (
              <span className="text-green-600">
                Última foto: {new Date(event.stats.lastPhotoUploaded).toLocaleDateString('es-AR')}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Link href={`/admin/events/${event.id}`}>
              <button className="liquid-button liquid-button-primary text-sm px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
                <Eye className="h-4 w-4" />
                <span className="liquid-button-text">Gestionar</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
