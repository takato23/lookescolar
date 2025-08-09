/**
 * Egress Bandwidth Monitoring System
 * Tracks data transfer and storage usage according to CLAUDE.md requirements
 */

import { logger } from './logger';
import { createClient } from '@/lib/supabase/server';

interface EgressMetric {
  id: string;
  eventId?: string;
  operation: 'photo_view' | 'photo_download' | 'qr_pdf' | 'export';
  bytes: number;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  token?: string;
  cacheHit?: boolean;
  costCenter: 'family' | 'admin' | 'system';
}

interface EgressSummary {
  totalBytes: number;
  totalRequests: number;
  cacheHitRate: number;
  topOperations: Array<{
    operation: string;
    bytes: number;
    requests: number;
    percentage: number;
  }>;
  byEvent: Array<{
    eventId: string;
    bytes: number;
    requests: number;
  }>;
  byDate: Array<{
    date: string;
    bytes: number;
    requests: number;
  }>;
}

interface AlertThreshold {
  daily: number; // Bytes per day
  monthly: number; // Bytes per month
  perEvent: number; // Bytes per event
}

class EgressMonitor {
  private static instance: EgressMonitor;
  private metrics: EgressMetric[] = [];
  private thresholds: AlertThreshold;

  // Default thresholds based on CLAUDE.md monitoring requirements
  private static readonly DEFAULT_THRESHOLDS: AlertThreshold = {
    daily: 5 * 1024 * 1024 * 1024, // 5GB per day
    monthly: 100 * 1024 * 1024 * 1024, // 100GB per month (CLAUDE.md limit)
    perEvent: 5 * 1024 * 1024 * 1024, // 5GB per event (CLAUDE.md soft limit)
  };

  constructor(thresholds?: Partial<AlertThreshold>) {
    this.thresholds = { ...EgressMonitor.DEFAULT_THRESHOLDS, ...thresholds };
  }

  static getInstance(thresholds?: Partial<AlertThreshold>): EgressMonitor {
    if (!EgressMonitor.instance) {
      EgressMonitor.instance = new EgressMonitor(thresholds);
    }
    return EgressMonitor.instance;
  }

