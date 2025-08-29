'use client';

import { useState, useEffect, useCallback } from 'react';

export interface GridBreakpoint {
  name: string;
  minWidth: number;
  maxWidth?: number;
  columns: number;
  cardMinWidth: number;
  gap: number;
  padding: number;
}

export const GRID_BREAKPOINTS: GridBreakpoint[] = [
  {
    name: 'mobile',
    minWidth: 0,
    maxWidth: 639,
    columns: 1,
    cardMinWidth: 300,
    gap: 16,
    padding: 16,
  },
  {
    name: 'tablet',
    minWidth: 640,
    maxWidth: 1023,
    columns: 2,
    cardMinWidth: 280,
    gap: 20,
    padding: 20,
  },
  {
    name: 'desktop',
    minWidth: 1024,
    maxWidth: 1439,
    columns: 3,
    cardMinWidth: 300,
    gap: 24,
    padding: 24,
  },
  {
    name: 'large',
    minWidth: 1440,
    maxWidth: 1919,
    columns: 4,
    cardMinWidth: 320,
    gap: 28,
    padding: 32,
  },
  {
    name: 'xl',
    minWidth: 1920,
    maxWidth: 2559,
    columns: 5,
    cardMinWidth: 340,
    gap: 32,
    padding: 40,
  },
  {
    name: 'xxl',
    minWidth: 2560,
    columns: 6,
    cardMinWidth: 360,
    gap: 36,
    padding: 48,
  },
];

export interface AdaptiveGridState {
  breakpoint: GridBreakpoint;
  screenWidth: number;
  gridColumns: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeScreen: boolean;
  isUltraWide: boolean;
}

/**
 * Custom hook for adaptive grid management
 * Optimized for large displays and responsive design
 */
export function useAdaptiveGrid(): AdaptiveGridState {
  const [screenWidth, setScreenWidth] = useState(0);

  const getCurrentBreakpoint = useCallback((width: number): GridBreakpoint => {
    return (
      GRID_BREAKPOINTS.find(
        (bp) =>
          width >= bp.minWidth &&
          (bp.maxWidth === undefined || width <= bp.maxWidth)
      ) || GRID_BREAKPOINTS[GRID_BREAKPOINTS.length - 1]
    );
  }, []);

  const [breakpoint, setBreakpoint] = useState<GridBreakpoint>(() =>
    getCurrentBreakpoint(
      typeof window !== 'undefined' ? window.innerWidth : 1024
    )
  );

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      setScreenWidth(width);

      const newBreakpoint = getCurrentBreakpoint(width);
      if (newBreakpoint.name !== breakpoint.name) {
        setBreakpoint(newBreakpoint);
      }
    };

    // Set initial size
    updateScreenSize();

    // Add event listener with debounce
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateScreenSize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [getCurrentBreakpoint, breakpoint.name]);

  return {
    breakpoint,
    screenWidth,
    gridColumns: breakpoint.columns,
    isMobile: breakpoint.name === 'mobile',
    isTablet: breakpoint.name === 'tablet',
    isDesktop: breakpoint.name === 'desktop',
    isLargeScreen: breakpoint.minWidth >= 1920,
    isUltraWide: breakpoint.minWidth >= 2560,
  };
}

/**
 * Hook for dynamic grid CSS variables
 */
export function useGridVariables() {
  const { breakpoint } = useAdaptiveGrid();

  return {
    '--card-min-width': `${breakpoint.cardMinWidth}px`,
    '--grid-gap': `${breakpoint.gap}px`,
    '--grid-padding': `${breakpoint.padding}px`,
  } as React.CSSProperties;
}

/**
 * Hook for responsive card sizing
 */
export interface CardDimensions {
  minHeight: number;
  maxHeight: number;
  padding: number;
  borderRadius: number;
}

export function useCardDimensions(): CardDimensions {
  const { breakpoint, isLargeScreen, isUltraWide } = useAdaptiveGrid();

  // Compact sizing for large screens to show more content
  if (isUltraWide) {
    return {
      minHeight: 240,
      maxHeight: 280,
      padding: 16,
      borderRadius: 16,
    };
  }

  if (isLargeScreen) {
    return {
      minHeight: 260,
      maxHeight: 300,
      padding: 18,
      borderRadius: 18,
    };
  }

  // Standard sizing for smaller screens
  return {
    minHeight: 280,
    maxHeight: 320,
    padding: 20,
    borderRadius: 20,
  };
}

/**
 * Hook for staggered animation delays
 */
export function useStaggeredAnimation(index: number, baseDelay = 100) {
  const { gridColumns } = useAdaptiveGrid();

  // Calculate row and column position
  const row = Math.floor(index / gridColumns);
  const column = index % gridColumns;

  // Stagger animation based on position
  const delay = baseDelay + row * 50 + column * 25;

  return {
    animationDelay: `${delay}ms`,
    style: {
      '--animation-delay': `${delay}ms`,
    } as React.CSSProperties,
  };
}
