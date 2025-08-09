'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  loading = false,
}: StatsCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
            <div className="h-8 w-16 animate-pulse rounded bg-neutral-200" />
            <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
          </div>
          <div className="h-10 w-10 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 transition-shadow duration-200 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-600">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-semibold text-neutral-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {trend && (
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-neutral-500">{description}</p>
          )}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-50">
            <Icon className="h-5 w-5 text-neutral-600" />
          </div>
        )}
      </div>
    </div>
  );
}
