'use client';

import React, { Suspense, lazy, ComponentType } from 'react';
import { cn } from '@/lib/utils/cn';

// Loading component
function ComponentLoader({
  message = 'Cargando...',
  className = '',
  showProgress = false,
}: {
  message?: string;
  className?: string;
  showProgress?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="neural-glass-card p-6 text-center">
        <div className="mx-auto mb-4 h-12 w-12">
          {showProgress ? (
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <div className="border-3 h-6 w-6 animate-spin rounded-full border-blue-600 border-t-transparent" />
            </div>
          )}
        </div>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// Error boundary for lazy loaded components
class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="neural-glass-card border-red-200 bg-red-50 p-6 text-center">
            <div className="mb-2 text-red-600">Error al cargar componente</div>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-sm text-blue-600 hover:underline"
            >
              Reintentar
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Optimized lazy loader with options
export function createOptimizedLazy<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    loadingMessage?: string;
    showProgress?: boolean;
    preload?: boolean;
    errorFallback?: React.ReactNode;
  } = {}
) {
  const LazyComponent = lazy(importFn);

  // Preload component if requested
  if (options.preload) {
    importFn();
  }

  return function OptimizedLazyComponent(props: React.ComponentProps<T>) {
    return (
      <LazyErrorBoundary fallback={options.errorFallback}>
        <Suspense
          fallback={
            <ComponentLoader
              message={options.loadingMessage}
              showProgress={options.showProgress}
            />
          }
        >
          <LazyComponent {...props} />
        </Suspense>
      </LazyErrorBoundary>
    );
  };
}

// Pre-defined lazy loaded components for the admin interface
export const LazyAdvancedAnalyticsDashboard = createOptimizedLazy(
  () => import('@/components/admin/AdvancedAnalyticsDashboard'),
  {
    loadingMessage: 'Cargando dashboard de analytics...',
    showProgress: true,
    preload: false,
  }
);

export const LazyEventPreviewModal = createOptimizedLazy(
  () => import('@/components/admin/EventPreviewModal'),
  {
    loadingMessage: 'Cargando vista previa...',
    showProgress: false,
    preload: true, // Preload since it's commonly used
  }
);

export const LazyExportSystem = createOptimizedLazy(
  () => import('@/components/admin/ExportSystem'),
  {
    loadingMessage: 'Cargando sistema de exportación...',
    showProgress: true,
    preload: false,
  }
);

export const LazyNotificationSystem = createOptimizedLazy(
  () => import('@/components/ui/NotificationSystem'),
  {
    loadingMessage: 'Cargando notificaciones...',
    showProgress: false,
    preload: true, // Preload since it's used globally
  }
);

export const LazyKeyboardShortcuts = createOptimizedLazy(
  () => import('@/components/ui/KeyboardShortcuts'),
  {
    loadingMessage: 'Cargando atajos de teclado...',
    showProgress: false,
    preload: true, // Preload since it's used globally
  }
);

export const LazyDragDrop = createOptimizedLazy(
  () => import('@/components/ui/DragDrop'),
  {
    loadingMessage: 'Cargando funcionalidad drag & drop...',
    showProgress: false,
    preload: false,
  }
);

export const LazyAdvancedSearch = createOptimizedLazy(
  () => import('@/components/admin/AdvancedSearch'),
  {
    loadingMessage: 'Cargando búsqueda avanzada...',
    showProgress: false,
    preload: true, // Preload since it's in the header
  }
);

// Component preloader utility
export class ComponentPreloader {
  private static preloadedComponents = new Set<string>();

  static preloadComponent(componentName: string, importFn: () => Promise<any>) {
    if (this.preloadedComponents.has(componentName)) return;

    this.preloadedComponents.add(componentName);

    // Preload on idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        importFn().catch((err) =>
          console.warn(`Failed to preload ${componentName}:`, err)
        );
      });
    } else {
      setTimeout(() => {
        importFn().catch((err) =>
          console.warn(`Failed to preload ${componentName}:`, err)
        );
      }, 100);
    }
  }

  static preloadCriticalComponents() {
    // Preload commonly used components
    this.preloadComponent(
      'EventPreviewModal',
      () => import('@/components/admin/EventPreviewModal')
    );
    this.preloadComponent(
      'NotificationSystem',
      () => import('@/components/ui/NotificationSystem')
    );
    this.preloadComponent(
      'KeyboardShortcuts',
      () => import('@/components/ui/KeyboardShortcuts')
    );
    this.preloadComponent(
      'AdvancedSearch',
      () => import('@/components/admin/AdvancedSearch')
    );
  }
}

// Hook for conditional lazy loading
export function useConditionalLazyLoad<T>(
  condition: boolean,
  importFn: () => Promise<{ default: T }>,
  dependencies: any[] = []
) {
  const [Component, setComponent] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!condition) return;

    setLoading(true);
    setError(null);

    importFn()
      .then((module) => {
        setComponent(() => module.default);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [condition, ...dependencies]);

  return { Component, loading, error };
}

// Intersection-based lazy loading
export function useIntersectionLazyLoad<T>(
  importFn: () => Promise<{ default: T }>,
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement>, T | null, boolean] {
  const ref = React.useRef<HTMLDivElement>(null);
  const [Component, setComponent] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !Component && !loading) {
          setLoading(true);
          importFn()
            .then((module) => {
              setComponent(() => module.default);
              setLoading(false);
            })
            .catch((err) => {
              console.error('Intersection lazy load error:', err);
              setLoading(false);
            });
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
        ...options,
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return [ref, Component, loading];
}

// Bundle analyzer utility
export function analyzeLazyComponents() {
  if (typeof window === 'undefined') return null;

  const scripts = Array.from(document.scripts);
  const lazyChunks = scripts.filter(
    (script) => script.src && script.src.includes('/_next/static/chunks/')
  );

  return {
    totalChunks: lazyChunks.length,
    chunks: lazyChunks.map((script) => ({
      src: script.src,
      size: script.src.length, // Rough estimate
    })),
    recommendation:
      lazyChunks.length > 20
        ? 'Consider consolidating some lazy components'
        : 'Lazy loading is well optimized',
  };
}
