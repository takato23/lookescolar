/**
 * Feedback Components
 *
 * User feedback components for actions, confirmations, and status updates
 * Designed for simplicity and clarity
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  X,
  Heart,
  ShoppingCart,
  Eye,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  onClose?: () => void;
  className?: string;
}

export function Toast({
  type,
  title,
  description,
  duration = 5000,
  onClose,
  className,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed right-4 top-4 z-50 w-full max-w-sm',
        'transform transition-all duration-300 ease-in-out',
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        className
      )}
    >
      <div className={cn('rounded-lg border p-4 shadow-lg', getColors())}>
        <div className="flex items-start space-x-3">
          {getIcon()}

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium text-foreground">{title}</h4>
            {description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>

          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose?.(), 300);
            }}
            className="ml-2 flex-shrink-0 text-gray-400 hover:text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface PhotoActionFeedbackProps {
  action: 'add' | 'remove' | 'view' | 'download';
  photoName?: string;
  onUndo?: () => void;
  className?: string;
}

export function PhotoActionFeedback({
  action,
  photoName,
  onUndo,
  className,
}: PhotoActionFeedbackProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const getActionText = () => {
    switch (action) {
      case 'add':
        return 'Foto agregada al carrito';
      case 'remove':
        return 'Foto removida del carrito';
      case 'view':
        return 'Foto marcada como vista';
      case 'download':
        return 'Descarga iniciada';
    }
  };

  const getIcon = () => {
    switch (action) {
      case 'add':
        return <ShoppingCart className="h-4 w-4 text-green-600" />;
      case 'remove':
        return <X className="h-4 w-4 text-red-600" />;
      case 'view':
        return <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'download':
        return <Download className="h-4 w-4 text-purple-600" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform',
        'rounded-lg border bg-white px-4 py-3 shadow-lg',
        'transition-all duration-300 ease-in-out',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
        className
      )}
    >
      <div className="flex items-center space-x-3">
        {getIcon()}

        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{getActionText()}</p>
          {photoName && <p className="text-xs text-gray-500">{photoName}</p>}
        </div>

        {onUndo && action !== 'download' && action !== 'view' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            className="text-xs"
          >
            Deshacer
          </Button>
        )}
      </div>
    </div>
  );
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

export function ConfirmationDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'default',
  onConfirm,
  onCancel,
  className,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className={cn(
          'relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl',
          'transform transition-all duration-300 ease-in-out',
          'scale-100 opacity-100',
          className
        )}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onCancel}>
              {cancelText}
            </Button>
            <Button
              variant={type === 'destructive' ? 'destructive' : 'default'}
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: 'draft' | 'pending' | 'processing' | 'completed' | 'error';
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const getStyles = () => {
    switch (status) {
      case 'draft':
        return 'bg-muted text-foreground border-border';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getDefaultLabel = () => {
    switch (status) {
      case 'draft':
        return 'Borrador';
      case 'pending':
        return 'Pendiente';
      case 'processing':
        return 'Procesando';
      case 'completed':
        return 'Completado';
      case 'error':
        return 'Error';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        getStyles(),
        className
      )}
    >
      {label || getDefaultLabel()}
    </span>
  );
}

interface FloatingActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function FloatingActionButton({
  icon,
  label,
  onClick,
  variant = 'primary',
  className,
}: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-6 z-40',
        'h-14 w-14 rounded-full shadow-lg',
        'flex items-center justify-center',
        'transition-all duration-300 ease-in-out',
        'hover:scale-110 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        variant === 'primary'
          ? 'bg-primary focus:ring-primary text-white'
          : 'text-primary border-primary focus:ring-primary border-2 bg-white',
        className
      )}
      title={label}
    >
      {icon}
    </button>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
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
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 py-12 text-center',
        className
      )}
    >
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}

      <h3 className="mb-2 text-lg font-medium text-foreground">{title}</h3>

      <p className="mb-6 max-w-sm text-gray-500 dark:text-gray-400">{description}</p>

      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}

interface QuickActionsProps {
  actions: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }>;
  className?: string;
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 md:grid-cols-4', className)}>
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          disabled={action.disabled}
          className={cn(
            'flex flex-col items-center justify-center p-4',
            'rounded-lg border bg-white',
            'transition-all duration-200',
            'hover:border-primary hover:bg-muted',
            'focus:ring-primary focus:outline-none focus:ring-2 focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !action.disabled && 'active:scale-95'
          )}
        >
          <div className="mb-2 text-gray-500 dark:text-gray-400">{action.icon}</div>
          <span className="text-xs font-medium text-foreground">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
}
