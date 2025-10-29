/**
 * Photo Grid Panel Component
 * Displays photos in a virtualized grid or list view
 * Extracted from PhotoAdmin.tsx
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Grid3X3,
  List,
  RefreshCw,
  ImageIcon,
  CheckSquare,
  X,
} from 'lucide-react';
import type { OptimizedAsset, OptimizedFolder } from '../../photo-admin';
import { PhotoCard } from './PhotoCard';

interface PhotoGridProps {
  assets: OptimizedAsset[];
  selectedAssetIds: Set<string>;
  onSelectionChange: (
    assetId: string,
    isSelected: boolean,
    isRange?: boolean
  ) => void;
  onSelectAll: () => void | Promise<void>;
  onClearSelection: () => void;
  onCreateAlbum: () => void;
  onBulkDelete: () => void;
  onBulkMove: (targetFolderId: string) => void;
  folders?: OptimizedFolder[];
  currentFolderId?: string | null;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  className?: string;
  albumTargetInfo?: string;
  totalCount?: number;
  isLoadingAllPages?: boolean;
}

export function PhotoGrid({
  assets,
  selectedAssetIds,
  onSelectionChange,
  onSelectAll,
  onClearSelection,
  onCreateAlbum,
  onBulkDelete,
  onBulkMove,
  folders = [],
  currentFolderId = null,
  onLoadMore,
  hasMore,
  isLoading,
  isLoadingMore,
  className,
  albumTargetInfo,
  totalCount,
  isLoadingAllPages,
}: PhotoGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    if (typeof window === 'undefined') return 'comfortable';
    const saved = localStorage.getItem('le:photoDensity');
    return saved === 'compact' ? 'compact' : 'comfortable';
  });
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null
  );
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('le:photoDensity', density);
    } catch (error) {
      console.warn('No se pudo persistir la densidad seleccionada', error);
    }
  }, [density]);

  // Virtual scrolling for performance
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(assets.length / 6) + (hasMore ? 1 : 0), // 6 items per row + loader
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => (density === 'compact' ? 160 : 220),
    overscan: 2,
  });

  // Intersection observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoadingMore || !onLoadMore) return;

    const rootEl = scrollElementRef.current ?? null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { threshold: 0.1, root: rootEl || undefined }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, onLoadMore, assets.length]);

  // Fallback: trigger load more when user scrolls near bottom
  useEffect(() => {
    const el = scrollElementRef.current;
    if (!el || !onLoadMore) return;
    const onScroll = () => {
      if (!hasMore || isLoadingMore) return;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (nearBottom) onLoadMore();
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasMore, isLoadingMore, onLoadMore]);

  const handleAssetClick = (
    asset: OptimizedAsset,
    index: number,
    event: React.MouseEvent
  ) => {
    const isSelected = selectedAssetIds.has(asset.id);

    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + Click: Toggle individual selection (for power users)
      onSelectionChange(asset.id, !isSelected);
      setLastSelectedIndex(index);
    } else if (event.shiftKey && lastSelectedIndex !== null) {
      // Shift + Click: Range selection
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);

      for (let i = start; i <= end; i++) {
        if (assets[i]) {
          onSelectionChange(assets[i].id, true);
        }
      }
    } else {
      // Regular click: Toggle individual selection (checkbox-like behavior)
      onSelectionChange(asset.id, !isSelected);
      setLastSelectedIndex(index);
    }
  };

  const handleTouchStart = () => {
    setTouchStartTime(Date.now());
  };

  const handleTouchEnd = (
    asset: OptimizedAsset,
    index: number,
    event: React.TouchEvent
  ) => {
    const touchDuration = Date.now() - touchStartTime;

    // Long press on mobile (500ms+) for selection
    if (touchDuration >= 500) {
      event.preventDefault();
      const isSelected = selectedAssetIds.has(asset.id);
      onSelectionChange(asset.id, !isSelected);
      setLastSelectedIndex(index);
    } else {
      // Regular tap: Toggle selection (same as click)
      const isSelected = selectedAssetIds.has(asset.id);
      onSelectionChange(asset.id, !isSelected);
      setLastSelectedIndex(index);
    }
  };

  const renderVirtualizedGrid = () => (
    <div ref={scrollElementRef} className="flex-1 overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * 6;
          const endIndex = Math.min(startIndex + 6, assets.length);
          const rowAssets = assets.slice(startIndex, endIndex);

          // If this is the last row and we have more to load, show loader
          if (startIndex >= assets.length && hasMore) {
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="flex items-center justify-center"
              >
                <div ref={loadMoreRef}>
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading more...
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading more photos...</div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className={cn(
                  'grid h-full',
                  density === 'compact'
                    ? 'grid-cols-3 gap-2 p-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'
                    : 'grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                )}
              >
                {rowAssets.map((asset, rowIndex) => {
                  const globalIndex = startIndex + rowIndex;
                  const isSelected = selectedAssetIds.has(asset.id);
                  return (
                    <PhotoCard
                      key={asset.id}
                      asset={asset}
                      isSelected={isSelected}
                      onClick={(e) => handleAssetClick(asset, globalIndex, e)}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={(e) => handleTouchEnd(asset, globalIndex, e)}
                      density={density}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={cn('flex h-full flex-col bg-white', className)}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold">Fotos</h3>
            {assets.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSelectAll}
                className="text-sm"
              >
                <CheckSquare className="mr-1 h-4 w-4" />
                Seleccionar
              </Button>
            )}
            {selectedAssetIds.size > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onClearSelection}
                className="shrink-0 text-sm"
              >
                <X className="mr-1 h-4 w-4" />
                Limpiar ({selectedAssetIds.size})
              </Button>
            )}
            {typeof totalCount === 'number' && totalCount > 0 ? (
              <Badge variant="secondary">
                {assets.length} / {totalCount}
              </Badge>
            ) : assets.length > 0 ? (
              <Badge variant="secondary">{assets.length}</Badge>
            ) : null}
            {isLoadingAllPages && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Cargando...
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="grid w-full shrink-0 grid-cols-2">
                <TabsTrigger value="grid">
                  <Grid3X3 className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div ref={scrollElementRef} className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg border">
                <div className="aspect-square animate-pulse bg-muted" />
                <div className="p-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 p-10 text-center text-sm text-muted-foreground">
          <ImageIcon className="h-12 w-12 text-muted-foreground" />
          <div className="space-y-2">
            <h4 className="text-lg font-semibold text-foreground">
              No encontramos fotos aquí
            </h4>
            <p>
              Revisa los filtros activos, incluye subcarpetas o utiliza la
              búsqueda global.
            </p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        renderVirtualizedGrid()
      ) : (
        <div ref={scrollElementRef} className="flex-1 overflow-auto">
          <div className="divide-y">
            {assets.map((asset, index) => {
              const isSelected = selectedAssetIds.has(asset.id);
              return (
                <div
                  key={asset.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 p-3 hover:bg-muted',
                    isSelected && 'bg-blue-50'
                  )}
                  onClick={(e) => handleAssetClick(asset, index, e)}
                >
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded border',
                      isSelected
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300'
                    )}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    {asset.filename}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

