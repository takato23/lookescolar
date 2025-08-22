/**
 * Apple-Grade Component Foundation
 * Sophisticated variant system with meticulous attention to detail
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { colors, spacing, borderRadius, animation } from './tokens';

// Button variants with Apple-style precision
export const buttonVariants = cva(
  [
    // Base styles
    'inline-flex items-center justify-center rounded-lg font-medium transition-all',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none whitespace-nowrap',
    // Apple-style subtle animations
    'transform active:scale-95 transition-transform duration-100',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-blue-600 text-white shadow-sm',
          'hover:bg-blue-700 hover:shadow-md',
          'focus-visible:ring-blue-500',
          'active:bg-blue-800',
        ],
        secondary: [
          'bg-gray-100 text-gray-900 shadow-sm border border-gray-200',
          'hover:bg-gray-200 hover:shadow-md hover:border-gray-300',
          'focus-visible:ring-gray-500',
          'active:bg-gray-300',
        ],
        ghost: [
          'bg-transparent text-gray-700',
          'hover:bg-gray-100 hover:text-gray-900',
          'focus-visible:ring-gray-500',
          'active:bg-gray-200',
        ],
        destructive: [
          'bg-red-600 text-white shadow-sm',
          'hover:bg-red-700 hover:shadow-md',
          'focus-visible:ring-red-500',
          'active:bg-red-800',
        ],
        // Age-appropriate variants
        kindergarten: [
          'bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 shadow-md',
          'hover:from-yellow-500 hover:to-orange-500 hover:shadow-lg',
          'focus-visible:ring-yellow-500',
          'active:from-yellow-600 active:to-orange-600',
        ],
        elementary: [
          'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md',
          'hover:from-blue-600 hover:to-purple-700 hover:shadow-lg',
          'focus-visible:ring-blue-500',
          'active:from-blue-700 active:to-purple-800',
        ],
        secondary_school: [
          'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-md',
          'hover:from-gray-900 hover:to-black hover:shadow-lg',
          'focus-visible:ring-gray-700',
          'active:from-black active:to-gray-800',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs gap-1.5',
        default: 'h-10 px-4 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2.5',
        xl: 'h-14 px-8 text-lg gap-3',
        icon: 'h-10 w-10',
      },
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        default: 'rounded-lg',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      rounded: 'default',
    },
  }
);

// Card variants with sophisticated elevation
export const cardVariants = cva(
  [
    'rounded-xl border bg-white shadow-sm transition-all duration-200',
    'focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500',
  ],
  {
    variants: {
      variant: {
        default: 'border-gray-200',
        elevated: 'border-gray-200 shadow-lg hover:shadow-xl',
        interactive: [
          'border-gray-200 cursor-pointer',
          'hover:shadow-md hover:border-gray-300',
          'active:scale-[0.98] active:shadow-sm',
        ],
        success: 'border-green-200 bg-green-50',
        warning: 'border-yellow-200 bg-yellow-50',
        error: 'border-red-200 bg-red-50',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        default: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
    },
  }
);

// Input variants with Apple-style focus states
export const inputVariants = cva(
  [
    'flex w-full rounded-lg border bg-white px-3 py-2 text-sm',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
    'placeholder:text-gray-500',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'transition-all duration-200',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-gray-300',
          'focus-visible:border-blue-500 focus-visible:ring-blue-500',
          'hover:border-gray-400',
        ],
        error: [
          'border-red-500 text-red-900 placeholder:text-red-700',
          'focus-visible:border-red-500 focus-visible:ring-red-500',
        ],
        success: [
          'border-green-500 text-green-900 placeholder:text-green-700',
          'focus-visible:border-green-500 focus-visible:ring-green-500',
        ],
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        default: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// Badge variants for status indicators
export const badgeVariants = cva(
  [
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  ],
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        primary: 'bg-blue-100 text-blue-900 hover:bg-blue-200',
        success: 'bg-green-100 text-green-900 hover:bg-green-200',
        warning: 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200',
        error: 'bg-red-100 text-red-900 hover:bg-red-200',
        outline: 'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Avatar variants with proper sizing
export const avatarVariants = cva(
  [
    'relative inline-flex shrink-0 overflow-hidden rounded-full',
    'bg-gray-100 text-gray-600 select-none',
  ],
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-sm',
        default: 'h-10 w-10 text-base',
        lg: 'h-12 w-12 text-lg',
        xl: 'h-16 w-16 text-xl',
        '2xl': 'h-20 w-20 text-2xl',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

// Loading skeleton variants
export const skeletonVariants = cva(
  [
    'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200',
    'bg-size-200 animate-shimmer',
  ],
  {
    variants: {
      variant: {
        default: 'rounded-md',
        text: 'rounded-md h-4',
        circle: 'rounded-full',
        button: 'rounded-lg h-10',
        card: 'rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Alert variants for notifications
export const alertVariants = cva(
  [
    'relative w-full rounded-lg border p-4',
    'transition-all duration-300 ease-in-out',
  ],
  {
    variants: {
      variant: {
        default: 'bg-gray-50 border-gray-200 text-gray-900',
        success: 'bg-green-50 border-green-200 text-green-900',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
        error: 'bg-red-50 border-red-200 text-red-900',
        info: 'bg-blue-50 border-blue-200 text-blue-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Export types for TypeScript support
export type ButtonVariants = VariantProps<typeof buttonVariants>;
export type CardVariants = VariantProps<typeof cardVariants>;
export type InputVariants = VariantProps<typeof inputVariants>;
export type BadgeVariants = VariantProps<typeof badgeVariants>;
export type AvatarVariants = VariantProps<typeof avatarVariants>;
export type SkeletonVariants = VariantProps<typeof skeletonVariants>;
export type AlertVariants = VariantProps<typeof alertVariants>;