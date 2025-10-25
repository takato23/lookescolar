import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'liquid-field flex min-h-[112px] w-full rounded-2xl px-4 py-3 text-sm leading-relaxed',
          'transition-[box-shadow,border-color,background-color] duration-200 ease-out',
          'text-foreground placeholder:text-foreground/55',
          'focus-visible:outline-none focus-visible:ring-0 focus-visible:border-white/45 dark:focus-visible:border-white/30',
          'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
