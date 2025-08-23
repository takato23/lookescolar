'use client';

import { motion } from 'framer-motion';
import { 
  Upload, Users, Eye, QrCode, Settings, Package, Camera,
  Zap, Clock, ArrowRight, Play, Star, ChevronRight, Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkflowAction, EventPhase, WorkflowPriority } from '@/lib/stores/event-workflow-store';
import { useRouter } from 'next/navigation';

interface ActionHubPanelProps {
  nextActions: WorkflowAction[];
  currentPhase: EventPhase;
  eventId: string;
  onActionClick: (action: WorkflowAction) => void;
}

export function ActionHubPanel({ nextActions, currentPhase, eventId, onActionClick }: ActionHubPanelProps) {
  const router = useRouter();
  
  const priorityConfig = {
    [WorkflowPriority.CRITICAL]: {
      color: 'red',
      label: 'Crítico',
      icon: '🚨'
    },
    [WorkflowPriority.HIGH]: {
      color: 'orange', 
      label: 'Alto',
      icon: '⚡'
    },
    [WorkflowPriority.MEDIUM]: {
      color: 'blue',
      label: 'Medio', 
      icon: '📋'
    },
    [WorkflowPriority.LOW]: {
      color: 'gray',
      label: 'Bajo',
      icon: '📝'
    },
    [WorkflowPriority.OPTIONAL]: {
      color: 'gray',
      label: 'Opcional',
      icon: '💡'
    }
  };

  const iconMap = {
    upload: Upload,
    tag: Settings,
    publish: Eye,
    organize: Users,
    review: Eye,
    export: Package,
    notify: Zap
  };

  const quickActions = [
    {
      id: 'event-library',
      title: 'Biblioteca de Fotos',
      icon: Upload,
      color: 'blue',
      href: `/admin/events/${eventId}/library`,
      description: 'Nueva interfaz con organización por carpetas'
    },
    {
      id: 'view-gallery',
      title: 'Ver Galería Pública',
      icon: Eye,
      color: 'purple',
      href: `/gallery/${eventId}`,
      description: 'Vista previa de la galería familiar'
    },
    {
      id: 'photos-mgmt-classic',
      title: 'Gestión Clásica',
      icon: Camera,
      color: 'gray',
      href: `/admin/photos?eventId=${eventId}`,
      description: 'Interfaz tradicional de fotos'
    },
    {
      id: 'qr-codes',
      title: 'Códigos QR',
      icon: QrCode,
      color: 'amber',
      href: `/admin/events/${eventId}/qr`,
      description: 'Generar accesos familiares'
    },
    {
      id: 'orders',
      title: 'Ver Pedidos', 
      icon: Package,
      color: 'green',
      href: `/admin/orders?event=${eventId}`,
      description: 'Gestionar compras y entregas'
    }
  ];

  return (
    <motion.div
      className="glass-action-hub"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-500" />
          Centro de Acción
        </h3>
        <Badge variant="outline" className="glass-label-ios26">
          {nextActions.length} acciones
        </Badge>
      </div>

      {/* Priority Actions */}
      {nextActions.length > 0 && (
        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Star className="h-4 w-4" />
            Acciones Prioritarias
          </h4>
          
          {nextActions.slice(0, 3).map((action, index) => {
            const ActionIcon = iconMap[action.type] || Settings;
            const priorityInfo = priorityConfig[action.priority];
            
            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  variant="ghost"
                  className="w-full h-auto p-4 justify-start glass-fab hover:scale-[1.02] transition-all"
                  onClick={() => onActionClick(action)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className={`p-2 rounded-lg bg-${action.color}-500/10 flex-shrink-0`}>
                      <ActionIcon className={`h-4 w-4 text-${action.color}-500`} />
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{action.title}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs glass-label-ios26 border-${priorityInfo.color}-300 text-${priorityInfo.color}-700`}
                        >
                          {priorityInfo.icon} {priorityInfo.label}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {action.description}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          ~{action.estimatedTime} min
                        </span>
                        {action.automatable && (
                          <Badge variant="secondary" className="text-xs">
                            Auto
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Acciones Rápidas</h4>
        
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <Button
                variant="outline"
                className="h-auto w-full p-3 flex-col gap-2 glass-fab hover:scale-105 transition-transform"
                onClick={() => router.push(action.href)}
              >
                <action.icon className={`h-5 w-5 text-${action.color}-500`} />
                <span className="text-xs font-medium">{action.title}</span>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Suggestions Teaser */}
      {nextActions.some(action => action.aiSuggestion) && (
        <motion.div
          className="mt-6 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-300/20"
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
          <p className="text-xs text-muted-foreground mt-1">
            {nextActions.find(action => action.aiSuggestion)?.aiSuggestion}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}