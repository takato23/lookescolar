'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PerformanceMetrics {
  renderTime: number;
  cacheHitRate: number;
  queryCount: number;
  errorRate: number;
}

export function usePerformanceMonitoring() {
  const queryClient = useQueryClient();

  const measureRenderPerformance = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Measure Core Web Vitals
    if ('web-vitals' in window) {
      // Web vitals are already being tracked in the app
      return;
    }

    // Basic performance measurement
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          console.debug(`[Performance] ${entry.name}: ${entry.duration}ms`);
        }
      }
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
  }, []);

  const getQueryClientMetrics = useCallback((): PerformanceMetrics => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    const totalQueries = queries.length;
    const cachedQueries = queries.filter(
      (query) => query.state.data !== undefined && !query.state.isLoading
    ).length;
    const errorQueries = queries.filter(
      (query) => query.state.error !== null
    ).length;

    return {
      renderTime: performance.now(),
      cacheHitRate: totalQueries > 0 ? (cachedQueries / totalQueries) * 100 : 0,
      queryCount: totalQueries,
      errorRate: totalQueries > 0 ? (errorQueries / totalQueries) * 100 : 0,
    };
  }, [queryClient]);

  const logBundleSize = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Estimate JavaScript bundle size from loaded scripts
    const scripts = document.querySelectorAll('script[src]');
    let estimatedSize = 0;

    scripts.forEach((script) => {
      const src = script.getAttribute('src');
      if (src?.includes('_next/static')) {
        // This is a rough estimation - in production you'd use webpack-bundle-analyzer
        estimatedSize += 100; // KB estimate per script
      }
    });

    console.debug(`[Performance] Estimated bundle size: ~${estimatedSize}KB`);
  }, []);

  useEffect(() => {
    const cleanup = measureRenderPerformance();
    logBundleSize();

    return cleanup;
  }, [measureRenderPerformance, logBundleSize]);

  return {
    getMetrics: getQueryClientMetrics,
    measureComponent: (componentName: string) => {
      if (typeof window === 'undefined') return () => {};

      const startTime = performance.now();
      performance.mark(`${componentName}-start`);

      return () => {
        performance.mark(`${componentName}-end`);
        performance.measure(
          `${componentName}-render`,
          `${componentName}-start`,
          `${componentName}-end`
        );
      };
    },
  };
}