  /**
   * Track bandwidth usage
   */
  async trackUsage(
    operation: EgressMetric['operation'],
    bytes: number,
    context: {
      requestId: string;
      eventId?: string;
      ip?: string;
      userAgent?: string;
      token?: string;
      cacheHit?: boolean;
      costCenter?: EgressMetric['costCenter'];
    }
  ): Promise<void> {
    const metric: EgressMetric = {
      id: `egress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      bytes,
      timestamp: new Date(),
      eventId: (context.eventId ?? '') as string,
      ip: context.ip,
      userAgent: context.userAgent,
      token: context.token,
      cacheHit: context.cacheHit,
      costCenter: context.costCenter || 'system',
    };

    // Store in memory for immediate access
    this.metrics.push(metric);

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Persist to database
    await this.persistMetric(metric);

    // Log the egress event
    logger.egressMetric({
      requestId: context.requestId,
      eventId: context.eventId as string | undefined,
      bytes,
      operation,
      cacheHit: context.cacheHit,
      ip: context.ip,
    });

    // Check thresholds and alert if necessary
    await this.checkThresholds(metric, context.requestId);
  }

  /**
   * Persist metric to database
   */
  private async persistMetric(metric: EgressMetric): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase.from('egress_metrics').insert({
        event_id: metric.eventId,
        operation: metric.operation,
        bytes_served: metric.bytes,
        client_ip: metric.ip,
        user_agent: metric.userAgent,
        token_hash: metric.token ? this.hashToken(metric.token) : null,
        cache_hit: metric.cacheHit,
        cost_center: metric.costCenter,
        created_at: metric.timestamp.toISOString(),
      });
    } catch (error) {
      logger.error(
        'egress_persist_failed',
        {
          requestId: 'system',
          errorCode: (error as Error).name,
          errorContext: {
            metricId: metric.id,
            operation: metric.operation,
            bytes: metric.bytes,
          },
        },
        'Failed to persist egress metric'
      );
    }
  }

  /**
   * Hash token for storage (privacy)
   */
  private hashToken(token: string): string {
    // Simple hash for storage - not cryptographic security
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check thresholds and trigger alerts
   */
  private async checkThresholds(
    metric: EgressMetric,
    requestId: string
  ): Promise<void> {
    try {
      // Check daily usage
      const dailyUsage = await this.getDailyUsage();
      if (dailyUsage.totalBytes > this.thresholds.daily * 0.8) {
        // 80% threshold
        const percentage =
          (dailyUsage.totalBytes / this.thresholds.daily) * 100;

        logger.warn(
          'egress_daily_threshold',
          {
            requestId,
            bytes: dailyUsage.totalBytes,
            businessMetric: {
              type: 'photo_view',
              value: percentage,
              unit: 'percent',
            },
          },
          `Daily egress usage: ${this.formatBytes(dailyUsage.totalBytes)} (${percentage.toFixed(1)}%)`
        );
      }

      // Check monthly usage
      const monthlyUsage = await this.getMonthlyUsage();
      if (monthlyUsage.totalBytes > this.thresholds.monthly * 0.8) {
        // 80% threshold
        const percentage =
          (monthlyUsage.totalBytes / this.thresholds.monthly) * 100;

        logger.warn(
          'egress_monthly_threshold',
          {
            requestId,
            bytes: monthlyUsage.totalBytes,
            businessMetric: {
              type: 'photo_view',
              value: percentage,
              unit: 'percent',
            },
          },
          `Monthly egress usage: ${this.formatBytes(monthlyUsage.totalBytes)} (${percentage.toFixed(1)}%)`
        );
      }

      // Check per-event usage if eventId is provided
      if (metric.eventId) {
        const eventUsage = await this.getEventUsage(metric.eventId);
        if (eventUsage.totalBytes > this.thresholds.perEvent * 0.8) {
          // 80% threshold
          const percentage =
            (eventUsage.totalBytes / this.thresholds.perEvent) * 100;

          logger.warn(
            'egress_event_threshold',
            {
              requestId,
              eventId: metric.eventId,
              bytes: eventUsage.totalBytes,
              businessMetric: {
                type: 'photo_view',
                value: percentage,
                unit: 'percent',
              },
            },
            `Event egress usage: ${this.formatBytes(eventUsage.totalBytes)} (${percentage.toFixed(1)}%)`
          );
        }
      }
    } catch (error) {
      logger.error(
        'threshold_check_failed',
        {
          requestId,
          errorCode: (error as Error).name,
        },
        'Failed to check egress thresholds'
      );
    }
  }

  /**
   * Get daily usage summary
   */
  async getDailyUsage(date?: Date): Promise<EgressSummary> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getUsageSummary(startOfDay, endOfDay);
  }

  /**
   * Get monthly usage summary
   */
  async getMonthlyUsage(date?: Date): Promise<EgressSummary> {
    const targetDate = date || new Date();
    const startOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    return this.getUsageSummary(startOfMonth, endOfMonth);
  }

  /**
   * Get usage by event
   */
  async getEventUsage(eventId: string): Promise<EgressSummary> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('egress_metrics')
        .select('*')
        .eq('event_id', eventId);

      if (error) throw error;

      return this.processMetricsData(data || []);
    } catch (error) {
      logger.error('event_usage_query_failed', {
        requestId: 'system',
        eventId,
        errorCode: (error as Error).name,
      });
      return this.getEmptySummary();
    }
  }

  /**
   * Get usage summary for date range
   */
  private async getUsageSummary(
    startDate: Date,
    endDate: Date
  ): Promise<EgressSummary> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('egress_metrics')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      return this.processMetricsData(data || []);
    } catch (error) {
      logger.error('usage_summary_query_failed', {
        requestId: 'system',
        errorCode: (error as Error).name,
      });
      return this.getEmptySummary();
    }
  }

  /**
   * Process metrics data into summary
   */
  private processMetricsData(data: any[]): EgressSummary {
    const totalBytes = data.reduce(
      (sum, record) => sum + (record.bytes_served || 0),
      0
    );
    const totalRequests = data.length;
    const cacheHits = data.filter((record) => record.cache_hit).length;
    const cacheHitRate =
      totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

    // Group by operation
    const operationMap = new Map<string, { bytes: number; requests: number }>();
    data.forEach((record) => {
      const op = record.operation || 'unknown';
      const current = operationMap.get(op) || { bytes: 0, requests: 0 };
      current.bytes += record.bytes_served || 0;
      current.requests += 1;
      operationMap.set(op, current);
    });

    const topOperations = Array.from(operationMap.entries())
      .map(([operation, stats]) => ({
        operation,
        bytes: stats.bytes,
        requests: stats.requests,
        percentage: totalBytes > 0 ? (stats.bytes / totalBytes) * 100 : 0,
      }))
      .sort((a, b) => b.bytes - a.bytes);

    // Group by event
    const eventMap = new Map<string, { bytes: number; requests: number }>();
    data.forEach((record) => {
      if (record.event_id) {
        const current = eventMap.get(record.event_id) || {
          bytes: 0,
          requests: 0,
        };
        current.bytes += record.bytes_served || 0;
        current.requests += 1;
        eventMap.set(record.event_id, current);
      }
    });

    const byEvent = Array.from(eventMap.entries())
      .map(([eventId, stats]) => ({
        eventId,
        bytes: stats.bytes,
        requests: stats.requests,
      }))
      .sort((a, b) => b.bytes - a.bytes);

    // Group by date
    const dateMap = new Map<string, { bytes: number; requests: number }>();
    data.forEach((record) => {
      const date = new Date(record.created_at).toISOString().split('T')[0];
      const current = dateMap.get(date) || { bytes: 0, requests: 0 };
      current.bytes += record.bytes_served || 0;
      current.requests += 1;
      dateMap.set(date, current);
    });

    const byDate = Array.from(dateMap.entries())
      .map(([date, stats]) => ({
        date,
        bytes: stats.bytes,
        requests: stats.requests,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalBytes,
      totalRequests,
      cacheHitRate,
      topOperations,
      byEvent,
      byDate,
    };
  }

  /**
   * Get empty summary
   */
  private getEmptySummary(): EgressSummary {
    return {
      totalBytes: 0,
      totalRequests: 0,
      cacheHitRate: 0,
      topOperations: [],
      byEvent: [],
      byDate: [],
    };
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);
    return `${size} ${sizes[i]}`;
  }

  /**
   * Generate daily report
   */
  async generateDailyReport(date?: Date): Promise<{
    summary: EgressSummary;
    alerts: string[];
    recommendations: string[];
  }> {
    const usage = await this.getDailyUsage(date);
    const alerts: string[] = [];
    const recommendations: string[] = [];

    // Check thresholds
    const dailyPercentage = (usage.totalBytes / this.thresholds.daily) * 100;
    if (dailyPercentage > 80) {
      alerts.push(`Daily usage at ${dailyPercentage.toFixed(1)}% of limit`);
    }

    // Recommendations based on usage patterns
    if (usage.cacheHitRate < 50) {
      recommendations.push(
        'Low cache hit rate detected. Consider implementing better caching strategies.'
      );
    }

    const photoViewOp = usage.topOperations.find(
      (op) => op.operation === 'photo_view'
    );
    if (photoViewOp && photoViewOp.percentage > 70) {
      recommendations.push(
        'Photo views account for most bandwidth. Consider optimizing image sizes and formats.'
      );
    }

    return {
      summary: usage,
      alerts,
      recommendations,
    };
  }

  /**
   * Update thresholds
   */
  updateThresholds(newThresholds: Partial<AlertThreshold>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };

    logger.info(
      'egress_thresholds_updated',
      {
        requestId: 'system',
      },
      `Updated egress thresholds: ${JSON.stringify(this.thresholds)}`
    );
  }

  /**
   * Cleanup old metrics (run periodically)
   */
  async cleanup(olderThanDays: number = 90): Promise<number> {
    try {
      const supabase = createClient();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { error, count } = await supabase
        .from('egress_metrics')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;

      logger.info(
        'egress_cleanup',
        {
          requestId: 'system',
          businessMetric: {
            type: 'photo_view',
            value: count || 0,
            unit: 'records',
          },
        },
        `Cleaned up ${count || 0} old egress metrics`
      );

      return count || 0;
    } catch (error) {
      logger.error('egress_cleanup_failed', {
        requestId: 'system',
        errorCode: (error as Error).name,
      });
      return 0;
    }
  }
}

// Export singleton instance
export const egressMonitor = EgressMonitor.getInstance();
export { EgressMonitor };

// Helper function for API routes
export async function trackEgress(
  operation: EgressMetric['operation'],
  bytes: number,
  context: {
    requestId: string;
    eventId?: string;
    ip?: string;
    userAgent?: string;
    token?: string;
    cacheHit?: boolean;
  }
): Promise<void> {
  await egressMonitor.trackUsage(operation, bytes, context);
}
