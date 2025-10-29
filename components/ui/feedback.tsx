'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { announceToScreenReader } from '@/lib/utils/accessibility';

// Toast notification system
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }

    // Announce to screen readers
    announceToScreenReader(
      `${toast.type}: ${toast.title}${toast.description ? '. ' + toast.description : ''}`,
      toast.type === 'error' ? 'assertive' : 'polite'
    );
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div
      className="fixed right-4 top-4 z-50 space-y-2"
      role="region"
      aria-label="Notificaciones"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-600" />,
    error: <XCircle className="h-5 w-5 text-red-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
  };

  const backgrounds = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div
      className={cn(
        'animate-in slide-in-from-right-full min-w-80 max-w-sm rounded-lg border p-4 shadow-lg backdrop-blur-sm duration-300',
        backgrounds[toast.type]
      )}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{icons[toast.type]}</div>

        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-foreground">{toast.title}</h4>
          {toast.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{toast.description}</p>
          )}
          {toast.action && (
            <div className="mt-2">
              <button
                onClick={toast.action.onClick}
                className="text-sm font-medium text-purple-600 hover:text-purple-700 focus:underline focus:outline-none"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 rounded-md p-1 text-gray-400 hover:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Cerrar notificación"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Loading states
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export function LoadingSpinner({
  size = 'md',
  className,
  label = 'Cargando',
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2
        className={cn('animate-spin text-purple-600', sizes[size])}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export function LoadingSkeleton({
  className,
  lines = 1,
}: LoadingSkeletonProps) {
  return (
    <div className={cn('animate-pulse space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-muted"
          style={{ width: `${80 + Math.random() * 20}%` }}
        />
      ))}
    </div>
  );
}

// Error boundaries and states
interface ErrorFallbackProps {
  error: Error;
  resetError?: () => void;
  className?: string;
}

export function ErrorFallback({
  error,
  resetError,
  className,
}: ErrorFallbackProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Error boundary caught:', error);
  }, [error]);

  return (
    <div className={cn('space-y-4 p-6 text-center', className)}>
      <div className="flex justify-center">
        <AlertCircle className="h-12 w-12 text-red-500" />
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          Algo salió mal
        </h2>
        <p className="mb-4 text-gray-500 dark:text-gray-400">
          Ocurrió un error inesperado. Por favor, intenta nuevamente.
        </p>

        <details className="text-left">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-foreground">
            Detalles técnicos
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs text-red-600">
            {error.message}
          </pre>
        </details>
      </div>

      {resetError && (
        <button
          onClick={resetError}
          className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" />
          Intentar nuevamente
        </button>
      )}
    </div>
  );
}

// Empty states
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('space-y-4 p-8 text-center', className)}>
      {icon && <div className="flex justify-center text-gray-400">{icon}</div>}

      <div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400">{description}</p>
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'inline-flex items-center rounded-md px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
            action.variant === 'secondary'
              ? 'bg-muted text-foreground hover:bg-muted focus:ring-gray-500'
              : 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500'
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Progress indicators
interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  variant = 'default',
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colors = {
    default: 'bg-purple-600',
    success: 'bg-green-600',
    warning: 'bg-amber-600',
    error: 'bg-red-600',
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        {label && (
          <span className="text-sm font-medium text-foreground">{label}</span>
        )}
        {showValue && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round(percentage)}%
          </span>
        )}
      </div>

      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            colors[variant]
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label}
        />
      </div>
    </div>
  );
}

// Status badges
interface StatusBadgeProps {
  status: 'pending' | 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  const variants = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const icons = {
    pending: <Loader2 className="h-3 w-3 animate-spin" />,
    success: <CheckCircle className="h-3 w-3" />,
    error: <XCircle className="h-3 w-3" />,
    warning: <AlertTriangle className="h-3 w-3" />,
    info: <Info className="h-3 w-3" />,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[status],
        className
      )}
    >
      {icons[status]}
      {children}
    </span>
  );
}
