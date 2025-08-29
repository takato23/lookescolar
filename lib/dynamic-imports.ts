// Dynamic imports for heavy dependencies to improve Fast Refresh
import { lazy } from 'react';

// Framer Motion (heavy animation library)
export const MotionDiv = lazy(() =>
  import('framer-motion').then((mod) => ({ default: mod.motion.div }))
);

export const MotionSpan = lazy(() =>
  import('framer-motion').then((mod) => ({ default: mod.motion.span }))
);

export const MotionButton = lazy(() =>
  import('framer-motion').then((mod) => ({ default: mod.motion.button }))
);

export const AnimatePresence = lazy(() =>
  import('framer-motion').then((mod) => ({ default: mod.AnimatePresence }))
);

// React Query Devtools (development only)
export const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((mod) => ({
    default: mod.ReactQueryDevtools,
  }))
);

// Heavy Recharts components
export const AreaChart = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.AreaChart }))
);

export const LineChart = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.LineChart }))
);

export const BarChart = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.BarChart }))
);

// Common motion variants for consistency
export const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const slideInVariants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 },
};

export const scaleVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};
