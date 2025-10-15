'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Cloud,
  CloudOff,
  Zap,
  ZapOff,
} from 'lucide-react';
import { clsx } from 'clsx';

interface OfflineIndicatorProps {
  variant?: 'full' | 'compact' | 'minimal' | 'toast';
  position?: 'top' | 'bottom' | 'center';
  showDetails?: boolean;
  onRetry?: () => void;
  className?: string;
}

interface ConnectionInfo {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export function OfflineIndicator({
  variant = 'compact',
  position = 'top',
  showDetails = false,
  onRetry,
  className,
}: OfflineIndicatorProps) {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    isOnline: navigator.onLine,
  });
  const [showToast, setShowToast] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);

  useEffect(() => {
    const updateConnectionInfo = () => {
      const info: ConnectionInfo = {
        isOnline: navigator.onLine,
      };

      // Get network information if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          info.connectionType = connection.type;
          info.effectiveType = connection.effectiveType;
          info.downlink = connection.downlink;
          info.rtt = connection.rtt;
          info.saveData = connection.saveData;
        }
      }

      setConnectionInfo(info);
    };

    const handleOnline = () => {
      setConnectionInfo(prev => ({ ...prev, isOnline: true }));
      setLastOnlineTime(new Date());
      setShowToast(true);

      // Hide toast after 3 seconds
      setTimeout(() => setShowToast(false), 3000);
    };

    const handleOffline = () => {
      setConnectionInfo(prev => ({ ...prev, isOnline: false }));
      setShowToast(true);
    };

    // Initial load
    updateConnectionInfo();

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', updateConnectionInfo);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          connection.removeEventListener('change', updateConnectionInfo);
        }
      }
    };
  }, []);

  const getConnectionQuality = () => {
    if (!connectionInfo.isOnline) return 'offline';

    const { effectiveType, downlink, rtt } = connectionInfo;

    if (effectiveType === '4g' || (downlink && downlink >= 10)) {
      return 'excellent';
    } else if (effectiveType === '3g' || (downlink && downlink >= 1)) {
      return 'good';
    } else if (effectiveType === '2g' || (downlink && downlink >= 0.1)) {
      return 'slow';
    } else {
      return 'poor';
    }
  };

  const getConnectionIcon = () => {
    if (!connectionInfo.isOnline) return WifiOff;

    const quality = getConnectionQuality();
    switch (quality) {
      case 'excellent':
        return Zap;
      case 'good':
        return Wifi;
      case 'slow':
        return Cloud;
      default:
        return AlertTriangle;
    }
  };

  const getConnectionColor = () => {
    if (!connectionInfo.isOnline) return 'text-red-500';

    const quality = getConnectionQuality();
    switch (quality) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-blue-500';
      case 'slow':
        return 'text-yellow-500';
      default:
        return 'text-red-500';
    }
  };

  const getConnectionText = () => {
    if (!connectionInfo.isOnline) return 'Sin conexión';

    const quality = getConnectionQuality();
    switch (quality) {
      case 'excellent':
        return 'Conexión rápida';
      case 'good':
        return 'Conexión buena';
      case 'slow':
        return 'Conexión lenta';
      default:
        return 'Conexión débil';
    }
  };

  const getDetailedInfo = () => {
    if (!connectionInfo.isOnline) {
      return 'No hay conexión a internet. Las funciones offline están disponibles.';
    }

    const { connectionType, effectiveType, downlink, rtt } = connectionInfo;
    const quality = getConnectionQuality();

    let details = '';
    if (effectiveType) details += `${effectiveType.toUpperCase()}`;
    if (downlink) details += ` • ${downlink} Mbps`;
    if (rtt) details += ` • ${rtt}ms latencia`;

    const qualityText = {
      excellent: 'Conexión excelente para subir fotos grandes.',
      good: 'Conexión adecuada para la mayoría de operaciones.',
      slow: 'Conexión lenta. Considere subir fotos más tarde.',
      poor: 'Conexión muy débil. Active el modo offline.',
    };

    return `${qualityText[quality]} ${details}`;
  };

  // Toast notification when connection changes
  if (variant === 'toast') {
    return (
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className={clsx(
              'fixed z-50 mx-4 p-4 rounded-xl shadow-lg border backdrop-blur-sm',
              position === 'top' ? 'top-20' : 'bottom-20',
              connectionInfo.isOnline
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            )}
          >
            <div className="flex items-center space-x-3">
              {connectionInfo.isOnline ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <div className="flex-1">
                <p className="font-medium">
                  {connectionInfo.isOnline ? 'Conexión restaurada' : 'Conexión perdida'}
                </p>
                <p className="text-sm opacity-90">
                  {getConnectionText()}
                </p>
              </div>
              {onRetry && !connectionInfo.isOnline && (
                <button
                  onClick={onRetry}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-surface/50 hover:bg-surface/70 rounded-lg text-sm font-medium transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reintentar</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Full indicator with details
  if (variant === 'full') {
    return (
      <div className={clsx('bg-background rounded-xl p-4 border border-border', className)}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Estado de Conexión</h3>
          <div className="flex items-center space-x-2">
            {(() => {
              const IconComponent = getConnectionIcon();
              return <IconComponent className={clsx('h-5 w-5', getConnectionColor())} />;
            })()}
            <span className={clsx('text-sm font-medium', getConnectionColor())}>
              {getConnectionText()}
            </span>
          </div>
        </div>

        {showDetails && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{getDetailedInfo()}</p>
            {lastOnlineTime && (
              <p>
                Última conexión: {lastOnlineTime.toLocaleTimeString('es-ES')}
              </p>
            )}
          </div>
        )}

        {onRetry && !connectionInfo.isOnline && (
          <button
            onClick={onRetry}
            className="mt-3 w-full flex items-center justify-center space-x-2 bg-primary-600 text-foreground py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reintentar Conexión</span>
          </button>
        )}
      </div>
    );
  }

  // Compact indicator
  if (variant === 'compact') {
    const IconComponent = getConnectionIcon();
    return (
      <div className={clsx('flex items-center space-x-2', className)}>
        <IconComponent className={clsx('h-4 w-4', getConnectionColor())} />
        <span className={clsx('text-sm', getConnectionColor())}>
          {getConnectionText()}
        </span>
        {showDetails && (
          <span className="text-xs text-muted-foreground">
            {connectionInfo.isOnline ? 'Online' : 'Offline'}
          </span>
        )}
      </div>
    );
  }

  // Minimal indicator (just icon)
  const IconComponent = getConnectionIcon();
  return (
    <div className={className}>
      <IconComponent
        className={clsx('h-5 w-5', getConnectionColor())}
        aria-label={getConnectionText()}
        role="img"
      />
    </div>
  );
}
