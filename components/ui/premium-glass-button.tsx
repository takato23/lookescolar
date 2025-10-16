'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

type PremiumGlassButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info';

type PremiumGlassButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface PremiumGlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PremiumGlassButtonVariant;
  size?: PremiumGlassButtonSize;
  shimmer?: boolean;
  glow?: boolean;
}

const sizeClasses: Record<PremiumGlassButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs sm:px-3',
  md: 'px-3.5 py-2 text-sm sm:px-4',
  lg: 'px-5 py-2.5 text-base sm:px-6 sm:py-3',
  xl: 'px-6 py-3 text-lg sm:px-8 sm:py-4',
};

const variantClasses: Record<PremiumGlassButtonVariant, string> = {
  default:
    'bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white border-white/20',
  primary:
    'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 text-blue-700 dark:text-blue-300 border-blue-400/30',
  secondary:
    'bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-700 dark:text-purple-300 border-purple-400/30',
  danger:
    'bg-gradient-to-r from-red-500/20 to-rose-500/20 hover:from-red-500/30 hover:to-rose-500/30 text-red-700 dark:text-red-300 border-red-400/30',
  success:
    'bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 text-green-700 dark:text-green-300 border-green-400/30',
  warning:
    'bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-700 dark:text-amber-300 border-amber-400/30',
  info: 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 text-sky-700 dark:text-sky-300 border-sky-400/30',
};

const glowClasses: Record<
  Exclude<PremiumGlassButtonVariant, 'default'>,
  string
> = {
  primary:
    'shadow-[0_0_20px_rgba(59,130,246,0.45)] hover:shadow-[0_0_30px_rgba(59,130,246,0.55)]',
  secondary:
    'shadow-[0_0_20px_rgba(168,85,247,0.45)] hover:shadow-[0_0_30px_rgba(168,85,247,0.55)]',
  danger:
    'shadow-[0_0_20px_rgba(239,68,68,0.45)] hover:shadow-[0_0_30px_rgba(239,68,68,0.55)]',
  success:
    'shadow-[0_0_20px_rgba(34,197,94,0.45)] hover:shadow-[0_0_30px_rgba(34,197,94,0.55)]',
  warning:
    'shadow-[0_0_20px_rgba(245,158,11,0.45)] hover:shadow-[0_0_30px_rgba(245,158,11,0.55)]',
  info: 'shadow-[0_0_20px_rgba(14,165,233,0.45)] hover:shadow-[0_0_30px_rgba(14,165,233,0.55)]',
};

const PremiumGlassButton = React.forwardRef<
  HTMLButtonElement,
  PremiumGlassButtonProps
>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      shimmer = true,
      glow = false,
      type = 'button',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'group relative inline-flex items-center justify-center rounded-xl font-medium',
          'border backdrop-blur-xl transition-all duration-300',
          'touch-manipulation hover:scale-105 active:scale-95',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100',
          'min-h-[44px] sm:min-h-0',
          sizeClasses[size],
          variantClasses[variant],
          glow && variant !== 'default' && glowClasses[variant],
          className
        )}
        {...props}
      >
        <span className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/10 to-white/5" />
        {shimmer && (
          <span className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.3)_50%,transparent_60%)] bg-[length:200%_100%] bg-[position:-100%_0] opacity-0 transition-all duration-500 group-hover:bg-[position:200%_0] group-hover:opacity-100" />
        )}
        <span className="absolute inset-[1px] rounded-[inherit] bg-gradient-to-b from-white/5 to-transparent opacity-50" />
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
        <span className="absolute bottom-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </button>
    );
  }
);

PremiumGlassButton.displayName = 'PremiumGlassButton';

const PremiumIconButton = React.forwardRef<
  HTMLButtonElement,
  PremiumGlassButtonProps
>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      shimmer = true,
      glow = false,
      type = 'button',
      children,
      ...props
    },
    ref
  ) => {
    const iconSizes: Record<PremiumGlassButtonSize, string> = {
      sm: 'p-2 sm:p-1.5',
      md: 'p-2.5 sm:p-2',
      lg: 'p-3 sm:p-3',
      xl: 'p-3.5 sm:p-4',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'group relative inline-flex items-center justify-center rounded-xl',
          'border backdrop-blur-xl transition-all duration-300',
          'touch-manipulation hover:rotate-3 hover:scale-110 active:rotate-0 active:scale-95',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100',
          'min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0',
          iconSizes[size],
          variantClasses[variant],
          glow && variant !== 'default' && glowClasses[variant],
          className
        )}
        {...props}
      >
        <span className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/10 to-white/5" />
        {shimmer && (
          <span className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.4)_50%,transparent_60%)] bg-[length:200%_100%] bg-[position:-100%_0] opacity-0 transition-all duration-500 group-hover:bg-[position:200%_0] group-hover:opacity-100" />
        )}
        <span className="absolute inset-[1px] rounded-[inherit] bg-gradient-to-b from-white/5 to-transparent opacity-50" />
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </button>
    );
  }
);

PremiumIconButton.displayName = 'PremiumIconButton';

export { PremiumGlassButton, PremiumIconButton };
