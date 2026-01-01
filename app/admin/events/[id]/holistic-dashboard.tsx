'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Home,
  RefreshCw,
  Upload,
  Users,
  Eye,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  useEventManagement,
  EventPhase,
  WorkflowPriority,
  WorkflowAction,
} from '@/lib/stores/event-workflow-store';

interface PriorityStyle {
  label: string;
  className: string;
}

const phaseConfig: Record<
  EventPhase,
  { title: string; description: string; accent: string }
> = {
  [EventPhase.SETUP]: {
    title: 'Configuración inicial',
    description: 'Prepará el evento y definí las bases',
    accent: 'text-blue-500',
  },
  [EventPhase.CONTENT_UPLOAD]: {
    title: 'Carga de contenido',
    description: 'Sumá fotos y etiquetas esenciales',
    accent: 'text-emerald-500',
  },
  [EventPhase.ORGANIZATION]: {
    title: 'Organización',
    description: 'Ordená estudiantes y accesos',
    accent: 'text-purple-500',
  },
  [EventPhase.PUBLISHING]: {
    title: 'Publicación',
    description: 'Dejá la galería lista para compartir',
    accent: 'text-indigo-500',
  },
  [EventPhase.ACTIVE_SALES]: {
    title: 'Ventas activas',
    description: 'Impulsá la participación de los clientes',
    accent: 'text-amber-500',
  },
  [EventPhase.FULFILLMENT]: {
    title: 'Cumplimiento',
    description: 'Gestioná pedidos pendientes',
    accent: 'text-orange-500',
  },
  [EventPhase.COMPLETED]: {
    title: 'Evento finalizado',
    description: 'Revisá resultados y aprendizajes',
    accent: 'text-green-500',
  },
};

const priorityStyles: Record<WorkflowPriority, PriorityStyle> = {
  [WorkflowPriority.CRITICAL]: {
    label: 'Crítico',
    className: 'bg-red-500/10 text-red-600 dark:text-red-300',
  },
  [WorkflowPriority.HIGH]: {
    label: 'Alto',
    className: 'bg-orange-500/10 text-orange-600 dark:text-orange-300',
  },
  [WorkflowPriority.MEDIUM]: {
    label: 'Medio',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  },
  [WorkflowPriority.LOW]: {
    label: 'Bajo',
    className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  },
  [WorkflowPriority.OPTIONAL]: {
    label: 'Opcional',
    className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  },
};

const numberFormatter = new Intl.NumberFormat('es-AR');
const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});
const dateTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const workflowActionPaths: Partial<Record<WorkflowAction['type'], string>> = {
  upload: 'unified',
  tag: 'unified',
  publish: 'publish',
  organize: 'students',
  review: 'photos',
  notify: 'unified',
};

