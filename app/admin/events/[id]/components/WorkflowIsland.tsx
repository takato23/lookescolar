'use client';

import { motion } from 'framer-motion';
import { 
  Target, ArrowRight, Play, CheckCircle2, Clock, 
  Lightbulb, Zap, Brain, ChevronRight, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { WorkflowAction, EventPhase, SmartSuggestion } from '@/lib/stores/event-workflow-store';
import { useRouter } from 'next/navigation';

interface WorkflowIslandProps {
  currentPhase: EventPhase;
  phaseInfo: {
    title: string;
    description: string;
    color: string;
    icon: any;
  };
  nextActions: WorkflowAction[];
  progressPercentage: number;
  smartSuggestions: SmartSuggestion[];
  onSuggestionAction: (suggestion: SmartSuggestion) => void;
  eventId?: string; // Add eventId prop for navigation
}

export function WorkflowIsland({
  currentPhase,
  phaseInfo,
  nextActions,
  progressPercentage,
  smartSuggestions,
  onSuggestionAction,
  eventId
}: WorkflowIslandProps) {
  
  const router = useRouter();
  const PhaseIcon = phaseInfo.icon;
  const nextAction = nextActions[0];
  const mainSuggestion = smartSuggestions[0];

  // Function to handle action execution
  const handleActionExecution = (action: WorkflowAction) => {
    console.log('Executing action:', action);
    
    // Route based on action type and ID
    switch (action.type) {
      case 'upload':
        if (eventId) {
          router.push(`/admin/photos?eventId=${eventId}`);
        } else {
          router.push('/admin/photos');
        }
        break;
      case 'tag':
        if (eventId) {
          router.push(`/admin/events/${eventId}/tagging`);
        } else {
          router.push('/admin/tagging');
        }
        break;
      case 'organize':
        if (eventId) {
          router.push(`/admin/events/${eventId}/students`);
        } else {
          router.push('/admin/subjects');
        }
        break;
      case 'publish':
        if (eventId) {
          router.push(`/admin/events/${eventId}/publish`);
        } else {
          router.push('/admin/publish');
        }
        break;
      case 'review':
        if (eventId) {
          router.push(`/admin/events/${eventId}/photos`);
        } else {
          router.push('/admin/photos');
        }
        break;
      case 'export':
        if (eventId) {
          router.push(`/admin/orders?event=${eventId}`);
        } else {
          router.push('/admin/orders');
        }
        break;
      case 'notify':
        // Could show a notification modal or navigate to communication panel
        console.log('Showing notification form for action:', action);
        break;
      default:
        console.log('Unknown action type:', action.type);
        // Fallback - try to navigate to a relevant page
        if (action.id === 'upload-photos') {
          router.push('/admin/photos');
        } else if (action.id === 'setup-students') {
          router.push('/admin/subjects');
        }
    }
  };

  const phaseMessages = {
    setup: "Configurando los fundamentos para un evento exitoso",
    content_upload: "Organizando y procesando el contenido visual",
    organization: "Estructurando accesos y preparando distribución", 
    publishing: "Activando la experiencia para las familias",
    active_sales: "Impulsando participación y optimizando conversiones",
    fulfillment: "Procesando pedidos y completando entregas",
    completed: "Evento completado exitosamente"
  };

  const getPhaseProgress = () => {
    const phaseOrder = ['setup', 'content_upload', 'organization', 'publishing', 'active_sales', 'fulfillment', 'completed'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    return ((currentIndex + 1) / phaseOrder.length) * 100;
  };

  return (
    <motion.div
      className="glass-workflow-island"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header with Phase Info */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl bg-${phaseInfo.color}-500/10 border border-${phaseInfo.color}-300/20`}>
            <PhaseIcon className={`h-6 w-6 text-${phaseInfo.color}-500`} />
          </div>
          
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl font-bold gradient-text-ios26">
                {phaseInfo.title}
              </h3>
              <Badge 
                variant="outline" 
                className={`glass-label-ios26 border-${phaseInfo.color}-300 text-${phaseInfo.color}-700`}
              >
                Activa
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {phaseMessages[currentPhase] || phaseInfo.description}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Progreso general</span>
            <span className="text-lg font-bold gradient-text-ios26">
              {Math.round(getPhaseProgress())}%
            </span>
          </div>
          <Progress 
            value={getPhaseProgress()} 
            className={`w-24 h-2 bg-${phaseInfo.color}-100`}
          />
        </div>
      </div>

      {/* Current Status and Next Action */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Current Status */}
        <motion.div
          className="p-4 rounded-xl bg-white/5 border border-white/10"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-blue-500" />
            <span className="font-medium">Estado Actual</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Configuración</span>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">Completado</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Contenido</span>
              <div className="flex items-center gap-1">
                {currentPhase !== 'setup' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">En progreso</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-muted-foreground">Pendiente</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Publicación</span>
              <div className="flex items-center gap-1">
                {['publishing', 'active_sales', 'fulfillment', 'completed'].includes(currentPhase) ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Activo</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-muted-foreground">Pendiente</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Next Action */}
        {nextAction && (
          <motion.div
            className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-300/20"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Play className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Próxima Acción</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-blue-700 dark:text-blue-300">
                  {nextAction.title}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {nextAction.description}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {nextAction.estimatedTime} min
                  </span>
                </div>
                
                {nextAction.automatable && (
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    Automatizable
                  </Badge>
                )}
              </div>
              
              <Button 
                className="w-full glass-fab"
                onClick={() => {
                  handleActionExecution(nextAction);
                }}
              >
                Comenzar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Smart Suggestion */}
      {mainSuggestion && (
        <motion.div
          className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-300/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <span className="font-medium text-purple-700 dark:text-purple-300">
                  Sugerencia Inteligente
                </span>
                <Badge variant="outline" className="glass-label-ios26 border-purple-300 text-purple-700">
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA
                </Badge>
              </div>
              
              <h4 className="font-semibold mb-1">{mainSuggestion.title}</h4>
              <p className="text-sm text-muted-foreground mb-2">
                {mainSuggestion.description}
              </p>
              
              <div className="flex items-center gap-4 mb-3">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    mainSuggestion.impact === 'high' ? 'border-green-300 text-green-700' :
                    mainSuggestion.impact === 'medium' ? 'border-yellow-300 text-yellow-700' :
                    'border-blue-300 text-blue-700'
                  }`}
                >
                  {mainSuggestion.impact === 'high' ? '🎯 Alto Impacto' : 
                   mainSuggestion.impact === 'medium' ? '📊 Impacto Medio' : '💡 Bajo Impacto'}
                </Badge>
                
                <Badge 
                  variant="outline"
                  className={`text-xs ${
                    mainSuggestion.effort === 'low' ? 'border-green-300 text-green-700' :
                    mainSuggestion.effort === 'medium' ? 'border-yellow-300 text-yellow-700' :
                    'border-red-300 text-red-700'
                  }`}
                >
                  {mainSuggestion.effort === 'low' ? '⚡ Fácil' :
                   mainSuggestion.effort === 'medium' ? '⚖️ Moderado' : '🔥 Intenso'}
                </Badge>
              </div>
              
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-3">
                💫 {mainSuggestion.expectedOutcome}
              </p>
            </div>
            
            <Button
              variant="outline"
              className="glass-fab ml-4"
              onClick={() => onSuggestionAction(mainSuggestion)}
            >
              Aplicar
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Progress Indicator */}
      <motion.div
        className="mt-6 flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <span>
            {nextActions.length > 0 
              ? `${nextActions.length} acciones pendientes` 
              : 'Todas las acciones completadas'
            }
          </span>
        </div>
        
        <Button variant="ghost" size="sm" className="text-xs">
          Ver flujo completo
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </motion.div>
    </motion.div>
  );
}