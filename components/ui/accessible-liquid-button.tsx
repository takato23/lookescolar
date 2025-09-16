'use client';

import { ButtonHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AccessibleLiquidButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  liquid?: boolean;
  theme?: 'dark' | 'light';
  highContrast?: boolean;
}

const AccessibleLiquidButton = forwardRef<HTMLButtonElement, AccessibleLiquidButtonProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'md', 
    liquid = true, 
    theme = 'dark',
    highContrast = false,
    children, 
    disabled,
    ...props 
  }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    const sizeClasses = {
      sm: 'h-10 px-4 text-sm font-semibold min-w-[80px]',
      md: 'h-12 px-6 text-base font-bold min-w-[100px]',
      lg: 'h-14 px-8 text-lg font-extrabold min-w-[120px]'
    };

    // Improved contrast ratios for WCAG AA compliance
    const lightThemeVariants = {
      default: {
        bg: 'from-gray-100/90 via-white/95 to-gray-50/90',
        text: 'text-gray-900',
        border: 'border-gray-300/50',
        shadow: 'shadow-gray-400/20',
        textShadow: '[text-shadow:_0_1px_2px_rgba(0,0,0,0.1)]'
      },
      primary: {
        bg: 'from-blue-500/90 via-blue-600/95 to-blue-700/90',
        text: 'text-white',
        border: 'border-blue-400/50',
        shadow: 'shadow-blue-500/30',
        textShadow: '[text-shadow:_0_1px_2px_rgba(0,0,0,0.3)]'
      },
      secondary: {
        bg: 'from-emerald-500/90 via-teal-600/95 to-green-700/90',
        text: 'text-white',
        border: 'border-emerald-400/50',
        shadow: 'shadow-emerald-500/30',
        textShadow: '[text-shadow:_0_1px_2px_rgba(0,0,0,0.3)]'
      },
      ghost: {
        bg: 'from-transparent via-gray-50/30 to-transparent',
        text: 'text-gray-800',
        border: 'border-gray-400/30',
        shadow: 'shadow-gray-300/20',
        textShadow: '[text-shadow:_0_1px_1px_rgba(255,255,255,0.5)]'
      },
      danger: {
        bg: 'from-red-500/90 via-red-600/95 to-red-700/90',
        text: 'text-white',
        border: 'border-red-400/50',
        shadow: 'shadow-red-500/30',
        textShadow: '[text-shadow:_0_1px_2px_rgba(0,0,0,0.3)]'
      }
    };

    const darkThemeVariants = {
      default: {
        bg: 'from-white/[0.18] via-white/[0.12] to-white/[0.15]',
        text: 'text-white',
        border: 'border-white/[0.25]',
        shadow: 'shadow-white/10',
        textShadow: '[text-shadow:_0_2px_4px_rgba(0,0,0,0.3)]'
      },
      primary: {
        bg: 'from-blue-400/[0.35] via-purple-400/[0.25] to-pink-400/[0.3]',
        text: 'text-white',
        border: 'border-blue-300/[0.4]',
        shadow: 'shadow-blue-400/20',
        textShadow: '[text-shadow:_0_2px_4px_rgba(0,0,0,0.4)]'
      },
      secondary: {
        bg: 'from-emerald-400/[0.35] via-teal-400/[0.25] to-cyan-400/[0.3]',
        text: 'text-white',
        border: 'border-emerald-300/[0.4]',
        shadow: 'shadow-emerald-400/20',
        textShadow: '[text-shadow:_0_2px_4px_rgba(0,0,0,0.4)]'
      },
      ghost: {
        bg: 'from-white/[0.08] via-white/[0.04] to-white/[0.06]',
        text: 'text-white/95',
        border: 'border-white/[0.15]',
        shadow: 'shadow-white/5',
        textShadow: '[text-shadow:_0_1px_3px_rgba(0,0,0,0.4)]'
      },
      danger: {
        bg: 'from-red-400/[0.35] via-rose-400/[0.25] to-pink-400/[0.3]',
        text: 'text-white',
        border: 'border-red-300/[0.4]',
        shadow: 'shadow-red-400/20',
        textShadow: '[text-shadow:_0_2px_4px_rgba(0,0,0,0.4)]'
      }
    };

    // High contrast mode overrides
    const highContrastOverrides = highContrast ? {
      border: theme === 'light' ? 'border-black border-2' : 'border-white border-2',
      text: theme === 'light' ? 'text-black' : 'text-white',
      bg: theme === 'light' ? 'from-white via-gray-100 to-white' : 'from-gray-900 via-black to-gray-900',
      textShadow: theme === 'light' ? '[text-shadow:_0_1px_1px_rgba(255,255,255,0.8)]' : '[text-shadow:_0_2px_4px_rgba(0,0,0,0.8)]'
    } : {};

    const variantStyles = theme === 'light' ? lightThemeVariants[variant] : darkThemeVariants[variant];
    const finalStyles = { ...variantStyles, ...highContrastOverrides };

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        className={cn(
          // Base accessibility
          'relative overflow-hidden transition-all duration-300',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          theme === 'light' 
            ? 'focus-visible:ring-blue-500 focus-visible:ring-offset-white' 
            : 'focus-visible:ring-blue-400 focus-visible:ring-offset-transparent',
          
          // Glass effect - reduced for better readability
          theme === 'light' 
            ? 'backdrop-blur-md backdrop-saturate-[1.2]' 
            : 'backdrop-blur-xl backdrop-saturate-[1.8]',
          
          // Dynamic rounded corners
          liquid ? 'rounded-[1.5rem]' : 'rounded-xl',
          
          // Size and typography
          sizeClasses[size],
          finalStyles.text,
          finalStyles.textShadow,
          'font-bold tracking-wide leading-none',
          
          // Borders and shadows
          `border-2 ${finalStyles.border}`,
          `shadow-lg ${finalStyles.shadow}`,
          
          // Interactive states - enhanced for accessibility
          !disabled && [
            'hover:scale-[1.02] hover:-translate-y-0.5',
            'active:scale-[0.98] active:translate-y-0',
            `hover:shadow-xl hover:${finalStyles.shadow.replace('/20', '/30')}`,
            isFocused && 'scale-[1.01]'
          ],
          
          // Disabled state
          disabled && [
            'opacity-50 cursor-not-allowed',
            'hover:scale-100 hover:translate-y-0',
            'active:scale-100 active:translate-y-0'
          ],
          
          // Z-index stacking
          '[&>*]:relative [&>*]:z-20',
          
          className
        )}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        whileHover={!disabled ? { 
          rotateX: liquid ? 3 : 0,
          rotateY: liquid ? 3 : 0,
        } : {}}
        whileTap={!disabled ? { 
          scale: 0.97,
          rotateX: 0,
          rotateY: 0,
        } : {}}
        whileFocus={{
          scale: 1.01
        }}
        style={{
          transformStyle: 'preserve-3d',
          perspective: '1000px',
        }}
        // Enhanced ARIA attributes
        aria-disabled={disabled}
        role="button"
        tabIndex={disabled ? -1 : 0}
        {...props}
      >
        {/* Main gradient background with better contrast */}
        <div 
          className={cn(
            'absolute inset-0 bg-gradient-to-br transition-all duration-500',
            finalStyles.bg,
            isHovered && !disabled && 'opacity-90',
            isFocused && 'opacity-95'
          )}
        />

        {/* Subtle liquid morphing - reduced for accessibility */}
        {liquid && !highContrast && (
          <div className="absolute inset-[-10%] animate-liquid opacity-30">
            <div className={cn(
              'absolute inset-0 bg-gradient-to-br blur-lg',
              theme === 'light' 
                ? 'from-white/20 via-transparent to-white/10' 
                : 'from-white/[0.1] via-transparent to-white/[0.05]'
            )} />
          </div>
        )}

        {/* Focus ring enhancement */}
        {isFocused && (
          <div className={cn(
            'absolute inset-[-2px] rounded-[inherit] border-2 animate-pulse',
            theme === 'light' ? 'border-blue-500' : 'border-blue-400'
          )} />
        )}

        {/* Subtle shimmer - only if not high contrast */}
        {!highContrast && (isHovered || isFocused) && (
          <motion.div 
            className={cn(
              'absolute inset-0 bg-gradient-to-r mix-blend-overlay pointer-events-none',
              theme === 'light'
                ? 'from-transparent via-white/30 to-transparent'
                : 'from-transparent via-white/[0.15] to-transparent'
            )}
            animate={{
              x: ['0%', '200%'],
            }}
            transition={{
              duration: 1.5,
              ease: 'easeInOut',
            }}
            initial={{
              x: '-100%'
            }}
          />
        )}

        {/* Inner highlight for depth */}
        <div className={cn(
          'absolute inset-[1px] rounded-[inherit] bg-gradient-to-b to-transparent opacity-40',
          theme === 'light' ? 'from-white/60' : 'from-white/[0.12]'
        )} />

        {/* Content with proper contrast */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>

        {/* Loading indicator space */}
        {disabled && (
          <div className="absolute inset-0 bg-black/10 rounded-[inherit] flex items-center justify-center">
            <div className={cn(
              'w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50',
              finalStyles.text
            )} />
          </div>
        )}
      </motion.button>
    );
  }
);

AccessibleLiquidButton.displayName = 'AccessibleLiquidButton';

export { AccessibleLiquidButton };