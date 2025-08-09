'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface QuickActionProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

const variants = {
  default: 'bg-neutral-50 hover:bg-neutral-100 text-neutral-900',
  primary: 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200',
  success: 'bg-green-50 hover:bg-green-100 text-green-900 border-green-200',
  warning: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-900 border-yellow-200',
};

const iconVariants = {
  default: 'text-neutral-600',
  primary: 'text-blue-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
};

export function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  variant = 'default',
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className={`group block rounded-lg border p-6 transition-all duration-200 hover:shadow-sm ${variants[variant]}`}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-neutral-200 bg-white transition-transform duration-200 group-hover:scale-105">
            <Icon className={`h-6 w-6 ${iconVariants[variant]}`} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-lg font-semibold transition-colors group-hover:text-opacity-80">
            {title}
          </h3>
          <p className="text-sm opacity-75">{description}</p>
        </div>
      </div>
    </Link>
  );
}
