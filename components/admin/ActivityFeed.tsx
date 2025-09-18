'use client';

import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { ActivityFeedSkeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/utils';
import {
  Activity,
  Calendar,
  Camera,
  ShoppingCart,
  Package,
  Users,
  CheckCircle,
} from 'lucide-react';

interface Activity {
  id: string;
  type:
    | 'event_created'
    | 'photos_uploaded'
    | 'order_created'
    | 'order_completed'
    | 'subject_created';
  message: string;
  timestamp: string;
  event_id?: string;
  event_name?: string;
  count?: number;
  user?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  compact?: boolean;
}

// Map de iconos por tipo de actividad
const activityIcons = {
  event_created: Calendar,
  photos_uploaded: Camera,
  order_created: ShoppingCart,
  order_completed: CheckCircle,
  subject_created: Users,
};

// Map de colores por tipo
const activityColors = {
  event_created: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20',
  photos_uploaded: 'text-green-600 bg-green-50 dark:bg-green-950/20',
  order_created: 'text-primary-600 bg-primary-50 dark:bg-primary-950/20',
  order_completed: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20',
  subject_created: 'text-purple-600 bg-purple-50 dark:bg-purple-950/20',
};

export function ActivityFeed({
  activities,
  isLoading,
  error,
  onRefresh,
  compact = false,
}: ActivityFeedProps) {
  if (error) {
    if (compact) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="rounded-full bg-red-50 dark:bg-red-900/20 p-3">
            <Activity className="h-6 w-6 text-red-500" />
          </div>
          <div className="text-center">
            <h3 className="text-foreground dark:text-white mb-2 text-sm font-medium">
              Error al cargar actividad
            </h3>
            <p className="text-muted-foreground dark:text-gray-400 mb-3 max-w-sm text-xs">
              No se pudo cargar la actividad reciente.
            </p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Reintentar
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <Card variant="glass" className="noise">
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary-500" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <div className="rounded-full bg-red-50 p-4 text-red-500 dark:bg-red-900/20">
              <Activity className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h3 className="text-foreground mb-2 font-medium">
                Error al cargar actividad
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm text-sm">
                No se pudo cargar la actividad reciente. Intentalo de nuevo.
              </p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="text-sm text-primary-500 transition-colors hover:text-primary-700"
                >
                  Reintentar
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Modo compact - sin Card wrapper
  if (compact) {
    return (
      <div>
        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="bg-muted dark:bg-gray-700 h-8 w-8 rounded animate-pulse"></div>
                <div className="flex-1 space-y-1">
                  <div className="bg-muted dark:bg-gray-700 h-3 rounded animate-pulse"></div>
                  <div className="bg-muted dark:bg-gray-700 h-2 w-2/3 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-6">
            <div className="bg-muted dark:bg-gray-800 text-gray-400 rounded-full p-3">
              <Activity className="h-5 w-5" />
            </div>
            <div className="text-center">
              <h3 className="text-foreground dark:text-white mb-1 text-sm font-medium">
                Sin actividad reciente
              </h3>
              <p className="text-muted-foreground dark:text-gray-400 max-w-sm text-xs">
                Las actividades recientes aparecerán aquí.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {activities.slice(0, 5).map((activity) => {
              const IconComponent = activityIcons[activity.type];
              const colorClasses = activityColors[activity.type];

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className={`rounded-md p-1.5 ${colorClasses}`}>
                    <IconComponent className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground dark:text-white text-sm leading-tight">
                      {activity.message}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
            {onRefresh && (
              <div className="pt-2 border-t border-border dark:border-gray-700">
                <button
                  onClick={onRefresh}
                  className="w-full text-center text-blue-600 dark:text-blue-400 text-xs hover:underline py-2"
                >
                  Ver más actividades
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card variant="glass" className="noise">
      <CardHeader>
        <CardTitle as="h2" className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary-500" />
            Actividad Reciente
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="hover:bg-muted/50 rounded-lg p-1 transition-colors"
              title="Actualizar"
            >
              <Activity className="text-gray-500 dark:text-gray-400 h-4 w-4" />
            </button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <ActivityFeedSkeleton />
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <div className="bg-muted/50 text-gray-500 dark:text-gray-400 rounded-full p-4">
              <Activity className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h3 className="text-foreground mb-2 font-medium">
                Sin actividad reciente
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm">
                Cuando empieces a usar el sistema, aquí verás tus últimas
                acciones.
              </p>
            </div>
          </div>
        ) : (
          <div className="scrollbar-elevated max-h-[60vh] space-y-1 overflow-auto pr-1">
            {activities.map((activity) => {
              const IconComponent = activityIcons[activity.type];
              const colorClasses = activityColors[activity.type];

              return (
                <div
                  key={activity.id}
                  className="hover:bg-muted/30 group flex items-start gap-3 rounded-lg p-3 transition-colors"
                >
                  <div
                    className={`flex-shrink-0 rounded-lg p-2 ${colorClasses}`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground text-sm font-medium transition-colors group-hover:text-primary-600">
                          {activity.message}
                        </p>

                        {activity.event_name && (
                          <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                            Evento: {activity.event_name}
                          </p>
                        )}
                      </div>

                      <time className="text-gray-500 dark:text-gray-400 flex-shrink-0 text-xs">
                        {formatRelativeTime(activity.timestamp)}
                      </time>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
