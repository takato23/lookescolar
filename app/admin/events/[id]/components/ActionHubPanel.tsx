'use client';

import { memo } from 'react';
import { MotionDiv } from '@/lib/dynamic-imports';
import {
  Upload,
  Users,
  Eye,
  QrCode,
  Settings,
  Package,
  Camera,
  Zap,
  Clock,
  Star,
  ChevronRight,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  WorkflowAction,
  EventPhase,
  WorkflowPriority,
} from '@/lib/stores/event-workflow-store';
import { useRouter } from 'next/navigation';

type ActionClickHandler = (arg: WorkflowAction) => void;

interface ActionHubPanelProps {
  nextActions: WorkflowAction[];
  currentPhase: EventPhase;
  eventId: string;
  onActionClick: ActionClickHandler;
}

export const ActionHubPanel = memo(function ActionHubPanel({
  nextActions,
  eventId,
  onActionClick,
}: ActionHubPanelProps) {
  const router = useRouter();

  const priorityConfig = {
    [WorkflowPriority.CRITICAL]: {
      color: 'red',
      label: 'Crítico',
      icon: '🚨',
    },
    [WorkflowPriority.HIGH]: {
      color: 'orange',
      label: 'Alto',
      icon: '⚡',
    },
    [WorkflowPriority.MEDIUM]: {
      color: 'blue',
      label: 'Medio',
      icon: '📋',
    },
    [WorkflowPriority.LOW]: {
      color: 'gray',
      label: 'Bajo',
      icon: '📝',
    },
    [WorkflowPriority.OPTIONAL]: {
      color: 'gray',
      label: 'Opcional',
      icon: '💡',
    },
  };

  const iconMap = {
    upload: Upload,
    tag: Settings,
    publish: Eye,
    organize: Users,
    review: Eye,
    export: Package,
    notify: Zap,
  };

  const quickActions = [
    {
      id: 'centralita-publish',
      title: 'Centralita Publicación',
      icon: Zap,
      color: 'purple',
      href: `/admin/publish?event_id=${eventId}&tab=overview`,
      description: 'Centro de control de publicación',
    },
    {
      id: 'event-photos',
      title: 'Gestión de Fotos',
      icon: Upload,
      color: 'blue',
      href: `/admin/photos?event_id=${eventId}`,
      description: 'Sistema unificado de gestión de fotos sin saltos',
    },
    {
      id: 'view-gallery',
      title: 'Ver Galería Pública',
      icon: Eye,
      color: 'purple',
      href: `/admin/publish?event_id=${eventId}&tab=public`,
      description: 'Gestionar y ver la galería del evento',
    },
    {
      id: 'photos-mgmt-classic',
      title: 'Gestión Clásica',
      icon: Camera,
      color: 'gray',
      href: `/admin/events/${eventId}/unified`,
      description: 'Interfaz tradicional de fotos',
    },
    {
      id: 'qr-codes',
      title: 'Códigos QR',
      icon: QrCode,
      color: 'amber',
      href: `/admin/events/${eventId}/qr`,
      description: 'Generar accesos familiares',
    },
    {
      id: 'orders',
      title: 'Ver Pedidos',
      icon: Package,
      color: 'green',
      href: `/admin/orders?event=${eventId}`,
      description: 'Gestionar compras y entregas',
    },
  ];

  return (
    <MotionDiv
      className="glass-action-hub"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Zap className="h-5 w-5 text-blue-500" />
          Centro de Acción
        </h3>
        <Badge variant="outline" className="glass-label-ios26">
          {nextActions.length} acciones
        </Badge>
      </div>

      {/* Priority Actions */}
      {nextActions.length > 0 && (
        <div className="mb-6 space-y-3">
          <h4 className="text-gray-500 dark:text-gray-400 flex items-center gap-2 text-sm font-medium">
            <Star className="h-4 w-4" />
            Acciones Prioritarias
          </h4>

          {nextActions.slice(0, 3).map((action, index) => {
            const ActionIcon = iconMap[action.type] || Settings;
            const priorityInfo = priorityConfig[action.priority];

            return (
              <MotionDiv
                key={action.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  variant="ghost"
                  className="glass-fab h-auto w-full justify-start p-4 transition-all hover:scale-[1.02]"
                  onClick={() => onActionClick(action)}
                >
                  <div className="flex w-full items-center gap-3">
                    <div
                      className={`rounded-lg p-2 bg-${action.color}-500/10 flex-shrink-0`}
                    >
                      <ActionIcon
                        className={`h-4 w-4 text-${action.color}-500`}
                      />
                    </div>

                    <div className="flex-1 text-left">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {action.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={`glass-label-ios26 text-xs border-${priorityInfo.color}-300 text-${priorityInfo.color}-700`}
                        >
                          {priorityInfo.icon} {priorityInfo.label}
                        </Badge>
                      </div>

                      <p className="text-gray-500 dark:text-gray-400 line-clamp-2 text-xs">
                        {action.description}
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <Clock className="text-gray-500 dark:text-gray-400 h-3 w-3" />
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          ~{action.estimatedTime} min
                        </span>
                        {action.automatable && (
                          <Badge variant="secondary" className="text-xs">
                            Auto
                          </Badge>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="text-gray-500 dark:text-gray-400 h-4 w-4 flex-shrink-0" />
                  </div>
                </Button>
              </MotionDiv>
            );
          })}
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="space-y-3">
        <h4 className="text-gray-500 dark:text-gray-400 text-sm font-medium">
          Acciones Rápidas
        </h4>

        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <MotionDiv
              key={action.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <Button
                variant="outline"
                className="glass-fab h-auto w-full flex-col gap-2 p-3 transition-transform hover:scale-105"
                onClick={() => router.push(action.href)}
              >
                <action.icon className={`h-5 w-5 text-${action.color}-500`} />
                <span className="text-xs font-medium">{action.title}</span>
              </Button>
            </MotionDiv>
          ))}
        </div>
      </div>

      {/* AI Suggestions Teaser */}
      {nextActions.some((action) => action.aiSuggestion) && (
        <MotionDiv
          className="mt-6 rounded-xl border border-purple-300/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
              IA puede automatizar esta acción
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
            {nextActions.find((action) => action.aiSuggestion)?.aiSuggestion}
          </p>
        </MotionDiv>
      )}
    </MotionDiv>
  );
});
