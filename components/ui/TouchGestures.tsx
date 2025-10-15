/**
 * Touch Gestures Components
 *
 * Enhanced mobile experience with swipe, pinch, and touch gestures
 * Optimized for gallery browsing and photo selection
 */

'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SwipeableProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
}

export function Swipeable({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className,
}: SwipeableProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number }> | null>(
    null
  );
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number }> | null>(
    null
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > threshold;
    const isRightSwipe = distanceX < -threshold;
    const isUpSwipe = distanceY > threshold;
    const isDownSwipe = distanceY < -threshold;

    // Determine if horizontal or vertical swipe is dominant
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      // Horizontal swipe
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft();
      } else if (isRightSwipe && onSwipeRight) {
        onSwipeRight();
      }
    } else {
      // Vertical swipe
      if (isUpSwipe && onSwipeUp) {
        onSwipeUp();
      } else if (isDownSwipe && onSwipeDown) {
        onSwipeDown();
      }
    }
  };

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}

interface PinchZoomProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  className?: string;
}

export function PinchZoom({
  children,
  minScale = 0.5,
  maxScale = 3,
  className,
}: PinchZoomProps) {
  const [scale, setScale] = useState(1);
  const [lastScale, setLastScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [lastTranslate, setLastTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        setIsDragging(true);
        setLastTranslate(translate);
      }
    },
    [translate]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 2) {
        // Pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        if (lastScale) {
          const newScale = Math.min(
            Math.max(distance / 100, minScale),
            maxScale
          );
          setScale(newScale);
        }
      } else if (e.touches.length === 1 && isDragging && scale > 1) {
        // Pan when zoomed
        const touch = e.touches[0];
        const deltaX = touch.clientX - e.changedTouches[0].clientX;
        const deltaY = touch.clientY - e.changedTouches[0].clientY;

        setTranslate({
          x: lastTranslate.x + deltaX,
          y: lastTranslate.y + deltaY,
        });
      }
    },
    [isDragging, lastScale, minScale, maxScale, scale, lastTranslate]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setLastScale(scale);
    setLastTranslate(translate);
  }, [scale, translate]);

  const resetZoom = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setLastScale(1);
    setLastTranslate({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className={cn('touch-none overflow-hidden', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={resetZoom}
    >
      <div
        style={{
          transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  className,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    // Only allow pull down at the top of the page
    if (window.scrollY === 0 && distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const pullProgress = Math.min(pullDistance / threshold, 1);

  return (
    <div className={className}>
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="bg-primary fixed left-0 right-0 top-0 z-50 py-2 text-center text-white transition-all duration-300"
          style={{
            transform: `translateY(${Math.min(pullDistance - threshold, 0)}px)`,
            opacity: pullProgress,
          }}
        >
          {isRefreshing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
              <span>Actualizando...</span>
            </div>
          ) : pullProgress >= 1 ? (
            'Suelta para actualizar'
          ) : (
            'Desliza para actualizar'
          )}
        </div>
      )}

      {/* Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.3s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface LongPressProps {
  children: React.ReactNode;
  onLongPress: () => void;
  delay?: number;
  className?: string;
}

export function LongPress({
  children,
  onLongPress,
  delay = 500,
  className,
}: LongPressProps) {
  const [isPressed, setIsPressed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startPress = useCallback(() => {
    setIsPressed(true);
    timeoutRef.current = setTimeout(() => {
      onLongPress();
      setIsPressed(false);
    }, delay);
  }, [onLongPress, delay]);

  const endPress = useCallback(() => {
    setIsPressed(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        'transition-all duration-150',
        isPressed && 'scale-95 opacity-75',
        className
      )}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchCancel={endPress}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
    >
      {children}
    </div>
  );
}

interface SwipeCarouselProps {
  items: React.ReactNode[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  className?: string;
}

export function SwipeCarousel({
  items,
  currentIndex,
  onIndexChange,
  className,
}: SwipeCarouselProps) {
  const handleSwipeLeft = () => {
    if (currentIndex < items.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  return (
    <Swipeable
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      className={cn('relative overflow-hidden', className)}
    >
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          width: `${items.length * 100}%`,
        }}
      >
        {items.map((item, index) => (
          <div key={index} className="w-full flex-shrink-0">
            {item}
          </div>
        ))}
      </div>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 transform space-x-2">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => onIndexChange(index)}
            className={cn(
              'h-2 w-2 rounded-full transition-all duration-200',
              index === currentIndex ? 'bg-white' : 'bg-white/50'
            )}
          />
        ))}
      </div>
    </Swipeable>
  );
}

export default {
  Swipeable,
  PinchZoom,
  PullToRefresh,
  LongPress,
  SwipeCarousel,
};
