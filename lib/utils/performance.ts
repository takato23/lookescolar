import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

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
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
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
    this.observers.forEach(observer => observer.disconnect());
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
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);
    
    return { startIndex, endIndex, visibleCount };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const virtualItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => ({
      item,
      index: visibleRange.startIndex + index,
      offsetTop: (visibleRange.startIndex + index) * itemHeight
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
    visibleRange
  };
}

// Debounced state hook for performance
export function useDebouncedState<T>(initialValue: T, delay: number = 300): [T, T, (value: T) => void] {
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

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });

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
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
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

  const bundleInfo = scripts.map(script => {
    if (script.src && script.src.includes('/_next/')) {
      // Estimate size based on typical Next.js chunks
      const size = script.src.includes('main') ? 200000 : 
                   script.src.includes('framework') ? 150000 :
                   script.src.includes('commons') ? 100000 : 50000;
      totalSize += size;
      return {
        src: script.src,
        estimatedSize: size
      };
    }
    return null;
  }).filter(Boolean);

  return {
    bundles: bundleInfo,
    totalEstimatedSize: totalSize,
    recommendation: totalSize > 1000000 ? 'Consider code splitting' : 'Bundle size is optimal'
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
export function optimizeImageLoading(src: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
} = {}): string {
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
  return Object.keys(baseStyles).reduce((acc, key) => {
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
  }, {} as Record<string, any>);
}