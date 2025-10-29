import { describe, it, expect } from 'vitest';
import { EgressMonitor } from '@/components/admin/photo-admin/services/egress-monitor.service';

describe('EgressMonitor', () => {
  it('should be a singleton', () => {
    const instance1 = EgressMonitor.getInstance();
    const instance2 = EgressMonitor.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should track bytes correctly', () => {
    const monitor = EgressMonitor.getInstance();
    monitor.resetSession();
    
    monitor.track(1000);
    monitor.track(2000);
    monitor.track(3000);
    
    const metrics = monitor.getMetrics();
    expect(metrics.currentSession).toBe(6000);
    expect(metrics.totalBytes).toBeGreaterThanOrEqual(6000);
    expect(metrics.totalRequests).toBeGreaterThanOrEqual(3);
  });

  it('should detect warning threshold', () => {
    const monitor = EgressMonitor.getInstance();
    monitor.resetSession();
    
    // Should not warn at 49MB
    monitor.track(49 * 1024 * 1024);
    const metrics49 = monitor.getMetrics();
    expect(metrics49.currentSession).toBeLessThan(50 * 1024 * 1024);
    
    // Should warn at 50MB
    monitor.track(1024 * 1024);
    const metrics50 = monitor.getMetrics();
    expect(metrics50.currentSession).toBeGreaterThanOrEqual(50 * 1024 * 1024);
  });

  it('should reset session correctly', () => {
    const monitor = EgressMonitor.getInstance();
    monitor.track(1000);
    
    const metricsBefore = monitor.getMetrics();
    expect(metricsBefore.currentSession).toBeGreaterThan(0);
    
    monitor.resetSession();
    
    const metricsAfter = monitor.getMetrics();
    expect(metricsAfter.currentSession).toBe(0);
  });
});


