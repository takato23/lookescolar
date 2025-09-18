'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PremiumGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shimmer?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}

export function PremiumGlassButton({
  className,
  variant = 'default',
  size = 'md',
  shimmer = true,
  glow = false,
  children,
  ...props
}: PremiumGlassButtonProps) {
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs sm:px-3',
    md: 'px-3.5 py-2 text-sm sm:px-4',
    lg: 'px-5 py-2.5 text-base sm:px-6 sm:py-3',
    xl: 'px-6 py-3 text-lg sm:px-8 sm:py-4',
  };

  const variantClasses = {
    default: 'bg-white/10 hover:bg-white/20 text-gray-900 dark:text-white border-white/20',
    primary: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 text-blue-700 dark:text-blue-300 border-blue-400/30',
    secondary: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-700 dark:text-purple-300 border-purple-400/30',
    danger: 'bg-gradient-to-r from-red-500/20 to-rose-500/20 hover:from-red-500/30 hover:to-rose-500/30 text-red-700 dark:text-red-300 border-red-400/30',
    success: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 text-green-700 dark:text-green-300 border-green-400/30',
    warning: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-700 dark:text-amber-300 border-amber-400/30',
  };

  const glowClasses = {
    default: '',
    primary: 'shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]',
    secondary: 'shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]',
    danger: 'shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]',
    success: 'shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]',
    warning: 'shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]',
  };

  return (
    <button
      className={cn(
        'group relative inline-flex items-center justify-center font-medium rounded-xl',
        'border backdrop-blur-xl transition-all duration-300',
        'hover:scale-105 active:scale-95 touch-manipulation',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        'min-h-[44px] sm:min-h-0', // Mobile touch target minimum
        sizeClasses[size],
        variantClasses[variant],
        glow && glowClasses[variant],
        className
      )}
      {...props}
    >
      {/* Glass effect base */}
      <span className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/10 to-white/5" />
      
      {/* Shimmer effect on hover */}
      {shimmer && (
        <span className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.3)_50%,transparent_60%)] bg-[length:200%_100%] bg-[position:-100%_0] opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:bg-[position:200%_0]" />
      )}
      
      {/* Inner glow for depth */}
      <span className="absolute inset-[1px] rounded-[inherit] bg-gradient-to-b from-white/5 to-transparent opacity-50" />
      
      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
      
      {/* Bottom reflection */}
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </button>
  );
}

// Icon Button variant
export function PremiumIconButton({
  className,
  variant = 'default',
  size = 'md',
  shimmer = true,
  glow = false,
  children,
  ...props
}: PremiumGlassButtonProps) {
  const sizeClasses = {
    sm: 'p-2 sm:p-1.5',
    md: 'p-2.5 sm:p-2',
    lg: 'p-3 sm:p-3',
    xl: 'p-3.5 sm:p-4',
  };

  const variantClasses = {
    default: 'bg-white/10 hover:bg-white/20 text-gray-900 dark:text-white border-white/20',
    primary: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 text-blue-700 dark:text-blue-300 border-blue-400/30',
    secondary: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-700 dark:text-purple-300 border-purple-400/30',
    danger: 'bg-gradient-to-r from-red-500/20 to-rose-500/20 hover:from-red-500/30 hover:to-rose-500/30 text-red-700 dark:text-red-300 border-red-400/30',
    success: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 text-green-700 dark:text-green-300 border-green-400/30',
    warning: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-700 dark:text-amber-300 border-amber-400/30',
  };

  const glowClasses = {
    default: '',
    primary: 'shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]',
    secondary: 'shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]',
    danger: 'shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]',
    success: 'shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]',
    warning: 'shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]',
  };

  return (
    <button
      className={cn(
        'group relative inline-flex items-center justify-center rounded-xl',
        'border backdrop-blur-xl transition-all duration-300',
        'hover:scale-110 hover:rotate-3 active:scale-95 active:rotate-0 touch-manipulation',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        'min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0', // Mobile touch target minimum
        sizeClasses[size],
        variantClasses[variant],
        glow && glowClasses[variant],
        className
      )}
      {...props}
    >
      {/* Glass effect base */}
      <span className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/10 to-white/5" />
      
      {/* Shimmer effect on hover */}
      {shimmer && (
        <span className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.4)_50%,transparent_60%)] bg-[length:200%_100%] bg-[position:-100%_0] opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:bg-[position:200%_0]" />
      )}
      
      {/* Inner glow for depth */}
      <span className="absolute inset-[1px] rounded-[inherit] bg-gradient-to-b from-white/5 to-transparent opacity-50" />
      
      {/* Content */}
      <span className="relative z-10">
        {children}
      </span>
    </button>
  );
}