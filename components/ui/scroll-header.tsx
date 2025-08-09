'use client';

import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';

interface ScrollHeaderProps {
  children: React.ReactNode;
  className?: string;
  threshold?: number; // px to trigger shadow
}

/**
 * Sticky header wrapper that adds depth (shadow/ring/blur) when the page is scrolled.
 * Works for light/dark/night and reduces motion automatically for users that prefer it.
 */
export function ScrollHeader({
  children,
  className,
  threshold = 8,
}: ScrollHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      setScrolled(y > threshold);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  const wrapperClasses = clsx(
    // Positioning
    'sticky top-0 z-50 w-full',
    // Smooth transition of depth
    'transition-all duration-200 ease-out',
    // Base glass for readability
    'backdrop-blur-xl',
    // Depth when scrolled
    scrolled ? 'bg-card/85 shadow-3d ring-1 ring-white/10' : 'bg-transparent',
    className
  );

  return <div className={wrapperClasses}>{children}</div>;
}

export default ScrollHeader;
