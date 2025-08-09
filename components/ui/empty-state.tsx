'use client';

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="px-6 py-12 text-center">
      {Icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100">
          <Icon className="h-6 w-6 text-neutral-400" />
        </div>
      )}

      <h3 className="mb-2 text-lg font-semibold text-neutral-900">{title}</h3>

      {description && (
        <p className="mx-auto mb-6 max-w-sm text-neutral-600">{description}</p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className={`rounded-lg px-4 py-2 font-medium transition-colors duration-200 ${
            action.variant === 'primary'
              ? 'bg-neutral-900 text-white hover:bg-neutral-800'
              : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200'
          }`}
        >
          {action.label}
        </button>
      )}

      {children}
    </div>
  );
}
