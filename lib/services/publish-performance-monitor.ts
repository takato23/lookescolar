/**
 * Performance monitoring service for publish functionality
 * Tracks metrics, detects bottlenecks, and provides optimization insights
 */

interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  itemCount?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

interface PublishStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  slowestOperation: number;
  fastestOperation: number;
  totalProcessingTime: number;
  operationsPerSecond: number;
  lastUpdated: number;
}

class PublishPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 1000; // Keep last 1000 operations
  private performanceThresholds = {
    slow: 1000, // >1s is slow
    critical: 3000, // >3s is critical
    bulk_slow: 5000, // >5s for bulk operations
    bulk_critical: 15000, // >15s for bulk operations
  };

  /**
   * Start tracking a performance operation
   */
  startOperation(operation: string, metadata?: Record<string, any>): string {
    const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const metric: PerformanceMetrics = {
      operation: `${operation}:${operationId}`,
      startTime: Date.now(),
      success: false, // Will be updated on completion
      metadata: {
        ...metadata,
        operationId,
      },
    };

    this.metrics.push(metric);

    // Cleanup old metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    console.log(`[PERF] Started ${operation}:`, metadata);
    return operationId;
  }

  /**
   * Complete tracking a performance operation
   */
  endOperation(
    operationId: string,
    success: boolean,
    itemCount?: number,
    errorMessage?: string,
    additionalMetadata?: Record<string, any>
  ): PerformanceMetrics | null {
    const metricIndex = this.metrics.findIndex((m) =>
      m.operation.includes(operationId)
    );

    if (metricIndex === -1) {
      console.warn(`[PERF] Operation not found: ${operationId}`);
      return null;
    }

    const metric = this.metrics[metricIndex];
    const endTime = Date.now();
    const duration = endTime - metric.startTime;

    // Update metric
    metric.endTime = endTime;
    metric.duration = duration;
    metric.success = success;
    metric.itemCount = itemCount;
    metric.errorMessage = errorMessage;
    metric.metadata = { ...metric.metadata, ...additionalMetadata };

    // Log performance result
    const isBulkOperation = metric.operation.includes('bulk');
    const threshold = isBulkOperation
      ? this.performanceThresholds.bulk_slow
      : this.performanceThresholds.slow;
    const criticalThreshold = isBulkOperation
      ? this.performanceThresholds.bulk_critical
      : this.performanceThresholds.critical;

    const operationName = metric.operation.split(':')[0];
    const throughput = itemCount
      ? (itemCount / (duration / 1000)).toFixed(1)
      : 'N/A';

    if (!success) {
      console.error(
        `[PERF] ❌ ${operationName} failed after ${duration}ms:`,
        errorMessage || 'No error details provided'
      );
      console.error(`[PERF] Debug info for ${operationName}:`, {
        operation: metric.operation,
        startTime: new Date(metric.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        itemCount: itemCount || 'N/A',
        metadata: metric.metadata,
      });
    } else if (duration > criticalThreshold) {
      console.error(
        `[PERF] 🐌 CRITICAL: ${operationName} took ${duration}ms (${throughput} items/s)`
      );
    } else if (duration > threshold) {
      console.warn(
        `[PERF] ⚠️  SLOW: ${operationName} took ${duration}ms (${throughput} items/s)`
      );
    } else {
      console.log(
        `[PERF] ✅ ${operationName} completed in ${duration}ms (${throughput} items/s)`
      );
    }

    return metric;
  }

  /**
   * Get current performance statistics
   */
  getStats(timeRangeMs = 3600000): PublishStats {
    // Default: last hour
    const cutoffTime = Date.now() - timeRangeMs;
    const recentMetrics = this.metrics.filter(
      (m) => m.startTime > cutoffTime && m.duration !== undefined
    );

    if (recentMetrics.length === 0) {
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageDuration: 0,
        slowestOperation: 0,
        fastestOperation: 0,
        totalProcessingTime: 0,
        operationsPerSecond: 0,
        lastUpdated: Date.now(),
      };
    }

    const successful = recentMetrics.filter((m) => m.success);
    const failed = recentMetrics.filter((m) => !m.success);
    const durations = recentMetrics.map((m) => m.duration!);
    const totalTime = durations.reduce((sum, d) => sum + d, 0);

    return {
      totalOperations: recentMetrics.length,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      averageDuration: Math.round(totalTime / recentMetrics.length),
      slowestOperation: Math.max(...durations),
      fastestOperation: Math.min(...durations),
      totalProcessingTime: totalTime,
      operationsPerSecond: recentMetrics.length / (timeRangeMs / 1000),
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get bottleneck analysis
   */
  getBottlenecks(timeRangeMs = 3600000): Array<{
    operation: string;
    averageDuration: number;
    failureRate: number;
    count: number;
    recommendation: string;
  }> {
    const cutoffTime = Date.now() - timeRangeMs;
    const recentMetrics = this.metrics.filter(
      (m) => m.startTime > cutoffTime && m.duration !== undefined
    );

    // Group by operation type
    const operationGroups = new Map<string, PerformanceMetrics[]>();
    recentMetrics.forEach((metric) => {
      const operationType = metric.operation.split(':')[0];
      if (!operationGroups.has(operationType)) {
        operationGroups.set(operationType, []);
      }
      operationGroups.get(operationType)!.push(metric);
    });

    const bottlenecks = [];

    for (const [operation, metrics] of operationGroups) {
      const avgDuration =
        metrics.reduce((sum, m) => sum + m.duration!, 0) / metrics.length;
      const failures = metrics.filter((m) => !m.success).length;
      const failureRate = failures / metrics.length;

      let recommendation = '';
      const isBulk = operation.includes('bulk');
      const threshold = isBulk
        ? this.performanceThresholds.bulk_slow
        : this.performanceThresholds.slow;

      if (avgDuration > threshold) {
        if (isBulk) {
          recommendation =
            'Consider reducing batch size or optimizing database queries';
        } else {
          recommendation = 'Check database indexes and query optimization';
        }
      } else if (failureRate > 0.1) {
        recommendation =
          'High failure rate detected - investigate error handling';
      } else if (avgDuration > threshold * 0.7) {
        recommendation =
          'Performance is degrading - consider preventive optimization';
      } else {
        recommendation = 'Performance is good';
      }

      bottlenecks.push({
        operation,
        averageDuration: Math.round(avgDuration),
        failureRate: Math.round(failureRate * 100) / 100,
        count: metrics.length,
        recommendation,
      });
    }

    // Sort by average duration (slowest first)
    return bottlenecks.sort((a, b) => b.averageDuration - a.averageDuration);
  }

  /**
   * Clear old metrics
   */
  cleanup(olderThanMs = 24 * 60 * 60 * 1000): number {
    // Default: 24 hours
    const cutoffTime = Date.now() - olderThanMs;
    const initialCount = this.metrics.length;

    this.metrics = this.metrics.filter((m) => m.startTime > cutoffTime);

    const removedCount = initialCount - this.metrics.length;
    if (removedCount > 0) {
      console.log(`[PERF] Cleaned up ${removedCount} old metrics`);
    }

    return removedCount;
  }

  /**
   * Generate performance report for admin dashboard
   */
  generateReport(timeRangeMs = 3600000): {
    stats: PublishStats;
    bottlenecks: ReturnType<typeof this.getBottlenecks>;
    recommendations: string[];
    healthScore: number; // 0-100
  } {
    const stats = this.getStats(timeRangeMs);
    const bottlenecks = this.getBottlenecks(timeRangeMs);
    const recommendations: string[] = [];

    // Health score calculation (0-100)
    let healthScore = 100;

    // Penalize for failures
    if (stats.failedOperations > 0) {
      const failureRate = stats.failedOperations / stats.totalOperations;
      healthScore -= failureRate * 30;
      recommendations.push(
        `Failure rate: ${Math.round(failureRate * 100)}% - investigate error patterns`
      );
    }

    // Penalize for slow operations
    if (stats.averageDuration > this.performanceThresholds.slow) {
      healthScore -= 25;
      recommendations.push(
        `Average operation time is ${stats.averageDuration}ms - optimize slow queries`
      );
    }

    // Penalize for very slow operations
    if (stats.slowestOperation > this.performanceThresholds.critical) {
      healthScore -= 20;
      recommendations.push(
        `Slowest operation: ${stats.slowestOperation}ms - critical optimization needed`
      );
    }

    // Add specific recommendations from bottlenecks
    bottlenecks.forEach((bottleneck) => {
      if (bottleneck.recommendation !== 'Performance is good') {
        recommendations.push(
          `${bottleneck.operation}: ${bottleneck.recommendation}`
        );
      }
    });

    // General recommendations based on stats
    if (stats.operationsPerSecond < 0.5 && stats.totalOperations > 10) {
      recommendations.push(
        'Low throughput detected - consider implementing caching or database optimization'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is healthy ✅');
    }

    return {
      stats,
      bottlenecks,
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      healthScore: Math.max(0, Math.round(healthScore)),
    };
  }
}

// Global instance
export const publishPerformanceMonitor = new PublishPerformanceMonitor();

// Performance monitoring decorators/helpers
export function monitorPerformance<T extends any[], R>(
  operationName: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const operationId = publishPerformanceMonitor.startOperation(
      operationName,
      {
        argsCount: args.length,
      }
    );

    try {
      const result = await fn(...args);
      publishPerformanceMonitor.endOperation(operationId, true);
      return result;
    } catch (error) {
      publishPerformanceMonitor.endOperation(
        operationId,
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  };
}

// Bulk operation performance helper
export function monitorBulkOperation<T>(
  operationName: string,
  itemCount: number
) {
  const operationId = publishPerformanceMonitor.startOperation(operationName, {
    itemCount,
    type: 'bulk',
  });

  return {
    complete: (successCount: number, errorMessage?: string) => {
      publishPerformanceMonitor.endOperation(
        operationId,
        successCount === itemCount,
        itemCount,
        errorMessage,
        { successCount }
      );
    },
  };
}

// React hook for performance monitoring
export function usePublishPerformanceMonitor(timeRangeMs = 3600000) {
  const getReport = () => publishPerformanceMonitor.generateReport(timeRangeMs);
  const getStats = () => publishPerformanceMonitor.getStats(timeRangeMs);
  const cleanup = () => publishPerformanceMonitor.cleanup();

  return {
    getReport,
    getStats,
    cleanup,
    monitor: publishPerformanceMonitor,
  };
}
