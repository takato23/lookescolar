/**
 * Performance monitoring utilities for the Unified Gallery System
 * Validates that the system meets the performance targets defined in the implementation plan
 */

// Performance targets from implementation plan
const PERFORMANCE_TARGETS = {
  INITIAL_LOAD: 2000, // < 2 seconds for 100 photos
  NAVIGATION: 500, // < 500ms between hierarchy levels
  BULK_OPERATIONS: 30000, // < 30 seconds for 500 photos
  MEMORY_USAGE: 150 * 1024 * 1024, // < 150MB for typical session
  BUNDLE_SIZE: 500 * 1024, // < 500KB additional bundle size
};

interface PerformanceMetrics {
  timestamp: number;
  metric: string;
  value: number;
  target: number;
  passed: boolean;
  context?: Record<string, any>;
}

class UnifiedGalleryPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];
  private memoryBaseline: number = 0;

  constructor() {
    this.setupPerformanceObservers();
    this.recordMemoryBaseline();
  }

  /**
   * Setup performance observers for key metrics
   */
  private setupPerformanceObservers() {
    if (typeof window === 'undefined') return;

    // Navigation timing observer
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric(
              'page_load_time',
              navEntry.loadEventEnd - navEntry.navigationStart,
              PERFORMANCE_TARGETS.INITIAL_LOAD,
              { type: 'navigation' }
            );
          }
        }
      });

      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Navigation observer not supported:', error);
      }
    }

    // Resource timing observer for image loading
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource' && entry.name.includes('photo')) {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordMetric(
              'image_load_time',
              resourceEntry.responseEnd - resourceEntry.startTime,
              1000, // 1 second target for individual images
              { url: entry.name }
            );
          }
        }
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }
    }
  }

  /**
   * Record memory baseline for comparison
   */
  private recordMemoryBaseline() {
    if (
      typeof window !== 'undefined' &&
      'performance' in window &&
      'memory' in performance
    ) {
      this.memoryBaseline = (performance as any).memory.usedJSHeapSize;
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    metric: string,
    value: number,
    target: number,
    context?: Record<string, any>
  ) {
    const passed = value <= target;
    const metricData: PerformanceMetrics = {
      timestamp: Date.now(),
      metric,
      value,
      target,
      passed,
      context,
    };

    this.metrics.push(metricData);

    // Log performance issues
    if (!passed) {
      console.warn(`🐌 Performance target missed:`, {
        metric,
        value: `${value}ms`,
        target: `${target}ms`,
        overage: `${value - target}ms (${Math.round((value / target - 1) * 100)}% over)`,
        context,
      });
    } else {
      console.log(`✅ Performance target met:`, {
        metric,
        value: `${value}ms`,
        target: `${target}ms`,
        context,
      });
    }
  }

  /**
   * Measure photo grid rendering performance
   */
  async measurePhotoGridPerformance(photoCount: number): Promise<void> {
    const startTime = performance.now();

    // Wait for next frame to ensure rendering is complete
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Scale target based on photo count (2 seconds for 100 photos)
    const scaledTarget = (photoCount / 100) * PERFORMANCE_TARGETS.INITIAL_LOAD;

    this.recordMetric('photo_grid_render', renderTime, scaledTarget, {
      photoCount,
    });
  }

  /**
   * Measure navigation performance between hierarchy levels
   */
  async measureNavigationPerformance(
    fromLevel: string,
    toLevel: string,
    navigationFn: () => Promise<void>
  ): Promise<void> {
    const startTime = performance.now();

    await navigationFn();

    const endTime = performance.now();
    const navigationTime = endTime - startTime;

    this.recordMetric(
      'hierarchy_navigation',
      navigationTime,
      PERFORMANCE_TARGETS.NAVIGATION,
      { from: fromLevel, to: toLevel }
    );
  }

  /**
   * Measure bulk operation performance
   */
  async measureBulkOperationPerformance(
    operation: string,
    photoCount: number,
    operationFn: () => Promise<void>
  ): Promise<void> {
    const startTime = performance.now();

    await operationFn();

    const endTime = performance.now();
    const operationTime = endTime - startTime;

    // Scale target based on photo count (30 seconds for 500 photos)
    const scaledTarget =
      (photoCount / 500) * PERFORMANCE_TARGETS.BULK_OPERATIONS;

    this.recordMetric('bulk_operation', operationTime, scaledTarget, {
      operation,
      photoCount,
    });
  }

  /**
   * Measure current memory usage
   */
  measureMemoryUsage(context?: string): void {
    if (
      typeof window !== 'undefined' &&
      'performance' in window &&
      'memory' in performance
    ) {
      const currentMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = currentMemory - this.memoryBaseline;

      this.recordMetric(
        'memory_usage',
        memoryIncrease,
        PERFORMANCE_TARGETS.MEMORY_USAGE,
        { context, currentMemory, baseline: this.memoryBaseline }
      );
    }
  }

  /**
   * Measure search/filter performance
   */
  async measureSearchPerformance(
    query: string,
    resultCount: number,
    searchFn: () => Promise<void>
  ): Promise<void> {
    const startTime = performance.now();

    await searchFn();

    const endTime = performance.now();
    const searchTime = endTime - startTime;

    // Search should be fast regardless of result count
    const target = 300; // 300ms target for search

    this.recordMetric('search_performance', searchTime, target, {
      query,
      resultCount,
    });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalMetrics: number;
    passedMetrics: number;
    failedMetrics: number;
    passRate: number;
    criticalFailures: PerformanceMetrics[];
    summary: Record<
      string,
      { avg: number; min: number; max: number; count: number }
    >;
  } {
    const totalMetrics = this.metrics.length;
    const passedMetrics = this.metrics.filter((m) => m.passed).length;
    const failedMetrics = totalMetrics - passedMetrics;
    const passRate =
      totalMetrics > 0 ? (passedMetrics / totalMetrics) * 100 : 0;

    // Critical failures are those that exceed target by >50%
    const criticalFailures = this.metrics.filter(
      (m) => !m.passed && m.value / m.target > 1.5
    );

    // Group metrics by type for summary
    const metricGroups: Record<string, number[]> = {};
    this.metrics.forEach((metric) => {
      if (!metricGroups[metric.metric]) {
        metricGroups[metric.metric] = [];
      }
      metricGroups[metric.metric].push(metric.value);
    });

    const summary: Record<
      string,
      { avg: number; min: number; max: number; count: number }
    > = {};
    Object.entries(metricGroups).forEach(([metric, values]) => {
      summary[metric] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
    });

    return {
      totalMetrics,
      passedMetrics,
      failedMetrics,
      passRate,
      criticalFailures,
      summary,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const summary = this.getPerformanceSummary();

    let report = `\n📊 Unified Gallery Performance Report\n`;
    report += `=====================================\n`;
    report += `Total Metrics: ${summary.totalMetrics}\n`;
    report += `Passed: ${summary.passedMetrics} (${summary.passRate.toFixed(1)}%)\n`;
    report += `Failed: ${summary.failedMetrics}\n`;
    report += `Critical Failures: ${summary.criticalFailures.length}\n\n`;

    // Detailed metrics
    report += `Detailed Metrics:\n`;
    report += `-----------------\n`;
    Object.entries(summary.summary).forEach(([metric, stats]) => {
      report += `${metric}:\n`;
      report += `  Average: ${stats.avg.toFixed(2)}ms\n`;
      report += `  Min: ${stats.min.toFixed(2)}ms\n`;
      report += `  Max: ${stats.max.toFixed(2)}ms\n`;
      report += `  Count: ${stats.count}\n\n`;
    });

    // Critical failures
    if (summary.criticalFailures.length > 0) {
      report += `Critical Failures:\n`;
      report += `------------------\n`;
      summary.criticalFailures.forEach((failure) => {
        report += `⚠️  ${failure.metric}: ${failure.value.toFixed(2)}ms `;
        report += `(target: ${failure.target}ms, overage: ${((failure.value / failure.target) * 100 - 100).toFixed(1)}%)\n`;
        if (failure.context) {
          report += `   Context: ${JSON.stringify(failure.context)}\n`;
        }
      });
    }

    return report;
  }

  /**
   * Export metrics data
   */
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Cleanup observers
   */
  destroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.clearMetrics();
  }
}

