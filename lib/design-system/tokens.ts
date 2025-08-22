/**
 * Apple-Grade Design Token System
 * Follows Apple's Human Interface Guidelines for precision and consistency
 */

// Base scale using 8pt grid system (Apple standard)
const baseUnit = 8;
const scale = (multiplier: number) => `${baseUnit * multiplier}px`;

// Color system with semantic meanings and accessibility
export const colors = {
  // Primary brand colors with proper contrast ratios
  primary: {
    50: 'hsl(210, 100%, 97%)',
    100: 'hsl(210, 100%, 95%)',
    200: 'hsl(210, 100%, 90%)',
    300: 'hsl(210, 100%, 80%)',
    400: 'hsl(210, 100%, 70%)',
    500: 'hsl(210, 100%, 60%)', // Main brand color
    600: 'hsl(210, 100%, 50%)',
    700: 'hsl(210, 100%, 40%)',
    800: 'hsl(210, 100%, 30%)',
    900: 'hsl(210, 100%, 20%)',
    950: 'hsl(210, 100%, 10%)',
  },
  
  // Semantic colors
  semantic: {
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    error: 'hsl(0, 84%, 60%)',
    info: 'hsl(210, 100%, 60%)',
  },
  
  // Neutral grays with proper contrast
  neutral: {
    0: 'hsl(0, 0%, 100%)',
    50: 'hsl(210, 20%, 98%)',
    100: 'hsl(210, 20%, 96%)',
    200: 'hsl(210, 16%, 93%)',
    300: 'hsl(210, 14%, 89%)',
    400: 'hsl(210, 14%, 83%)',
    500: 'hsl(210, 11%, 71%)',
    600: 'hsl(210, 9%, 56%)',
    700: 'hsl(210, 10%, 40%)',
    800: 'hsl(210, 24%, 16%)',
    900: 'hsl(210, 24%, 10%)',
    1000: 'hsl(0, 0%, 0%)',
  },
  
  // Age-appropriate theming colors
  kindergarten: {
    primary: 'hsl(45, 100%, 70%)', // Warm yellow
    secondary: 'hsl(120, 60%, 70%)', // Gentle green
    accent: 'hsl(300, 60%, 80%)', // Soft purple
  },
  
  elementary: {
    primary: 'hsl(210, 80%, 60%)', // Friendly blue
    secondary: 'hsl(25, 80%, 65%)', // Warm orange
    accent: 'hsl(330, 70%, 70%)', // Playful pink
  },
  
  secondary: {
    primary: 'hsl(220, 70%, 50%)', // Professional blue
    secondary: 'hsl(150, 60%, 45%)', // Mature green
    accent: 'hsl(280, 60%, 55%)', // Sophisticated purple
  },
} as const;

// Typography scale following Apple's type system
export const typography = {
  fontFamily: {
    sans: [
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ],
    mono: [
      'SF Mono',
      'Monaco',
      'Inconsolata',
      'Roboto Mono',
      'source-code-pro',
      'Menlo',
      'monospace',
    ],
  },
  
  fontSize: {
    xs: ['12px', { lineHeight: '16px', letterSpacing: '0.05em' }],
    sm: ['14px', { lineHeight: '20px', letterSpacing: '0.025em' }],
    base: ['16px', { lineHeight: '24px', letterSpacing: '0em' }],
    lg: ['18px', { lineHeight: '28px', letterSpacing: '-0.025em' }],
    xl: ['20px', { lineHeight: '32px', letterSpacing: '-0.025em' }],
    '2xl': ['24px', { lineHeight: '36px', letterSpacing: '-0.05em' }],
    '3xl': ['30px', { lineHeight: '40px', letterSpacing: '-0.05em' }],
    '4xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.1em' }],
    '5xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.1em' }],
    '6xl': ['60px', { lineHeight: '72px', letterSpacing: '-0.1em' }],
  },
  
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
} as const;

// Spacing system using 8pt grid
export const spacing = {
  px: '1px',
  0: '0',
  0.5: scale(0.0625), // 0.5px
  1: scale(0.125),    // 1px  
  1.5: scale(0.1875), // 1.5px
  2: scale(0.25),     // 2px
  2.5: scale(0.3125), // 2.5px
  3: scale(0.375),    // 3px
  3.5: scale(0.4375), // 3.5px
  4: scale(0.5),      // 4px
  5: scale(0.625),    // 5px
  6: scale(0.75),     // 6px
  7: scale(0.875),    // 7px
  8: scale(1),        // 8px - base unit
  9: scale(1.125),    // 9px
  10: scale(1.25),    // 10px
  11: scale(1.375),   // 11px
  12: scale(1.5),     // 12px
  14: scale(1.75),    // 14px
  16: scale(2),       // 16px
  20: scale(2.5),     // 20px
  24: scale(3),       // 24px
  28: scale(3.5),     // 28px
  32: scale(4),       // 32px
  36: scale(4.5),     // 36px
  40: scale(5),       // 40px
  44: scale(5.5),     // 44px
  48: scale(6),       // 48px
  52: scale(6.5),     // 52px
  56: scale(7),       // 56px
  60: scale(7.5),     // 60px
  64: scale(8),       // 64px
  72: scale(9),       // 72px
  80: scale(10),      // 80px
  96: scale(12),      // 96px
} as const;

// Apple-style elevation system
export const elevation = {
  none: {
    boxShadow: 'none',
  },
  subtle: {
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },
  small: {
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  },
  medium: {
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  large: {
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  xl: {
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  '2xl': {
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
} as const;

// Border radius following Apple's design language
export const borderRadius = {
  none: '0',
  sm: '2px',
  base: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
} as const;

// Transition and animation values
export const animation = {
  duration: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // Apple's signature easing
    apple: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// Breakpoints for responsive design
export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Z-index scale for layering
export const zIndex = {
  base: 0,
  raised: 10,
  dropdown: 1000,
  sticky: 1020,
  banner: 1030,
  overlay: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
  system: 2147483647,
} as const;