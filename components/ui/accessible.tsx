'use client';

import React, { useEffect, useRef } from 'react';
import {
  handleKeyboardNavigation,
  trapFocus,
  generateId,
  announceToScreenReader,
  manageFocus,
} from '@/lib/utils/accessibility';
import { cn } from '@/lib/utils/cn';

// Skip to content link (must be first focusable element)
export function SkipToContent({
  targetId = 'main-content',
}: {
  targetId?: string;
}) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only transition-all focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-purple-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
    >
      Saltar al contenido principal
    </a>
  );
}

// Accessible button component
interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export function AccessibleButton({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  ariaLabel,
  ariaDescribedBy,
  disabled,
  ...props
}: AccessibleButtonProps) {
  const variants = {
    primary: 'bg-purple-600 text-white hover:bg-purple-700 focus:bg-purple-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:bg-gray-200',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:bg-gray-100',
    outline:
      'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:bg-gray-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled || loading}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}

// Accessible form field wrapper
interface AccessibleFieldProps {
  label: string;
  id?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactElement;
  className?: string;
}

export function AccessibleField({
  label,
  id,
  error,
  hint,
  required = false,
  children,
  className,
}: AccessibleFieldProps) {
  const fieldId = id || generateId('field');
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;

  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-500" aria-label="requerido">
            *
          </span>
        )}
      </label>

      {hint && (
        <p id={hintId} className="text-sm text-gray-600">
          {hint}
        </p>
      )}

      {React.cloneElement(children, {
        id: fieldId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? 'true' : 'false',
        'aria-required': required,
      })}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// Accessible modal/dialog
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const focusManager = useRef(manageFocus()).current;

  useEffect(() => {
    if (isOpen) {
      focusManager.save();

      const cleanup = modalRef.current
        ? trapFocus(modalRef.current)
        : undefined;

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        cleanup?.();
        document.body.style.overflow = '';
        focusManager.restore();
      };
    }
  }, [isOpen, focusManager]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${title}-title`}
      aria-describedby={description ? `${title}-description` : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative max-h-screen w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl',
          className
        )}
      >
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id={`${title}-title`}
              className="text-xl font-semibold text-gray-900"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Cerrar modal"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {description && (
            <p id={`${title}-description`} className="mb-6 text-gray-600">
              {description}
            </p>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}

// Accessible status announcement
interface StatusAnnouncementProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  visible?: boolean;
}

export function StatusAnnouncement({
  message,
  type = 'info',
  visible = true,
}: StatusAnnouncementProps) {
  useEffect(() => {
    if (visible && message) {
      const priority = type === 'error' ? 'assertive' : 'polite';
      announceToScreenReader(message, priority);
    }
  }, [message, type, visible]);

  if (!visible) return null;

  const colors = {
    success: 'text-green-600 bg-green-50 border-green-200',
    error: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-amber-600 bg-amber-50 border-amber-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
  };

  return (
    <div
      role="status"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={cn('rounded-md border p-4 text-sm', colors[type])}
    >
      {message}
    </div>
  );
}

// Accessible progress indicator
interface AccessibleProgressProps {
  value: number;
  max?: number;
  label: string;
  description?: string;
  showPercentage?: boolean;
  className?: string;
}

export function AccessibleProgress({
  value,
  max = 100,
  label,
  description,
  showPercentage = true,
  className,
}: AccessibleProgressProps) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {showPercentage && (
          <span
            className="text-sm text-gray-500"
            aria-label={`${percentage} por ciento completo`}
          >
            {percentage}%
          </span>
        )}
      </div>

      {description && <p className="text-sm text-gray-600">{description}</p>}

      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${value} de ${max}`}
        className="h-2 w-full rounded-full bg-gray-200"
      >
        <div
          className="h-2 rounded-full bg-purple-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Accessible image with proper alt text
interface AccessibleImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  loading?: 'lazy' | 'eager';
  decorative?: boolean;
}

export function AccessibleImage({
  src,
  alt,
  loading = 'lazy',
  decorative = false,
  className,
  ...props
}: AccessibleImageProps) {
  return (
    <img
      src={src}
      alt={decorative ? '' : alt}
      loading={loading}
      aria-hidden={decorative}
      className={cn('transition-opacity duration-200', className)}
      {...props}
    />
  );
}

// Screen reader only text
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
