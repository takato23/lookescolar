'use client';

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Database performance metric interfaces
export interface DatabasePerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  queryCount?: number;
  recordCount?: number;
  cacheHit?: boolean;
  metadata?: Record<string, any>;
}

export interface QueryPerformanceStats {
  avgResponseTime: number;
  p95ResponseTime: number;
  totalQueries: number;
  cacheHitRate: number;
  slowQueries: number;
  errorRate: number;
}

// Enhanced Performance monitoring utilities with database focus
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private dbMetrics: DatabasePerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private readonly maxDbMetrics = 1000;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasurement(name: string): void {
    performance.mark(`${name}-start`);
  }

  endMeasurement(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const measures = performance.getEntriesByName(name, 'measure');
    const duration = measures[measures.length - 1]?.duration || 0;

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);

    return duration;
  }

  getAverageTime(name: string): number {
    const times = this.metrics.get(name) || [];
    return times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;
  }

  /**
   * Time a database operation and record performance metrics
   */
  async timeQuery<T>(
    operation: string,
    queryFn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; metric: DatabasePerformanceMetric }> {
    const startTime = performance.now();
    const startMemory =
      typeof process !== 'undefined' ? process.memoryUsage() : null;

    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      const endMemory =
        typeof process !== 'undefined' ? process.memoryUsage() : null;

      const metric: DatabasePerformanceMetric = {
        operation,
        duration,
        timestamp: new Date(),
        metadata: {
          ...metadata,
          memoryDelta:
            startMemory && endMemory
              ? endMemory.heapUsed - startMemory.heapUsed
              : undefined,
          success: true,
        },
      };

      this.recordDbMetric(metric);

      // Log performance warnings
      if (duration > 500) {
        console.warn(
          `[PERF] Slow query detected: ${operation} took ${duration.toFixed(2)}ms`
        );
      } else if (duration < 100) {
        console.log(
          `[PERF] Fast query: ${operation} completed in ${duration.toFixed(2)}ms ✅`
        );
      }

      return { result, metric };
    } catch (error) {
      const duration = performance.now() - startTime;

      const metric: DatabasePerformanceMetric = {
        operation,
        duration,
        timestamp: new Date(),
        metadata: {
          ...metadata,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };

      this.recordDbMetric(metric);
      console.error(
        `[PERF] Query failed: ${operation} after ${duration.toFixed(2)}ms`,
        error
      );

      throw error;
    }
  }

  /**
   * Record a database performance metric
   */
  recordDbMetric(metric: DatabasePerformanceMetric): void {
    this.dbMetrics.push(metric);

    // Keep only recent metrics to prevent memory leaks
    if (this.dbMetrics.length > this.maxDbMetrics) {
      this.dbMetrics = this.dbMetrics.slice(-this.maxDbMetrics);
    }

    // Log critical performance issues
    if (metric.duration > 1000) {
      console.error(
        `[PERF] CRITICAL: ${metric.operation} took ${metric.duration.toFixed(2)}ms`
      );
    }
  }

  /**
   * Get database performance statistics
   */
  getDbStats(operation?: string, timeWindow?: number): QueryPerformanceStats {
    const now = Date.now();
    const windowMs = timeWindow || 60000; // Default: last minute

    const relevantMetrics = this.dbMetrics.filter((m) => {
      const matchesOperation = !operation || m.operation === operation;
      const withinWindow = now - m.timestamp.getTime() <= windowMs;
      return matchesOperation && withinWindow;
    });

    if (relevantMetrics.length === 0) {
      return {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        totalQueries: 0,
        cacheHitRate: 0,
        slowQueries: 0,
        errorRate: 0,
      };
    }

    const durations = relevantMetrics
      .map((m) => m.duration)
      .sort((a, b) => a - b);
    const successfulQueries = relevantMetrics.filter(
      (m) => m.metadata?.success !== false
    );
    const cacheHits = relevantMetrics.filter((m) => m.cacheHit === true);
    const slowQueries = relevantMetrics.filter((m) => m.duration > 500);

    return {
      avgResponseTime:
        durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p95ResponseTime: durations[Math.floor(durations.length * 0.95)] || 0,
      totalQueries: relevantMetrics.length,
      cacheHitRate: cacheHits.length / relevantMetrics.length,
      slowQueries: slowQueries.length,
      errorRate:
        (relevantMetrics.length - successfulQueries.length) /
        relevantMetrics.length,
    };
  }

  /**
   * Get performance summary with alerts
   */
  getPerformanceSummary(): {
    currentStats: QueryPerformanceStats;
    recentOperations: Array<{
      operation: string;
      count: number;
      avgDuration: number;
    }>;
    alerts: string[];
  } {
    const currentStats = this.getDbStats();

    // Group by operation
    const operationGroups = this.dbMetrics.reduce(
      (acc, metric) => {
        if (!acc[metric.operation]) {
          acc[metric.operation] = [];
        }
        acc[metric.operation].push(metric);
        return acc;
      },
      {} as Record<string, DatabasePerformanceMetric[]>
    );

    const recentOperations = Object.entries(operationGroups)
      .map(([operation, metrics]) => ({
        operation,
        count: metrics.length,
        avgDuration:
          metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      }))
      .sort((a, b) => b.count - a.count);

    // Generate performance alerts
    const alerts: string[] = [];
    if (currentStats.avgResponseTime > 300) {
      alerts.push(
        `High average response time: ${currentStats.avgResponseTime.toFixed(2)}ms`
      );
    }
    if (currentStats.errorRate > 0.05) {
      alerts.push(
        `High error rate: ${(currentStats.errorRate * 100).toFixed(2)}%`
      );
    }
    if (currentStats.slowQueries > 5) {
      alerts.push(`Too many slow queries: ${currentStats.slowQueries}`);
    }

    return {
      currentStats,
      recentOperations,
      alerts,
    };
  }

  initializeObservers(): void {
    if (typeof window === 'undefined') return;

    // Observe largest contentful paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEventTiming;
      console.log('LCP:', lastEntry.startTime);
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(lcpObserver);

    // Observe cumulative layout shift
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      console.log('CLS:', clsValue);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(clsObserver);
  }

  cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

