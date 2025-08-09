'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Menu, X } from 'lucide-react';
import { Button } from './button';

interface LayoutResponsiveProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

export function LayoutResponsive({
  sidebar,
  children,
  header,
  className,
}: LayoutResponsiveProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false); // Close mobile sidebar on desktop
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, sidebarOpen]);

  return (
    <div
      className={clsx(
        'min-h-screen bg-neutral-50',
        'lg:grid lg:grid-cols-[auto_1fr]', // Desktop: sidebar + main
        className
      )}
    >
      {/* Mobile Header */}
      {isMobile && (
        <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                icon={<Menu className="h-5 w-5" />}
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir navegación"
                className="touch-target-lg"
              />
              <h1 className="text-title font-semibold text-neutral-900">
                LookEscolar
              </h1>
            </div>
            {header && <div className="flex items-center gap-2">{header}</div>}
          </div>
        </header>
      )}

      {/* Sidebar - Mobile Overlay */}
      {isMobile && (
        <>
          {/* Backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-50 bg-neutral-900/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Mobile Sidebar */}
          <aside
            className={clsx(
              'fixed left-0 top-0 z-50 h-full w-80 max-w-[85vw] transform transition-transform duration-300 ease-in-out lg:hidden',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}
            aria-label="Navegación principal"
            role="navigation"
          >
            {/* Close button */}
            <div className="absolute right-4 top-4 z-10">
              <Button
                variant="ghost"
                size="sm"
                icon={<X className="h-5 w-5" />}
                onClick={() => setSidebarOpen(false)}
                aria-label="Cerrar navegación"
                className="touch-target-lg bg-white/90 shadow-sm backdrop-blur-sm"
              />
            </div>

            {/* Sidebar content */}
            <div className="scrollbar-thin h-full overflow-y-auto">
              {sidebar}
            </div>
          </aside>
        </>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className="hidden lg:block"
          aria-label="Navegación principal"
          role="navigation"
        >
          {sidebar}
        </aside>
      )}

      {/* Main Content */}
      <main className="min-w-0 flex-1">
        {/* Desktop Header */}
        {!isMobile && header && (
          <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">{header}</div>
            </div>
          </header>
        )}

        {/* Content Area */}
        <div
          className={clsx(
            'px-4 py-6', // Mobile padding
            'sm:px-6', // Small screen padding
            'lg:px-8 lg:py-8' // Desktop padding
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

// Hook for managing responsive sidebar state
export function useResponsiveSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [sidebarOpen]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return {
    sidebarOpen,
    setSidebarOpen,
    isMobile,
    toggleSidebar,
    closeSidebar,
  };
}
