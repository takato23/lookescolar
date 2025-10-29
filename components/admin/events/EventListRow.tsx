'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  CalendarDays,
  Image,
  GraduationCap,
  CircleDollarSign,
  Eye,
  MoreHorizontal,
  Settings,
  Layers3,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

interface EventListRowProps {
  event: AdminEvent;
  onQuickView: (event: AdminEvent) => void;
  onDeleteRequest: (event: AdminEvent) => void;
  isDeleting?: boolean;
  density?: 'comfortable' | 'compact' | 'dense';
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

export const EventListRow = ({
  event,
  onQuickView,
  onDeleteRequest,
  isDeleting = false,
  density = 'comfortable',
}: EventListRowProps) => {
  const displayName = useMemo(() => getEventDisplayName(event), [event]);
  const statusClassName = event.status
    ? statusTone[event.status] ?? 'border-border bg-muted text-muted-foreground'
    : 'border-border bg-muted text-muted-foreground';

  const metrics = [
    {
      label: 'Fecha',
      value: formatEventDate(event.date),
      icon: CalendarDays,
    },
    {
      label: 'Fotos',
      value: (event.stats?.totalPhotos ?? 0).toLocaleString('es-AR'),
      icon: Image,
    },
    {
      label: 'Estudiantes',
      value: (event.stats?.totalSubjects ?? 0).toLocaleString('es-AR'),
      icon: GraduationCap,
    },
    {
      label: 'Ingresos',
      value: formatEventCurrency(event.stats?.totalRevenue ?? 0),
      icon: CircleDollarSign,
    },
  ];

  return (
    <Card
      data-density={density}
      className={cn(
        'group relative flex w-full items-center gap-4 rounded-xl border border-border/60 bg-card/95 px-4 py-3 text-left shadow-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
        'md:px-5 xl:px-6 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg motion-safe:focus-within:-translate-y-0.5',
        'hover:border-primary-200/80',
        'group-data-[density=compact]:gap-3 group-data-[density=compact]:px-3 group-data-[density=compact]:py-2 group-data-[density=compact]:md:px-4',
        'group-data-[density=dense]:gap-2 group-data-[density=dense]:px-2 group-data-[density=dense]:py-2 group-data-[density=dense]:md:px-3'
      )}
      role="row"
      tabIndex={0}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
          keyboardEvent.preventDefault();
          onQuickView(event);
        }
      }}
      aria-label={`Evento ${displayName}`}
    >
      <div className="hidden flex-shrink-0 sm:block">
        <EventThumbnail
          event={event}
          aspectRatio="1/1"
          className="w-20 transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.03] motion-safe:group-focus-within:scale-[1.03]"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground md:text-lg">
              {displayName}
            </p>
            <p className="text-sm text-muted-foreground md:text-base">
              {formatEventDate(event.date)}
            </p>
          </div>
          {event.status && (
            <Badge className={cn('border text-xs capitalize', statusClassName)}>
              {event.status}
            </Badge>
          )}
        </div>

        <div className="grid w-full grid-cols-2 gap-3 text-sm sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 group-data-[density=compact]:gap-2 group-data-[density=dense]:gap-1.5">
          {metrics.map(({ label, value, icon: Icon }) => (
            <Tooltip key={label} delayDuration={150}>
              <TooltipTrigger asChild>
                <div
                  tabIndex={0}
                  className={cn(
                    'group/metric flex items-center gap-3 rounded-lg border border-transparent bg-muted/20 px-3 py-2 transition-colors duration-200',
                    'hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60'
                  )}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary-600">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-muted-foreground group-data-[density=dense]:tracking-[0.14em]">
                      {label}
                    </span>
                    <span className="truncate text-sm font-semibold text-foreground group-data-[density=compact]:text-[0.95rem] group-data-[density=dense]:text-xs">
                      {value}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <Link href={`/admin/events/${event.id}/unified`}>
          <Button
            variant="secondary"
            size="sm"
            className="hidden sm:inline-flex transition-transform duration-200 motion-safe:hover:-translate-y-0.5"
            aria-label={`Ir a detalles de ${displayName}`}
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver detalles
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
          aria-label={`Abrir vista rápida de ${displayName}`}
          onClick={() => onQuickView(event)}
        >
          Vista rápida
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-full border border-transparent text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary-500/60"
              aria-label={`Más acciones para ${displayName}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <Link href={`/admin/events/${event.id}/unified`} className="flex items-center">
                <Eye className="mr-2 h-4 w-4" /> Ver detalles
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href={`/admin/events/${event.id}/unified#photos`} className="flex items-center">
                <Image className="mr-2 h-4 w-4" /> Gestionar fotos
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href={`/admin/store-settings?eventId=${event.id}`} className="flex items-center">
                <Settings className="mr-2 h-4 w-4" /> Configurar tienda
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href={`/admin/events/${event.id}/duplicate`} className="flex items-center">
                <Layers3 className="mr-2 h-4 w-4" /> Duplicar evento
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(itemEvent) => {
                itemEvent.preventDefault();
                onDeleteRequest(event);
              }}
              className="text-error-600 focus:text-error-600"
            >
              Eliminar evento
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="danger"
          size="sm"
          loading={isDeleting}
          className="transition-colors duration-200"
          aria-label={`Eliminar ${displayName}`}
          onClick={() => onDeleteRequest(event)}
        >
          Eliminar
        </Button>
      </div>
    </Card>
  );
};