// Virtual scrolling hook for large lists
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const visibleRange = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );
    const endIndex = Math.min(
      items.length - 1,
      startIndex + visibleCount + overscan * 2
    );

    return { startIndex, endIndex, visibleCount };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const virtualItems = useMemo(() => {
    return items
      .slice(visibleRange.startIndex, visibleRange.endIndex + 1)
      .map((item, index) => ({
        item,
        index: visibleRange.startIndex + index,
        offsetTop: (visibleRange.startIndex + index) * itemHeight,
      }));
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    virtualItems,
    totalHeight,
    scrollElementRef,
    handleScroll,
    visibleRange,
  };
}

// Debounced state hook for performance
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return [value, debouncedValue, setValue];
}

// Memoized calculation hook
export function useMemoizedCalculation<T, R>(
  data: T[],
  calculator: (data: T[]) => R,
  dependencies: any[] = []
): R {
  return useMemo(() => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.startMeasurement('calculation');
    const result = calculator(data);
    monitor.endMeasurement('calculation');
    return result;
  }, [data, ...dependencies]);
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return [ref, isIntersecting];
}

// Optimized event handler
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: any[]
): T {
  return useCallback(callback, dependencies);
}

// Memory usage monitoring
export function useMemoryMonitoring(interval: number = 5000) {
  const [memoryInfo, setMemoryInfo] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !(performance as any).memory) return;

    const updateMemoryInfo = () => {
      setMemoryInfo({
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      });
    };

    updateMemoryInfo();
    const intervalId = setInterval(updateMemoryInfo, interval);

    return () => clearInterval(intervalId);
  }, [interval]);

  return memoryInfo;
}

// Bundle size analyzer
export function analyzeBundleSize() {
  if (typeof window === 'undefined') return null;

  const scripts = Array.from(document.scripts);
  let totalSize = 0;

  const bundleInfo = scripts
    .map((script) => {
      if (script.src && script.src.includes('/_next/')) {
        // Estimate size based on typical Next.js chunks
        const size = script.src.includes('main')
          ? 200000
          : script.src.includes('framework')
            ? 150000
            : script.src.includes('commons')
              ? 100000
              : 50000;
        totalSize += size;
        return {
          src: script.src,
          estimatedSize: size,
        };
      }
      return null;
    })
    .filter(Boolean);

  return {
    bundles: bundleInfo,
    totalEstimatedSize: totalSize,
    recommendation:
      totalSize > 1000000
        ? 'Consider code splitting'
        : 'Bundle size is optimal',
  };
}

// Performance measurement decorator
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.startMeasurement(name);
    const result = fn(...args);
    monitor.endMeasurement(name);
    return result;
  }) as T;
}

// Image optimization utilities
export function optimizeImageLoading(
  src: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
  } = {}
): string {
  if (!src) return src;

  const { width, height, quality = 75, format = 'auto' } = options;
  const params = new URLSearchParams();

  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  params.set('q', quality.toString());
  if (format !== 'auto') params.set('f', format);

  return `${src}?${params.toString()}`;
}

// CSS-in-JS optimization
export function generateOptimizedStyles(baseStyles: Record<string, any>) {
  return Object.keys(baseStyles).reduce(
    (acc, key) => {
      const value = baseStyles[key];

      // Remove unused CSS properties
      if (value === null || value === undefined || value === '') {
        return acc;
      }

      // Optimize color values
      if (typeof value === 'string' && value.includes('rgb(')) {
        acc[key] = value.replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g, '#$1$2$3');
      } else {
        acc[key] = value;
      }

      return acc;
    },
    {} as Record<string, any>
  );
}
