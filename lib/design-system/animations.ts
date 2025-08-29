/**
 * Apple-Grade Animation System
 * Sophisticated motion design with spring physics and gesture support
 */

import { Variants, Transition } from 'framer-motion';

// Apple's signature spring configuration
export const springConfig = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

// Refined spring for subtle interactions
export const subtleSpring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 40,
  mass: 0.6,
};

// Bouncy spring for playful interactions (kindergarten/elementary)
export const bouncySpring = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 15,
  mass: 1.2,
};

// Smooth easing for professional contexts (secondary school)
export const smoothEasing = {
  type: 'tween' as const,
  duration: 0.3,
  ease: 'easeOut' as const, // Fixed easing type
};

// Page transition variants
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.96,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springConfig,
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.96,
    transition: {
      ...smoothEasing,
      duration: 0.2,
    },
  },
};

// Card hover and tap animations
export const cardVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  },
  hover: {
    scale: 1.02,
    y: -2,
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    transition: subtleSpring,
  },
  tap: {
    scale: 0.98,
    y: 0,
    transition: {
      ...subtleSpring,
      duration: 0.1,
    },
  },
};

// Photo gallery item animations
export const photoVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
    y: 30,
  },
  animate: (index: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...springConfig,
      delay: index * 0.05,
    },
  }),
  hover: {
    scale: 1.05,
    zIndex: 10,
    transition: subtleSpring,
  },
  tap: {
    scale: 0.95,
    transition: {
      ...subtleSpring,
      duration: 0.1,
    },
  },
  selected: {
    scale: 1.03,
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5)',
    transition: springConfig,
  },
};

// Modal/overlay animations
export const modalVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
    y: 50,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 50,
    transition: {
      ...smoothEasing,
      duration: 0.2,
    },
  },
};

// Backdrop animation
export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Button press animation
export const buttonVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: subtleSpring,
  },
  tap: {
    scale: 0.95,
    transition: {
      ...subtleSpring,
      duration: 0.1,
    },
  },
};

// List item stagger animation
export const listVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const listItemVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20,
    y: 10,
  },
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: springConfig,
  },
};

// Navigation drawer animation
export const drawerVariants: Variants = {
  closed: {
    x: '-100%',
    transition: smoothEasing,
  },
  open: {
    x: 0,
    transition: springConfig,
  },
};

// Toast notification animation
export const toastVariants: Variants = {
  initial: {
    opacity: 0,
    y: -50,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    y: -50,
    scale: 0.9,
    transition: {
      ...smoothEasing,
      duration: 0.2,
    },
  },
};

// Loading spinner animation
export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Progress bar animation
export const progressVariants: Variants = {
  initial: { width: '0%' },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: {
      ...smoothEasing,
      duration: 0.5,
    },
  }),
};

// Age-appropriate animation configs
export const ageVariants = {
  kindergarten: {
    spring: bouncySpring,
    scale: { hover: 1.08, tap: 0.92 },
    colors: {
      from: 'hsl(45, 100%, 70%)',
      to: 'hsl(300, 60%, 80%)',
    },
  },
  elementary: {
    spring: {
      ...springConfig,
      stiffness: 250,
      damping: 25,
    },
    scale: { hover: 1.05, tap: 0.95 },
    colors: {
      from: 'hsl(210, 80%, 60%)',
      to: 'hsl(330, 70%, 70%)',
    },
  },
  secondary: {
    spring: {
      ...springConfig,
      stiffness: 350,
      damping: 35,
    },
    scale: { hover: 1.03, tap: 0.97 },
    colors: {
      from: 'hsl(220, 70%, 50%)',
      to: 'hsl(280, 60%, 55%)',
    },
  },
};

// Gesture configurations
export const gestureConfigs = {
  swipe: {
    threshold: 50,
    velocity: 0.3,
  },
  drag: {
    dragConstraints: { left: 0, right: 0, top: 0, bottom: 0 },
    dragElastic: 0.1,
    dragTransition: { bounceStiffness: 300, bounceDamping: 20 },
  },
  pinch: {
    scaleRange: [0.5, 3],
    springConfig: {
      stiffness: 300,
      damping: 30,
    },
  },
};

// Utility function to get age-appropriate animation
export const getAgeAnimation = (
  ageGroup: 'kindergarten' | 'elementary' | 'secondary'
) => {
  return ageVariants[ageGroup];
};

// Utility function for staggered list animations
export const createStaggeredAnimation = (
  itemCount: number,
  baseDelay: number = 0.05
) => {
  return {
    animate: {
      transition: {
        staggerChildren: baseDelay,
        delayChildren: baseDelay,
      },
    },
  };
};

// Utility for creating custom spring animations
export const createSpringAnimation = (
  stiffness: number = 300,
  damping: number = 30,
  mass: number = 0.8
): Transition => ({
  type: 'spring',
  stiffness,
  damping,
  mass,
});

// Predefined animation presets
export const animationPresets = {
  // Subtle interactions for professional contexts
  subtle: {
    hover: { scale: 1.02, transition: subtleSpring },
    tap: { scale: 0.98, transition: { ...subtleSpring, duration: 0.1 } },
  },

  // Playful interactions for younger age groups
  playful: {
    hover: { scale: 1.08, rotate: 1, transition: bouncySpring },
    tap: {
      scale: 0.92,
      rotate: -1,
      transition: { ...bouncySpring, duration: 0.15 },
    },
  },

  // Elegant interactions for refined contexts
  elegant: {
    hover: { y: -2, scale: 1.01, transition: smoothEasing },
    tap: { y: 0, scale: 0.99, transition: { ...smoothEasing, duration: 0.1 } },
  },
};
