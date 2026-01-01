'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X, ShoppingBag, Eye, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PreviewToolbar } from './PreviewToolbar';
import { PreviewFrame } from './PreviewFrame';
import { DeviceType } from './PreviewDeviceSelector';

export type PreviewMode = 'gallery' | 'store' | 'design';
export type PreviewVariant = 'modal' | 'inline' | 'panel';

interface PreviewToken {
  token: string;
  previewUrl: string;
  expiresAt: Date;
}

interface UnifiedPreviewProps {
  // Required for generating preview
  eventId?: string;
  folderId?: string;

  // Preview configuration
  mode: PreviewMode;
  variant?: PreviewVariant;

  // Direct URL mode (skips token generation)
  directUrl?: string;

  // Modal props
  open?: boolean;
  onClose?: () => void;

  // Customization
  title?: string;
  subtitle?: string;
  className?: string;

  // Initial state
  initialDevice?: DeviceType;
}

const MODE_CONFIG: Record<PreviewMode, {
  title: string;
  icon: typeof Eye;
  gradient: string;
}> = {
  gallery: {
    title: 'Vista Previa de Galeria',
    icon: ImageIcon,
    gradient: 'from-emerald-500 to-teal-600',
  },
  store: {
    title: 'Vista Previa de Tienda',
    icon: ShoppingBag,
    gradient: 'from-purple-500 to-pink-500',
  },
  design: {
    title: 'Vista Previa de Diseno',
    icon: Eye,
    gradient: 'from-blue-500 to-indigo-600',
  },
};

async function generatePreviewToken(
  eventId: string,
  folderId: string | undefined,
  mode: PreviewMode
): Promise<PreviewToken> {
  // Use the existing preview endpoint
  const response = await fetch('/api/admin/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: eventId,
      folder_id: folderId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Error al generar token de preview');
  }

  const data = await response.json();
  return {
    token: data.token,
    previewUrl: data.preview_url,
    expiresAt: new Date(data.expires_at),
  };
}

