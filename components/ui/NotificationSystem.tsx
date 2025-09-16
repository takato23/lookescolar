'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Bell,
  Camera,
  Upload,
  Download,
  Users,
  DollarSign,
  Clock,
  Zap,
  Star,
  Target,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

// Notification types
export type NotificationType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ComponentType<any>;
  timestamp: Date;
  category?: 'event' | 'photo' | 'system' | 'user';
  eventId?: string;
  metadata?: any;
}

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp'>
  ) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  markAsRead: (id: string) => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
}

// Provider component
interface NotificationProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
}

export function NotificationProvider({
  children,
  maxNotifications = 10,
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp'>) => {
      const id = Math.random().toString(36).substring(2, 15);
      const newNotification: Notification = {
        ...notification,
        id,
        timestamp: new Date(),
        duration: notification.duration ?? (notification.persistent ? 0 : 5000),
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev];
        return updated.slice(0, maxNotifications);
      });

      setUnreadCount((prev) => prev + 1);

      // Auto-remove if not persistent
      if (
        !notification.persistent &&
        newNotification.duration &&
        newNotification.duration > 0
      ) {
        setTimeout(() => {
          removeNotification(id);
        }, newNotification.duration);
      }

      return id;
    },
    [maxNotifications]
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const value: NotificationContextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    markAsRead,
    unreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

// Toast notification component
interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onAction?: () => void;
}

function NotificationToast({
  notification,
  onClose,
  onAction,
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 300);
  };

  const getIcon = () => {
    if (notification.icon) {
      const Icon = notification.icon;
      return <Icon className="h-5 w-5" />;
    }

    switch (notification.type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getColorScheme = () => {
    switch (notification.type) {
      case 'success':
        return 'border-green-200 bg-green-50/90 text-green-800';
      case 'error':
        return 'border-red-200 bg-red-50/90 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50/90 text-yellow-800';
      case 'info':
        return 'border-blue-200 bg-blue-50/90 text-blue-800';
      default:
        return 'border-border bg-white/90 text-foreground';
    }
  };

  return (
    <div
      className={cn(
        'neural-glass-card transform transition-all duration-300 ease-out',
        'w-full max-w-sm rounded-xl border p-4 shadow-lg backdrop-blur-md',
        getColorScheme(),
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{getIcon()}</div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-semibold">{notification.title}</h4>
              <p className="mt-1 text-sm opacity-90">{notification.message}</p>

              {notification.action && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      notification.action?.onClick();
                      onAction?.();
                    }}
                    className="text-xs"
                  >
                    {notification.action.label}
                  </Button>
                </div>
              )}
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleClose}
              className="ml-2 h-6 w-6 p-0 opacity-60 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs opacity-60">
            <span>{notification.timestamp.toLocaleTimeString()}</span>
            {notification.category && (
              <span className="capitalize">{notification.category}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Notification container
function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof window === 'undefined') return null;

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
      {notifications.slice(0, 5).map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationToast
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        </div>
      ))}
    </div>,
    document.body
  );
}

// Notification bell component
export function NotificationBell() {
  const { notifications, unreadCount, clearAll } = useNotifications();
  const [showPanel, setShowPanel] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowPanel(!showPanel)}
        className="neural-glass-card relative border-white/20"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </Button>

      {showPanel && (
        <div className="neural-glass-card absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/20 bg-white/95 shadow-lg backdrop-blur-md">
          <div className="border-b border-border/50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Notificaciones</h3>
              {notifications.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearAll}
                  className="text-xs"
                >
                  Limpiar todas
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">No hay notificaciones</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-lg p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {notification.icon ? (
                          <notification.icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <Bell className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {notification.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions for common notifications
export const showSuccessNotification = (
  addNotification: NotificationContextValue['addNotification'],
  title: string,
  message: string,
  options?: Partial<Notification>
) => {
  return addNotification({
    type: 'success',
    title,
    message,
    icon: CheckCircle2,
    ...options,
  });
};

export const showErrorNotification = (
  addNotification: NotificationContextValue['addNotification'],
  title: string,
  message: string,
  options?: Partial<Notification>
) => {
  return addNotification({
    type: 'error',
    title,
    message,
    icon: AlertCircle,
    persistent: true,
    ...options,
  });
};

export const showPhotoUploadNotification = (
  addNotification: NotificationContextValue['addNotification'],
  eventName: string,
  photoCount: number,
  eventId: string
) => {
  return addNotification({
    type: 'info',
    title: 'Fotos subidas',
    message: `${photoCount} fotos agregadas a ${eventName}`,
    icon: Camera,
    category: 'photo',
    eventId,
    action: {
      label: 'Ver evento',
      onClick: () => window.open(`/admin/events/${eventId}`, '_blank'),
    },
  });
};

export const showEventUpdateNotification = (
  addNotification: NotificationContextValue['addNotification'],
  eventName: string,
  updateType: string,
  eventId: string
) => {
  return addNotification({
    type: 'success',
    title: 'Evento actualizado',
    message: `${eventName}: ${updateType}`,
    icon: Activity,
    category: 'event',
    eventId,
    action: {
      label: 'Ver detalles',
      onClick: () => window.open(`/admin/events/${eventId}`, '_blank'),
    },
  });
};

export const showRevenueNotification = (
  addNotification: NotificationContextValue['addNotification'],
  eventName: string,
  amount: number,
  eventId: string
) => {
  return addNotification({
    type: 'success',
    title: 'Nuevo ingreso',
    message: `$${amount.toLocaleString()} generado en ${eventName}`,
    icon: DollarSign,
    category: 'event',
    eventId,
    action: {
      label: 'Ver analytics',
      onClick: () => window.open(`/admin/events/${eventId}`, '_blank'),
    },
  });
};

// Real-time notification hook for WebSocket/Server-Sent Events
export function useRealTimeNotifications() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    // In a real implementation, you would connect to WebSocket or SSE here
    // Demo notifications are disabled by default. Enable with NEXT_PUBLIC_NOTIFICATIONS_DEMO=true
    const demoEnabled =
      typeof process !== 'undefined' &&
      (process as any).env?.NEXT_PUBLIC_NOTIFICATIONS_DEMO === 'true';
    if (!demoEnabled) return;

    const simulateNotifications = () => {
      const notifications = [
        {
          type: 'info' as const,
          title: 'Sistema actualizado',
          message: 'Nueva versión disponible con mejoras de rendimiento',
          icon: Zap,
          category: 'system' as const,
        },
        {
          type: 'success' as const,
          title: 'Fotos procesadas',
          message: 'Se procesaron 25 fotos nuevas automáticamente',
          icon: Camera,
          category: 'photo' as const,
        },
        {
          type: 'info' as const,
          title: 'Recordatorio',
          message: 'Evento "Graduación 2024" mañana a las 10:00 AM',
          icon: Clock,
          category: 'event' as const,
        },
      ];

      notifications.forEach((notification, index) => {
        setTimeout(
          () => {
            addNotification(notification);
          },
          (index + 1) * 3000
        );
      });
    };

    // Simulate notifications after a delay
    const timer = setTimeout(simulateNotifications, 2000);

    return () => clearTimeout(timer);
  }, [addNotification]);
}
