'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Camera,
  Package,
  Tag,
  Clock,
  ArrowUpRight,
  Activity as ActivityIcon,
} from 'lucide-react';

interface Activity {
  id: string;
  type:
    | 'event_created'
    | 'photos_uploaded'
    | 'order_created'
    | 'order_completed';
  message: string;
  timestamp: string;
  eventId?: string;
  count?: number;
}

interface RecentActivityProps {
  activities: Activity[];
}

const activityConfig = {
  event_created: {
    icon: Calendar,
    color: 'text-primary-600 bg-primary-50',
  },
  photos_uploaded: {
    icon: Camera,
    color: 'text-blue-600 bg-blue-50',
  },
  order_created: {
    icon: Package,
    color: 'text-green-600 bg-green-50',
  },
  order_completed: {
    icon: Tag,
    color: 'text-purple-600 bg-purple-50',
  },
} as const;

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return 'Hace unos segundos';
  if (minutes === 1) return 'Hace 1 minuto';
  if (minutes < 60) return `Hace ${minutes} minutos`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'Hace 1 hora';
  if (hours < 24) return `Hace ${hours} horas`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hace 1 día';
  if (days < 7) return `Hace ${days} días`;

  return date.toLocaleDateString('es-ES');
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const sortedActivities = useMemo(() => {
    return activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activities]);

  if (activities.length === 0) {
    return (
      <div className="py-12 text-center">
        <ActivityIcon className="text-gray-500 dark:text-gray-400 mx-auto mb-4 h-12 w-12" />
        <h3 className="text-foreground mb-2 font-medium">
          Sin actividad reciente
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Cuando uses el sistema, aquí verás tu actividad reciente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedActivities.map((activity) => {
        const config = activityConfig[activity.type];
        const Icon = config.icon;

        return (
          <div
            key={activity.id}
            className="hover:bg-muted/50 flex items-start gap-3 rounded-lg p-3 transition-colors"
          >
            <div className={`rounded-lg p-2 ${config.color}`}>
              <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-foreground mb-1 text-sm font-medium">
                {activity.message}
              </p>
              <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3" />
                {formatTimeAgo(activity.timestamp)}
              </div>
            </div>

            <Button variant="ghost" size="sm" aria-label="Ver detalles">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
