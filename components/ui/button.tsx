import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

type ButtonVariant =
  | 'primary'
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'glass'
  | 'glass-ios26'
  | 'link'
  | 'minimal';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

type LiquidStyle = 'glass' | 'intense';

interface VariantConfig {
  className: string;
  liquidStyle?: LiquidStyle;
  tone?: 'accent' | 'muted' | 'success' | 'danger' | 'warning';
  dataVariant?: 'ghost';
  halo?: string;
}

const variantConfig: Record<ButtonVariant, VariantConfig> = {
  primary: {
    liquidStyle: 'intense',
    tone: 'accent',
    halo:
      'radial-gradient(circle, rgba(91, 111, 255, 0.48) 0%, rgba(91, 111, 255, 0) 62%)',
    className:
      'text-white shadow-[0_26px_60px_-30px_rgba(72,97,255,0.68)] hover:shadow-[0_36px_88px_-28px_rgba(72,97,255,0.78)]',
  },
  default: {
    liquidStyle: 'intense',
    tone: 'accent',
    halo:
      'radial-gradient(circle, rgba(91, 111, 255, 0.42) 0%, rgba(91, 111, 255, 0) 60%)',
    className:
      'text-white/95 shadow-[0_24px_58px_-30px_rgba(64,87,255,0.62)] hover:shadow-[0_34px_82px_-28px_rgba(64,87,255,0.75)]',
  },
  secondary: {
    liquidStyle: 'glass',
    tone: 'muted',
    halo:
      'radial-gradient(circle, rgba(148, 163, 184, 0.35) 0%, rgba(148, 163, 184, 0) 60%)',
    className:
      'text-slate-900 dark:text-slate-100 shadow-[0_20px_48px_-28px_rgba(15,23,42,0.32)] hover:shadow-[0_26px_66px_-30px_rgba(15,23,42,0.45)]',
  },
  outline: {
    liquidStyle: 'glass',
    tone: 'muted',
    dataVariant: 'ghost',
    halo:
      'radial-gradient(circle, rgba(148, 163, 184, 0.28) 0%, rgba(148, 163, 184, 0) 58%)',
    className:
      'text-slate-900 dark:text-slate-100 border border-white/20 hover:border-white/35 dark:border-white/10 dark:hover:border-white/20',
  },
  ghost: {
    liquidStyle: 'glass',
    tone: 'muted',
    dataVariant: 'ghost',
    halo:
      'radial-gradient(circle, rgba(148, 163, 184, 0.22) 0%, rgba(148, 163, 184, 0) 60%)',
    className:
      'text-slate-900 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white',
  },
  danger: {
    liquidStyle: 'intense',
    tone: 'danger',
    halo:
      'radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, rgba(239, 68, 68, 0) 62%)',
    className:
      'text-white shadow-[0_26px_60px_-30px_rgba(181,44,85,0.62)] hover:shadow-[0_36px_92px_-28px_rgba(210,60,102,0.74)]',
  },
  success: {
    liquidStyle: 'intense',
    tone: 'success',
    halo:
      'radial-gradient(circle, rgba(34, 197, 94, 0.48) 0%, rgba(34, 197, 94, 0) 62%)',
    className:
      'text-white shadow-[0_26px_60px_-30px_rgba(16,145,102,0.58)] hover:shadow-[0_36px_92px_-28px_rgba(22,166,120,0.7)]',
  },
  glass: {
    liquidStyle: 'glass',
    tone: 'muted',
    halo:
      'radial-gradient(circle, rgba(91, 111, 255, 0.32) 0%, rgba(91, 111, 255, 0) 58%)',
    className:
      'text-slate-900 dark:text-slate-100 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.32)] hover:shadow-[0_30px_70px_-30px_rgba(64,87,255,0.38)]',
  },
  'glass-ios26': {
    liquidStyle: 'intense',
    tone: 'accent',
    halo:
      'radial-gradient(circle, rgba(91, 111, 255, 0.48) 0%, rgba(91, 111, 255, 0) 60%)',
    className:
      'text-white shadow-[0_28px_72px_-30px_rgba(91,111,255,0.68)] hover:shadow-[0_36px_92px_-28px_rgba(99,122,255,0.78)]',
  },
  link: {
    className:
      'bg-transparent p-0 h-auto min-h-0 text-primary-600 underline underline-offset-6 decoration-transparent hover:decoration-primary-400 hover:text-primary-500 focus-visible:ring-0',
  },
  minimal: {
    className:
      'bg-transparent border border-transparent text-slate-800 dark:text-slate-200 hover:bg-white/10 hover:text-slate-950 dark:hover:bg-white/5 dark:hover:text-white focus-visible:ring-0',
  },
};

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
    const config = variantConfig[variant];
    const isLiquid = Boolean(config.liquidStyle);
    const liquidClass =
      config.liquidStyle === 'intense'
        ? 'liquid-glass-intense'
        : config.liquidStyle === 'glass'
          ? 'liquid-glass'
          : '';

    const baseClasses = [
      'group relative inline-flex items-center justify-center gap-2 font-medium',
      'tracking-tight text-center leading-tight',
      'select-none whitespace-nowrap',
      'overflow-hidden transform-gpu will-change-transform',
      'transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out',
      'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
      'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
      'touch-target',
    ].join(' ');

    const sizes = {
      xs: 'rounded-full px-3 py-1.5 text-xs min-h-[36px]',
      sm: 'rounded-full px-3.5 py-2 text-sm min-h-[40px]',
      md: 'rounded-full px-5 py-2.5 text-sm min-h-[44px]',
      lg: 'rounded-full px-6 py-3 text-base min-h-[48px]',
      xl: 'rounded-full px-8 py-3.5 text-lg min-h-[54px]',
    } as const;

    const buttonClasses = clsx(
      baseClasses,
      liquidClass,
      isLiquid && 'liquid-hover liquid-raise',
      config.className,
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
        data-liquid-tone={config.tone}
        data-liquid-variant={config.dataVariant}
        disabled={disabled || loading}
        {...props}
      >
        {/* Liquid halo */}
        {isLiquid && (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] opacity-40 transition-opacity duration-300 ease-out group-hover:opacity-80"
              style={{ backgroundImage: config.halo }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] bg-[linear-gradient(105deg,transparent_45%,rgba(255,255,255,0.28)_52%,transparent_65%)] bg-[length:220%_120%] opacity-0 transition-[opacity,transform] duration-500 group-hover:opacity-100 group-hover:translate-x-[4%]"
            />
          </>
        )}

        {/* Loading spinner */}
        {loading && (
          <div
            className="spinner-sm relative z-10"
            aria-label="Loading"
            role="status"
          />
        )}

        {/* Icon */}
        {icon && !loading && (
          <span className="relative z-10 flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}

        {/* Button content */}
        {children && (
          <span
            className={clsx('relative z-10 min-w-0 flex-1', {
              truncate: typeof children === 'string',
            })}
          >
            {children}
          </span>
        )}

        {/* Outer refracted halo */}
        {isLiquid && config.halo && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[22%] z-[-1] rounded-[inherit] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30"
            style={{ backgroundImage: config.halo }}
          />
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, type ButtonProps };
