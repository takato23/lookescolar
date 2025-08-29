'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Users,
  ShoppingCart,
  ArrowLeft,
  Upload,
  QrCode,
  Eye,
  AlertCircle,
  RefreshCw,
  Home,
  TrendingUp,
  Zap,
  Brain,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  BarChart3,
  Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
// Removed unused Card imports
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  useEventManagement,
  EventPhase,
  WorkflowPriority,
} from '@/lib/stores/event-workflow-store';

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
    getHealthScore,
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

  // Add/remove holistic-dashboard class to body for CSS scoping
  useEffect(() => {
    const doc = globalThis.document;
    if (doc) {
      doc.body.classList.add('holistic-dashboard');
      return () => {
        doc.body.classList.remove('holistic-dashboard');
      };
    }
    return undefined;
  }, []);

  if (loading) {
    return (
      <div className="liquid-nav-ultra-thin">
        <div className="glass-work-canvas">
          <motion.div
            className="flex min-h-screen items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="glass-health-island text-center">
              <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-500" />
              <p className="gradient-text-ios26 text-lg font-medium">
                Iniciando sistema holístico...
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                Analizando estado del evento
              </p>
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
            className="flex min-h-screen items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="glass-health-island border-red-200 bg-red-50/10">
              <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-500" />
              <p className="text-lg font-medium text-red-700">
                Error al cargar evento
              </p>
              <p className="mt-2 text-sm text-red-600">
                {error || 'Evento no encontrado'}
              </p>
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
      description: 'Estableciendo fundamentos del evento',
    },
    [EventPhase.CONTENT_UPLOAD]: {
      title: 'Carga de Contenido',
      icon: Upload,
      color: 'green',
      description: 'Subiendo y organizando fotos',
    },
    [EventPhase.ORGANIZATION]: {
      title: 'Organización',
      icon: Users,
      color: 'purple',
      description: 'Estructurando datos y accesos',
    },
    [EventPhase.PUBLISHING]: {
      title: 'Publicación',
      icon: Eye,
      color: 'blue',
      description: 'Preparando acceso público',
    },
    [EventPhase.ACTIVE_SALES]: {
      title: 'Ventas Activas',
      icon: TrendingUp,
      color: 'green',
      description: 'Impulsando participación',
    },
    [EventPhase.FULFILLMENT]: {
      title: 'Cumplimiento',
      icon: ShoppingCart,
      color: 'orange',
      description: 'Procesando pedidos',
    },
    [EventPhase.COMPLETED]: {
      title: 'Completado',
      icon: CheckCircle2,
      color: 'green',
      description: 'Evento finalizado exitosamente',
    },
  };

  const currentPhaseInfo = phaseConfig[currentPhase];
  const progressPercentage = getProgressPercentage();
  const healthScore = getHealthScore();
  const priorityActions = getCurrentPriorities();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-blue-950/30 dark:to-purple-950/20">
      {/* Ultra-thin Navigation */}
      <nav className="liquid-nav-ultra-thin">
        <div className="container mx-auto flex h-full items-center justify-between px-6">
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
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Link
                  href="/admin"
                  className="transition-colors hover:text-blue-500"
                >
                  <Home className="h-4 w-4" />
                </Link>
                <span>/</span>
                <Link
                  href="/admin/events"
                  className="transition-colors hover:text-blue-500"
                >
                  Eventos
                </Link>
                <span>/</span>
              </div>

              <h1 className="gradient-text-ios26 text-xl font-bold">
                {eventInfo.school || eventInfo.name}
              </h1>

              <Badge variant="outline" className="glass-label-ios26">
                {currentPhaseInfo.title}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-muted-foreground">
                Sincronizado{' '}
                {new Date().toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit',
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
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="space-y-8"
        >
          {/* Smart Notifications */}
          <AnimatePresence>
            {notificationQueue.length > 0 && (
              <SmartNotifications notifications={notificationQueue} />
            )}
          </AnimatePresence>

          {/* Health Metrics Islands */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                      break;
                    default:
                    // fallback
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
                const response = await globalThis.fetch(
                  `/api/admin/issues/${issueId}/resolve`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  }
                );

                if (response.ok) {
                  // Refresh the data after successful resolution
                  await initializeEvent(id);
                } else {
                  // failed resolve
                }
              } catch (error) {
                // silent
              }
            }}
            onDismissIssue={async (issueId) => {
              try {
                // Handle issue dismissal by calling the appropriate API
                const response = await globalThis.fetch(
                  `/api/admin/issues/${issueId}/dismiss`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  }
                );

                if (response.ok) {
                  // Refresh the data after successful dismissal
                  await initializeEvent(id);
                } else {
                  // failed dismiss
                }
              } catch (error) {
                // silent
              }
            }}
          />

          {/* Dynamic Content Areas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent Activity Stream */}
            <motion.div
              className="glass-health-island"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Actividad Reciente
                </h3>
                <Badge variant="outline" className="glass-label-ios26">
                  Tiempo Real
                </Badge>
              </div>

              <div className="space-y-3">
                {[
                  {
                    action: 'Fotos subidas',
                    count: 12,
                    time: '2 min',
                    icon: Camera,
                    color: 'green',
                  },
                  {
                    action: 'Auto-etiquetado',
                    count: 8,
                    time: '5 min',
                    icon: Zap,
                    color: 'blue',
                  },
                  {
                    action: 'Nuevo pedido',
                    count: 1,
                    time: '8 min',
                    icon: ShoppingCart,
                    color: 'purple',
                  },
                  {
                    action: 'Token generado',
                    count: 3,
                    time: '12 min',
                    icon: QrCode,
                    color: 'orange',
                  },
                ].map((activity, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-3 rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <div
                      className={`rounded-lg p-2 bg-${activity.color}-500/10`}
                    >
                      <activity.icon
                        className={`h-4 w-4 text-${activity.color}-500`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-muted-foreground text-xs">
                        +{activity.count} elementos
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {activity.time}
                    </span>
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
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  Análisis Rápido
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveView('analytics')}
                  className="text-xs"
                >
                  Ver más <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Progreso del evento
                  </span>
                  <span className="text-sm font-medium">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="gradient-text-ios26 text-2xl font-bold">
                      {Math.round(metrics.conversionRate * 100)}%
                    </p>
                    <p className="text-muted-foreground text-xs">Conversión</p>
                  </div>
                  <div className="text-center">
                    <p className="gradient-text-ios26 text-2xl font-bold">
                      {Math.round(metrics.engagementRate * 100)}%
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Participación
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className={`h-2 w-2 rounded-full ${healthScore > 80 ? 'bg-green-500' : healthScore > 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    ></div>
                    <span className="text-muted-foreground">
                      Salud del evento:
                    </span>
                    <span className="font-medium">
                      {Math.round(healthScore)}/100
                    </span>
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
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xl font-semibold">
                  <Brain className="h-6 w-6 text-purple-500" />
                  Sugerencias Inteligentes
                </h3>
                <Badge variant="outline" className="glass-label-ios26">
                  <Sparkles className="mr-1 h-3 w-3" />
                  IA
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {smartSuggestions.slice(1).map((suggestion, index) => (
                  <motion.div
                    key={suggestion.id}
                    className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-300 hover:bg-white/10"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    onClick={() => suggestion.action()}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <Badge
                        variant="outline"
                        className={`glass-label-ios26 ${
                          suggestion.impact === 'high'
                            ? 'border-green-300 text-green-700'
                            : suggestion.impact === 'medium'
                              ? 'border-yellow-300 text-yellow-700'
                              : 'border-blue-300 text-blue-700'
                        }`}
                      >
                        {suggestion.impact === 'high'
                          ? 'Alto Impacto'
                          : suggestion.impact === 'medium'
                            ? 'Impacto Medio'
                            : 'Bajo Impacto'}
                      </Badge>
                      <ArrowRight className="text-muted-foreground h-4 w-4" />
                    </div>

                    <h4 className="mb-2 font-medium">{suggestion.title}</h4>
                    <p className="text-muted-foreground mb-3 text-sm">
                      {suggestion.description}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {suggestion.expectedOutcome}
                    </p>
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
