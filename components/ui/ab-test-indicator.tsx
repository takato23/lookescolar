'use client';

import { useABTest } from '@/components/providers/ab-test-provider';
import { cn } from '@/lib/utils';

export function ABTestIndicator() {
  const { variant, isLoading } = useABTest();

  // Only show in development or when explicitly enabled
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SHOW_AB_INDICATOR) {
    return null;
  }

  if (isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 px-3 py-1 rounded-full text-xs font-medium cursor-pointer",
        "backdrop-blur-md border shadow-lg transition-all duration-300 select-none",
        "hover:scale-110 active:scale-95",
        variant === 'A'
          ? "bg-blue-500/20 text-blue-700 border-blue-300"
          : "bg-purple-500/20 text-purple-700 border-purple-300"
      )}
      onClick={() => {
        console.log(`🔬 A/B Testing: Current variant is ${variant}`);
        console.log('💡 To switch variants, run:');
        console.log('   node scripts/ab-test-force-variant.cjs A  # for variant A');
        console.log('   node scripts/ab-test-force-variant.cjs B  # for variant B');
        console.log('   Then restart the dev server');
      }}
      title={`Click to see variant info. Current: ${variant}`}
    >
      Var. {variant}
    </div>
  );
}
