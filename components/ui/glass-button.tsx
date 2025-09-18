'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  intensity?: 'light' | 'medium' | 'strong';
}

const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = 'default', size = 'md', intensity = 'medium', children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 px-3 text-xs font-medium',
      md: 'h-10 px-4 text-sm font-semibold',
      lg: 'h-12 px-6 text-base font-semibold'
    };

    const intensityClasses = {
      light: 'backdrop-blur-md bg-white/[0.08] border-white/[0.15] backdrop-saturate-[1.8]',
      medium: 'backdrop-blur-xl bg-white/[0.12] border-white/[0.18] backdrop-saturate-[2]',
      strong: 'backdrop-blur-3xl bg-white/[0.15] border-white/[0.22] backdrop-saturate-[2.5]'
    };

    const variantClasses = {
      default: 'text-white hover:bg-white/[0.18] hover:border-white/30',
      primary: 'text-white bg-gradient-to-br from-blue-400/[0.15] via-purple-400/[0.15] to-pink-400/[0.15] hover:from-blue-400/[0.25] hover:via-purple-400/[0.25] hover:to-pink-400/[0.25]',
      secondary: 'text-white bg-gradient-to-br from-emerald-400/[0.15] via-teal-400/[0.15] to-cyan-400/[0.15] hover:from-emerald-400/[0.25] hover:via-teal-400/[0.25] hover:to-cyan-400/[0.25]',
      ghost: 'text-white/90 hover:bg-white/[0.08] hover:border-white/20',
      danger: 'text-white bg-gradient-to-br from-red-400/[0.15] via-rose-400/[0.15] to-pink-400/[0.15] hover:from-red-400/[0.25] hover:via-rose-400/[0.25] hover:to-pink-400/[0.25]'
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          // Enhanced liquid glass effect
          'relative overflow-hidden rounded-2xl border transition-all duration-500',
          'shadow-[0_8px_32px_0_rgba(31,38,135,0.37),inset_0_1px_0_0_rgba(255,255,255,0.1)]',
          
          // Multiple glass layers for depth
          'before:absolute before:inset-0 before:rounded-2xl',
          'before:bg-gradient-to-br before:from-white/[0.07] before:via-white/[0.05] before:to-transparent',
          'before:backdrop-blur-[2px]',
          
          'after:absolute after:inset-0 after:rounded-2xl', 
          'after:bg-gradient-to-t after:from-transparent after:via-white/[0.03] after:to-white/[0.07]',
          
          // Enhanced interactive states
          'hover:shadow-[0_20px_40px_-10px_rgba(31,38,135,0.5),inset_0_2px_0_0_rgba(255,255,255,0.15)]',
          'hover:scale-[1.02] hover:-translate-y-0.5',
          'active:scale-[0.97] active:translate-y-0',
          'active:shadow-[0_4px_20px_0_rgba(31,38,135,0.3),inset_0_2px_4px_0_rgba(0,0,0,0.1)]',
          
          // Size, intensity and variant
          sizeClasses[size],
          intensityClasses[intensity],
          variantClasses[variant],
          
          // Ensure text is above glass layers
          '[&>*]:relative [&>*]:z-10',
          
          className
        )}
        whileHover={{ 
          boxShadow: '0 20px 40px -15px rgba(31, 38, 135, 0.5)',
        }}
        whileTap={{ scale: 0.97 }}
        {...props}
      >
        {/* Enhanced liquid glass effects */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/[0.15] to-transparent mix-blend-overlay" />
        
        {/* Frost glass noise texture */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay">
          <svg className="w-full h-full">
            <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
            </filter>
            <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
          </svg>
        </div>
        
        {/* Iridescent shimmer */}
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 animate-pulse-slow" />
        </div>
        
        {/* Content */}
        {children}
      </motion.button>
    );
  }
);

GlassButton.displayName = 'GlassButton';

export { GlassButton };