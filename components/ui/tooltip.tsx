'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
  delay?: number;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  disabled = false,
  delay = 500,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    if (disabled) return;

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let x = 0;
        let y = 0;

        // Calculate position based on side
        switch (side) {
          case 'top':
            x = rect.left + rect.width / 2;
            y = rect.top;
            break;
          case 'bottom':
            x = rect.left + rect.width / 2;
            y = rect.bottom;
            break;
          case 'left':
            x = rect.left;
            y = rect.top + rect.height / 2;
            break;
          case 'right':
            x = rect.right;
            y = rect.top + rect.height / 2;
            break;
        }

        setPosition({ x, y });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getTooltipClasses = () => {
    const baseClasses = `
      absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg
      pointer-events-none transform transition-all duration-200 ease-out
      ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
    `;

    // Add positioning classes
    let positionClasses = '';
    switch (side) {
      case 'top':
        positionClasses = '-translate-x-1/2 -translate-y-full mb-1';
        break;
      case 'bottom':
        positionClasses = '-translate-x-1/2 translate-y-1 mt-1';
        break;
      case 'left':
        positionClasses = '-translate-x-full -translate-y-1/2 mr-1';
        break;
      case 'right':
        positionClasses = 'translate-x-1 -translate-y-1/2 ml-1';
        break;
    }

    return `${baseClasses} ${positionClasses}`.trim();
  };

  const getArrowClasses = () => {
    const baseClasses = 'absolute w-0 h-0';

    switch (side) {
      case 'top':
        return `${baseClasses} border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 top-full left-1/2 -translate-x-1/2`;
      case 'bottom':
        return `${baseClasses} border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 bottom-full left-1/2 -translate-x-1/2`;
      case 'left':
        return `${baseClasses} border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900 left-full top-1/2 -translate-y-1/2`;
      case 'right':
        return `${baseClasses} border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900 right-full top-1/2 -translate-y-1/2`;
      default:
        return baseClasses;
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={getTooltipClasses()}
            style={{
              left: position.x,
              top: position.y,
            }}
          >
            {content}
            <div className={getArrowClasses()} />
          </div>,
          document.body
        )}
    </>
  );
}

// Componente simplificado para casos comunes
export function SimpleTooltip({
  text,
  children,
  side = 'top',
}: {
  text: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  return (
    <Tooltip
      content={<span className="whitespace-nowrap">{text}</span>}
      side={side}
    >
      {children}
    </Tooltip>
  );
}
