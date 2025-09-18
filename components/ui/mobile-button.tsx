'use client';

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface MobileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  loadingText?: string;
  haptic?: boolean; // Enable haptic feedback on touch devices
  children: ReactNode;
}

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      isLoading = false,
      loadingText,
      haptic = true,
      className,
      children,
      onClick,
      disabled,
      ...props
    },
    ref
  ) => {
    const { isTouchDevice } = useMobileDetection();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Haptic feedback for touch devices
      if (haptic && isTouchDevice && navigator.vibrate) {
        navigator.vibrate(10); // Light haptic feedback
      }

      if (onClick && !disabled && !isLoading) {
        onClick(e);
      }
    };

    const getVariantClasses = () => {
      switch (variant) {
        case 'primary':
          return 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700 hover:border-primary-700 active:bg-primary-800 shadow-lg hover:shadow-xl';
        case 'secondary':
          return 'bg-muted text-foreground border-border hover:bg-muted hover:border-border active:bg-gray-300';
        case 'outline':
          return 'bg-transparent text-primary-600 border-primary-600 hover:bg-primary-50 active:bg-primary-100';
        case 'ghost':
          return 'bg-transparent text-foreground border-transparent hover:bg-muted active:bg-muted';
        case 'destructive':
          return 'bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700 active:bg-red-800 shadow-lg hover:shadow-xl';
        default:
          return 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700 hover:border-primary-700 active:bg-primary-800';
      }
    };

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'mobile-touch-target px-3 py-2 text-sm font-medium rounded-lg';
        case 'md':
          return 'mobile-touch-target px-4 py-3 text-base font-medium rounded-xl';
        case 'lg':
          return 'mobile-touch-target px-6 py-4 text-lg font-semibold rounded-xl';
        case 'xl':
          return 'mobile-touch-target px-8 py-5 text-xl font-bold rounded-2xl';
        default:
          return 'mobile-touch-target px-4 py-3 text-base font-medium rounded-xl';
      }
    };

    const buttonContent = (
      <>
        {isLoading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="mr-2 h-5 w-5 rounded-full border-2 border-current border-t-transparent"
            />
            {loadingText || 'Cargando...'}
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span className="mr-2 flex-shrink-0">{icon}</span>
            )}
            <span className="flex-1 truncate">{children}</span>
            {icon && iconPosition === 'right' && (
              <span className="ml-2 flex-shrink-0">{icon}</span>
            )}
          </>
        )}
      </>
    );

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        className={clsx(
          'relative flex items-center justify-center border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          'select-none', // Prevent text selection on mobile
          getSizeClasses(),
          getVariantClasses(),
          className
        )}
        onClick={handleClick}
        disabled={disabled || isLoading}
        {...props}
      >
        {buttonContent}
      </motion.button>
    );
  }
);

MobileButton.displayName = 'MobileButton';

// Floating Action Button for mobile
interface MobileFABProps {
  icon: ReactNode;
  onClick: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export function MobileFAB({
  icon,
  onClick,
  position = 'bottom-right',
  variant = 'primary',
  size = 'lg',
  className,
  disabled = false,
}: MobileFABProps) {
  const { isMobileView } = useMobileDetection();

  if (!isMobileView) {
    return null;
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right':
        return 'bottom-20 right-4';
      case 'bottom-left':
        return 'bottom-20 left-4';
      case 'bottom-center':
        return 'bottom-20 left-1/2 -translate-x-1/2';
      default:
        return 'bottom-20 right-4';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-600 text-white shadow-lg hover:bg-primary-700 active:bg-primary-800';
      case 'secondary':
        return 'bg-white text-foreground shadow-lg hover:bg-muted active:bg-muted border border-border';
      default:
        return 'bg-primary-600 text-white shadow-lg hover:bg-primary-700 active:bg-primary-800';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'md':
        return 'h-14 w-14';
      case 'lg':
        return 'h-16 w-16';
      default:
        return 'h-16 w-16';
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'fixed z-40 flex items-center justify-center rounded-full transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'safe-area-padding',
        getPositionClasses(),
        getVariantClasses(),
        getSizeClasses(),
        className
      )}
    >
      {icon}
    </motion.button>
  );
}

// Button Group for mobile
interface MobileButtonGroupProps {
  children: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function MobileButtonGroup({
  children,
  orientation = 'horizontal',
  className,
}: MobileButtonGroupProps) {
  return (
    <div
      className={clsx(
        'flex gap-2',
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        className
      )}
    >
      {children}
    </div>
  );
}

// Icon Button optimized for mobile
interface MobileIconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline' | 'filled';
  label?: string; // For accessibility
}

export const MobileIconButton = forwardRef<
  HTMLButtonElement,
  MobileIconButtonProps
>(
  (
    { icon, size = 'md', variant = 'ghost', label, className, ...props },
    ref
  ) => {
    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'h-10 w-10 p-2';
        case 'md':
          return 'h-12 w-12 p-3';
        case 'lg':
          return 'h-14 w-14 p-4';
        default:
          return 'h-12 w-12 p-3';
      }
    };

    const getVariantClasses = () => {
      switch (variant) {
        case 'ghost':
          return 'bg-transparent text-muted-foreground hover:bg-muted active:bg-muted';
        case 'outline':
          return 'bg-transparent text-muted-foreground border border-border hover:bg-muted active:bg-muted';
        case 'filled':
          return 'bg-muted text-foreground hover:bg-muted active:bg-gray-300';
        default:
          return 'bg-transparent text-muted-foreground hover:bg-muted active:bg-muted';
      }
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.95 }}
        className={clsx(
          'flex items-center justify-center rounded-xl transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'mobile-touch-target',
          getSizeClasses(),
          getVariantClasses(),
          className
        )}
        aria-label={label}
        {...props}
      >
        {icon}
      </motion.button>
    );
  }
);

MobileIconButton.displayName = 'MobileIconButton';
