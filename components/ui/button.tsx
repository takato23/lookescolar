import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'default'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'danger'
    | 'success'
    | 'glass'
    | 'link'
    | 'minimal';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      icon,
      iconPosition = 'left',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Base classes with accessibility and premium styling
    const baseClasses = [
      // Layout and interaction
      'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-out',
      'relative overflow-hidden group transform-gpu will-change-transform',

      // Accessibility - WCAG AA compliance
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'focus-visible:ring-primary-500',

      // Disabled states
      'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none',
      'disabled:shadow-none',

      // Touch target compliance (44px minimum)
      'touch-target',

      // Typography enhancement
      'text-center leading-tight tracking-normal',

      // Interactive states
      'active:scale-[0.98] active:transition-transform active:duration-75',
    ].join(' ');

    // Variant styles with AAA compliant colors
    const variants = {
      primary: [
        // Background and colors using AAA compliant values
        'bg-gradient-to-b from-primary-600 to-primary-700 text-white border border-primary-700',
        'hover:from-primary-600 hover:to-primary-800 hover:border-primary-800 hover:shadow-3d hover:-translate-y-0.5',
        'active:from-primary-700 active:to-primary-900 active:translate-y-0 active:shadow-md',
        'focus-visible:ring-primary-500',

        // Enhanced shadow for depth
        'shadow-3d-sm hover:shadow-3d active:shadow-sm',
      ].join(' '),

      default: [
        // Mirror primary but slightly softer
        'bg-gradient-to-b from-primary-500 to-primary-600 text-white border border-primary-600',
        'hover:from-primary-500 hover:to-primary-700 hover:border-primary-700 hover:shadow-3d hover:-translate-y-0.5',
        'active:from-primary-600 active:to-primary-800 active:translate-y-0 active:shadow-md',
        'focus-visible:ring-primary-500',
        'shadow-3d-sm',
      ].join(' '),

      secondary: [
        'bg-white/90 text-primary-700 border border-primary-200 backdrop-blur',
        'hover:bg-white hover:border-primary-300 hover:text-primary-800 hover:shadow-3d-sm',
        'active:bg-primary-100 active:border-primary-400',
        'focus-visible:ring-primary-500',
        'shadow-3d-sm',
      ].join(' '),

      outline: [
        'bg-transparent text-neutral-800 dark:text-neutral-200 border border-neutral-300',
        'hover:bg-neutral-50/70 hover:border-neutral-400 hover:text-neutral-900',
        'active:bg-neutral-100 active:border-neutral-500',
        'focus-visible:ring-neutral-500',
      ].join(' '),

      ghost: [
        'bg-transparent text-neutral-800 dark:text-neutral-200 border border-transparent',
        'hover:bg-neutral-100/70 hover:text-neutral-900',
        'active:bg-neutral-200',
        'focus-visible:ring-neutral-500',
      ].join(' '),

      danger: [
        'bg-error-strong text-white border border-error-strong', // Using AAA compliant error color
        'hover:bg-error-700 hover:border-error-700 hover:shadow-lg hover:-translate-y-0.5',
        'active:bg-error-800 active:translate-y-0 active:shadow-md',
        'focus-visible:ring-error-500',
        'shadow-md hover:shadow-lg active:shadow-sm',
      ].join(' '),

      success: [
        'bg-success-strong text-white border border-success-strong', // Using AAA compliant success color
        'hover:bg-success-700 hover:border-success-700 hover:shadow-lg hover:-translate-y-0.5',
        'active:bg-success-800 active:translate-y-0 active:shadow-md',
        'focus-visible:ring-success-500',
        'shadow-md hover:shadow-lg active:shadow-sm',
      ].join(' '),

      glass: [
        'glass text-neutral-800 border border-white/20',
        'hover:bg-white/20 hover:border-white/30 hover:shadow-lg hover:-translate-y-1',
        'active:bg-white/10 active:translate-y-0',
        'focus-visible:ring-white/50',
        'backdrop-blur-lg',
      ].join(' '),

      link: [
        'bg-transparent text-primary-700 underline underline-offset-4 decoration-primary-300',
        'hover:text-primary-800 hover:decoration-primary-400',
        'active:text-primary-900',
        'focus-visible:ring-primary-500',
        'p-0 h-auto min-h-0',
      ].join(' '),

      minimal: [
        'bg-transparent text-neutral-700 border border-transparent',
        'hover:bg-neutral-50 hover:text-neutral-900',
        'active:bg-neutral-100',
        'focus-visible:ring-neutral-500',
      ].join(' '),
    };

    // Size styles with proper touch targets
    const sizes = {
      xs: 'px-2 py-1.5 text-xs rounded-md gap-1 min-h-[32px] h-8', // Compact controls for móvil
      sm: 'px-3 py-2 text-sm rounded-md gap-1.5 min-h-[40px]', // Slightly smaller but still accessible
      md: 'px-4 py-2.5 text-sm rounded-lg gap-2 min-h-[44px]', // WCAG AA minimum
      lg: 'px-6 py-3 text-base rounded-lg gap-2 min-h-[48px]', // Comfortable
      xl: 'px-8 py-4 text-lg rounded-xl gap-3 min-h-[52px]', // Desktop optimized
    } as const;

    const buttonClasses = clsx(
      baseClasses,
      variants[variant],
      sizes[size],
      {
        'w-full': fullWidth,
        'cursor-wait pointer-events-none': loading,
        'flex-row-reverse': iconPosition === 'right',
      },
      className
    );

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <div className="spinner-sm" aria-label="Loading" role="status" />
        )}

        {/* Icon */}
        {icon && !loading && (
          <span className="flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}

        {/* Button content */}
        {children && (
          <span
            className={clsx('min-w-0 flex-1', {
              truncate: typeof children === 'string',
            })}
          >
            {children}
          </span>
        )}

        {/* Shine effect for premium feel */}
        {(variant === 'primary' ||
          variant === 'danger' ||
          variant === 'success') && (
          <div className="absolute inset-0 -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, type ButtonProps };
