/**
 * Apple-Grade Button Component
 * Sophisticated interactions with haptic feedback, age-appropriate theming, and accessibility excellence
 */

'use client';

import React, { forwardRef, ReactNode } from 'react';
import { motion, MotionProps, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  buttonVariants,
  type ButtonVariants,
} from '@/lib/design-system/variants';
import {
  buttonVariants as animationVariants,
  springConfig,
  subtleSpring,
} from '@/lib/design-system/animations';

interface AppleGradeButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'size'>,
    ButtonVariants {
  children: ReactNode;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  ageGroup?: 'kindergarten' | 'elementary' | 'secondary';
  hapticFeedback?: boolean;
  soundFeedback?: boolean;
  glowEffect?: boolean;
  tooltip?: string;
  badge?: string | number;
  pulse?: boolean;
  gradient?: boolean;
}

// Haptic feedback simulation for web
const triggerHapticFeedback = (
  type: 'light' | 'medium' | 'heavy' = 'light'
) => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    };
    navigator.vibrate(patterns[type]);
  }
};

// Sound feedback for interactions
const playClickSound = (pitch: 'high' | 'medium' | 'low' = 'medium') => {
  if ('AudioContext' in window) {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    const frequencies = {
      high: 800,
      medium: 600,
      low: 400,
    };

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequencies[pitch];
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.1
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }
};

// Age-appropriate styling configurations
const ageConfigurations = {
  kindergarten: {
    soundPitch: 'high' as const,
    hapticType: 'light' as const,
    animationStyle: 'playful',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    shadowColor: 'rgba(251, 191, 36, 0.3)',
  },
  elementary: {
    soundPitch: 'medium' as const,
    hapticType: 'medium' as const,
    animationStyle: 'bouncy',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    shadowColor: 'rgba(59, 130, 246, 0.3)',
  },
  secondary: {
    soundPitch: 'low' as const,
    hapticType: 'heavy' as const,
    animationStyle: 'subtle',
    glowColor: 'rgba(107, 114, 128, 0.4)',
    shadowColor: 'rgba(107, 114, 128, 0.3)',
  },
};

// Loading spinner component
const LoadingSpinner = ({ size = 16 }: { size?: number }) => (
  <motion.svg
    className="animate-spin"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeDasharray="32"
      strokeDashoffset="32"
    />
  </motion.svg>
);

export const AppleGradeButton = forwardRef<
  HTMLButtonElement,
  AppleGradeButtonProps
>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'default',
      rounded = 'default',
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      ageGroup = 'elementary',
      hapticFeedback = true,
      soundFeedback = false,
      glowEffect = false,
      tooltip,
      badge,
      pulse = false,
      gradient = false,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const ageConfig = ageConfigurations[ageGroup];
    const isDisabled = disabled || loading;

    // Handle click with feedback
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return;

      // Haptic feedback
      if (hapticFeedback) {
        triggerHapticFeedback(ageConfig.hapticType);
      }

      // Sound feedback
      if (soundFeedback) {
        playClickSound(ageConfig.soundPitch);
      }

      onClick?.(event);
    };

    // Dynamic variant selection based on age group
    const getAgeVariant = () => {
      if (variant === 'primary') {
        switch (ageGroup) {
          case 'kindergarten':
            return 'kindergarten';
          case 'elementary':
            return 'elementary';
          case 'secondary':
            return 'secondary_school';
          default:
            return variant;
        }
      }
      return variant;
    };

    // Glow effect styles
    const glowStyles = glowEffect
      ? {
          boxShadow: `0 0 20px ${ageConfig.glowColor}, 0 0 40px ${ageConfig.glowColor}`,
        }
      : {};

    // Pulse animation
    const pulseAnimation = pulse
      ? {
          animate: {
            scale: [1, 1.05, 1],
            transition: {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          },
        }
      : {};

    return (
      <motion.button
        ref={ref}
        className={cn(
          buttonVariants({
            variant: getAgeVariant() as any,
            size,
            rounded,
          }),
          'relative overflow-hidden',
          gradient &&
            'bg-size-200 hover:bg-pos-100 bg-gradient-to-r from-current to-current',
          className
        )}
        style={glowStyles}
        variants={animationVariants}
        initial="initial"
        whileHover={!isDisabled ? 'hover' : undefined}
        whileTap={!isDisabled ? 'tap' : undefined}
        disabled={isDisabled}
        onClick={handleClick}
        title={tooltip}
        {...pulseAnimation}
        {...props}
      >
        {/* Gradient overlay for enhanced visual effect */}
        {gradient && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300"
            whileHover={{ opacity: 1 }}
          />
        )}

        {/* Button content */}
        <div className="relative flex items-center justify-center gap-2">
          {/* Left icon or loading spinner */}
          {loading ? (
            <LoadingSpinner
              size={size === 'sm' ? 12 : size === 'lg' ? 20 : 16}
            />
          ) : leftIcon ? (
            <span className="flex-shrink-0">{leftIcon}</span>
          ) : null}

          {/* Button text */}
          <span
            className={cn(
              'font-medium transition-all duration-200',
              loading && 'opacity-70'
            )}
          >
            {loading && loadingText ? loadingText : children}
          </span>

          {/* Right icon */}
          {!loading && rightIcon && (
            <span className="flex-shrink-0">{rightIcon}</span>
          )}
        </div>

        {/* Badge */}
        {badge && (
          <motion.span
            className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={springConfig}
          >
            {badge}
          </motion.span>
        )}

        {/* Ripple effect */}
        <motion.div
          className="rounded-inherit absolute inset-0"
          whileTap={{
            background:
              'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
          }}
          transition={{ duration: 0.6 }}
        />
      </motion.button>
    );
  }
);

AppleGradeButton.displayName = 'AppleGradeButton';

// Specialized button variants for common use cases

// FAB (Floating Action Button)
export const FAB = forwardRef<
  HTMLButtonElement,
  Omit<AppleGradeButtonProps, 'variant' | 'size'>
>(({ className, ...props }, ref) => (
  <AppleGradeButton
    ref={ref}
    variant="primary"
    size="icon"
    rounded="full"
    className={cn(
      'fixed bottom-6 right-6 z-50 h-14 w-14 shadow-lg',
      'hover:scale-110 hover:shadow-xl',
      className
    )}
    glowEffect
    hapticFeedback
    {...props}
  />
));

FAB.displayName = 'FAB';

// Icon button
export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<AppleGradeButtonProps, 'children'> & {
    icon: ReactNode;
    label: string;
  }
>(({ icon, label, className, ...props }, ref) => (
  <AppleGradeButton
    ref={ref}
    size="icon"
    variant="ghost"
    className={cn('rounded-full', className)}
    tooltip={label}
    {...props}
  >
    {icon}
  </AppleGradeButton>
));

IconButton.displayName = 'IconButton';

// Social login button
export const SocialButton = forwardRef<
  HTMLButtonElement,
  AppleGradeButtonProps & {
    provider: 'google' | 'facebook' | 'apple' | 'github';
  }
>(({ provider, children, className, ...props }, ref) => {
  const providerStyles = {
    google: 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
    facebook: 'bg-blue-600 text-white hover:bg-blue-700',
    apple: 'bg-black text-white hover:bg-gray-900',
    github: 'bg-gray-900 text-white hover:bg-gray-800',
  };

  return (
    <AppleGradeButton
      ref={ref}
      variant="secondary"
      className={cn(providerStyles[provider], className)}
      {...props}
    >
      {children}
    </AppleGradeButton>
  );
});

SocialButton.displayName = 'SocialButton';

export default AppleGradeButton;
