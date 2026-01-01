'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Web Vitals Tracker Component
 *
 * Automatically tracks Core Web Vitals metrics for all pages
 * Sends metrics to analytics endpoint in production
 */
export function WebVitalsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Only load web-vitals in browser
    if (typeof window === 'undefined') return;

    // Dynamic import to avoid SSR issues
    import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
      // Track all Core Web Vitals
      onCLS((metric) => reportMetric(metric, pathname));
      onFCP((metric) => reportMetric(metric, pathname));
      onLCP((metric) => reportMetric(metric, pathname));
      onTTFB((metric) => reportMetric(metric, pathname));
      onINP((metric) => reportMetric(metric, pathname));
    }).catch((err) => {
      console.error('[Web Vitals] Failed to load web-vitals library:', err);
    });
  }, [pathname]);

  return null; // No UI needed
}

interface Metric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: string;
}

function reportMetric(metric: Metric, pathname: string) {
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: `${metric.value.toFixed(2)}ms`,
      rating: metric.rating,
      page: pathname,
    });
  }

  // Send to analytics in production
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    const body = JSON.stringify({
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      page: pathname,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
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
      }).catch((err) => {
        console.error('[Web Vitals] Failed to send metric:', err);
      });
    }
  }
}
