'use client';

import { cn } from '@/lib/utils';

interface BrutalistHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function BrutalistHeader({ children, className }: BrutalistHeaderProps) {
  return (
    <h1
      className={cn(
        'text-6xl font-black leading-none tracking-tighter md:text-8xl lg:text-9xl',
        'select-none text-black',
        'font-mono uppercase',
        // Bubble/organic letter styling
        'drop-shadow-[4px_4px_0px_rgba(0,0,0,0.3)]',
        'transform transition-transform duration-300 hover:scale-105',
        className
      )}
    >
      {children}
    </h1>
  );
}

interface BrutalistTextProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function BrutalistText({
  children,
  className,
  size = 'md',
}: BrutalistTextProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  return (
    <p
      className={cn(
        'font-mono leading-tight text-black',
        sizeClasses[size],
        className
      )}
    >
      {children}
    </p>
  );
}

interface BrutalistSectionHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function BrutalistSectionHeader({
  children,
  className,
}: BrutalistSectionHeaderProps) {
  return (
    <h2
      className={cn(
        'font-mono text-2xl font-black uppercase tracking-wider md:text-4xl',
        'leading-none text-black',
        className
      )}
    >
      {children}
    </h2>
  );
}

interface BrutalistLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function BrutalistLabel({ children, className }: BrutalistLabelProps) {
  return (
    <span
      className={cn(
        'font-mono text-xs uppercase tracking-widest text-gray-600',
        className
      )}
    >
      {children}
    </span>
  );
}
