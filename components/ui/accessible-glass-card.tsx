'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/theme-context';

interface AccessibleGlassCardProps extends HTMLAttributes<HTMLDivElement> {
  intensity?: 'light' | 'medium' | 'strong';
  hover?: boolean;
  interactive?: boolean;
  semanticLevel?: 'section' | 'article' | 'aside' | 'div';
}

const AccessibleGlassCard = forwardRef<HTMLDivElement, AccessibleGlassCardProps>(
  ({ 
    className, 
    intensity = 'medium', 
    hover = false, 
    interactive = false,
    semanticLevel = 'div',
    children, 
    ...props 
  }, ref) => {
    const { resolvedTheme, highContrast, reducedMotion } = useTheme();
    const isDark = resolvedTheme === 'dark';
    
    // Light theme intensity classes with proper contrast ratios
    const lightIntensityClasses = {
      light: 'backdrop-blur-sm bg-white/90 border-gray-200/60 shadow-gray-200/30',
      medium: 'backdrop-blur-md bg-white/95 border-gray-300/50 shadow-gray-300/40',
      strong: 'backdrop-blur-lg bg-white/98 border-gray-400/40 shadow-gray-400/50'
    };
    
    // Dark theme intensity classes with enhanced contrast
    const darkIntensityClasses = {
      light: 'backdrop-blur-xl bg-white/[0.04] border-white/[0.12] shadow-white/5',
      medium: 'backdrop-blur-2xl bg-white/[0.08] border-white/[0.18] shadow-white/8',
      strong: 'backdrop-blur-3xl bg-white/[0.12] border-white/[0.25] shadow-white/12'
    };
    
    // High contrast mode - maximum readability
    const highContrastClasses = {
      light: isDark 
        ? 'bg-white text-black border-white border-2 shadow-xl' 
        : 'bg-black text-white border-black border-2 shadow-xl',
      medium: isDark 
        ? 'bg-white text-black border-white border-2 shadow-xl' 
        : 'bg-black text-white border-black border-2 shadow-xl',
      strong: isDark 
        ? 'bg-white text-black border-white border-2 shadow-xl' 
        : 'bg-black text-white border-black border-2 shadow-xl'
    };
    
    const intensityClasses = highContrast 
      ? highContrastClasses 
      : isDark 
        ? darkIntensityClasses 
        : lightIntensityClasses;

    const baseClasses = cn(
      // Base accessible styles
      'relative overflow-hidden rounded-2xl border transition-all',
      reducedMotion ? 'duration-0' : 'duration-300',
      
      // Apply intensity styles
      intensityClasses[intensity],
      
      // Backdrop effects (only if not high contrast)
      !highContrast && 'backdrop-saturate-[1.2]',
      
      // Interactive states for accessibility
      interactive && [
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isDark 
          ? 'focus-visible:ring-blue-400 focus-visible:ring-offset-gray-900' 
          : 'focus-visible:ring-blue-500 focus-visible:ring-offset-white',
        'cursor-pointer',
        'select-none',
      ],
      
      // Hover effects with accessibility considerations
      hover && !reducedMotion && [
        'hover:scale-[1.01] hover:-translate-y-0.5',
        isDark 
          ? 'hover:shadow-[0_20px_40px_-10px_rgba(31,38,135,0.4)]'
          : 'hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)]',
        !highContrast && isDark && 'hover:bg-white/[0.15] hover:border-white/[0.35]',
        !highContrast && !isDark && 'hover:bg-white hover:border-gray-400/70',
      ],
      
      // Text contrast for content
      !highContrast && (isDark ? 'text-white' : 'text-gray-900'),
      
      // Ensure proper z-indexing for content
      '[&>*]:relative [&>*]:z-10',
      
      className
    );

    // Choose appropriate semantic HTML element
    const Component = motion[semanticLevel as keyof typeof motion] || motion.div;

    return (
      <Component
        ref={ref}
        className={baseClasses}
        whileHover={hover && !reducedMotion ? { 
          y: -2,
          scale: 1.01,
        } : undefined}
        whileTap={interactive && !reducedMotion ? {
          scale: 0.99,
          y: 0,
        } : undefined}
        whileFocus={interactive ? {
          scale: 1.005,
        } : undefined}
        // Enhanced accessibility attributes
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={props['aria-label']}
        {...props}
      >
        {/* Background gradients - only if not high contrast */}
        {!highContrast && (
          <>
            {/* Primary gradient layer */}
            <div className={cn(
              'absolute inset-0 rounded-[inherit]',
              isDark 
                ? 'bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.01]'
                : 'bg-gradient-to-br from-black/[0.02] via-transparent to-black/[0.005]'
            )} />
            
            {/* Subtle texture - only for enhanced glass effect */}
            {intensity === 'strong' && (
              <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none">
                <svg className="w-full h-full" aria-hidden="true">
                  <defs>
                    <filter id={`accessible-frost-${intensity}`}>
                      <feTurbulence 
                        type="fractalNoise" 
                        baseFrequency="0.8" 
                        numOctaves="3" 
                        seed="7"
                      />
                      <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.03 0" />
                    </filter>
                  </defs>
                  <rect width="100%" height="100%" filter={`url(#accessible-frost-${intensity})`} />
                </svg>
              </div>
            )}
            
            {/* Subtle shimmer effect on hover */}
            {hover && (
              <motion.div 
                className={cn(
                  'absolute inset-0 bg-gradient-to-r mix-blend-overlay pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300',
                  isDark
                    ? 'from-transparent via-white/[0.08] to-transparent'
                    : 'from-transparent via-black/[0.03] to-transparent'
                )}
                animate={{
                  x: ['0%', '200%'],
                }}
                transition={{
                  duration: 2,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatDelay: 3,
                }}
                initial={{
                  x: '-100%'
                }}
              />
            )}
          </>
        )}
        
        {/* Content container with proper spacing and contrast */}
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
        
        {/* Focus indicator */}
        {interactive && (
          <div 
            className={cn(
              'absolute inset-0 rounded-[inherit] opacity-0 focus-within:opacity-100 transition-opacity',
              'ring-2 ring-offset-2 pointer-events-none',
              isDark 
                ? 'ring-blue-400 ring-offset-gray-900'
                : 'ring-blue-500 ring-offset-white'
            )}
            aria-hidden="true"
          />
        )}
      </Component>
    );
  }
);

AccessibleGlassCard.displayName = 'AccessibleGlassCard';

export { AccessibleGlassCard };