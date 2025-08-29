'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/components/ui/NotificationSystem';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  QrCode,
  Undo,
  Clock,
  Users,
  Link2,
  X,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublishSuccessData {
  codeId: string;
  codeValue: string;
  token: string;
  familyUrl: string;
  qrUrl: string;
  photosCount: number;
  eventName?: string;
  action: 'published' | 'unpublished' | 'rotated';
}

interface PublishSuccessToastProps {
  data: PublishSuccessData;
  onUndo?: (codeId: string, action: string) => Promise<void>;
  autoHide?: boolean;
  duration?: number;
  className?: string;
}

export function PublishSuccessToast({
  data,
  onUndo,
  autoHide = true,
  duration = 8000,
  className,
}: PublishSuccessToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isUndoing, setIsUndoing] = useState(false);
  const [progress, setProgress] = useState(100);
  const [timeRemaining, setTimeRemaining] = useState(duration / 1000);
  const [copied, setCopied] = useState<'url' | 'qr' | null>(null);
  const [shared, setShared] = useState(false);

  // Auto-hide timer
  useEffect(() => {
    if (!autoHide || !isVisible) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - 100 / (duration / 100);
        return Math.max(0, newProgress);
      });
    }, 100);

    const countdownInterval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    const hideTimer = setTimeout(() => {
      handleHide();
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearInterval(countdownInterval);
      clearTimeout(hideTimer);
    };
  }, [duration, autoHide, isVisible]);

  const handleHide = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(data.familyUrl);
      setCopied('url');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Error copying URL:', error);
    }
  }, [data.familyUrl]);

  const handleCopyQrUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(data.qrUrl);
      setCopied('qr');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Error copying QR URL:', error);
    }
  }, [data.qrUrl]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Galería familiar - ${data.codeValue}`,
          text: `Fotos del evento ${data.eventName || 'escolar'}`,
          url: data.familyUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copy URL
      handleCopyUrl();
    }
  }, [data, handleCopyUrl]);

  const handleUndo = useCallback(async () => {
    if (!onUndo || isUndoing) return;

    setIsUndoing(true);
    try {
      await onUndo(data.codeId, data.action);
      handleHide();
    } catch (error) {
      console.error('Error undoing action:', error);
    } finally {
      setIsUndoing(false);
    }
  }, [onUndo, data.codeId, data.action, isUndoing, handleHide]);

  const getActionText = () => {
    switch (data.action) {
      case 'published':
        return 'Código publicado exitosamente';
      case 'unpublished':
        return 'Código despublicado';
      case 'rotated':
        return 'Token rotado exitosamente';
      default:
        return 'Acción completada';
    }
  };

  const getActionColor = () => {
    switch (data.action) {
      case 'published':
        return 'text-emerald-800 bg-emerald-50/90 border-emerald-200';
      case 'unpublished':
        return 'text-orange-800 bg-orange-50/90 border-orange-200';
      case 'rotated':
        return 'text-blue-800 bg-blue-50/90 border-blue-200';
      default:
        return 'text-gray-800 bg-gray-50/90 border-gray-200';
    }
  };

  const getIcon = () => {
    switch (data.action) {
      case 'published':
        return <CheckCircle2 className="h-6 w-6 text-emerald-600" />;
      case 'unpublished':
        return <Clock className="h-6 w-6 text-orange-600" />;
      case 'rotated':
        return <Link2 className="h-6 w-6 text-blue-600" />;
      default:
        return <CheckCircle2 className="h-6 w-6 text-gray-600" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-full max-w-md',
        'transform transition-all duration-300 ease-out',
        'translate-x-0 scale-100 opacity-100',
        'sm:bottom-6 sm:right-6',
        className
      )}
    >
      {/* Progress bar */}
      {autoHide && (
        <div className="absolute left-0 right-0 top-0 h-1 overflow-hidden rounded-t-xl bg-white/20">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div
        className={cn(
          'neural-glass-card rounded-xl border p-4 shadow-lg backdrop-blur-md',
          'transition-all duration-300 hover:shadow-xl',
          getActionColor()
        )}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="mt-0.5 flex-shrink-0">{getIcon()}</div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold">{getActionText()}</h4>
                <div className="mt-1 flex items-center gap-2 text-xs opacity-90">
                  <span className="font-medium">{data.codeValue}</span>
                  {data.photosCount > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{data.photosCount} fotos</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleHide}
                className="ml-2 h-6 min-h-[24px] w-6 flex-shrink-0 p-0 opacity-60 hover:opacity-100"
                aria-label="Cerrar notificación"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Action buttons for published codes */}
            {data.action === 'published' && data.token && (
              <div className="mb-3 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyUrl}
                  disabled={copied === 'url'}
                  className="min-h-[36px] min-w-0 flex-1 text-xs font-medium"
                  aria-label="Copiar enlace familiar"
                >
                  {copied === 'url' ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" />
                      <span>Copiar enlace</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="min-h-[36px] flex-shrink-0 px-3 text-xs font-medium"
                  aria-label="Compartir enlace"
                >
                  {shared ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <Share2 className="h-3 w-3" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(data.qrUrl, '_blank')}
                  className="min-h-[36px] flex-shrink-0 px-3 text-xs font-medium"
                  aria-label="Ver código QR"
                >
                  <QrCode className="h-3 w-3" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(data.familyUrl, '_blank')}
                  className="min-h-[36px] flex-shrink-0 px-3 text-xs font-medium"
                  aria-label="Abrir galería"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Bottom row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs opacity-60">
                {autoHide && timeRemaining > 0 && (
                  <span>Se cierra en {Math.ceil(timeRemaining)}s</span>
                )}
              </div>

              {/* Undo button */}
              {onUndo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={isUndoing}
                  className="min-h-[32px] px-3 text-xs font-medium"
                  aria-label="Deshacer acción"
                >
                  {isUndoing ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <>
                      <Undo className="mr-1 h-3 w-3" />
                      <span>Deshacer</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to use the PublishSuccessToast with notifications system
export function usePublishSuccessToast() {
  const { addNotification } = useNotifications();

  const showPublishSuccess = useCallback(
    (
      data: PublishSuccessData,
      options?: {
        onUndo?: (codeId: string, action: string) => Promise<void>;
        autoHide?: boolean;
        duration?: number;
      }
    ) => {
      return addNotification({
        type: 'success',
        title: 'Publicación exitosa',
        message: `Código ${data.codeValue} ${data.action === 'published' ? 'publicado' : 'actualizado'}`,
        category: 'event',
        duration: options?.autoHide === false ? 0 : options?.duration || 8000,
        action: options?.onUndo
          ? {
              label: 'Deshacer',
              onClick: () => options.onUndo!(data.codeId, data.action),
            }
          : undefined,
        metadata: data,
      });
    },
    [addNotification]
  );

  const showUnpublishSuccess = useCallback(
    (
      codeValue: string,
      codeId: string,
      onUndo?: (codeId: string) => Promise<void>
    ) => {
      return addNotification({
        type: 'info',
        title: 'Código despublicado',
        message: `${codeValue} ya no es accesible para las familias`,
        category: 'event',
        duration: 5000,
        action: onUndo
          ? {
              label: 'Restaurar',
              onClick: () => onUndo(codeId),
            }
          : undefined,
      });
    },
    [addNotification]
  );

  const showRotateSuccess = useCallback(
    (codeValue: string, newToken: string, familyUrl: string, qrUrl: string) => {
      return addNotification({
        type: 'success',
        title: 'Token rotado',
        message: `Nuevo enlace generado para ${codeValue}`,
        category: 'event',
        duration: 8000,
        action: {
          label: 'Copiar enlace',
          onClick: async () => {
            try {
              await navigator.clipboard.writeText(familyUrl);
            } catch (error) {
              console.error('Error copying URL:', error);
            }
          },
        },
        metadata: {
          codeValue,
          token: newToken,
          familyUrl,
          qrUrl,
        },
      });
    },
    [addNotification]
  );

  const showBulkOperationSuccess = useCallback(
    (action: string, count: number, details?: string[]) => {
      return addNotification({
        type: 'success',
        title: `Operación masiva completada`,
        message: `${action} aplicada a ${count} códigos`,
        category: 'event',
        duration: 6000,
        metadata: {
          action,
          count,
          details,
        },
      });
    },
    [addNotification]
  );

  return {
    showPublishSuccess,
    showUnpublishSuccess,
    showRotateSuccess,
    showBulkOperationSuccess,
  };
}

// Skeleton component for loading state
export function PublishSuccessToastSkeleton() {
  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md">
      <div className="neural-glass-card rounded-xl border border-gray-200 bg-white/90 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-6 w-6 flex-shrink-0 animate-pulse rounded-full bg-gray-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
            <div className="flex gap-2">
              <div className="h-8 flex-1 animate-pulse rounded bg-gray-100" />
              <div className="h-8 w-8 animate-pulse rounded bg-gray-100" />
              <div className="h-8 w-8 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
