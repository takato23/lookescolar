'use client';

import { cn } from '@/lib/utils';

interface BrutalistHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function BrutalistHeader({ children, className }: BrutalistHeaderProps) {
  return (
    <h1 className={cn(
      "text-6xl md:text-8xl lg:text-9xl font-black leading-none tracking-tighter",
      "text-black select-none",
      "font-mono uppercase",
      // Bubble/organic letter styling
      "drop-shadow-[4px_4px_0px_rgba(0,0,0,0.3)]",
      "transform hover:scale-105 transition-transform duration-300",
      className
    )}>
      {children}
    </h1>
  );
}

interface BrutalistTextProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function BrutalistText({ children, className, size = 'md' }: BrutalistTextProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return (
    <p className={cn(
      "font-mono text-black leading-tight",
      sizeClasses[size],
      className
    )}>
      {children}
    </p>
  );
}

interface BrutalistSectionHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function BrutalistSectionHeader({ children, className }: BrutalistSectionHeaderProps) {
  return (
    <h2 className={cn(
      "text-2xl md:text-4xl font-black font-mono uppercase tracking-wider",
      "text-black leading-none",
      className
    )}>
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
    <span className={cn(
      "text-xs font-mono uppercase tracking-widest text-gray-600",
      className
    )}>
      {children}
    </span>
  );
}