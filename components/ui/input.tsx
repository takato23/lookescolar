import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'liquid-field flex w-full rounded-xl px-4 py-2 text-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out',
          'min-h-[42px] text-foreground placeholder:text-foreground/55',
          'focus-visible:outline-none focus-visible:ring-0 focus-visible:border-white/50 dark:focus-visible:border-white/30',
          'file:rounded-lg file:border-0 file:bg-transparent file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground',
          'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
