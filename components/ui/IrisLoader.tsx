'use client';

import { cn } from '@/lib/utils';

interface IrisLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

/**
 * IrisLoader - Photo Design System loading spinner
 * Inspired by camera aperture/iris mechanism
 * Lightweight CSS animation (~1KB)
 */
export function IrisLoader({ size = 'md', className, label }: IrisLoaderProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className={cn('photo-spinner-iris', sizeClasses[size])} role="status" aria-label={label || 'Cargando'}>
        <span className="sr-only">{label || 'Cargando...'}</span>
      </div>
      {label && (
        <span className="text-sm text-zinc-400 animate-pulse">{label}</span>
      )}
    </div>
  );
}

/**
 * IrisLoaderOverlay - Full screen loading overlay with iris animation
 */
export function IrisLoaderOverlay({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <IrisLoader size="lg" label={label} />
    </div>
  );
}

/**
 * IrisLoaderInline - Inline loader for buttons and small spaces
 */
export function IrisLoaderInline({ className }: { className?: string }) {
  return (
    <div className={cn('photo-spinner-iris w-4 h-4', className)} role="status">
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export default IrisLoader;
