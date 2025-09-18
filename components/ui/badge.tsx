import * as React from 'react';
import { cn } from '@/lib/utils/cn';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600',
  secondary: 'border-transparent bg-muted text-foreground hover:bg-muted dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
  destructive: 'border-transparent bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
  outline: 'text-foreground border-border bg-transparent hover:bg-muted dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800',
};

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
