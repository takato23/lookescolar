'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ABTestContextType {
  variant: 'A' | 'B';
  isLoading: boolean;
}

const ABTestContext = createContext<ABTestContextType | undefined>(undefined);

export function ABTestProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariant] = useState<'A' | 'B'>('A');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for forced variant from environment
    const forcedVariant = process.env.NEXT_PUBLIC_FORCE_AB_VARIANT as 'A' | 'B';

    if (forcedVariant && ['A', 'B'].includes(forcedVariant)) {
      setVariant(forcedVariant);
      console.log(`🔬 A/B Test: Forzando variante ${forcedVariant} (env var)`);
    } else {
      // Normal A/B testing logic - 50/50 split
      const storedVariant = localStorage.getItem('lookescolar-variant') as 'A' | 'B';

      if (storedVariant) {
        setVariant(storedVariant);
      } else {
        // Random assignment for new users
        const newVariant = Math.random() < 0.5 ? 'A' : 'B';
        setVariant(newVariant);
        localStorage.setItem('lookescolar-variant', newVariant);
        console.log(`🎲 A/B Test: Nueva variante asignada: ${newVariant}`);
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Apply variant class to body
      document.body.className = document.body.className
        .replace(/variant-[ab]/g, '')
        .trim();

      document.body.classList.add(`variant-${variant.toLowerCase()}`);
    }
  }, [variant, isLoading]);

  return (
    <ABTestContext.Provider value={{ variant, isLoading }}>
      {children}
    </ABTestContext.Provider>
  );
}

export function useABTest() {
  const context = useContext(ABTestContext);
  if (context === undefined) {
    throw new Error('useABTest must be used within an ABTestProvider');
  }
  return context;
}

// Analytics helper
export function trackABTestEvent(event: string, variant: 'A' | 'B') {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, {
      event_category: 'ab_test',
      event_label: `variant_${variant}`,
      value: variant === 'A' ? 0 : 1
    });
  }

  // Also log to console for debugging
  console.log(`[AB Test] ${event} - Variant ${variant}`);
}
