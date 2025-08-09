/**
 * Health Check and Alerting System
 * Monitors system health and sends alerts when issues are detected
 */

import { logger } from './logger';
import { apiCache } from './api-cache';
import { egressMonitor } from './egress-monitor';
import { createClient } from '@/lib/supabase/server';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number; // in milliseconds
  message?: string;
  lastCheck?: Date;
  details?: Record<string, any>;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: HealthCheck[];
  uptime: number;
  version: string;
}

interface AlertRule {
  name: string;
  condition: (health: SystemHealth) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // minutes
  lastTriggered?: Date;
  enabled: boolean;
}

interface Alert {
  id: string;
  rule: string;
  severity: AlertRule['severity'];
  message: string;
  timestamp: Date;
  resolved?: Date;
  details?: Record<string, any>;
}

class HealthMonitor {
  private static instance: HealthMonitor;
  private checks: Map<string, HealthCheck> = new Map();
  private alerts: Alert[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private startTime = Date.now();
  private checkInterval?: NodeJS.Timeout;
  private isRunning = false;

  // Health check thresholds
  private static readonly THRESHOLDS = {
    database: {
      latency: { healthy: 100, degraded: 500 }, // ms
      connectionPool: { healthy: 80, degraded: 95 }, // percentage
    },
    storage: {
      latency: { healthy: 200, degraded: 1000 }, // ms
      diskUsage: { healthy: 80, degraded: 90 }, // percentage
    },
    api: {
      responseTime: { healthy: 200, degraded: 1000 }, // ms
      errorRate: { healthy: 1, degraded: 5 }, // percentage
    },
    memory: {
      usage: { healthy: 70, degraded: 85 }, // percentage
    },
    egress: {
      dailyUsage: { healthy: 70, degraded: 85 }, // percentage of limit
      monthlyUsage: { healthy: 80, degraded: 90 }, // percentage of limit
    },
  };

  constructor() {
    this.initializeAlertRules();
  }

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  /**
   * Initialize default alert rules
   */
  private initializeAlertRules(): void {
    const rules: AlertRule[] = [
      {
        name: 'database_unhealthy',
        condition: (health) => {
          const dbCheck = health.checks.find((c) => c.name === 'database');
          return dbCheck?.status === 'unhealthy';
        },
        severity: 'critical',
        cooldown: 5,
        enabled: true,
      },
      {
        name: 'high_api_latency',
        condition: (health) => {
          const apiCheck = health.checks.find(
            (c) => c.name === 'api_performance'
          );
          return (
            apiCheck?.latency &&
            apiCheck.latency >
              HealthMonitor.THRESHOLDS.api.responseTime.degraded
          );
        },
        severity: 'high',
        cooldown: 15,
        enabled: true,
      },
      {
        name: 'storage_full',
        condition: (health) => {
          const storageCheck = health.checks.find((c) => c.name === 'storage');
          return (
            storageCheck?.details?.diskUsage >
            HealthMonitor.THRESHOLDS.storage.diskUsage.degraded
          );
        },
        severity: 'critical',
        cooldown: 30,
        enabled: true,
      },
      {
        name: 'high_memory_usage',
        condition: (health) => {
          const memoryCheck = health.checks.find((c) => c.name === 'memory');
          return (
            memoryCheck?.details?.usage >
            HealthMonitor.THRESHOLDS.memory.usage.degraded
          );
        },
        severity: 'medium',
        cooldown: 10,
        enabled: true,
      },
      {
        name: 'egress_limit_approaching',
        condition: (health) => {
          const egressCheck = health.checks.find(
            (c) => c.name === 'egress_bandwidth'
          );
          return (
            egressCheck?.details?.monthlyUsagePercent >
            HealthMonitor.THRESHOLDS.egress.monthlyUsage.degraded
          );
        },
        severity: 'high',
        cooldown: 60,
        enabled: true,
      },
      {
        name: 'multiple_services_degraded',
        condition: (health) => {
          const degradedCount = health.checks.filter(
            (c) => c.status === 'degraded' || c.status === 'unhealthy'
          ).length;
          return degradedCount >= 3;
        },
        severity: 'critical',
        cooldown: 10,
        enabled: true,
      },
    ];

    rules.forEach((rule) => {
      this.alertRules.set(rule.name, rule);
    });
  }

  /**
   * Start health monitoring
   */
  start(intervalMs = 30000): void {
    // Default 30 seconds
    if (this.isRunning) return;

    this.isRunning = true;

    // Run initial health check
    this.runHealthChecks();

    // Set up recurring health checks
    this.checkInterval = setInterval(() => {
      this.runHealthChecks();
    }, intervalMs);

    logger.info(
      'health_monitor_started',
      {
        requestId: 'health_monitor',
        performance: {
          totalTime: intervalMs,
        },
      },
      `Health monitor started with ${intervalMs}ms interval`
    );
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
    this.isRunning = false;

    logger.info(
      'health_monitor_stopped',
      {
        requestId: 'health_monitor',
      },
      'Health monitor stopped'
    );
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<SystemHealth> {
    const startTime = Date.now();
    const checks: HealthCheck[] = [];

    try {
      // Run all health checks in parallel
      const [
        databaseHealth,
        storageHealth,
        apiHealth,
        memoryHealth,
        cacheHealth,
        egressHealth,
      ] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkStorage(),
        this.checkAPIPerformance(),
        this.checkMemoryUsage(),
        this.checkCacheHealth(),
        this.checkEgressUsage(),
      ]);

      // Collect results
      if (databaseHealth.status === 'fulfilled')
        checks.push(databaseHealth.value);
      if (storageHealth.status === 'fulfilled')
        checks.push(storageHealth.value);
      if (apiHealth.status === 'fulfilled') checks.push(apiHealth.value);
      if (memoryHealth.status === 'fulfilled') checks.push(memoryHealth.value);
      if (cacheHealth.status === 'fulfilled') checks.push(cacheHealth.value);
      if (egressHealth.status === 'fulfilled') checks.push(egressHealth.value);

      // Add error checks for failed health checks
      if (databaseHealth.status === 'rejected') {
        checks.push({
          name: 'database',
          status: 'unhealthy',
          message: 'Health check failed',
          details: { error: databaseHealth.reason.message },
        });
      }

      // Update stored checks
      checks.forEach((check) => {
        check.lastCheck = new Date();
        this.checks.set(check.name, check);
      });

      // Determine overall status
      const overall = this.calculateOverallHealth(checks);
      const uptime = Date.now() - this.startTime;

      const systemHealth: SystemHealth = {
        overall,
        timestamp: new Date(),
        checks,
        uptime,
        version: process.env.npm_package_version || '1.0.0',
      };

      // Check for alerts
      await this.checkAlerts(systemHealth);

      // Log health summary
      const duration = Date.now() - startTime;
      logger.info(
        'health_check_complete',
        {
          requestId: 'health_monitor',
          performance: {
            totalTime: duration,
          },
          businessMetric: {
            type: 'photo_view',
            value: checks.length,
            unit: 'checks',
          },
        },
        `Health check completed: ${overall} (${checks.length} checks in ${duration}ms)`
      );

      return systemHealth;
    } catch (error) {
      logger.error(
        'health_check_failed',
        {
          requestId: 'health_monitor',
          errorCode: (error as Error).name,
          errorContext: {
            error: (error as Error).message,
          },
        },
        'Health check failed'
      );

      throw error;
    }
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const supabase = createClient();

      // Simple query to test database connectivity
      const { data, error } = await supabase
        .from('events')
        .select('id')
        .limit(1);

      const latency = Date.now() - startTime;

      if (error) {
        return {
          name: 'database',
          status: 'unhealthy',
          latency,
          message: error.message,
          details: { error: error.message },
        };
      }

      const status =
        latency > HealthMonitor.THRESHOLDS.database.latency.degraded
          ? 'degraded'
          : latency > HealthMonitor.THRESHOLDS.database.latency.healthy
            ? 'degraded'
            : 'healthy';

      return {
        name: 'database',
        status,
        latency,
        message:
          status === 'healthy'
            ? 'Database responding normally'
            : 'Database response time elevated',
        details: { latency },
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: (error as Error).message,
        details: { error: (error as Error).message },
      };
    }
  }

  /**
   * Check storage health
   */
  private async checkStorage(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const supabase = createClient();

      // Test storage connectivity with a simple list operation
      const { data, error } = await supabase.storage
        .from('photos')
        .list('', { limit: 1 });

      const latency = Date.now() - startTime;

      if (error) {
        return {
          name: 'storage',
          status: 'unhealthy',
          latency,
          message: error.message,
          details: { error: error.message },
        };
      }

      // Check disk usage (mock for now - in real app would check actual storage)
      const diskUsage = 45 + Math.random() * 30; // Mock percentage

      const status =
        diskUsage > HealthMonitor.THRESHOLDS.storage.diskUsage.degraded
          ? 'unhealthy'
          : diskUsage > HealthMonitor.THRESHOLDS.storage.diskUsage.healthy ||
              latency > HealthMonitor.THRESHOLDS.storage.latency.degraded
            ? 'degraded'
            : 'healthy';

      return {
        name: 'storage',
        status,
        latency,
        message:
          status === 'healthy'
            ? 'Storage responding normally'
            : diskUsage > 90
              ? 'Storage space critical'
              : 'Storage response time elevated',
        details: {
          latency,
          diskUsage: Math.round(diskUsage),
        },
      };
    } catch (error) {
      return {
        name: 'storage',
        status: 'unhealthy',
        message: (error as Error).message,
        details: { error: (error as Error).message },
      };
    }
  }

  /**
   * Check API performance
   */
  private async checkAPIPerformance(): Promise<HealthCheck> {
    // Mock API performance check
    const mockLatency = 50 + Math.random() * 500;
    const mockErrorRate = Math.random() * 3;

    const status =
      mockErrorRate > HealthMonitor.THRESHOLDS.api.errorRate.degraded ||
      mockLatency > HealthMonitor.THRESHOLDS.api.responseTime.degraded
        ? 'unhealthy'
        : mockErrorRate > HealthMonitor.THRESHOLDS.api.errorRate.healthy ||
            mockLatency > HealthMonitor.THRESHOLDS.api.responseTime.healthy
          ? 'degraded'
          : 'healthy';

    return {
      name: 'api_performance',
      status,
      latency: mockLatency,
      message:
        status === 'healthy'
          ? 'API performance normal'
          : 'API performance degraded',
      details: {
        averageLatency: Math.round(mockLatency),
        errorRate: Math.round(mockErrorRate * 100) / 100,
      },
    };
  }

  /**
   * Check memory usage
   */
  private async checkMemoryUsage(): Promise<HealthCheck> {
    let memoryUsage = 0;
    let status: HealthCheck['status'] = 'healthy';
    let message = 'Memory usage normal';

    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage();
        const totalMemory = usage.heapTotal;
        const usedMemory = usage.heapUsed;
        memoryUsage = (usedMemory / totalMemory) * 100;

        status =
          memoryUsage > HealthMonitor.THRESHOLDS.memory.usage.degraded
            ? 'unhealthy'
            : memoryUsage > HealthMonitor.THRESHOLDS.memory.usage.healthy
              ? 'degraded'
              : 'healthy';

        message =
          status === 'healthy'
            ? 'Memory usage normal'
            : 'Memory usage elevated';
      }
    } catch (error) {
      status = 'degraded';
      message = 'Unable to check memory usage';
    }

    return {
      name: 'memory',
      status,
      message,
      details: {
        usage: Math.round(memoryUsage),
      },
    };
  }

  /**
   * Check cache health
   */
  private async checkCacheHealth(): Promise<HealthCheck> {
    const stats = apiCache.getStats();

    const status = stats.hitRate < 30 ? 'degraded' : 'healthy';
    const message =
      status === 'healthy' ? 'Cache performing well' : 'Cache hit rate low';

    return {
      name: 'cache',
      status,
      message,
      details: {
        hitRate: stats.hitRate,
        totalEntries: stats.totalEntries,
        memoryUsage: Math.round((stats.memoryUsage / 1024 / 1024) * 100) / 100, // MB
      },
    };
  }

  /**
   * Check egress bandwidth usage
   */
  private async checkEgressUsage(): Promise<HealthCheck> {
    try {
      const dailyUsage = await egressMonitor.getDailyUsage();
      const monthlyUsage = await egressMonitor.getMonthlyUsage();

      // Calculate usage percentages (mock limits for now)
      const dailyLimit = 5 * 1024 * 1024 * 1024; // 5GB
      const monthlyLimit = 100 * 1024 * 1024 * 1024; // 100GB

      const dailyPercent = (dailyUsage.totalBytes / dailyLimit) * 100;
      const monthlyPercent = (monthlyUsage.totalBytes / monthlyLimit) * 100;

      const status =
        monthlyPercent > HealthMonitor.THRESHOLDS.egress.monthlyUsage.degraded
          ? 'unhealthy'
          : monthlyPercent >
                HealthMonitor.THRESHOLDS.egress.monthlyUsage.healthy ||
              dailyPercent > HealthMonitor.THRESHOLDS.egress.dailyUsage.degraded
            ? 'degraded'
            : 'healthy';

      const message =
        status === 'healthy'
          ? 'Bandwidth usage normal'
          : monthlyPercent > 90
            ? 'Monthly bandwidth limit approaching'
            : 'Bandwidth usage elevated';

      return {
        name: 'egress_bandwidth',
        status,
        message,
        details: {
          dailyUsagePercent: Math.round(dailyPercent),
          monthlyUsagePercent: Math.round(monthlyPercent),
          dailyBytes: dailyUsage.totalBytes,
          monthlyBytes: monthlyUsage.totalBytes,
          cacheHitRate: dailyUsage.cacheHitRate,
        },
      };
    } catch (error) {
      return {
        name: 'egress_bandwidth',
        status: 'degraded',
        message: 'Unable to check bandwidth usage',
        details: { error: (error as Error).message },
      };
    }
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(
    checks: HealthCheck[]
  ): SystemHealth['overall'] {
    const healthyCount = checks.filter((c) => c.status === 'healthy').length;
    const degradedCount = checks.filter((c) => c.status === 'degraded').length;
    const unhealthyCount = checks.filter(
      (c) => c.status === 'unhealthy'
    ).length;

    if (unhealthyCount > 0 || degradedCount > checks.length / 2) {
      return 'unhealthy';
    }

    if (degradedCount > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Check and trigger alerts
   */
  private async checkAlerts(health: SystemHealth): Promise<void> {
    const now = new Date();

    for (const [ruleName, rule] of this.alertRules.entries()) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldown * 60 * 1000;
        if (now.getTime() - rule.lastTriggered.getTime() < cooldownMs) {
          continue;
        }
      }

      // Check condition
      if (rule.condition(health)) {
        await this.triggerAlert(ruleName, rule, health);
        rule.lastTriggered = now;
      }
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    ruleName: string,
    rule: AlertRule,
    health: SystemHealth
  ): Promise<void> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rule: ruleName,
      severity: rule.severity,
      message: `${rule.name.replace(/_/g, ' ').toUpperCase()}: System health check triggered`,
      timestamp: new Date(),
      details: {
        overallHealth: health.overall,
        failedChecks: health.checks.filter((c) => c.status !== 'healthy'),
        uptime: health.uptime,
      },
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log the alert
    logger.warn(
      'health_alert_triggered',
      {
        requestId: 'health_monitor',
        security: {
          suspiciousActivity: rule.severity === 'critical',
        },
      },
      `Alert triggered: ${rule.name} (${rule.severity})`
    );

    // TODO: Integrate with external alerting systems (email, Slack, etc.)
    await this.sendAlert(alert);
  }

  /**
   * Send alert to external systems
   */
  private async sendAlert(alert: Alert): Promise<void> {
    try {
      // TODO: Implement integration with alerting systems
      // Examples:
      // - Email notifications
      // - Slack webhooks
      // - PagerDuty integration
      // - SMS alerts for critical issues

      console.warn(
        `🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`
      );

      if (alert.severity === 'critical') {
        console.error('Critical system health issue detected!', alert.details);
      }
    } catch (error) {
      logger.error(
        'alert_send_failed',
        {
          requestId: 'health_monitor',
          errorCode: (error as Error).name,
          errorContext: {
            alertId: alert.id,
            error: (error as Error).message,
          },
        },
        'Failed to send alert'
      );
    }
  }

  /**
   * Get current system health
   */
  getCurrentHealth(): SystemHealth | null {
    if (this.checks.size === 0) return null;

    const checks = Array.from(this.checks.values());
    const overall = this.calculateOverallHealth(checks);

    return {
      overall,
      timestamp: new Date(),
      checks,
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 10): Alert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert || alert.resolved) return false;

    alert.resolved = new Date();

    logger.info(
      'health_alert_resolved',
      {
        requestId: 'health_monitor',
      },
      `Alert resolved: ${alert.rule}`
    );

    return true;
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.name, rule);
  }

  /**
   * Get health check endpoint response
   */
  getHealthEndpointResponse(): {
    status: number;
    body: {
      status: string;
      timestamp: string;
      version: string;
      uptime: number;
      checks?: HealthCheck[];
      alerts?: Alert[];
    };
  } {
    const health = this.getCurrentHealth();

    if (!health) {
      return {
        status: 503,
        body: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          uptime: Date.now() - this.startTime,
        },
      };
    }

    const statusCode =
      health.overall === 'healthy'
        ? 200
        : health.overall === 'degraded'
          ? 200
          : 503;

    return {
      status: statusCode,
      body: {
        status: health.overall,
        timestamp: health.timestamp.toISOString(),
        version: health.version,
        uptime: health.uptime,
        checks: health.checks,
        alerts: this.getRecentAlerts(5),
      },
    };
  }
}

// Export singleton
export const healthMonitor = HealthMonitor.getInstance();

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  healthMonitor.start();
}
