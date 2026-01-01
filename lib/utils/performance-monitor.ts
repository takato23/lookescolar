// @ts-nocheck
/**
 * Performance Monitoring System with Core Web Vitals
 * Implements comprehensive performance tracking for production
 */

import { logger } from './logger';

// Core Web Vitals thresholds (Google recommendations)
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  CLS: { good: 0.1, needsImprovement: 0.25 }, // Cumulative Layout Shift
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
};

interface WebVital {
  name: 'CLS' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  id: string;
  delta: number;
  entries: PerformanceEntry[];
}

interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number;
  cls?: number;
  ttfb?: number;
  fcp?: number;

  // Custom metrics
  navigationStart?: number;
  domContentLoaded?: number;
  loadComplete?: number;
  memoryUsage?: {
    used: number;
    total: number;
    jsHeapSizeLimit: number;
  };

  // Page specific
  pageType?: 'admin' | 'family' | 'public';
  photosLoaded?: number;
  imagesLoaded?: number;
  cacheHitRate?: number;
  bundleSize?: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private observers: PerformanceObserver[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.init();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Initialize Web Vitals monitoring
    this.initWebVitals();

    // Initialize performance observers
    this.initPerformanceObservers();

    // Monitor memory usage
    this.initMemoryMonitoring();

    // Monitor page load metrics
    this.initPageLoadMetrics();
  }

  private initWebVitals() {
    if (typeof window === 'undefined') return;

    // Dynamic import to avoid SSR issues
    import('web-vitals')
      .then((mod) => {
        const onCLS = (mod as any).onCLS ?? (mod as any).getCLS;
        const onFCP = (mod as any).onFCP ?? (mod as any).getFCP;
        const onLCP = (mod as any).onLCP ?? (mod as any).getLCP;
        const onTTFB = (mod as any).onTTFB ?? (mod as any).getTTFB;
        onCLS(this.handleWebVital.bind(this));
        onFCP(this.handleWebVital.bind(this));
        onLCP(this.handleWebVital.bind(this));
        onTTFB(this.handleWebVital.bind(this));
      })
      .catch((error) => {
        logger.warn(
          'web_vitals_load_failed',
          {
            requestId: this.sessionId,
            errorCode: error.name,
          },
          'Failed to load web-vitals library'
        );
      });
  }

  private handleWebVital(metric: WebVital) {
    const currentMetrics: PerformanceMetrics =
      this.metrics.get(window.location.pathname) || {};

    // Update metrics
    currentMetrics[metric.name.toLowerCase() as keyof PerformanceMetrics] =
      metric.value;
    this.metrics.set(window.location.pathname, currentMetrics);

    // Determine rating
    const threshold = THRESHOLDS[metric.name];
    let rating: 'good' | 'needs-improvement' | 'poor' = 'good';
    if (metric.value > threshold.needsImprovement) {
      rating = 'poor';
    } else if (metric.value > threshold.good) {
      rating = 'needs-improvement';
    }

    // Log the metric
    logger.info(
      'web_vital_measured',
      {
        requestId: this.sessionId,
        performance: {
          [metric.name.toLowerCase()]: metric.value,
        },
        businessMetric: {
          type: 'photo_view', // Generic type for web vitals
          value: metric.value,
          unit: metric.name === 'CLS' ? 'score' : 'ms',
        },
      },
      `${metric.name}: ${metric.value}${metric.name === 'CLS' ? '' : 'ms'} (${rating})`
    );

    // Analytics deshabilitado en este entorno
  }

  private initPerformanceObservers() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window))
      return;

    try {
      // Navigation timing
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.handleNavigationTiming(navEntry);
          }
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // Resource timing (for images, scripts, etc.)
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.handleResourceTiming(entries as PerformanceResourceTiming[]);
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Long tasks (performance issues)
      if (
        'PerformanceObserver' in window &&
        PerformanceObserver.supportedEntryTypes?.includes('longtask')
      ) {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            logger.warn(
              'long_task_detected',
              {
                requestId: this.sessionId,
                duration: entry.duration,
                performance: {
                  totalTime: entry.duration,
                },
              },
              `Long task detected: ${entry.duration}ms`
            );
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      }

      // Layout shifts (CLS contributors)
      if (
        'PerformanceObserver' in window &&
        PerformanceObserver.supportedEntryTypes?.includes('layout-shift')
      ) {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              logger.debug(
                'layout_shift',
                {
                  requestId: this.sessionId,
                  performance: {
                    totalTime: entry.value,
                  },
                },
                `Layout shift: ${entry.value}`
              );
            }
          });
        });
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(layoutShiftObserver);
      }
    } catch (error) {
      logger.warn(
        'performance_observer_init_failed',
        {
          requestId: this.sessionId,
          errorCode: (error as Error).name,
        },
        'Failed to initialize performance observers'
      );
    }
  }

  private handleNavigationTiming(entry: PerformanceNavigationTiming) {
    const currentMetrics: PerformanceMetrics =
      this.metrics.get(window.location.pathname) || {};

    // Calculate key timings
    const domContentLoaded =
      entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
    const loadComplete = entry.loadEventEnd - entry.loadEventStart;
    const ttfb = entry.responseStart - entry.requestStart;

    currentMetrics.navigationStart = entry.navigationStart;
    currentMetrics.domContentLoaded = domContentLoaded;
    currentMetrics.loadComplete = loadComplete;
    currentMetrics.ttfb = ttfb;

    this.metrics.set(window.location.pathname, currentMetrics);

    logger.info(
      'navigation_timing',
      {
        requestId: this.sessionId,
        performance: {
          totalTime: loadComplete,
          dbQueryTime: ttfb,
        },
      },
      `Page load: ${loadComplete}ms (TTFB: ${ttfb}ms)`
    );
  }

  private handleResourceTiming(entries: PerformanceResourceTiming[]) {
    const currentMetrics: PerformanceMetrics =
      this.metrics.get(window.location.pathname) || {};

    // Count images and calculate cache hit rate
    const imageEntries = entries.filter(
      (entry) =>
        entry.initiatorType === 'img' ||
        entry.name.includes('.jpg') ||
        entry.name.includes('.jpeg') ||
        entry.name.includes('.png') ||
        entry.name.includes('.webp')
    );

    const cachedResources = entries.filter(
      (entry) => entry.transferSize === 0 && entry.decodedBodySize > 0
    );

    currentMetrics.imagesLoaded =
      (currentMetrics.imagesLoaded || 0) + imageEntries.length;
    currentMetrics.cacheHitRate =
      entries.length > 0 ? (cachedResources.length / entries.length) * 100 : 0;

    // Log slow resources (>1s)
    const slowResources = entries.filter((entry) => entry.duration > 1000);
    slowResources.forEach((entry) => {
      logger.warn(
        'slow_resource',
        {
          requestId: this.sessionId,
          duration: entry.duration,
          bytes: entry.transferSize,
          cacheHit: entry.transferSize === 0 && entry.decodedBodySize > 0,
        },
        `Slow resource: ${entry.name} (${entry.duration}ms)`
      );
    });

    this.metrics.set(window.location.pathname, currentMetrics);
  }

  private initMemoryMonitoring() {
    if (typeof window === 'undefined' || !(performance as any).memory) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      const currentMetrics = this.metrics.get(window.location.pathname) || {};

      currentMetrics.memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };

      this.metrics.set(window.location.pathname, currentMetrics);

      // Warn if memory usage is high
      const usagePercent =
        (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      if (usagePercent > 80) {
        logger.warn(
          'high_memory_usage',
          {
            requestId: this.sessionId,
            performance: {
              totalTime: usagePercent,
            },
          },
          `High memory usage: ${usagePercent.toFixed(1)}%`
        );
      }
    };

    // Check memory every 30 seconds
    setInterval(checkMemory, 30000);
    checkMemory(); // Initial check
  }

  private initPageLoadMetrics() {
    if (typeof window === 'undefined') return;

    // Determine page type
    const pageType = window.location.pathname.startsWith('/admin')
      ? 'admin'
      : window.location.pathname.startsWith('/f/')
        ? 'family'
        : 'public';

    const currentMetrics: PerformanceMetrics =
      this.metrics.get(window.location.pathname) || {};
    currentMetrics.pageType = pageType;
    this.metrics.set(window.location.pathname, currentMetrics);

    // Monitor bundle size (approximate from script tags)
    const scripts = document.querySelectorAll('script[src]');
    let totalBundleSize = 0;

    scripts.forEach((script) => {
      const src = (script as HTMLScriptElement).src;
      if (src.includes('/_next/')) {
        // This is a Next.js bundle - we'll estimate size based on network timing
        const entry = performance.getEntriesByName(src)[0] as
          | PerformanceResourceTiming
          | undefined;
        if (entry) {
          totalBundleSize += entry.transferSize || 0;
        }
      }
    });

    if (totalBundleSize > 0) {
      currentMetrics.bundleSize = totalBundleSize;
      this.metrics.set(window.location.pathname, currentMetrics);

      // Log if bundle is large
      const bundleMB = totalBundleSize / (1024 * 1024);
      if (bundleMB > 0.5) {
        // >500KB
        logger.warn(
          'large_bundle_size',
          {
            requestId: this.sessionId,
            bytes: totalBundleSize,
            pageType,
          },
          `Large bundle size: ${bundleMB.toFixed(2)}MB`
        );
      }
    }
  }

  /**
   * Track custom performance metric
   */
  trackCustomMetric(name: string, value: number, unit: string = 'ms') {
    logger.info(
      'custom_performance_metric',
      {
        requestId: this.sessionId,
        performance: {
          [name]: value,
        },
        businessMetric: {
          type: 'photo_view',
          value,
          unit,
        },
      },
      `${name}: ${value}${unit}`
    );
  }

  /**
   * Track photo gallery performance
   */
  trackGalleryPerformance(metrics: {
    photosLoaded: number;
    loadTime: number;
    virtualScrollEnabled: boolean;
    cacheHitRate?: number;
  }) {
    const currentMetrics = this.metrics.get(window.location.pathname) || {};
    currentMetrics.photosLoaded = metrics.photosLoaded;
    currentMetrics.cacheHitRate = metrics.cacheHitRate;
    this.metrics.set(window.location.pathname, currentMetrics);

    logger.info(
      'gallery_performance',
      {
        requestId: this.sessionId,
        performance: {
          totalTime: metrics.loadTime,
        },
        businessMetric: {
          type: 'photo_view',
          value: metrics.photosLoaded,
          unit: 'photos',
        },
        cacheHit: (metrics.cacheHitRate || 0) > 50,
      },
      `Gallery loaded: ${metrics.photosLoaded} photos in ${metrics.loadTime}ms`
    );
  }

  /**
   * Get current page metrics
   */
  getMetrics(path?: string): PerformanceMetrics | undefined {
    const targetPath = path || window.location.pathname;
    return this.metrics.get(targetPath);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Clear metrics for a path
   */
  clearMetrics(path?: string) {
    if (path) {
      this.metrics.delete(path);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Cleanup observers
   */
  disconnect() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: {
      averageLCP: number;
      averageCLS: number;
      totalPages: number;
    };
    pages: Array<{
      path: string;
      metrics: PerformanceMetrics;
      score: number; // 0-100
    }>;
  } {
    const pages = Array.from(this.metrics.entries());
    const scores = pages.map(([path, metrics]) => {
      // Calculate performance score (Google Lighthouse style)
      let score = 100;

      if (metrics.lcp && metrics.lcp > THRESHOLDS.LCP.good) {
        score -= 20;
      }
      if (metrics.cls && metrics.cls > THRESHOLDS.CLS.good) {
        score -= 20;
      }
      if (metrics.ttfb && metrics.ttfb > THRESHOLDS.TTFB.good) {
        score -= 20;
      }
      if (metrics.fcp && metrics.fcp > THRESHOLDS.FCP.good) {
        score -= 20;
      }

      return { path, metrics, score: Math.max(0, score) };
    });

    // Calculate averages
    const lcpValues = pages.map(([, m]) => m.lcp).filter(Boolean) as number[];
    const clsValues = pages.map(([, m]) => m.cls).filter(Boolean) as number[];

    return {
      summary: {
        averageLCP:
          lcpValues.length > 0
            ? lcpValues.reduce((a, b) => a + b) / lcpValues.length
            : 0,
        averageCLS:
          clsValues.length > 0
            ? clsValues.reduce((a, b) => a + b) / clsValues.length
            : 0,
        totalPages: pages.length,
      },
      pages: scores,
    };
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
export { PerformanceMonitor };

// Initialize on client side
if (typeof window !== 'undefined') {
  // Initialize performance monitoring
  performanceMonitor;

  // Report metrics before page unload
  window.addEventListener('beforeunload', () => {
    const metrics = performanceMonitor.getMetrics();
    if (metrics) {
      logger.info(
        'page_unload_metrics',
        {
          requestId: performanceMonitor['sessionId'],
          performance: {
            totalTime: metrics.loadComplete,
          },
        },
        `Page unload - Photos loaded: ${metrics.photosLoaded || 0}`
      );
    }
  });
}