export function UnifiedPreview({
  eventId,
  folderId,
  mode,
  variant = 'modal',
  directUrl,
  open = true,
  onClose,
  title,
  subtitle,
  className,
  initialDevice = 'desktop',
}: UnifiedPreviewProps) {
  const [device, setDevice] = useState<DeviceType>(initialDevice);
  const [previewToken, setPreviewToken] = useState<PreviewToken | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const modeConfig = MODE_CONFIG[mode];
  const displayTitle = title || modeConfig.title;
  const Icon = modeConfig.icon;

  // Determine the preview URL to use
  const previewUrl = directUrl || previewToken?.previewUrl;

  // Generate preview token when needed
  const generateToken = useCallback(async () => {
    if (directUrl) return; // Skip if using direct URL

    if (!eventId) {
      setError('Se requiere un evento para generar el preview');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await generatePreviewToken(eventId, folderId, mode);
      setPreviewToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, folderId, mode, directUrl]);

  // Auto-generate token when component opens
  useEffect(() => {
    if (open && !directUrl && !previewToken) {
      generateToken();
    }
  }, [open, directUrl, previewToken, generateToken]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    if (directUrl) {
      setRefreshKey((prev) => prev + 1);
    } else {
      generateToken();
    }
  }, [directUrl, generateToken]);

  // Open in external tab
  const handleOpenExternal = useCallback(() => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  }, [previewUrl]);

  // Toggle fullscreen
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Close handler
  const handleClose = useCallback(() => {
    if (isFullscreen) {
      setIsFullscreen(false);
    } else {
      onClose?.();
    }
  }, [isFullscreen, onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleRefresh();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleClose, handleRefresh]);

  // Render content based on variant
  const renderContent = () => (
    <div className={cn(
      'flex flex-col overflow-hidden',
      variant === 'modal' && isFullscreen
        ? 'fixed inset-0 z-[60] bg-background'
        : variant === 'modal'
        ? 'max-h-[90vh] rounded-xl bg-background shadow-2xl'
        : variant === 'panel'
        ? 'rounded-xl border bg-background shadow-lg'
        : 'rounded-lg border bg-background'
    )}>
      {/* Toolbar */}
      <PreviewToolbar
        previewUrl={previewUrl}
        expiresAt={previewToken?.expiresAt}
        device={device}
        onDeviceChange={setDevice}
        onRefresh={handleRefresh}
        onOpenExternal={handleOpenExternal}
        onToggleFullscreen={variant === 'modal' ? handleToggleFullscreen : undefined}
        isFullscreen={isFullscreen}
        isLoading={isLoading}
        title={displayTitle}
        subtitle={subtitle}
      />

      {/* Preview content */}
      <div className={cn(
        'relative flex-1 min-h-0',
        variant === 'inline' ? 'min-h-[400px]' : 'min-h-[500px]'
      )}>
        {error ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div className="max-w-sm">
              <div className={cn(
                'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full',
                `bg-gradient-to-br ${modeConfig.gradient} text-white opacity-50`
              )}>
                <Icon className="h-8 w-8" />
              </div>
              <p className="text-destructive font-medium">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
                Reintentar
              </Button>
            </div>
          </div>
        ) : previewUrl ? (
          <PreviewFrame
            key={refreshKey}
            src={previewUrl}
            device={device}
            title={displayTitle}
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <div className="text-center">
              <div className={cn(
                'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full animate-pulse',
                `bg-gradient-to-br ${modeConfig.gradient} text-white`
              )}>
                <Icon className="h-8 w-8" />
              </div>
              <p className="text-muted-foreground">Generando preview...</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {variant === 'modal' && !isFullscreen && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Asi veran los clientes la {mode === 'store' ? 'tienda' : 'galeria'}
          </p>
          <Button variant="secondary" onClick={handleClose}>
            Cerrar vista previa
          </Button>
        </div>
      )}
    </div>
  );

  // Don't render if not open (for modal variant)
  if (variant === 'modal' && !open) {
    return null;
  }

  // Modal variant with overlay
  if (variant === 'modal') {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4',
          isFullscreen ? '' : 'bg-black/50 backdrop-blur-sm'
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isFullscreen) {
            handleClose();
          }
        }}
      >
        <div
          className={cn(
            'relative w-full transition-all duration-300',
            isFullscreen ? 'h-full max-w-none' : 'max-w-5xl',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button for modal */}
          {!isFullscreen && (
            <button
              onClick={handleClose}
              className="absolute -right-2 -top-2 z-10 rounded-full bg-background p-2 shadow-lg hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {renderContent()}
        </div>
      </div>
    );
  }

  // Inline and panel variants
  return (
    <div className={cn(
      variant === 'panel' ? 'h-full' : '',
      className
    )}>
      {renderContent()}
    </div>
  );
}

// Hook for using the preview system
export function useUnifiedPreview() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    eventId?: string;
    folderId?: string;
    mode: PreviewMode;
    directUrl?: string;
    title?: string;
    subtitle?: string;
  } | null>(null);

  const openPreview = useCallback((options: {
    eventId?: string;
    folderId?: string;
    mode: PreviewMode;
    directUrl?: string;
    title?: string;
    subtitle?: string;
  }) => {
    setConfig(options);
    setIsOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsOpen(false);
    setConfig(null);
  }, []);

  return {
    isOpen,
    config,
    openPreview,
    closePreview,
  };
}

// Convenience components for specific preview types
export function StorePreview(props: Omit<UnifiedPreviewProps, 'mode'>) {
  return <UnifiedPreview {...props} mode="store" />;
}

export function GalleryPreview(props: Omit<UnifiedPreviewProps, 'mode'>) {
  return <UnifiedPreview {...props} mode="gallery" />;
}

export function DesignPreview(props: Omit<UnifiedPreviewProps, 'mode'>) {
  return <UnifiedPreview {...props} mode="design" />;
}
