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
  event_created: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  photos_uploaded: 'text-green-500 bg-green-50 dark:bg-green-900/20',
  order_created: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
  order_completed: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  subject_created: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
};

export function ActivityFeed({
  activities,
  isLoading,
  error,
  onRefresh,
}: ActivityFeedProps) {
  if (error) {
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
              <p className="text-muted-foreground mb-4 max-w-sm text-sm">
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
              <Activity className="text-muted-foreground h-4 w-4" />
            </button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <ActivityFeedSkeleton />
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <div className="bg-muted/50 text-muted-foreground rounded-full p-4">
              <Activity className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h3 className="text-foreground mb-2 font-medium">
                Sin actividad reciente
              </h3>
              <p className="text-muted-foreground max-w-sm text-sm">
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
                          <p className="text-muted-foreground mt-1 text-xs">
                            Evento: {activity.event_name}
                          </p>
                        )}
                      </div>

                      <time className="text-muted-foreground flex-shrink-0 text-xs">
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