export default function SimplifiedEventDashboard() {
  const params = useParams();
  const router = useRouter();
  const id = params['id'] as string;

  const {
    eventInfo,
    metrics,
    currentPhase,
    nextActions,
    initializeEvent,
    getProgressPercentage,
    getCurrentPriorities,
    getHealthScore,
    lastUpdated,
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

  const progressPercentage = getProgressPercentage();
  const healthScore = getHealthScore();
  const priorityActions = getCurrentPriorities().slice(0, 3);

const quickActions = [
  {
    id: 'upload',
    title: 'Subir fotos',
    description: 'Carga y etiqueta en un solo paso',
    icon: Upload,
    onClick: () => router.push(`/admin/events/${id}/unified`),
  },
  {
    id: 'publish',
    title: 'Publicar evento',
    description: 'Configurá la galería pública',
    icon: Eye,
    onClick: () => router.push(`/admin/events/${id}/publish`),
  },
  {
    id: 'orders',
    title: 'Pedidos y ventas',
    description: 'Seguimiento de ingresos y entregas',
    icon: ShoppingCart,
    onClick: () => router.push(`/admin/orders?event=${id}`),
  },
  {
    id: 'students',
    title: 'Estudiantes',
    description: 'Gestioná listas y accesos',
    icon: Users,
    onClick: () => router.push(`/admin/events/${id}/students`),
  },
];

const quickStats = [
  {
    id: 'photos',
    label: 'Fotos cargadas',
    value: numberFormatter.format(metrics.totalPhotos),
  },
  {
    id: 'orders',
    label: 'Pedidos totales',
    value: numberFormatter.format(metrics.totalOrders),
  },
  {
    id: 'revenue',
    label: 'Ingresos',
    value: currencyFormatter.format(metrics.revenue || 0),
  },
];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="rounded-3xl border border-blue-100/40 bg-white/70 p-8 text-center shadow-lg backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-500" />
          <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
            Preparando tu panel…
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Traemos los datos fundamentales del evento
          </p>
        </div>
      </div>
    );
  }

  if (error || !eventInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="rounded-3xl border border-red-200/40 bg-white/70 p-8 text-center shadow-lg backdrop-blur dark:border-red-500/40 dark:bg-slate-900/80">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-500" />
          <p className="text-lg font-semibold text-red-600 dark:text-red-300">
            No pudimos cargar el evento
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {error || 'Revisá que el evento exista o volvé a intentarlo.'}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/admin/events')}
          >
            Volver a eventos
          </Button>
        </div>
      </div>
    );
  }

  const currentPhaseInfo = phaseConfig[currentPhase];
  const nextActionsByPriority = priorityActions.length
    ? priorityActions
    : nextActions.slice(0, 2);
  const primaryAction = nextActionsByPriority[0];
  const secondaryActions = nextActionsByPriority.slice(1);
  const primaryStyle = primaryAction
    ? priorityStyles[primaryAction.priority]
    : null;

  const formattedUpdatedAt =
    lastUpdated instanceof Date
      ? dateTimeFormatter.format(lastUpdated)
      : '—';

  const navigateFromWorkflow = (action: WorkflowAction) => {
    if (action.type === 'export') {
      router.push(`/admin/orders?event=${id}`);
      return;
    }

    const suffix = workflowActionPaths[action.type] ?? 'unified';
    router.push(`/admin/events/${id}/${suffix}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 dark:from-slate-950 dark:via-blue-950/30 dark:to-slate-900">
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
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
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

              <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                {eventInfo.school || eventInfo.name}
              </h1>

              <Badge variant="outline" className="glass-label-ios26">
                {currentPhaseInfo.title}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <div className="hidden items-center gap-2 md:flex">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span>Actualizado {formattedUpdatedAt}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => initializeEvent(id)}
              className="rounded-full p-2 hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="glass-work-canvas">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="container mx-auto max-w-6xl space-y-10 px-6 py-10"
        >
          <section className="rounded-3xl border border-white/40 bg-white/70 p-6 shadow-lg backdrop-blur-md dark:border-slate-700/40 dark:bg-slate-900/70">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Resumen del evento
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {eventInfo.name || eventInfo.school}
                </h2>
                {eventInfo.school && eventInfo.name && eventInfo.school !== eventInfo.name ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {eventInfo.school}
                  </p>
                ) : null}
                <p className="mt-4 max-w-xl text-sm text-slate-600 dark:text-slate-300">
                  {currentPhaseInfo.description}
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-4 md:max-w-sm">
                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                  <span>Progreso del flujo</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-slate-600 shadow-sm backdrop-blur dark:border-slate-700/40 dark:bg-slate-900/60 dark:text-slate-300">
                    <span className="block text-xs uppercase tracking-wide">
                      Salud del evento
                    </span>
                    <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {Math.round(healthScore)}/100
                    </span>
                  </div>
                  <div className="rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-slate-600 shadow-sm backdrop-blur dark:border-slate-700/40 dark:bg-slate-900/60 dark:text-slate-300">
                    <span className="block text-xs uppercase tracking-wide">
                      Participación estimada
                    </span>
                    <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {Math.round(metrics.conversionRate * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <header className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Accesos esenciales
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Entrá rápido a los módulos que más usás.
              </p>
            </header>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.onClick}
                    className="flex h-full flex-col rounded-3xl border border-white/40 bg-white/70 p-5 text-left shadow-lg transition hover:-translate-y-1 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white backdrop-blur-md dark:border-slate-700/40 dark:bg-slate-900/70 dark:hover:bg-slate-900/90 dark:focus:ring-offset-slate-900"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-blue-500/10 p-2 text-blue-500">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {action.title}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      {action.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <header className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Indicadores principales
              </h3>
            </header>
            <div className="grid gap-4 sm:grid-cols-3">
              {quickStats.map((stat) => (
                <div
                  key={stat.id}
                  className="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-lg backdrop-blur-md dark:border-slate-700/40 dark:bg-slate-900/70"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <header className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Próximo paso recomendado
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Concentrate en lo que destraba el avance ahora mismo.
              </p>
            </header>

            {!primaryAction ? (
              <div className="rounded-3xl border border-emerald-200/50 bg-emerald-50/80 p-6 text-sm text-emerald-700 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                ¡Todo al día! No hay acciones críticas pendientes.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl border border-blue-200/50 bg-blue-50/80 p-6 shadow-lg backdrop-blur dark:border-blue-500/40 dark:bg-blue-500/10">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`${primaryStyle?.className ?? ''} border-transparent`}
                        >
                          {primaryStyle?.label}
                        </Badge>
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {primaryAction.estimatedTime} min aprox.
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {primaryAction.title}
                      </p>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {primaryAction.description}
                      </p>
                    </div>
                    <Button onClick={() => navigateFromWorkflow(primaryAction)}>
                      Ir a la tarea
                    </Button>
                  </div>
                </div>

                {secondaryActions.length > 0 ? (
                  <div className="grid gap-3">
                    {secondaryActions.map((action) => {
                      const style = priorityStyles[action.priority];
                      return (
                        <div
                          key={action.id}
                          className="flex items-start justify-between rounded-2xl border border-white/40 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-700/40 dark:bg-slate-900/70"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`${style.className} border-transparent`}
                              >
                                {style.label}
                              </Badge>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {action.estimatedTime} min
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                              {action.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {action.description}
                            </p>
                          </div>
                          <Button
                            variant="minimal"
                            onClick={() => navigateFromWorkflow(action)}
                            className="mt-1"
                          >
                            Ir
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </motion.div>
      </main>
    </div>
  );
}
