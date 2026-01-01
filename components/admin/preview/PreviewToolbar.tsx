'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  ExternalLink,
  Maximize2,
  Minimize2,
  Clock,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PreviewDeviceSelector, DeviceType } from './PreviewDeviceSelector';

interface PreviewToolbarProps {
  previewUrl?: string;
  expiresAt?: Date;
  device: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
  onRefresh: () => void;
  onOpenExternal?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

function formatTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) return 'Expirado';

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function PreviewToolbar({
  previewUrl,
  expiresAt,
  device,
  onDeviceChange,
  onRefresh,
  onOpenExternal,
  onToggleFullscreen,
  isFullscreen = false,
  isLoading = false,
  title = 'Vista Previa',
  subtitle,
  className,
}: PreviewToolbarProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Update countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const updateTime = () => {
      setTimeRemaining(formatTimeRemaining(expiresAt));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleOpenExternal = () => {
    if (previewUrl && onOpenExternal) {
      onOpenExternal();
    } else if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={cn(
      'flex flex-col gap-3 border-b bg-muted/30 px-4 py-3',
      className
    )}>
      {/* Top row: Title and main actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <Eye className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{title}</h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Token expiry indicator */}
          {expiresAt && timeRemaining && (
            <Badge
              variant="outline"
              className={cn(
                'gap-1.5 text-xs',
                timeRemaining === 'Expirado'
                  ? 'border-destructive text-destructive'
                  : 'border-amber-300 bg-amber-50 text-amber-700'
              )}
            >
              <Clock className="h-3 w-3" />
              {timeRemaining}
            </Badge>
          )}

          {/* Refresh button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-9 w-9"
            title="Refrescar preview"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>

          {/* Fullscreen toggle */}
          {onToggleFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFullscreen}
              className="h-9 w-9"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Open in new tab */}
          {previewUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenExternal}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Abrir</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bottom row: Device selector */}
      <div className="flex items-center justify-between gap-4">
        <PreviewDeviceSelector
          selected={device}
          onChange={onDeviceChange}
        />

        {previewUrl && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate max-w-[200px]" title={previewUrl}>
              {previewUrl.replace(/^https?:\/\//, '').substring(0, 30)}...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
