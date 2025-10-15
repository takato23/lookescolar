'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  ArrowRight,
  Zap,
  AlertCircle,
  Shield,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QualityIssue } from '@/lib/stores/event-workflow-store';

// Smart Notifications Component
interface SmartNotificationsProps {
  notifications: Array<{
    id: string;
    type: 'success' | 'warning' | 'info' | 'action';
    title: string;
    message: string;
    actions?: Array<{
      label: string;
      action: () => void;
      variant?: 'default' | 'outline';
    }>;
    dismissible?: boolean;
  }>;
}

export function SmartNotifications({ notifications }: SmartNotificationsProps) {
  const iconMap = {
    success: CheckCircle2,
    warning: AlertTriangle,
    info: Info,
    action: Zap,
  };

  const colorMap = {
    success: 'green',
    warning: 'yellow',
    info: 'blue',
    action: 'purple',
  };

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {notifications.map((notification) => {
          const Icon = iconMap[notification.type];
          const color = colorMap[notification.type];

          return (
            <motion.div
              key={notification.id}
              className={`glass-notification ${notification.type}`}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={`h-5 w-5 text-${color}-500 mt-0.5 flex-shrink-0`}
                />

                <div className="min-w-0 flex-1">
                  <h4 className="mb-1 text-sm font-medium">
                    {notification.title}
                  </h4>
                  <p className="text-sm opacity-90">{notification.message}</p>

                  {notification.actions && notification.actions.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      {notification.actions.map((action, index) => (
                        <Button
                          key={index}
                          variant={action.variant || 'default'}
                          size="sm"
                          className="glass-fab h-auto px-3 py-1.5 text-xs"
                          onClick={action.action}
                        >
                          {action.label}
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {notification.dismissible !== false && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 opacity-60 hover:opacity-100"
                    onClick={() => {
                      // Handle dismissal (no-op to satisfy lint)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Quality Assurance Component
type IssueResolver = (id: string) => void;

interface QualityAssuranceProps {
  issues: QualityIssue[];
  onResolveIssue: IssueResolver;
}

export function QualityAssurance({
  issues,
  onResolveIssue,
}: QualityAssuranceProps) {
  const severityConfig = {
    critical: {
      icon: AlertCircle,
      color: 'red',
      label: 'Error Crítico',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-300/20',
    },
    high: {
      icon: AlertTriangle,
      color: 'orange',
      label: 'Alta Prioridad',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-300/20',
    },
    medium: {
      icon: AlertTriangle,
      color: 'yellow',
      label: 'Media Prioridad',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-300/20',
    },
    low: {
      icon: Info,
      color: 'blue',
      label: 'Baja Prioridad',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-300/20',
    },
  };

  const getIssuesByComponent = () => {
    const grouped = issues.reduce(
      (acc, issue) => {
        issue.affectedComponents.forEach((component) => {
          if (!acc[component]) acc[component] = [];
          acc[component].push(issue);
        });
        return acc;
      },
      {} as Record<string, QualityIssue[]>
    );

    return grouped;
  };

  const groupedIssues = getIssuesByComponent();
  const criticalIssues = issues.filter(
    (issue) => issue.severity === 'critical'
  );
  const autoFixableIssues = issues.filter((issue) => issue.autoFixable);

  return (
    <motion.div
      className="glass-action-hub"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-orange-500" />
          <h3 className="text-xl font-semibold">Control de Calidad</h3>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`glass-label-ios26 ${
              criticalIssues.length > 0
                ? 'border-red-300 text-red-700'
                : issues.length > 0
                  ? 'border-yellow-300 text-yellow-700'
                  : 'border-green-300 text-green-700'
            }`}
          >
            {issues.length === 0
              ? '✅ Sin problemas'
              : `${issues.length} problemas`}
          </Badge>

          {autoFixableIssues.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="glass-fab"
              onClick={() => {
                autoFixableIssues.forEach((issue) => onResolveIssue(issue.id));
              }}
            >
              <Zap className="mr-1 h-4 w-4" />
              Auto-reparar ({autoFixableIssues.length})
            </Button>
          )}
        </div>
      </div>

      {issues.length === 0 ? (
        <motion.div
          className="py-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Target className="mx-auto mb-3 h-12 w-12 text-green-500 opacity-50" />
          <h4 className="mb-2 font-medium text-green-700 dark:text-green-300">
            ¡Excelente Calidad!
          </h4>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No se detectaron problemas en tu evento. Todo está funcionando
            correctamente.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* Critical Issues First */}
          {criticalIssues.length > 0 && (
            <motion.div
              className="rounded-xl border border-red-300/20 bg-red-500/10 p-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-700 dark:text-red-300">
                  Problemas Críticos
                </span>
                <Badge
                  variant="outline"
                  className="border-red-300 text-xs text-red-700"
                >
                  Requiere atención inmediata
                </Badge>
              </div>

              <div className="space-y-2">
                {criticalIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-lg border border-red-200/30 bg-red-500/5 p-3"
                  >
                    <h5 className="mb-1 text-sm font-medium">{issue.title}</h5>
                    <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm">
                      {issue.description}
                    </p>
                    <p className="mb-3 text-xs text-red-600 dark:text-red-400">
                      💡 {issue.resolution}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {issue.affectedComponents.join(', ')}
                        </Badge>
                        {issue.autoFixable && (
                          <Badge variant="secondary" className="text-xs">
                            <Zap className="mr-1 h-3 w-3" />
                            Auto-reparable
                          </Badge>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto px-3 py-1 text-xs"
                        onClick={() => onResolveIssue(issue.id)}
                      >
                        {issue.autoFixable ? 'Auto-reparar' : 'Revisar'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Other Issues by Component */}
          {Object.entries(groupedIssues).map(
            ([component, componentIssues], index) => {
              const nonCriticalIssues = componentIssues.filter(
                (issue) => issue.severity !== 'critical'
              );
              if (nonCriticalIssues.length === 0) return null;

              return (
                <motion.div
                  key={component}
                  className="glass-stat-card-ios26 p-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium capitalize">
                      {component}
                    </span>
                    <Badge
                      variant="outline"
                      className="glass-label-ios26 text-xs"
                    >
                      {nonCriticalIssues.length} problemas
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {nonCriticalIssues.map((issue) => {
                      const config = severityConfig[issue.severity];
                      const Icon = config.icon;

                      return (
                        <div
                          key={issue.id}
                          className={`rounded-lg p-3 ${config.bgColor} border ${config.borderColor}`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon
                              className={`h-4 w-4 text-${config.color}-500 mt-0.5 flex-shrink-0`}
                            />

                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <h5 className="text-sm font-medium">
                                  {issue.title}
                                </h5>
                                <Badge
                                  variant="outline"
                                  className={`text-xs border-${config.color}-300 text-${config.color}-700`}
                                >
                                  {config.label}
                                </Badge>
                              </div>

                              <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm">
                                {issue.description}
                              </p>

                              <p
                                className={`text-xs text-${config.color}-600 dark:text-${config.color}-400 mb-2`}
                              >
                                💡 {issue.resolution}
                              </p>

                              <div className="flex items-center justify-between">
                                {issue.autoFixable && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    <Zap className="mr-1 h-3 w-3" />
                                    Auto-reparable
                                  </Badge>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto h-auto px-2 py-1 text-xs"
                                  onClick={() => onResolveIssue(issue.id)}
                                >
                                  {issue.autoFixable ? 'Reparar' : 'Revisar'}
                                  <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            }
          )}
        </div>
      )}
    </motion.div>
  );
}
