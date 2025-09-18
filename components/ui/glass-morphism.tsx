'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion, MotionProps } from 'framer-motion';

// Glass Card Component with enhanced morphism
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement>, Partial<MotionProps> {
  variant?: 'default' | 'elevated' | 'interactive' | 'colorful';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  gradient?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', blur = 'md', gradient = false, children, ...props }, ref) => {
    const blurClasses = {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-lg',
      xl: 'backdrop-blur-xl',
    };

    const variantClasses = {
      default: 'bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/20',
      elevated: 'bg-white/80 dark:bg-gray-900/80 border-white/30 dark:border-gray-700/30 shadow-2xl',
      interactive: 'bg-white/75 dark:bg-gray-900/75 border-white/25 dark:border-gray-700/25 hover:bg-white/85 hover:shadow-3xl transition-all duration-300',
      colorful: 'bg-gradient-to-br from-white/60 via-white/50 to-purple-50/40 dark:from-gray-900/60 dark:via-gray-900/50 dark:to-purple-900/40 border-white/30 dark:border-purple-700/30',
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          'rounded-2xl border',
          blurClasses[blur],
          variantClasses[variant],
          'shadow-xl',
          gradient && 'bg-gradient-to-br from-white/80 to-white/60',
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        {...props}
      >
        {gradient && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none" />
        )}
        {children}
      </motion.div>
    );
  }
);
GlassCard.displayName = 'GlassCard';

// Glass Button Component with modern effects
interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = 'default', size = 'md', glow = false, children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-6 text-base',
      lg: 'h-14 px-8 text-lg',
    };

    const variantClasses = {
      default: 'bg-white/70 hover:bg-white/85 text-gray-900 border-white/30',
      primary: 'bg-indigo-500/80 hover:bg-indigo-500/90 text-white border-indigo-400/30',
      secondary: 'bg-purple-500/80 hover:bg-purple-500/90 text-white border-purple-400/30',
      ghost: 'bg-transparent hover:bg-white/20 text-gray-900 dark:text-white border-transparent',
      gradient: 'bg-gradient-to-r from-indigo-500/80 to-purple-500/80 hover:from-indigo-500/90 hover:to-purple-500/90 text-white border-white/20',
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          'rounded-xl border backdrop-blur-md font-medium transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-95',
          sizeClasses[size],
          variantClasses[variant],
          glow && 'shadow-lg hover:shadow-indigo-500/25',
          className
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
GlassButton.displayName = 'GlassButton';

// Glass Panel Component for sidebars and panels
interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'left' | 'right' | 'top' | 'bottom';
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, side = 'left', children, ...props }, ref) => {
    const sideClasses = {
      left: 'left-0 top-0 h-full border-r',
      right: 'right-0 top-0 h-full border-l',
      top: 'top-0 left-0 w-full border-b',
      bottom: 'bottom-0 left-0 w-full border-t',
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          'fixed backdrop-blur-xl bg-white/70 dark:bg-gray-900/70',
          'border-white/20 dark:border-gray-700/20',
          'shadow-2xl z-40',
          sideClasses[side],
          className
        )}
        initial={{ opacity: 0, x: side === 'left' ? -100 : side === 'right' ? 100 : 0 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: side === 'left' ? -100 : side === 'right' ? 100 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
GlassPanel.displayName = 'GlassPanel';

// Glass Input Component
interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, icon, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-xl border backdrop-blur-md',
            'bg-white/50 dark:bg-gray-900/50',
            'border-white/30 dark:border-gray-700/30',
            'px-4 py-3 text-gray-900 dark:text-white',
            'placeholder:text-gray-500 dark:placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            'transition-all duration-200',
            icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
GlassInput.displayName = 'GlassInput';

// Glass Modal Backdrop
export const GlassBackdrop: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 backdrop-blur-xl bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
    />
  );
};

// Animated Gradient Background
export const GradientBackground: React.FC<{ variant?: 'aurora' | 'sunset' | 'ocean' }> = ({ 
  variant = 'aurora' 
}) => {
  const gradients = {
    aurora: 'from-purple-400 via-pink-500 to-indigo-500',
    sunset: 'from-orange-400 via-pink-500 to-purple-500',
    ocean: 'from-blue-400 via-cyan-500 to-teal-500',
  };

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className={cn(
          'absolute -inset-[100%] opacity-30',
          'bg-gradient-to-br',
          gradients[variant]
        )}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50" />
    </div>
  );
};

// Floating Animation Wrapper
export const FloatingWrapper: React.FC<{ children: React.ReactNode; delay?: number }> = ({ 
  children, 
  delay = 0 
}) => {
  return (
    <motion.div
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    >
      {children}
    </motion.div>
  );
};

// Shimmer Loading Effect
export const ShimmerEffect: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
};