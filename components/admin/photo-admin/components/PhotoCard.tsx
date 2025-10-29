/**
 * Individual photo card component
 * Displays a single photo in grid or list view
 * Extracted from PhotoAdmin.tsx
 */

'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import {
  Square,
  CheckSquare,
  Image as ImageIcon,
  Star,
  Link2,
  RefreshCw,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import type { OptimizedAsset } from '../../photo-admin';
import { SafeImage, getPreviewUrl } from '../../photo-admin';
import { statusLabel } from '@/lib/utils/photo-helpers';

interface PhotoCardProps {
  asset: OptimizedAsset;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onTouchStart: () => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  density: 'comfortable' | 'compact';
}

export function PhotoCard({
  asset,
  isSelected,
  onClick,
  onTouchStart,
  onTouchEnd,
  density,
}: PhotoCardProps) {
  const draggable = useDraggable({ id: asset.id, data: { type: 'asset' } });
  const style = {
    transform: draggable.transform
      ? CSS.Translate.toString(draggable.transform)
      : undefined,
  } as React.CSSProperties;

  const previewUrl =
    asset.preview_url ?? getPreviewUrl(asset.preview_path, asset.original_path);
  const sizeLabel = asset.file_size
    ? asset.file_size > 1024 * 1024
      ? `${(asset.file_size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(asset.file_size / 1024))} KB`
    : null;
  const dateLabel = asset.created_at
    ? new Date(asset.created_at).toLocaleDateString('es-AR')
    : null;
  const statusText =
    asset.status && asset.status !== 'ready'
      ? statusLabel(asset.status)
      : null;

  return (
    <div
      className={cn(
        'group relative cursor-pointer touch-manipulation overflow-hidden rounded-xl border transition-all',
        density === 'compact'
          ? 'min-h-[100px] sm:min-h-[120px]'
          : 'min-h-[120px] sm:min-h-[150px]',
        isSelected
          ? 'border-blue-500/80 bg-blue-50 shadow-lg ring-2 ring-blue-500/40'
          : 'border-transparent bg-white hover:border-border hover:shadow-sm'
      )}
      ref={draggable.setNodeRef}
      style={style}
      {...draggable.listeners}
      {...draggable.attributes}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={cn(
          'absolute left-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border text-xs transition sm:h-8 sm:w-8',
          isSelected
            ? 'border-blue-500 bg-blue-500 text-white shadow-lg'
            : 'border-white/70 bg-black/30 text-white backdrop-blur-sm group-hover:border-white group-hover:bg-black/40'
        )}
      >
        {isSelected ? (
          <CheckSquare className="h-3.5 w-3.5" />
        ) : (
          <Square className="h-3.5 w-3.5" />
        )}
      </div>

      <div className="relative aspect-square overflow-hidden bg-muted">
        {previewUrl ? (
          <SafeImage
            src={previewUrl}
            alt={asset.filename}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImageIcon className="h-8 w-8 text-gray-400" />
        )}
        {!previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            {asset.status === 'processing' && (
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            )}
            {asset.status === 'error' && (
              <AlertCircle className="h-6 w-6 text-red-400" />
            )}
            {asset.status === 'pending' && (
              <Activity className="h-6 w-6 text-yellow-400" />
            )}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 rounded-xl border border-transparent transition group-hover:border-white/30" />
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition group-hover:opacity-100">
          <div className="flex items-center justify-between p-2 text-[11px] text-white">
            {statusText ? (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                {statusText}
              </span>
            ) : (
              <span />
            )}
            <div className="pointer-events-auto flex items-center gap-1">
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toast.info(
                    'Marca esta foto desde el inspector para destacarla.'
                  );
                }}
                aria-label="Destacar foto"
              >
                <Star className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toast.info(
                    'Comparte fotos desde el inspector o el gestor de enlaces.'
                  );
                }}
                aria-label="Compartir foto"
              >
                <Link2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="pointer-events-none space-y-1 px-2 pb-2">
            <p className="truncate text-sm font-medium text-white">
              {asset.filename}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-white/80">
              {sizeLabel && <span>{sizeLabel}</span>}
              {sizeLabel && dateLabel && <span>•</span>}
              {dateLabel && <span>{dateLabel}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
        <span className="truncate" title={asset.filename}>
          {asset.filename}
        </span>
        <div className="flex items-center gap-1">
          {statusText && (
            <span
              className="inline-flex h-2 w-2 rounded-full bg-blue-400"
              aria-hidden
            />
          )}
          {sizeLabel && <span>{sizeLabel}</span>}
        </div>
      </div>
    </div>
  );
}

