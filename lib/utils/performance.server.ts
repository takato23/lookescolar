/**
 * Server-side Performance Monitoring Utilities
 * Simple version without DOM APIs for Node.js/server environments
 */

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

/**
 * Server-side Performance Monitor
 * Simplified version without DOM dependencies
 */
export class ServerPerformanceMonitor {
  private static instance: ServerPerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private dbMetrics: DatabasePerformanceMetric[] = [];
  private readonly maxDbMetrics = 1000;

  static getInstance(): ServerPerformanceMonitor {
    if (!ServerPerformanceMonitor.instance) {
      ServerPerformanceMonitor.instance = new ServerPerformanceMonitor();
    }
    return ServerPerformanceMonitor.instance;
  }

  /**
   * Start timing measurement using process.hrtime.bigint() for high resolution
   */
  startMeasurement(name: string): void {
    const startTime = process.hrtime.bigint();
    this.metrics.set(`${name}-start`, [Number(startTime)]);
  }

  /**
   * End timing measurement and return duration in milliseconds
   */
  endMeasurement(name: string): number {
    const endTime = process.hrtime.bigint();
    const startTimes = this.metrics.get(`${name}-start`);
    
    if (!startTimes || startTimes.length === 0) {
      console.warn(`[PERF] No start time found for measurement: ${name}`);
      return 0;
    }

    const startTime = BigInt(startTimes[0]);
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);

    // Clean up start time
    this.metrics.delete(`${name}-start`);

    return duration;
  }

  /**
   * Get average time for a measurement
   */
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
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await queryFn();
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
      
      const metric: DatabasePerformanceMetric = {
        operation,
        duration,
        timestamp: new Date(),
        metadata: {
          ...metadata,
          memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
          success: true
        }
      };

      this.recordDbMetric(metric);
      
      // Log performance warnings
      if (duration > 500) {
        console.warn(`[PERF] Slow query detected: ${operation} took ${duration.toFixed(2)}ms`);
      } else if (duration < 100) {
        console.log(`[PERF] Fast query: ${operation} completed in ${duration.toFixed(2)}ms ✅`);
      }

      return { result, metric };
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000;
      
      const metric: DatabasePerformanceMetric = {
        operation,
        duration,
        timestamp: new Date(),
        metadata: {
          ...metadata,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };

      this.recordDbMetric(metric);
      console.error(`[PERF] Query failed: ${operation} after ${duration.toFixed(2)}ms`, error);
      
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
      console.error(`[PERF] CRITICAL: ${metric.operation} took ${metric.duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get database performance statistics
   */
  getDbStats(operation?: string, timeWindow?: number): QueryPerformanceStats {
    const now = Date.now();
    const windowMs = timeWindow || 60000; // Default: last minute
    
    const relevantMetrics = this.dbMetrics.filter(m => {
      const matchesOperation = !operation || m.operation === operation;
      const withinWindow = (now - m.timestamp.getTime()) <= windowMs;
      return matchesOperation && withinWindow;
    });

    if (relevantMetrics.length === 0) {
      return {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        totalQueries: 0,
        cacheHitRate: 0,
        slowQueries: 0,
        errorRate: 0
      };
    }

    const durations = relevantMetrics.map(m => m.duration).sort((a, b) => a - b);
    const successfulQueries = relevantMetrics.filter(m => m.metadata?.success !== false);
    const cacheHits = relevantMetrics.filter(m => m.cacheHit === true);
    const slowQueries = relevantMetrics.filter(m => m.duration > 500);

    return {
      avgResponseTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p95ResponseTime: durations[Math.floor(durations.length * 0.95)] || 0,
      totalQueries: relevantMetrics.length,
      cacheHitRate: cacheHits.length / relevantMetrics.length,
      slowQueries: slowQueries.length,
      errorRate: (relevantMetrics.length - successfulQueries.length) / relevantMetrics.length
    };
  }

  /**
   * Get performance summary with alerts
   */
  getPerformanceSummary(): {
    currentStats: QueryPerformanceStats;
    recentOperations: Array<{ operation: string; count: number; avgDuration: number }>;
    alerts: string[];
  } {
    const currentStats = this.getDbStats();
    
    // Group by operation
    const operationGroups = this.dbMetrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = [];
      }
      acc[metric.operation].push(metric);
      return acc;
    }, {} as Record<string, DatabasePerformanceMetric[]>);

    const recentOperations = Object.entries(operationGroups).map(([operation, metrics]) => ({
      operation,
      count: metrics.length,
      avgDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
    })).sort((a, b) => b.count - a.count);

    // Generate performance alerts
    const alerts: string[] = [];
    if (currentStats.avgResponseTime > 300) {
      alerts.push(`High average response time: ${currentStats.avgResponseTime.toFixed(2)}ms`);
    }
    if (currentStats.errorRate > 0.05) {
      alerts.push(`High error rate: ${(currentStats.errorRate * 100).toFixed(2)}%`);
    }
    if (currentStats.slowQueries > 5) {
      alerts.push(`Too many slow queries: ${currentStats.slowQueries}`);
    }

    return {
      currentStats,
      recentOperations,
      alerts
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.dbMetrics = [];
  }

  /**
   * Get memory usage stats (Node.js only)
   */
  getMemoryStats(): {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  } {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024), // MB
    };
  }
}

/**
 * Performance measurement decorator for server-side functions
 */
export function withServerPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    const monitor = ServerPerformanceMonitor.getInstance();
    monitor.startMeasurement(name);
    try {
      const result = fn(...args);
      if (result && typeof result.then === 'function') {
        // Handle async function
        return result.finally(() => {
          monitor.endMeasurement(name);
        });
      } else {
        // Handle sync function
        monitor.endMeasurement(name);
        return result;
      }
    } catch (error) {
      monitor.endMeasurement(name);
      throw error;
    }
  }) as T;
}

/**
 * Simple timing function for ad-hoc measurements
 */
export function timeFunction<T>(name: string, fn: () => T): T {
  const monitor = ServerPerformanceMonitor.getInstance();
  monitor.startMeasurement(name);
  try {
    const result = fn();
    monitor.endMeasurement(name);
    return result;
  } catch (error) {
    monitor.endMeasurement(name);
    throw error;
  }
}

/**
 * Async timing function for promises
 */
export async function timeAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const monitor = ServerPerformanceMonitor.getInstance();
  monitor.startMeasurement(name);
  try {
    const result = await fn();
    monitor.endMeasurement(name);
    return result;
  } catch (error) {
    monitor.endMeasurement(name);
    throw error;
  }
}

// Export singleton for easy use
export const serverPerformanceMonitor = ServerPerformanceMonitor.getInstance();