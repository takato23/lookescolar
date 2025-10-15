'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Upload,
  Users,
  Package,
  BarChart3,
  Settings,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { clsx } from 'clsx';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  action: () => void;
  badge?: number;
  disabled?: boolean;
  loading?: boolean;
}

interface QuickActionsGridProps {
  onUpload?: () => void;
  onViewEvents?: () => void;
  onViewOrders?: () => void;
  onViewStats?: () => void;
  onSettings?: () => void;
  className?: string;
}

export function QuickActionsGrid({
  onUpload,
  onViewEvents,
  onViewOrders,
  onViewStats,
  onSettings,
  className,
}: QuickActionsGridProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [uploadCount, setUploadCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  // Monitor online status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Simulate dynamic data updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setUploadCount(prev => Math.max(0, prev + Math.floor(Math.random() * 3)));
      }
      if (Math.random() > 0.8) {
        setPendingOrders(prev => Math.max(0, prev + Math.floor(Math.random() * 2)));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const quickActions: QuickAction[] = [
    {
      id: 'upload',
      label: 'Subir Fotos',
      icon: Upload,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => onUpload?.(),
      badge: uploadCount > 0 ? uploadCount : undefined,
    },
    {
      id: 'events',
      label: 'Eventos',
      icon: Users,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => onViewEvents?.(),
    },
    {
      id: 'orders',
      label: 'Pedidos',
      icon: Package,
      color: 'bg-orange-500 hover:bg-orange-600',
      action: () => onViewOrders?.(),
      badge: pendingOrders > 0 ? pendingOrders : undefined,
    },
    {
      id: 'stats',
      label: 'Estadísticas',
      icon: BarChart3,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => onViewStats?.(),
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: Settings,
      color: 'bg-muted0 hover:bg-muted',
      action: () => onSettings?.(),
      disabled: !isOnline,
    },
    {
      id: 'new-event',
      label: 'Nuevo Evento',
      icon: Plus,
      color: 'bg-teal-500 hover:bg-teal-600',
      action: () => {
        // TODO: Implement new event creation
        console.log('Nuevo evento');
      },
    },
  ];

  return (
    <div className={clsx('w-full', className)}>
      {/* Connection Status */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Acciones Rápidas
        </h2>
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <div className="flex items-center space-x-1 text-sm text-green-600">
              <Wifi className="h-4 w-4" />
              <span>Online</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-sm text-red-500">
              <WifiOff className="h-4 w-4" />
              <span>Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;

          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={action.action}
              disabled={action.disabled}
              className={clsx(
                'relative flex flex-col items-center justify-center rounded-2xl p-6 text-foreground shadow-lg transition-all duration-200',
                'mobile-touch-target min-h-[100px]',
                'focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-background',
                action.color,
                action.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'active:scale-95 hover:shadow-xl',
                'group'
              )}
              aria-label={action.label}
            >
              {/* Icon with animation */}
              <div className="relative">
                <Icon
                  className={clsx(
                    'h-8 w-8 transition-transform duration-200',
                    'group-hover:scale-110',
                    action.loading && 'animate-pulse'
                  )}
                />

                {/* Badge */}
                {action.badge && action.badge > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-foreground shadow-lg ring-2 ring-white">
                    {action.badge > 99 ? '99+' : action.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className="mt-3 text-sm font-medium text-center leading-tight">
                {action.label}
              </span>

              {/* Loading indicator */}
              {action.loading && (
                <div className="absolute inset-0 rounded-2xl bg-black/20 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-border/30 border-t-white rounded-full animate-spin" />
                </div>
              )}

              {/* Hover effect */}
              <div className="absolute inset-0 rounded-2xl bg-surface/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </motion.button>
          );
        })}
      </div>

      {/* Status Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 shadow-sm ring-1 ring-blue-200/50"
        >
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-blue-600 font-medium">Pendientes</p>
              <p className="text-lg font-bold text-blue-700">
                {uploadCount + pendingOrders}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-4 shadow-sm ring-1 ring-green-200/50"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs text-green-600 font-medium">Completados</p>
              <p className="text-lg font-bold text-green-700">12</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Offline Warning */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 rounded-xl bg-yellow-50 p-4 ring-1 ring-yellow-200"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Modo Offline
                </p>
                <p className="text-xs text-yellow-700">
                  Las fotos se subirán automáticamente cuando haya conexión
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
