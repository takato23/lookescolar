'use client';

import { cn } from '@/lib/utils';
import type React from 'react';

// Props del componente Skeleton
type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('bg-muted/50 animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

// Skeleton específico para stats cards
export function StatsCardSkeleton() {
  return (
    <div className="bg-glass border-glass rounded-xl border p-6 backdrop-blur-md">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
        <Skeleton className="h-8 w-16" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

// Skeleton para activity items
export function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

// Skeleton para performance metrics
export function PerformanceItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-6 w-12" />
    </div>
  );
}

// Skeleton para la sección completa de actividad
export function ActivityFeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton para la sección completa de performance
export function PerformanceSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <PerformanceItemSkeleton key={i} />
      ))}
    </div>
  );
}
