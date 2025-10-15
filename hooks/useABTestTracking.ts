'use client';

import { useCallback } from 'react';
import { useABTest, trackABTestEvent } from '@/components/providers/ab-test-provider';

export function useABTestTracking() {
  // Safe context access to avoid SSR issues
  let variant: 'A' | 'B' = 'A';
  let contextError = false;

  try {
    const context = useABTest();
    variant = context.variant;
  } catch (error) {
    // Context not available during SSR/build - use default variant
    contextError = true;
  }

  const trackEvent = useCallback((eventName: string, additionalData?: Record<string, any>) => {
    // Track to analytics
    trackABTestEvent(eventName, variant);

    // Also track with additional data
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, {
        event_category: 'ab_test',
        event_label: `variant_${variant}`,
        ...additionalData
      });
    }

    // Log for debugging
    console.log(`[AB Test Tracking] ${eventName} - Variant ${variant}`, additionalData);
  }, [variant]);

  const trackConversion = useCallback((conversionType: string, value?: number) => {
    trackEvent('conversion', { conversion_type: conversionType, value });
  }, [trackEvent]);

  const trackEngagement = useCallback((engagementType: string, duration?: number) => {
    trackEvent('engagement', { engagement_type: engagementType, duration });
  }, [trackEvent]);

  const trackError = useCallback((errorType: string, errorMessage?: string) => {
    trackEvent('error', { error_type: errorType, error_message: errorMessage });
  }, [trackEvent]);

  return {
    variant,
    trackEvent,
    trackConversion,
    trackEngagement,
    trackError
  };
}
