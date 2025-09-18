'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  intensity?: 'light' | 'medium' | 'strong';
  hover?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, intensity = 'medium', hover = false, children, ...props }, ref) => {
    const intensityClasses = {
      light: 'backdrop-blur-xl bg-white/[0.02] border-white/[0.08] backdrop-saturate-[1.5]',
      medium: 'backdrop-blur-2xl bg-white/[0.05] border-white/[0.12] backdrop-saturate-[1.8]',
      strong: 'backdrop-blur-3xl bg-white/[0.08] border-white/[0.15] backdrop-saturate-[2]'
    };

    const baseClasses = cn(
      // Enhanced frost glass effect
      'relative overflow-hidden rounded-3xl border-[1.5px] transition-all duration-700',
      'shadow-[0_8px_32px_0_rgba(31,38,135,0.37),inset_0_0_0_1px_rgba(255,255,255,0.1)]',
      'bg-gradient-to-br from-white/[0.03] to-white/[0.01]',
      
      // Multiple glass gradient layers
      'before:absolute before:inset-0 before:rounded-3xl',
      'before:bg-gradient-to-br before:from-white/[0.06] before:via-transparent before:to-white/[0.02]',
      'before:backdrop-blur-[1px]',
      
      'after:absolute after:inset-0 after:rounded-3xl',
      'after:bg-gradient-to-t after:from-transparent after:via-white/[0.02] after:to-white/[0.05]',
      'after:mix-blend-overlay',
      
      // Intensity
      intensityClasses[intensity],
      
      // Enhanced hover effects
      hover && [
        'hover:shadow-[0_20px_60px_-5px_rgba(31,38,135,0.5),inset_0_0_0_1px_rgba(255,255,255,0.2)]',
        'hover:bg-white/[0.1] hover:border-white/[0.25]',
        'hover:scale-[1.01] hover:-translate-y-1',
        'hover:backdrop-saturate-[2.5]',
      ],
      
      // Ensure content is above glass layers
      '[&>*]:relative [&>*]:z-10',
      
      className
    );

    if (!hover) {
      return (
        <div ref={ref} className={baseClasses} {...props}>
          {/* Frost noise texture */}
          <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none">
            <svg className="w-full h-full">
              <filter id="frostNoise">
                <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="4" seed="5" />
                <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0" />
              </filter>
              <rect width="100%" height="100%" filter="url(#frostNoise)" />
            </svg>
          </div>
          
          {/* Iridescent gradient */}
          <div className="absolute inset-0 opacity-40">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-400/5 to-pink-400/10 animate-pulse-slow" />
          </div>
          
          {/* Radial glow */}
          <div className="absolute inset-0 bg-radial-gradient from-white/[0.06] to-transparent opacity-50" />
          
          {children}
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={baseClasses}
        whileHover={{ 
          boxShadow: '0 30px 60px -15px rgba(31, 38, 135, 0.5)',
        }}
        {...props}
      >
        {/* Enhanced liquid shimmer */}
        <div className="absolute inset-0 -translate-x-full hover:animate-shimmer bg-gradient-to-r from-transparent via-white/[0.12] to-transparent mix-blend-overlay" />
        
        {/* Frost noise texture */}
        <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none">
          <svg className="w-full h-full">
            <filter id="frostNoiseHover">
              <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="4" seed="5" />
              <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#frostNoiseHover)" />
          </svg>
        </div>
        
        {/* Iridescent gradient animation */}
        <div className="absolute inset-0 opacity-50">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-purple-400/8 to-pink-400/10 animate-pulse-slow" />
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/8 via-transparent to-rose-400/8 animate-pulse-slow" style={{ animationDelay: '1s' }} />
        </div>
        
        {/* Radial inner glow */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(255,255,255,0.06) 0%, transparent 70%)' }} />
        
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export { GlassCard };