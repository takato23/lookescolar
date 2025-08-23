'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, MapPin, DollarSign, Camera, Users, ShoppingCart, 
  ArrowLeft, Upload, QrCode, Eye, AlertCircle, RefreshCw, 
  Home, TrendingUp, Zap, Brain, Target, Clock, CheckCircle2,
  AlertTriangle, Info, Sparkles, ArrowRight, Play, Pause,
  BarChart3, Settings, Download
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useEventManagement, EventPhase, WorkflowPriority } from '@/lib/stores/event-workflow-store';

// Import enhanced components
import { HealthMetricsIsland } from './components/HealthMetricsIsland';
import { ActionHubPanel } from './components/ActionHubPanel';
import { WorkflowIsland } from './components/WorkflowIsland';
import { ContextSidebar } from './components/ContextSidebar';
import { SmartNotifications } from './components/SmartNotifications';
import { QualityAssurance } from './components/QualityAssurance';

export default function HolisticEventDashboard() {
  const params = useParams();
  const router = useRouter();
  const id = params['id'] as string;
  
  // Zustand store
  const {
    eventInfo,
    metrics,
    currentPhase,
    nextActions,
    qualityIssues,
    smartSuggestions,
    activeView,
    contextualPanel,
    notificationQueue,
    syncStatus,
    initializeEvent,
    setActiveView,
    setContextualPanel,
    getProgressPercentage,
    getCurrentPriorities,
    getHealthScore
  } = useEventManagement();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      initializeEvent(id)
        .then(() => setLoading(false))
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [id, initializeEvent]);

  if (loading) {
    return (
      <div className="liquid-nav-ultra-thin">
        <div className="glass-work-canvas">
          <motion.div 
            className="flex items-center justify-center min-h-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="glass-health-island text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-lg font-medium gradient-text-ios26">Iniciando sistema holístico...</p>
              <p className="text-sm text-muted-foreground mt-2">Analizando estado del evento</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error || !eventInfo) {
    return (
      <div className="liquid-nav-ultra-thin">
        <div className="glass-work-canvas">
          <motion.div 
            className="flex items-center justify-center min-h-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="glass-health-island border-red-200 bg-red-50/10">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-red-700">Error al cargar evento</p>
              <p className="text-sm text-red-600 mt-2">{error || 'Evento no encontrado'}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/admin/events')}
              >
                Volver a eventos
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const phaseConfig = {
    [EventPhase.SETUP]: {
      title: 'Configuración Inicial',
      icon: Settings,
      color: 'blue',
      description: 'Estableciendo fundamentos del evento'
    },
    [EventPhase.CONTENT_UPLOAD]: {
      title: 'Carga de Contenido',
      icon: Upload,
      color: 'green',
      description: 'Subiendo y organizando fotos'
    },
    [EventPhase.ORGANIZATION]: {
      title: 'Organización',
      icon: Users,
      color: 'purple',
      description: 'Estructurando datos y accesos'
    },
    [EventPhase.PUBLISHING]: {
      title: 'Publicación',
      icon: Eye,
      color: 'blue',
      description: 'Preparando acceso público'
    },
    [EventPhase.ACTIVE_SALES]: {
      title: 'Ventas Activas',
      icon: TrendingUp,
      color: 'green',
      description: 'Impulsando participación'
    },
    [EventPhase.FULFILLMENT]: {
      title: 'Cumplimiento',
      icon: ShoppingCart,
      color: 'orange',
      description: 'Procesando pedidos'
    },
    [EventPhase.COMPLETED]: {
      title: 'Completado',
      icon: CheckCircle2,
      color: 'green',
      description: 'Evento finalizado exitosamente'
    }
  };

  const currentPhaseInfo = phaseConfig[currentPhase];
  const progressPercentage = getProgressPercentage();
  const healthScore = getHealthScore();
  const priorityActions = getCurrentPriorities();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-blue-950/30 dark:to-purple-950/20">
      {/* Ultra-thin Navigation */}
      <nav className="liquid-nav-ultra-thin">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/events')}
              className="rounded-full p-2 hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/admin" className="hover:text-blue-500 transition-colors">
                  <Home className="h-4 w-4" />
                </Link>
                <span>/</span>
                <Link href="/admin/events" className="hover:text-blue-500 transition-colors">
                  Eventos
                </Link>
                <span>/</span>
              </div>
              
              <h1 className="text-xl font-bold gradient-text-ios26">
                {eventInfo.school || eventInfo.name}
              </h1>
              
              <Badge variant="outline" className="glass-label-ios26">
                {currentPhaseInfo.title}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-muted-foreground">
                Sincronizado {new Date().toLocaleTimeString('es-AR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => initializeEvent(id)}
              className="glass-fab"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Context Sidebar */}
      <ContextSidebar 
        eventInfo={eventInfo}
        metrics={metrics}
        currentPhase={currentPhase}
        healthScore={healthScore}
      />

      {/* Main Work Canvas */}
      <main className="glass-work-canvas">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-8"
        >
          {/* Smart Notifications */}
          <AnimatePresence>
            {notificationQueue.length > 0 && (
              <SmartNotifications notifications={notificationQueue} />
            )}
          </AnimatePresence>

          {/* Health Metrics Islands */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <HealthMetricsIsland 
                metrics={metrics}
                healthScore={healthScore}
                currentPhase={currentPhase}
                onViewDetails={(metric) => setContextualPanel(metric)}
              />
            </div>
            
            <div>
              <ActionHubPanel 
                eventId={id}
                nextActions={priorityActions}
                currentPhase={currentPhase}
                onActionClick={(action) => {
                  // Handle action execution based on action type
                  switch (action.type) {
                    case 'upload':
                      router.push(`/admin/photos?eventId=${id}`);
                      break;
                    case 'tag':
                      router.push(`/admin/photos?eventId=${id}`);
                      break;
                    case 'publish':
                      router.push(`/admin/events/${id}/publish`);
                      break;
                    case 'organize':
                      router.push(`/admin/events/${id}/students`);
                      break;
                    case 'review':
                      router.push(`/admin/events/${id}/photos`);
                      break;
                    case 'export':
                      router.push(`/admin/orders?event=${id}`);
                      break;
                    case 'notify':
                      // Show notification modal or form
                      console.log('Showing notification form for action:', action);
                      break;
                    default:
                      console.log('Executing action:', action);
                  }
                }}
              />
            </div>
          </div>

          {/* Intelligent Workflow Island */}
          <WorkflowIsland
            currentPhase={currentPhase}
            phaseInfo={currentPhaseInfo}
            nextActions={priorityActions}
            progressPercentage={progressPercentage}
            smartSuggestions={smartSuggestions.slice(0, 1)} // Show most important suggestion
            eventId={id} // Pass the event ID for navigation
            onSuggestionAction={(suggestion) => {
              // Execute the suggestion action
              suggestion.action();
              // Refresh the data after action execution
              initializeEvent(id);
            }}
          />

          {/* Quality Assurance Panel */}
          <QualityAssurance 
            eventId={id}
            issues={qualityIssues}
            onRefresh={() => initializeEvent(id)}
            onResolveIssue={async (issueId) => {
              try {
                // Handle issue resolution by calling the appropriate API
                const response = await fetch(`/api/admin/issues/${issueId}/resolve`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });
                
                if (response.ok) {
                  // Refresh the data after successful resolution
                  await initializeEvent(id);
                } else {
                  console.error('Failed to resolve issue:', await response.text());
                }
              } catch (error) {
                console.error('Error resolving issue:', error);
              }
            }}
            onDismissIssue={async (issueId) => {
              try {
                // Handle issue dismissal by calling the appropriate API
                const response = await fetch(`/api/admin/issues/${issueId}/dismiss`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });
                
                if (response.ok) {
                  // Refresh the data after successful dismissal
                  await initializeEvent(id);
                } else {
                  console.error('Failed to dismiss issue:', await response.text());
                }
              } catch (error) {
                console.error('Error dismissing issue:', error);
              }
            }}
          />

          {/* Dynamic Content Areas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity Stream */}
            <motion.div
              className="glass-health-island"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Actividad Reciente
                </h3>
                <Badge variant="outline" className="glass-label-ios26">
                  Tiempo Real
                </Badge>
              </div>
              
              <div className="space-y-3">
                {[
                  { action: 'Fotos subidas', count: 12, time: '2 min', icon: Camera, color: 'green' },
                  { action: 'Auto-etiquetado', count: 8, time: '5 min', icon: Zap, color: 'blue' },
                  { action: 'Nuevo pedido', count: 1, time: '8 min', icon: ShoppingCart, color: 'purple' },
                  { action: 'Token generado', count: 3, time: '12 min', icon: QrCode, color: 'orange' }
                ].map((activity, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <div className={`p-2 rounded-lg bg-${activity.color}-500/10`}>
                      <activity.icon className={`h-4 w-4 text-${activity.color}-500`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">+{activity.count} elementos</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quick Analytics */}
            <motion.div
              className="glass-health-island"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  Análisis Rápido
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveView('analytics')}
                  className="text-xs"
                >
                  Ver más <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Progreso del evento</span>
                  <span className="text-sm font-medium">{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold gradient-text-ios26">{Math.round(metrics.conversionRate * 100)}%</p>
                    <p className="text-xs text-muted-foreground">Conversión</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold gradient-text-ios26">{Math.round(metrics.engagementRate * 100)}%</p>
                    <p className="text-xs text-muted-foreground">Participación</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${healthScore > 80 ? 'bg-green-500' : healthScore > 60 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                    <span className="text-muted-foreground">Salud del evento:</span>
                    <span className="font-medium">{Math.round(healthScore)}/100</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Smart Suggestions Panel */}
          {smartSuggestions.length > 1 && (
            <motion.div
              className="glass-action-hub"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Brain className="h-6 w-6 text-purple-500" />
                  Sugerencias Inteligentes
                </h3>
                <Badge variant="outline" className="glass-label-ios26">
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {smartSuggestions.slice(1).map((suggestion, index) => (
                  <motion.div
                    key={suggestion.id}
                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/10"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    onClick={() => suggestion.action()}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Badge 
                        variant="outline" 
                        className={`glass-label-ios26 ${
                          suggestion.impact === 'high' ? 'border-green-300 text-green-700' :
                          suggestion.impact === 'medium' ? 'border-yellow-300 text-yellow-700' :
                          'border-blue-300 text-blue-700'
                        }`}
                      >
                        {suggestion.impact === 'high' ? 'Alto Impacto' : 
                         suggestion.impact === 'medium' ? 'Impacto Medio' : 'Bajo Impacto'}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <h4 className="font-medium mb-2">{suggestion.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">{suggestion.expectedOutcome}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}