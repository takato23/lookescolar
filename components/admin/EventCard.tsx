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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
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

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        'hover:scale-[1.01] hover:border-primary-300 hover:shadow-lg',
        'gradient-border-hover',
        className
      )}
      variant="glass"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 to-secondary-50/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <Badge variant={status.variant} className="shrink-0">
                <status.icon className="mr-1 h-3 w-3" />
                {status.label}
              </Badge>
              {isUpcoming && (
                <Badge
                  variant="outline"
                  className="border-orange-200 text-orange-600"
                >
                  Próximo
                </Badge>
              )}
              {event.stats?.untaggedPhotos &&
                event.stats.untaggedPhotos > 0 && (
                  <Badge
                    variant="outline"
                    className="border-amber-200 text-amber-600"
                  >
                    {event.stats.untaggedPhotos} sin etiquetar
                  </Badge>
                )}
            </div>

            <div className="space-y-1">
              <h3 className="text-foreground line-clamp-1 text-xl font-bold transition-colors group-hover:text-primary-700">
                {event.school}
              </h3>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
                disabled={isLoading}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onView?.(event);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles
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
              <DropdownMenuItem asChild>
                <Link
                  href={`/admin/events/${event.id}/qr-pdf`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Descargar QR PDF
                </Link>
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
      </CardHeader>

      <CardContent className="relative space-y-4 pt-0">
        {/* Event Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div className="text-muted-foreground flex items-center">
              <Calendar className="mr-2 h-4 w-4 shrink-0" />
              <div>
                <div className="text-foreground font-medium">
                  {eventDate.toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-xs">
                  {eventDate.toLocaleDateString('es-AR', { weekday: 'long' })}
                </div>
              </div>
            </div>

            {event.school && (
              <div className="text-muted-foreground flex items-center">
                <MapPin className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{event.school}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {event.photo_price && (
              <div className="text-muted-foreground flex items-center">
                <DollarSign className="mr-2 h-4 w-4 shrink-0" />
                <div>
                  <div className="text-foreground font-medium">
                    ${event.photo_price.toLocaleString()}
                  </div>
                  <div className="text-xs">por foto</div>
                </div>
              </div>
            )}

            {event.stats?.revenue && event.stats.revenue > 0 && (
              <div className="text-muted-foreground flex items-center">
                <TrendingUp className="mr-2 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium text-green-600">
                    ${event.stats.revenue.toLocaleString()}
                  </div>
                  <div className="text-xs">recaudado</div>
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
              <div className="text-foreground text-lg font-bold">
                {event.stats.totalPhotos || 0}
              </div>
              <div className="text-muted-foreground text-xs">Fotos</div>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-foreground text-lg font-bold">
                {event.stats.totalSubjects || 0}
              </div>
              <div className="text-muted-foreground text-xs">Familias</div>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-foreground text-lg font-bold">
                {event.stats.totalOrders || 0}
              </div>
              <div className="text-muted-foreground text-xs">Pedidos</div>
            </div>
          </div>
        )}

        {/* Action Area */}
        <div className="border-border/50 flex items-center justify-between border-t pt-4">
          <div className="text-muted-foreground text-xs">
            Creado {new Date(event.created_at).toLocaleDateString('es-AR')}
          </div>

          <div className="flex gap-2">
            <Link href={`/admin/events/${event.id}`}>
              <Button variant="ghost" size="sm" className="text-xs">
                <Eye className="mr-1 h-3 w-3" />
                Ver
              </Button>
            </Link>
            <Link href={`/admin/events/${event.id}/photos`}>
              <Button variant="ghost" size="sm" className="text-xs">
                <Camera className="mr-1 h-3 w-3" />
                Fotos
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={async () => {
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
              aria-label={`Generar watermarks del evento ${event.school}`}
            >
              Previews
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
