'use client';

import * as React from 'react';
import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(
  null
);

interface DropdownMenuProps {
  children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function DropdownMenuTrigger({
  asChild,
  children,
  className,
}: DropdownMenuTriggerProps) {
  const context = useContext(DropdownMenuContext);
  if (!context)
    throw new Error('DropdownMenuTrigger must be used within DropdownMenu');

  const { open, setOpen } = context;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
      'aria-expanded': open,
      'aria-haspopup': 'true',
      className: cn(children.props.className, className),
    });
  }

  return (
    <button
      onClick={handleClick}
      aria-expanded={open}
      aria-haspopup="true"
      className={cn('outline-none', className)}
    >
      {children}
    </button>
  );
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function DropdownMenuContent({
  children,
  className,
  align = 'center',
  side = 'bottom',
}: DropdownMenuContentProps) {
  const context = useContext(DropdownMenuContext);
  if (!context)
    throw new Error('DropdownMenuContent must be used within DropdownMenu');

  const { open, setOpen } = context;
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, setOpen]);

  if (!open) return null;

  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  const sideClasses = {
    top: 'bottom-full mb-2',
    right: 'left-full ml-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
  };

  return (
    <div
      ref={contentRef}
      className={cn(
        // Container & layout
        'absolute z-50 min-w-[10rem] overflow-hidden rounded-xl p-2',
        // Depth & glass effect
        'glass-ultra shadow-3d border border-white/10 ring-1 ring-white/10 drop-shadow-xl backdrop-blur-xl',
        // Animation
        'animate-slide-down transform-gpu will-change-transform',
        alignClasses[align],
        sideClasses[side],
        className
      )}
    >
      {children}
    </div>
  );
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
  disabled?: boolean;
  asChild?: boolean;
}

export function DropdownMenuItem({
  children,
  className,
  onClick,
  disabled = false,
  asChild = false,
}: DropdownMenuItemProps) {
  const context = useContext(DropdownMenuContext);
  if (!context)
    throw new Error('DropdownMenuItem must be used within DropdownMenu');

  const { setOpen } = context;

  const handleClick = (event: React.MouseEvent) => {
    if (disabled) return;

    onClick?.(event);
    setOpen(false);
  };

  const itemClasses = cn(
    'group relative flex cursor-pointer select-none items-center rounded-md px-2.5 py-2 text-sm outline-none',
    // Motion & depth
    'transition-all duration-150 ease-out hover:-translate-y-[1px] active:translate-y-0',
    'hover:shadow-3d-sm active:shadow-sm',
    // Color states (preserve brand accent) + subtle blur for depth
    'focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground backdrop-blur-sm',
    // Focus ring accessibility
    'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
    disabled && 'pointer-events-none opacity-50',
    className
  );

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
      className: cn(children.props.className, itemClasses),
    });
  }

  return (
    <button onClick={handleClick} disabled={disabled} className={itemClasses}>
      {children}
    </button>
  );
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

export function DropdownMenuSeparator({
  className,
}: DropdownMenuSeparatorProps) {
  return (
    <div
      className={cn('bg-border my-1 h-px', className)}
      role="separator"
      aria-orientation="horizontal"
    />
  );
}
