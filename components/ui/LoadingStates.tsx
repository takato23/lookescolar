/**
 * Loading States Components
 *
 * Consistent and engaging loading states throughout the application
 * Maintains simplicity while providing clear feedback
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Image,
  ShoppingCart,
  Package,
  CreditCard,
} from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2
      className={cn('text-primary animate-spin', sizeClasses[size], className)}
    />
  );
}

interface LoadingCardProps {
  className?: string;
}

export function LoadingCard({ className }: LoadingCardProps) {
  return (
    <div className={cn('space-y-3 rounded-lg border p-4', className)}>
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-3/4 rounded bg-muted"></div>
        <div className="h-3 w-1/2 rounded bg-muted"></div>
        <div className="h-20 rounded bg-muted"></div>
      </div>
    </div>
  );
}

interface LoadingGalleryProps {
  count?: number;
  className?: string;
}

export function LoadingGallery({ count = 12, className }: LoadingGalleryProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="aspect-square animate-pulse rounded-lg bg-muted"
        />
      ))}
    </div>
  );
}

interface LoadingScreenProps {
  title?: string;
  description?: string;
  type?: 'gallery' | 'store' | 'payment' | 'processing';
  className?: string;
}

export function LoadingScreen({
  title,
  description,
  type = 'gallery',
  className,
}: LoadingScreenProps) {
  const getIconByType = () => {
    switch (type) {
      case 'gallery':
        return <Image className="text-primary/30 h-16 w-16" />;
      case 'store':
        return <ShoppingCart className="text-primary/30 h-16 w-16" />;
      case 'payment':
        return <CreditCard className="text-primary/30 h-16 w-16" />;
      case 'processing':
        return <Package className="text-primary/30 h-16 w-16" />;
      default:
        return <Loader2 className="text-primary/30 h-16 w-16" />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'gallery':
        return 'Cargando galería...';
      case 'store':
        return 'Preparando tienda...';
      case 'payment':
        return 'Procesando pago...';
      case 'processing':
        return 'Procesando...';
      default:
        return 'Cargando...';
    }
  };

  const getDefaultDescription = () => {
    switch (type) {
      case 'gallery':
        return 'Preparando tus fotos';
      case 'store':
        return 'Configurando opciones de compra';
      case 'payment':
        return 'Conectando con MercadoPago';
      case 'processing':
        return 'Por favor espera';
      default:
        return 'Un momento por favor';
    }
  };

  return (
    <div
      className={cn(
        'flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50',
        className
      )}
    >
      <div className="mx-auto max-w-sm space-y-6 px-4 text-center">
        {/* Icon */}
        <div className="flex justify-center">{getIconByType()}</div>

        {/* Spinner */}
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {title || getDefaultTitle()}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {description || getDefaultDescription()}
          </p>
        </div>

        {/* Progress bar (animated) */}
        <div className="h-1 w-full rounded-full bg-muted">
          <div className="bg-primary h-1 animate-pulse rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  label,
  showPercentage = true,
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn('space-y-2', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm">
          {label && <span className="text-gray-500 dark:text-gray-400">{label}</span>}
          {showPercentage && (
            <span className="font-medium text-foreground">
              {clampedValue.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({
  steps,
  currentStep,
  className,
}: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center space-x-4', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <React.Fragment key={step}>
            <div className="flex items-center">
              {/* Step circle */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all duration-300',
                  isCompleted && 'bg-primary text-white',
                  isCurrent &&
                    'bg-primary/20 text-primary border-primary border-2',
                  isUpcoming && 'bg-muted text-gray-400'
                )}
              >
                {isCompleted ? (
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>

              {/* Step label */}
              <span
                className={cn(
                  'ml-2 hidden text-sm font-medium sm:block',
                  isCompleted && 'text-primary',
                  isCurrent && 'text-primary',
                  isUpcoming && 'text-gray-400'
                )}
              >
                {step}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-8 transition-all duration-300',
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-primary h-2 w-2 animate-bounce rounded-full"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

interface PulseLoaderProps {
  count?: number;
  className?: string;
}

export function PulseLoader({ count = 3, className }: PulseLoaderProps) {
  return (
    <div className={cn('flex space-x-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-primary h-3 w-3 animate-pulse rounded-full"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}
