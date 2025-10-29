'use client';

import * as React from 'react';
import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  anchorRef: React.RefObject<HTMLDivElement>;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(
  null
);

interface DropdownMenuProps {
  children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, anchorRef }}>
      <div ref={anchorRef} className="relative inline-block">{children}</div>
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

export interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  onClick?: (event: React.MouseEvent) => void;
}

export function DropdownMenuContent({
  children,
  className,
  align = 'center',
  side = 'bottom',
  sideOffset = 0,
  onClick,
}: DropdownMenuContentProps) {
  const context = useContext(DropdownMenuContext);
  if (!context)
    throw new Error('DropdownMenuContent must be used within DropdownMenu');

  const { open, setOpen, anchorRef } = context;
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

  // Compute portal-based positioning to avoid clipping by overflow contexts
  const anchorRect = anchorRef.current?.getBoundingClientRect();
  const usePortal = true;

  const positionStyles: React.CSSProperties = {};
  const transform: string[] = [];
  if (anchorRect) {
    // Vertical position
    if (side === 'top') {
      positionStyles.top = anchorRect.top;
      transform.push('translateY(-100%)');
    } else if (side === 'bottom') {
      positionStyles.top = anchorRect.bottom + sideOffset; // configurable offset
    } else if (side === 'left') {
      positionStyles.top = anchorRect.top + anchorRect.height / 2;
      transform.push('translateY(-50%)');
    } else if (side === 'right') {
      positionStyles.top = anchorRect.top + anchorRect.height / 2;
      transform.push('translateY(-50%)');
    }
    // Horizontal position
    if (align === 'start') {
      positionStyles.left = anchorRect.left;
    } else if (align === 'center') {
      positionStyles.left = anchorRect.left + anchorRect.width / 2;
      transform.push('translateX(-50%)');
    } else if (align === 'end') {
      positionStyles.left = anchorRect.right;
      transform.push('translateX(-100%)');
    }
  }

  const content = (
    <div
      ref={contentRef}
      className={cn(
        'min-w-[10rem] overflow-hidden rounded-xl p-2',
        'glass-ultra shadow-3d border border-white/10 ring-1 ring-white/10 drop-shadow-xl backdrop-blur-xl',
        'transform-gpu will-change-transform z-[9999]',
        className
      )}
      style={{ transform: transform.join(' '), ...(!usePortal && { position: 'absolute' }) }}
      onClick={onClick}
    >
      {children}
    </div>
  );

  if (usePortal) {
    return createPortal(
      <div
        className={cn(
          'fixed inset-0 pointer-events-none z-[9999]'
        )}
        aria-hidden="false"
      >
        <div
          className={cn('pointer-events-auto')}
          style={{ position: 'fixed', ...positionStyles }}
        >
          {content}
        </div>
      </div>,
      document.body
    );
  }

  // Fallback to inline absolute positioning
  return (
    <div
      className={cn(
        'absolute z-[9999]',
        alignClasses[align],
        sideClasses[side]
      )}
    >
      {content}
    </div>
  );
}

export interface DropdownMenuItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
  onSelect?: (event: React.MouseEvent) => void;
  disabled?: boolean;
  asChild?: boolean;
}

export function DropdownMenuItem({
  children,
  className,
  onClick,
  onSelect,
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
    onSelect?.(event);
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

// Additional components for compatibility
export function DropdownMenuLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('px-2.5 py-1.5 text-sm font-semibold', className)}>
      {children}
    </div>
  );
}

export function DropdownMenuShortcut({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('ml-auto text-xs tracking-widest opacity-60', className)}>
      {children}
    </span>
  );
}

export function DropdownMenuSub({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export function DropdownMenuSubTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DropdownMenuItem className={cn('cursor-pointer', className)}>
      {children}
    </DropdownMenuItem>
  );
}

export function DropdownMenuSubContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DropdownMenuContent className={className}>
      {children}
    </DropdownMenuContent>
  );
}
