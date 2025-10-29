'use client';

import Link from 'next/link';
import {
  Eye,
  Image,
  Settings,
  Layers3,
  AlertTriangle,
  CalendarDays,
  Users,
  CircleDollarSign,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { AdminEvent } from './types';
import {
  formatEventCurrency,
  formatEventDate,
  getEventDisplayName,
} from './utils';
import { EventThumbnail } from './EventThumbnail';

interface EventQuickActionsDialogProps {
  event: AdminEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteRequest: (event: AdminEvent) => void;
}

const statusTone: Record<string, string> = {
  active:
    'border-emerald-200 bg-emerald-100/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  draft:
    'border-amber-200 bg-amber-100/80 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  completed:
    'border-sky-200 bg-sky-100/80 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
  archived:
    'border-border bg-muted text-muted-foreground',
  inactive:
    'border-border bg-muted text-muted-foreground',
  paused:
    'border-purple-200 bg-purple-100/80 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
};

export const EventQuickActionsDialog = ({
  event,
  open,
  onOpenChange,
  onDeleteRequest,
}: EventQuickActionsDialogProps) => {
  if (!event) return null;

  const displayName = getEventDisplayName(event);
  const totalPhotos = event.stats?.totalPhotos ?? 0;
  const totalSubjects = event.stats?.totalSubjects ?? 0;
  const totalOrders = event.stats?.totalOrders ?? null;
  const completionRate = event.stats?.completionRate ?? null;
  const conversionRate = event.stats?.conversionRate ?? null;

  const normalizedCompletionRate =
    typeof completionRate === 'number'
      ? Math.max(0, Math.min(100, completionRate))
      : null;
  const normalizedConversionRate =
    typeof conversionRate === 'number'
      ? Math.max(
          0,
          Math.min(100, conversionRate <= 1 ? conversionRate * 100 : conversionRate)
        )
      : null;

  const hasInventory = totalPhotos > 0 || totalSubjects > 0;

  const metrics = [
    {
      label: 'Fecha programada',
      value: formatEventDate(event.date),
      icon: CalendarDays,
    },
    {
      label: 'Estudiantes vinculados',
      value: totalSubjects.toLocaleString('es-AR'),
      icon: Users,
    },
    {
      label: 'Ingresos estimados',
      value: formatEventCurrency(event.stats?.totalRevenue ?? 0),
      icon: CircleDollarSign,
    },
  ];

  const secondaryMetrics = [
    {
      label: 'Tasa de finalización',
      value:
        typeof normalizedCompletionRate === 'number' && normalizedCompletionRate > 0
          ? `${Math.round(normalizedCompletionRate)}%`
          : 'Sin datos',
      helper: 'Porcentaje de estudiantes que completaron su flujo',
    },
    {
      label: 'Conversión a compra',
      value:
        typeof normalizedConversionRate === 'number' && normalizedConversionRate > 0
          ? `${Math.round(normalizedConversionRate * 10) / 10}%`
          : 'Próximamente',
      helper: 'Pendiente de sincronizar con analytics',
    },
    {
      label: 'Pedidos totales',
      value:
        typeof totalOrders === 'number' && totalOrders > 0
          ? totalOrders.toLocaleString('es-AR')
          : 'Sin datos',
      helper: 'Pedidos ya confirmados para este evento',
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex h-full flex-col gap-6 overflow-y-auto bg-background/95 p-0 text-left sm:max-w-xl',
          'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in motion-safe:data-[state=open]:duration-200',
          'motion-safe:data-[state=open]:slide-in-from-right motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:slide-out-to-right'
        )}
      >
        <SheetHeader className="space-y-2 px-6 pt-6">
          <SheetTitle className="text-left text-xl font-semibold text-foreground">
            {displayName}
          </SheetTitle>
          <SheetDescription className="text-left text-sm text-muted-foreground">
            Accede a las acciones principales sin salir del flujo actual
          </SheetDescription>
          {event.status && (
            <Badge className={cn('w-fit border text-xs capitalize', statusTone[event.status] ?? '')}>
              {event.status}
            </Badge>
          )}
        </SheetHeader>

        <div className="px-6">
          <EventThumbnail event={event} className="w-full" aspectRatio="16/9" />
        </div>

        <div className="space-y-6 px-6">
          <section aria-labelledby="quick-actions-heading" className="space-y-3">
            <p id="quick-actions-heading" className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Acciones rápidas
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link 
                href={`/admin/events/${event.id}/unified`} 
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-secondary px-4 py-3 text-left transition-colors hover:bg-secondary/80"
              >
                <Eye className="h-4 w-4" /> Ver detalles
              </Link>
              <Link
                href={`/admin/events/${event.id}/unified#photos`}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-secondary px-4 py-3 text-left transition-colors hover:bg-secondary/80"
              >
                <Image className="h-4 w-4" /> Gestionar fotos
              </Link>
              <Link
                href={`/admin/store-settings?eventId=${event.id}`}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-secondary px-4 py-3 text-left transition-colors hover:bg-secondary/80"
              >
                <Settings className="h-4 w-4" /> Configurar tienda
              </Link>
              <Link 
                href={`/admin/events/${event.id}/duplicate`} 
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-secondary px-4 py-3 text-left transition-colors hover:bg-secondary/80"
              >
                <Layers3 className="h-4 w-4" /> Duplicar evento
              </Link>
            </div>
          </section>

          <Separator />

          <section aria-labelledby="metrics-heading" className="space-y-3">
            <p id="metrics-heading" className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Métricas clave
            </p>
            <div className="grid grid-cols-1 gap-3">
              {metrics.map(({ label, value, icon: Icon }) => (
                <Tooltip key={label} delayDuration={120}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary-600">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em]">{label}</p>
                          <p className="text-base font-semibold text-foreground md:text-lg">
                            {value}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </section>

          <section aria-labelledby="secondary-metrics-heading" className="space-y-3">
            <p
              id="secondary-metrics-heading"
              className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
            >
              Métricas secundarias
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {secondaryMetrics.map(({ label, value, helper }) => (
                <div
                  key={label}
                  className="flex flex-col gap-1 rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3 transition-colors duration-200 hover:border-border hover:bg-muted/20"
                >
                  <span className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {label}
                  </span>
                  <span className={cn('text-base font-semibold text-foreground', value === 'Próximamente' || value === 'Sin datos' ? 'text-muted-foreground' : '')}>
                    {value}
                  </span>
                  <span className="text-xs text-muted-foreground/80">{helper}</span>
                </div>
              ))}
            </div>
          </section>

          {hasInventory && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold">Este evento contiene contenido publicado</p>
                  <p className="text-sm text-amber-700/90 dark:text-amber-200/80">
                    Hay {totalPhotos.toLocaleString('es-AR')} fotos y {totalSubjects.toLocaleString('es-AR')} estudiantes vinculados. Al eliminarlo, se perderán todos los recursos asociados.
                  </p>
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                className="mt-4 transition-transform duration-200 motion-safe:hover:-translate-y-0.5"
                onClick={() => onDeleteRequest(event)}
              >
                Eliminar evento definitivamente
              </Button>
            </div>
          )}
        </div>

        <div className="mt-auto border-t border-border/60 bg-muted/20 px-6 py-4">
          <Button
            variant="ghost"
            className="w-full transition-colors duration-200 hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cerrar vista rápida
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
