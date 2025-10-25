'use client';

import {
  CalendarCheck,
  Images,
  Users,
  CircleDollarSign,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { StatsCardSkeleton } from '@/components/ui/skeleton';
import { formatEventCurrency } from './utils';

interface EventStatsSummaryProps {
  totalEvents: number;
  totalPhotos: number;
  totalSubjects: number;
  totalRevenue: number;
  isLoading?: boolean;
}

const numberFormatter = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 0,
});

export const EventStatsSummary = ({
  totalEvents,
  totalPhotos,
  totalSubjects,
  totalRevenue,
  isLoading = false,
}: EventStatsSummaryProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatsCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: 'Eventos',
      description: 'Eventos visibles según filtros activos',
      icon: CalendarCheck,
      value: numberFormatter.format(totalEvents),
      tone: 'from-primary-500/15 via-primary-500/10 to-primary-500/5 text-primary-700 dark:text-primary-200',
    },
    {
      label: 'Fotografías',
      description: 'Conteo acumulado de fotos procesadas',
      icon: Images,
      value: numberFormatter.format(totalPhotos),
      tone: 'from-emerald-500/15 via-emerald-500/10 to-emerald-500/5 text-emerald-700 dark:text-emerald-200',
    },
    {
      label: 'Estudiantes',
      description: 'Sujetos únicos vinculados a los eventos',
      icon: Users,
      value: numberFormatter.format(totalSubjects),
      tone: 'from-sky-500/15 via-sky-500/10 to-sky-500/5 text-sky-700 dark:text-sky-200',
    },
    {
      label: 'Ingresos',
      description: 'Ingresos totales generados por los eventos',
      icon: CircleDollarSign,
      value: formatEventCurrency(totalRevenue),
      tone: 'from-amber-500/15 via-amber-500/10 to-amber-500/5 text-amber-700 dark:text-amber-200',
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, description, icon: Icon, value, tone }) => (
          <Card
            key={label}
            className="border-border/60 bg-gradient-to-br from-background via-background to-muted/40 shadow-sm transition-colors duration-200 focus-within:ring-2 focus-within:ring-primary-500/60 motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-none pb-4">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-colors hover:bg-muted"
                    aria-label={`Más información sobre ${label}`}
                  >
                    <Info className="h-4 w-4" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  {description}
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent className="flex items-end justify-between p-6 pt-0">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {value}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Actualizado en tiempo real
                </p>
              </div>
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr',
                  tone
                )}
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
};
