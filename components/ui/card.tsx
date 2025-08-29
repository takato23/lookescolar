import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'surface'
    | 'glass'
    | 'glass-strong'
    | 'glass-ios26' // New iOS 26 liquid glass variant
    | 'elevated'
    | 'outlined'
    | 'floating';
  interactive?: boolean;
  glow?: boolean;
  noise?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      interactive,
      glow,
      noise,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'relative transition-all duration-300';

    const variants = {
      default: [
        'bg-card text-card-foreground',
        'border border-border',
        'shadow-soft',
        'rounded-lg',
      ].join(' '),

      surface: [
        'bg-surface text-foreground',
        'border border-border',
        'shadow-soft',
        'rounded-lg',
      ].join(' '),

      glass: ['glass-card text-foreground', 'rounded-xl', 'shadow-glass'].join(
        ' '
      ),

      'glass-strong': [
        'bg-gradient-to-br from-glass-white-strong to-glass-white',
        'backdrop-blur-lg border border-glass-border',
        'shadow-glass text-foreground',
        'rounded-xl',
      ].join(' '),

      // New iOS 26 liquid glass variant
      'glass-ios26': [
        'liquid-glass-card-ios26 text-foreground',
        'rounded-2xl',
        'shadow-glass',
        'transition-all duration-300',
      ].join(' '),

      elevated: [
        'bg-card text-card-foreground',
        'border border-border',
        'shadow-large hover:shadow-xl',
        'rounded-xl',
        'hover:-translate-y-1',
      ].join(' '),

      outlined: [
        'bg-transparent text-foreground',
        'border-2 border-border',
        'hover:border-primary-500/50',
        'rounded-lg',
      ].join(' '),

      floating: [
        'glass-card text-foreground',
        'shadow-glass hover:shadow-glow-strong',
        'rounded-2xl',
        'hover:-translate-y-2 hover:rotate-1',
        'animate-float',
      ].join(' '),
    };

    const interactiveClasses = interactive
      ? 'cursor-pointer hover:-translate-y-1 hover:shadow-large active:translate-y-0 active:shadow-medium'
      : '';

    const glowClasses = glow ? 'animate-glow' : '';

    const cardClasses = clsx(
      baseClasses,
      variants[variant],
      interactiveClasses,
      glowClasses,
      {
        noise: noise,
      },
      className
    );

    return (
      <div ref={ref} className={cardClasses} {...props}>
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
      neutral: 'text-gray-600 bg-gray-50 border-gray-200',
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
};
