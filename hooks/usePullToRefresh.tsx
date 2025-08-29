'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || window.scrollY > 0) return;

      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging.current || disabled) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && window.scrollY === 0) {
        e.preventDefault();
        const distance = Math.min(diff * 0.5, threshold + 30); // Resistance effect
        setPullDistance(distance);
        setIsPulling(distance > threshold);
      }
    },
    [threshold, disabled]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current || disabled) return;

    isDragging.current = false;

    if (pullDistance > threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setIsPulling(false);
        setPullDistance(0);
      }
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh, disabled]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    container.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    // CSS transform for pull indicator
    pullStyle: {
      transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
      transition: isDragging.current ? 'none' : 'transform 0.3s ease',
    },
  };
}

// Componente visual para el indicador de pull-to-refresh
export function PullToRefreshIndicator({
  isPulling,
  isRefreshing,
  pullDistance,
  threshold = 70,
}: {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  threshold?: number;
}) {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;

  return (
    <div
      className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full transform transition-transform duration-300 ${
        pullDistance > 10 ? 'translate-y-0' : ''
      }`}
      style={{
        transform: `translateX(-50%) translateY(${Math.min(pullDistance - threshold, 0)}px)`,
      }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 shadow-lg">
        {isRefreshing ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <svg
            className="h-5 w-5 text-white transition-transform duration-200"
            style={{ transform: `rotate(${rotation}deg)` }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7-7m0 0l-7 7m7-7v18"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
