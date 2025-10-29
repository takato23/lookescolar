import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';

type CardVariant =
  | 'default'
  | 'surface'
  | 'glass'
  | 'glass-strong'
  | 'glass-ios26'
  | 'elevated'
  | 'outlined'
  | 'floating'
  | 'modern';

type CardTone = 'accent' | 'muted';
type ModernCardTone = 'neutral' | 'brand' | 'tinted';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
  glow?: boolean;
  noise?: boolean;
  modernTone?: ModernCardTone;
}

interface VariantStyle {
  className: string;
  tone?: CardTone;
  dataVariant?: 'ghost';
  hover?: boolean;
}

const variantStyles: Record<Exclude<CardVariant, 'modern'>, VariantStyle> = {
  default: {
    className:
      'liquid-glass text-foreground shadow-[0_26px_64px_-32px_rgba(16,24,40,0.35)]',
    tone: 'muted',
    dataVariant: 'ghost',
  },
  surface: {
    className:
      'liquid-surface text-foreground shadow-[0_20px_54px_-28px_rgba(16,24,40,0.32)]',
    tone: 'muted',
  },
  glass: {
    className:
      'liquid-glass text-foreground shadow-[0_28px_68px_-32px_rgba(16,24,40,0.34)]',
    tone: 'muted',
  },
  'glass-strong': {
    className:
      'liquid-glass-intense text-foreground shadow-[0_32px_88px_-30px_rgba(72,97,255,0.42)]',
    tone: 'accent',
  },
  'glass-ios26': {
    className:
      'liquid-glass-intense text-foreground shadow-[0_32px_92px_-30px_rgba(91,111,255,0.46)]',
    tone: 'accent',
  },
  elevated: {
    className:
      'liquid-glass-intense text-foreground shadow-[0_36px_96px_-28px_rgba(72,97,255,0.48)]',
    tone: 'accent',
    hover: true,
  },
  outlined: {
    className:
      'liquid-glass text-foreground border border-white/15 dark:border-white/10 shadow-[0_22px_58px_-32px_rgba(16,24,40,0.35)]',
    tone: 'muted',
    dataVariant: 'ghost',
  },
  floating: {
    className:
      'liquid-glass-intense text-foreground shadow-[0_40px_110px_-36px_rgba(91,111,255,0.5)]',
    tone: 'accent',
    hover: true,
  },
};

const modernVariantStyles: Record<ModernCardTone, VariantStyle> = {
  neutral: {
    className:
      'bg-white/95 text-[#101828] border border-[#d0d5dd] shadow-[0_24px_48px_-32px_rgba(16,24,40,0.18)] backdrop-blur-sm',
    tone: 'muted',
  },
  brand: {
    className:
      'bg-[#1f2a44] text-white shadow-[0_36px_80px_-36px_rgba(16,24,40,0.7)] border border-transparent',
    tone: 'accent',
    hover: true,
  },
  tinted: {
    className:
      'bg-[#f5f7fa] text-[#101828] border border-[#d0d5dd]/70 shadow-[0_30px_60px_-34px_rgba(16,24,40,0.15)]',
    tone: 'muted',
  },
};

