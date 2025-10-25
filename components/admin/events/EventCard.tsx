'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  CalendarDays,
  FolderImage,
  GraduationCap,
  CircleDollarSign,
  MoreHorizontal,
  Sparkle,
  Eye,
  Settings,
  Layers3,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { AdminEvent } from './types';
import {
  formatEventCurrency,
  formatEventDate,
  getEventDisplayName,
} from './utils';
import { EventThumbnail } from './EventThumbnail';

interface EventCardProps {
  event: AdminEvent;
  onQuickView: (event: AdminEvent) => void;
  onDeleteRequest: (event: AdminEvent) => void;
  isDeleting?: boolean;
}

const statusTone: Record<string, string> = {
  active:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  draft:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  completed:
    'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  archived:
    'border-border bg-muted text-muted-foreground dark:bg-muted/40',
  inactive:
    'border-border bg-muted text-muted-foreground dark:bg-muted/40',
  paused:
    'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
};

export const EventCard = ({
  event,
  onQuickView,
  onDeleteRequest,
  isDeleting = false,
}: EventCardProps) => {
  const displayName = useMemo(() => getEventDisplayName(event), [event]);
  const statusClassName = event.status
    ? statusTone[event.status] ?? 'border-border bg-muted text-muted-foreground'
    : 'border-border bg-muted text-muted-foreground';

  const metrics = [
    {
      label: 'Fecha',
      value: formatEventDate(event.date),
      icon: CalendarDays,
      tooltip: 'Fecha programada para el evento',
    },
    {
      label: 'Fotos',
      value: (event.stats?.totalPhotos ?? 0).toLocaleString('es-AR'),
      icon: FolderImage,
      tooltip: 'Fotos totales asociadas al evento',
    },
    {
      label: 'Estudiantes',
      value: (event.stats?.totalSubjects ?? 0).toLocaleString('es-AR'),
      icon: GraduationCap,
      tooltip: 'Estudiantes vinculados al evento',
    },
    {
      label: 'Ingresos',
      value: formatEventCurrency(event.stats?.totalRevenue ?? 0),
      icon: CircleDollarSign,
      tooltip: 'Ingresos estimados generados',
    },
  ];

  return (
    <Card
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-sm transition-colors',
        'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-xl motion-safe:focus-within:-translate-y-1',
        'focus-within:ring-2 focus-within:ring-primary-500/60'
      )}
    >
      <CardHeader className="space-y-4 border-none pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="line-clamp-1 text-base font-semibold text-foreground md:text-lg">
              {displayName}
            </CardTitle>
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkle className="h-4 w-4 text-primary-500" aria-hidden />
              Evento escolar
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-full border border-transparent text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary-500/60"
                aria-label={`Acciones rápidas para ${displayName}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href={`/admin/events/${event.id}/unified`}>
                  <Eye className="mr-2 h-4 w-4" /> Ver detalles
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/events/${event.id}/unified#photos`}>
                  <FolderImage className="mr-2 h-4 w-4" /> Gestionar fotos
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/store-settings?eventId=${event.id}`}>
                  <Settings className="mr-2 h-4 w-4" /> Configurar tienda
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/events/${event.id}/duplicate`}>
                  <Layers3 className="mr-2 h-4 w-4" /> Duplicar evento
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(eventSelect) => {
                  eventSelect.preventDefault();
                  onDeleteRequest(event);
                }}
                className="text-error-600 focus:text-error-600"
              >
                Eliminar evento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {event.status && (
          <Badge className={cn('w-fit border text-xs capitalize', statusClassName)}>
            {event.status}
          </Badge>
        )}
        <EventThumbnail
          event={event}
          className="w-full transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.02] motion-safe:group-focus-within:scale-[1.02]"
        />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4 p-6 xl:p-7 2xl:p-8">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-2 md:grid-cols-4 2xl:grid-cols-4">
          {metrics.map(({ label, value, icon: Icon, tooltip }) => (
            <Tooltip key={label} delayDuration={150}>
              <TooltipTrigger asChild>
                <div
                  className="group/metric flex flex-col gap-1 rounded-lg border border-transparent bg-muted/30 p-3 transition-colors duration-200 hover:border-border hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
                  tabIndex={0}
                  aria-label={`${label}: ${value}`}
                >
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    <Icon className="h-4 w-4 text-primary-500" aria-hidden />
                    {label}
                  </div>
                  <span className="text-base font-semibold text-foreground md:text-lg">
                    {value}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">{tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/20 p-4 xl:p-6">
        <Link href={`/admin/events/${event.id}/unified`}>
          <Button
            variant="secondary"
            size="sm"
            className="min-w-[140px] transition-transform duration-200 motion-safe:hover:-translate-y-0.5"
          >
            Ver detalles
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
            onClick={() => onQuickView(event)}
          >
            Vista rápida
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={isDeleting}
            className="transition-colors duration-200"
            onClick={() => onDeleteRequest(event)}
          >
            Eliminar
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