// Create singleton instance
export const performanceMonitor = new UnifiedGalleryPerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  const measurePhotoLoad = (photoCount: number) => {
    return performanceMonitor.measurePhotoGridPerformance(photoCount);
  };

  const measureNavigation = (
    from: string,
    to: string,
    navigationFn: () => Promise<void>
  ) => {
    return performanceMonitor.measureNavigationPerformance(
      from,
      to,
      navigationFn
    );
  };

  const measureBulkOperation = (
    operation: string,
    photoCount: number,
    operationFn: () => Promise<void>
  ) => {
    return performanceMonitor.measureBulkOperationPerformance(
      operation,
      photoCount,
      operationFn
    );
  };

  const measureSearch = (
    query: string,
    resultCount: number,
    searchFn: () => Promise<void>
  ) => {
    return performanceMonitor.measureSearchPerformance(
      query,
      resultCount,
      searchFn
    );
  };

  const measureMemory = (context?: string) => {
    performanceMonitor.measureMemoryUsage(context);
  };

  const getReport = () => {
    return performanceMonitor.generateReport();
  };

  return {
    measurePhotoLoad,
    measureNavigation,
    measureBulkOperation,
    measureSearch,
    measureMemory,
    getReport,
  };
}

// Performance validation function for testing
export function validatePerformanceTargets(): {
  passed: boolean;
  report: string;
  criticalIssues: string[];
} {
  const summary = performanceMonitor.getPerformanceSummary();
  const passed = summary.passRate >= 80; // 80% pass rate required
  const report = performanceMonitor.generateReport();

  const criticalIssues = summary.criticalFailures.map(
    (failure) =>
      `${failure.metric} exceeded target by ${((failure.value / failure.target) * 100 - 100).toFixed(1)}%`
  );

  return {
    passed,
    report,
    criticalIssues,
  };
}

export { PERFORMANCE_TARGETS };
