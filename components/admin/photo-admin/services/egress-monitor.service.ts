/**
 * Egress monitoring service for tracking Supabase data transfer usage
 * Prevents exceeding free tier limits by monitoring API response sizes
 */

interface EgressMetrics {
  totalRequests: number;
  totalBytes: number;
  currentSession: number;
  warningThreshold: number;
  criticalThreshold: number;
}

export class EgressMonitor {
  private static instance: EgressMonitor;
  private metrics: EgressMetrics = {
    totalRequests: 0,
    totalBytes: 0,
    currentSession: 0,
    warningThreshold: 50 * 1024 * 1024, // 50MB warning
    criticalThreshold: 100 * 1024 * 1024, // 100MB critical
  };

  static getInstance(): EgressMonitor {
    if (!EgressMonitor.instance) {
      EgressMonitor.instance = new EgressMonitor();
    }
    return EgressMonitor.instance;
  }

  track(bytes: number): void {
    this.metrics.totalRequests++;
    this.metrics.totalBytes += bytes;
    this.metrics.currentSession += bytes;

    if (this.metrics.currentSession > this.metrics.warningThreshold) {
      console.warn(
        '⚠️ High egress usage detected:',
        this.metrics.currentSession / 1024 / 1024,
        'MB'
      );
    }

    if (this.metrics.currentSession > this.metrics.criticalThreshold) {
      console.error('Critical egress usage! Consider optimizing queries.');
    }
  }

  getMetrics(): EgressMetrics {
    return { ...this.metrics };
  }

  resetSession(): void {
    this.metrics.currentSession = 0;
  }
}

export const egressMonitor = EgressMonitor.getInstance();














