'use client';

import React, {
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useState,
} from 'react';
import {
  useVirtualScrolling,
  useIntersectionObserver,
} from '@/lib/utils/performance';
import { cn } from '@/lib/utils/cn';
import { EventCard } from '@/components/admin/EventCard';

interface VirtualEventGridProps {
  events: any[];
  onEventSelect?: (event: any, selected: boolean) => void;
  onEventEdit?: (event: any) => void;
  onEventDelete?: (event: any) => void;
  onEventView?: (event: any) => void;
  selectedEvents?: string[];
  isDragMode?: boolean;
  compactMode?: boolean;
  showProgress?: boolean;
  showPreview?: boolean;
  showAnalytics?: boolean;
  className?: string;
  gridColumns?: number;
  itemHeight?: number;
}

export function VirtualEventGrid({
  events,
  onEventSelect,
  onEventEdit,
  onEventDelete,
  onEventView,
  selectedEvents = [],
  isDragMode = false,
  compactMode = false,
  showProgress = true,
  showPreview = true,
  showAnalytics = true,
  className,
  gridColumns = 4,
  itemHeight = 420,
}: VirtualEventGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(800);
  const [isVisible, setIsVisible] = useIntersectionObserver();

  // Calculate responsive grid columns based on container width
  const responsiveColumns = useMemo(() => {
    if (typeof window === 'undefined') return gridColumns;

    const width = window.innerWidth;
    if (width >= 2560) return 6; // XXL (32"+)
    if (width >= 2048) return 5; // XL (27")
    if (width >= 1536) return 4; // Large
    if (width >= 1024) return 3; // Desktop
    if (width >= 768) return 2; // Tablet
    return 1; // Mobile
  }, [gridColumns]);

  // Adjust item height for compact mode
  const adjustedItemHeight = compactMode ? itemHeight * 0.7 : itemHeight;

  // Group events into rows for virtual scrolling
  const eventRows = useMemo(() => {
    const rows: any[][] = [];
    for (let i = 0; i < events.length; i += responsiveColumns) {
      rows.push(events.slice(i, i + responsiveColumns));
    }
    return rows;
  }, [events, responsiveColumns]);

  const {
    virtualItems,
    totalHeight,
    scrollElementRef,
    handleScroll,
    visibleRange,
  } = useVirtualScrolling(eventRows, adjustedItemHeight, containerHeight, 2);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(Math.min(rect.height, window.innerHeight - 200));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Optimized event handlers
  const handleEventSelect = useCallback(
    (event: any, selected: boolean) => {
      onEventSelect?.(event, selected);
    },
    [onEventSelect]
  );

  const handleEventEdit = useCallback(
    (event: any) => {
      onEventEdit?.(event);
    },
    [onEventEdit]
  );

  const handleEventDelete = useCallback(
    (event: any) => {
      onEventDelete?.(event);
    },
    [onEventDelete]
  );

  const handleEventView = useCallback(
    (event: any) => {
      onEventView?.(event);
    },
    [onEventView]
  );

  // Render virtual event row
  const renderEventRow = useCallback(
    (rowData: { item: any[]; index: number; offsetTop: number }) => {
      const { item: eventRow, index: rowIndex, offsetTop } = rowData;

      return (
        <div
          key={`row-${rowIndex}`}
          className="absolute grid w-full gap-4"
          style={{
            top: offsetTop,
            height: adjustedItemHeight,
            gridTemplateColumns: `repeat(${responsiveColumns}, 1fr)`,
          }}
        >
          {eventRow.map((event, colIndex) => {
            const globalIndex = rowIndex * responsiveColumns + colIndex;

            return (
              <div
                key={event.id}
                className="neural-card-enter"
                style={{
                  animationDelay: `${(globalIndex % 12) * 50}ms`,
                  animationFillMode: 'both',
                }}
              >
                <EventCard
                  event={event}
                  onDelete={handleEventDelete}
                  onEdit={handleEventEdit}
                  onView={handleEventView}
                  onSelect={handleEventSelect}
                  isSelected={selectedEvents.includes(event.id)}
                  isDraggable={isDragMode}
                  dragIndex={globalIndex}
                  className="flex h-full flex-col"
                  compact={compactMode}
                  showProgress={showProgress}
                  showPreview={showPreview}
                  showAnalytics={showAnalytics}
                  animationDelay={globalIndex * 50}
                />
              </div>
            );
          })}

          {/* Fill empty slots in the last row */}
          {eventRow.length < responsiveColumns &&
            Array.from({ length: responsiveColumns - eventRow.length }).map(
              (_, emptyIndex) => <div key={`empty-${rowIndex}-${emptyIndex}`} />
            )}
        </div>
      );
    },
    [
      responsiveColumns,
      adjustedItemHeight,
      selectedEvents,
      isDragMode,
      compactMode,
      showProgress,
      showPreview,
      showAnalytics,
      handleEventDelete,
      handleEventEdit,
      handleEventView,
      handleEventSelect,
    ]
  );

  if (!isVisible && events.length > 20) {
    return (
      <div
        ref={isVisible}
        className={cn('neural-glass-card p-8 text-center', className)}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          <div className="border-3 h-8 w-8 animate-spin rounded-full border-blue-600 border-t-transparent" />
        </div>
        <p className="text-gray-600">Cargando eventos optimizado...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('w-full', className)}>
      <div
        ref={scrollElementRef}
        className="overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div className="relative" style={{ height: totalHeight }}>
          {virtualItems.map(renderEventRow)}
        </div>

        {/* Performance indicator */}
        {process.env.NODE_ENV === 'development' && (
          <div className="neural-glass-card fixed bottom-4 right-4 bg-black/80 p-2 font-mono text-xs text-white">
            <div>
              Visible: {visibleRange.startIndex}-{visibleRange.endIndex}
            </div>
            <div>Total: {events.length} events</div>
            <div>Rows: {eventRows.length}</div>
            <div>Cols: {responsiveColumns}</div>
          </div>
        )}
      </div>

      {/* Loading indicator for bottom */}
      {events.length > 100 && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            <span>Optimizado para {events.length} eventos</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Performance stats component
export function VirtualGridStats({
  events,
  visibleRange,
}: {
  events: any[];
  visibleRange: { startIndex: number; endIndex: number; visibleCount: number };
}) {
  const memoryUsage = useMemo(() => {
    if (typeof window === 'undefined' || !(performance as any).memory)
      return null;

    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
    };
  }, []);

  return (
    <div className="neural-glass-card space-y-1 p-3 text-xs">
      <div className="font-semibold text-blue-600">Rendimiento Virtual</div>
      <div>Eventos totales: {events.length}</div>
      <div>Visibles: {visibleRange.endIndex - visibleRange.startIndex + 1}</div>
      <div>
        Rango: {visibleRange.startIndex}-{visibleRange.endIndex}
      </div>
      {memoryUsage && (
        <div>
          Memoria: {memoryUsage.used}MB / {memoryUsage.total}MB
        </div>
      )}
    </div>
  );
}
