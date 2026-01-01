/**
 * Web Vitals Performance Monitoring
 *
 * Tracks Core Web Vitals metrics:
 * - LCP (Largest Contentful Paint) - Loading performance
 * - CLS (Cumulative Layout Shift) - Visual stability
 * - FCP (First Contentful Paint) - Initial rendering
 * - TTFB (Time to First Byte) - Server response time
 * - INP (Interaction to Next Paint) - Responsiveness (replaces FID)
 */

export interface WebVitalsMetric {
  id: string;
  name: 'CLS' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache' | 'prerender' | 'restore';
}

// Thresholds based on Core Web Vitals guidelines
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

function getRating(name: WebVitalsMetric['name'], value: number): WebVitalsMetric['rating'] {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Report Web Vitals metric to analytics
 * Can be customized to send to your analytics service (Google Analytics, etc.)
 */
export function reportWebVitals(metric: WebVitalsMetric) {
  const rating = getRating(metric.name, metric.value);

  console.log(`[Web Vitals] ${metric.name}:`, {
    value: metric.value,
    rating,
    id: metric.id,
    delta: metric.delta,
  });

  // Send to analytics endpoint (optional)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Example: Send to custom analytics endpoint
    const body = JSON.stringify({
      metric: metric.name,
      value: metric.value,
      rating,
      page: window.location.pathname,
      ...metric,
    });

    // Use sendBeacon for reliability (doesn't block page unload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/web-vitals', body);
    } else {
      // Fallback to fetch
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(console.error);
    }
  }
}

/**
 * Get current Web Vitals ratings for monitoring dashboard
 */
export function getCurrentVitals(): Promise<Record<string, WebVitalsMetric | null>> {
  return new Promise((resolve) => {
    const metrics: Record<string, WebVitalsMetric | null> = {
      LCP: null,
      CLS: null,
      FCP: null,
      TTFB: null,
      INP: null,
    };

    // Use web-vitals library if available
    if (typeof window !== 'undefined') {
      import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
        onCLS((metric) => { metrics.CLS = metric as WebVitalsMetric; });
        onFCP((metric) => { metrics.FCP = metric as WebVitalsMetric; });
        onLCP((metric) => { metrics.LCP = metric as WebVitalsMetric; });
        onTTFB((metric) => { metrics.TTFB = metric as WebVitalsMetric; });
        onINP((metric) => { metrics.INP = metric as WebVitalsMetric; });

        // Wait a bit for metrics to populate
        setTimeout(() => resolve(metrics), 1000);
      }).catch(() => resolve(metrics));
    } else {
      resolve(metrics);
    }
  });
}

/**
 * Performance budget checker
 * Alerts if metrics exceed thresholds
 */
export function checkPerformanceBudget(metric: WebVitalsMetric): boolean {
  const threshold = THRESHOLDS[metric.name];
  const exceedsBudget = metric.value > threshold.poor;

  if (exceedsBudget && process.env.NODE_ENV === 'development') {
    console.warn(
      `[Performance Budget] ${metric.name} exceeded budget: ${metric.value}ms (limit: ${threshold.poor}ms)`
    );
  }

  return !exceedsBudget;
}

/**
 * Component performance tracker for React components
 */
export function trackComponentPerformance(componentName: string, startTime: number) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > 100) {
      console.warn(
        `[Component Performance] ${componentName} took ${duration.toFixed(2)}ms to render`
      );
    }

    return duration;
  }
  return 0;
}