const glowByTone: Record<CardTone, string> = {
  accent: 'shadow-[0_0_90px_rgba(91,111,255,0.32)]',
  muted: 'shadow-[0_0_75px_rgba(148,163,184,0.28)]',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      interactive,
      glow,
      noise,
      modernTone = 'neutral',
      children,
      ...props
    },
    ref
  ) => {
    const config =
      variant === 'modern'
        ? modernVariantStyles[modernTone]
        : variantStyles[variant];

    const baseClasses =
      'relative transition-all duration-300 rounded-2xl overflow-hidden';

    const shouldElevate = interactive || config.hover;

    const interactiveClasses = clsx(
      shouldElevate && 'liquid-hover liquid-raise',
      interactive && 'cursor-pointer'
    );

    const glowClasses =
      glow && config.tone ? glowByTone[config.tone] : undefined;

    const cardClasses = clsx(
      baseClasses,
      config.className,
      interactiveClasses,
      glowClasses,
      {
        noise: noise,
      },
      className
    );

    return (
      <div
        ref={ref}
        className={cardClasses}
        data-liquid-tone={config.tone}
        data-liquid-variant={config.dataVariant}
        {...props}
      >
        {noise && (
          <div className="noise rounded-inherit pointer-events-none absolute inset-0" />
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  gradient?: boolean;
  divider?: boolean;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, gradient, divider = true, children, ...props }, ref) => {
    const baseClasses = 'px-6 py-4 relative';
    const dividerClasses = divider ? 'border-b border-border' : '';
    const gradientClasses = gradient
      ? 'bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-950 dark:to-secondary-950'
      : '';

    return (
      <div
        ref={ref}
        className={clsx(
          baseClasses,
          dividerClasses,
          gradientClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding = 'md', ...props }, ref) => {
    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'px-6 py-4',
      lg: 'px-8 py-6',
      xl: 'px-10 py-8',
    };

    return (
      <div
        ref={ref}
        className={clsx(paddingClasses[padding], className)}
        {...props}
      />
    );
  }
);

CardContent.displayName = 'CardContent';

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  divider?: boolean;
  actions?: boolean;
}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, divider = true, actions, ...props }, ref) => {
    const baseClasses = 'px-6 py-4';
    const dividerClasses = divider ? 'border-t border-border' : '';
    const actionsClasses = actions ? 'flex items-center justify-end gap-3' : '';

    return (
      <div
        ref={ref}
        className={clsx(baseClasses, dividerClasses, actionsClasses, className)}
        {...props}
      />
    );
  }
);

CardFooter.displayName = 'CardFooter';

// Additional Card Components

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  gradient?: boolean;
}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = 'h3', gradient, children, ...props }, ref) => {
    const baseClasses = 'font-semibold leading-tight tracking-tight';
    const gradientClasses = gradient
      ? 'text-gradient-primary'
      : 'text-foreground';

    return (
      <Component
        ref={ref}
        className={clsx(baseClasses, gradientClasses, className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

CardTitle.displayName = 'CardTitle';

type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={clsx(
        'text-muted-foreground text-sm leading-relaxed',
        className
      )}
      {...props}
    />
  )
);

CardDescription.displayName = 'CardDescription';

// Specialized Card Variants

interface StatsCardProps extends CardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: ReactNode;
}

const StatsCard = forwardRef<HTMLDivElement, StatsCardProps>(
  (
    {
      title,
      value,
      description,
      trend,
      trendValue,
      icon,
      className,
      variant = 'glass',
      ...props
    },
    ref
  ) => {
    const trendColors = {
      up: 'text-green-600 bg-green-50 border-green-200',
      down: 'text-red-600 bg-red-50 border-red-200',
      neutral: 'text-muted-foreground bg-muted border-border',
    };

    // Special handling for glass-ios26 variant
    const isGlassIOS26 = variant === 'glass-ios26';

    return (
      <Card
        ref={ref}
        variant={variant}
        className={clsx('p-6', className)}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p
              className={clsx(
                'text-sm font-medium',
                isGlassIOS26 ? 'text-foreground/80' : 'text-muted-foreground'
              )}
            >
              {title}
            </p>
            <p
              className={clsx(
                'mt-1 text-3xl font-bold',
                isGlassIOS26 ? 'text-foreground' : 'text-foreground'
              )}
            >
              {value}
            </p>
            {description && (
              <p
                className={clsx(
                  'mt-1 text-sm',
                  isGlassIOS26 ? 'text-foreground/70' : 'text-muted-foreground'
                )}
              >
                {description}
              </p>
            )}
          </div>

          {icon && (
            <div
              className={clsx(
                'ml-4 rounded-lg p-2',
                isGlassIOS26
                  ? 'text-foreground bg-white/10'
                  : 'bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400'
              )}
            >
              {icon}
            </div>
          )}
        </div>

        {trend && trendValue && (
          <div
            className={clsx(
              'mt-3 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
              trendColors[trend],
              isGlassIOS26 && 'backdrop-blur-sm'
            )}
          >
            {trend === 'up' && '↗'}
            {trend === 'down' && '↘'}
            {trend === 'neutral' && '→'}
            <span className="ml-1">{trendValue}</span>
          </div>
        )}
      </Card>
    );
  }
);

StatsCard.displayName = 'StatsCard';

export {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
  StatsCard,
  type CardProps,
  type StatsCardProps,
  type ModernCardTone,
};
