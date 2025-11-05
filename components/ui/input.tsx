'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type InputAppearance = 'legacy' | 'modern';
type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends React.ComponentProps<'input'> {
  appearance?: InputAppearance;
  size?: InputSize;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, appearance = 'legacy', size = 'md', ...props }, ref) => {
    const baseClasses = [
      'flex w-full transition-[box-shadow,border-color,background-color] duration-200 ease-out',
      'focus-visible:outline-none',
      'file:rounded-lg file:border-0 file:bg-transparent file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground',
      'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none',
    ];

    const sizeClasses: Record<InputSize, string> = {
      sm: 'min-h-[36px] rounded-lg px-3 py-1.5 text-sm',
      md: 'min-h-[42px] rounded-xl px-4 py-2 text-sm',
      lg: 'min-h-[48px] rounded-2xl px-5 py-2.5 text-base',
    };

    const variantClasses: Record<InputAppearance, string> = {
      legacy:
        'liquid-field text-foreground placeholder:text-foreground/55 focus-visible:ring-0 focus-visible:border-white/50 dark:focus-visible:border-white/30',
      modern:
        'rounded-full border border-[#d0d5dd] bg-white/90 text-[#101828] placeholder:text-[#667085] shadow-sm focus-visible:border-[#62e2a2] focus-visible:ring-2 focus-visible:ring-[#62e2a2]/40 hover:shadow-[0_18px_36px_-24px_rgba(16,24,40,0.2)]',
    };

    return (
      <input
        type={type}
        className={cn(
          ...baseClasses,
          sizeClasses[size],
          appearance === 'modern' && size === 'sm' ? 'px-3.5' : null,
          appearance === 'modern' && size === 'lg' ? 'px-6' : null,
          variantClasses[appearance],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input, type InputAppearance, type InputSize, type InputProps };
