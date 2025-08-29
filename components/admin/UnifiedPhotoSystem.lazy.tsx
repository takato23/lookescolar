'use client';

import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy components
const UnifiedPhotoSystemCore = lazy(() =>
  import('./UnifiedPhotoSystem').then((module) => ({
    default: module.UnifiedPhotoSystem,
  }))
);

// Lightweight loading skeleton
const UnifiedPhotoSystemSkeleton = () => (
  <div className="h-screen space-y-4 p-6">
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>

    {/* Filters skeleton */}
    <div className="flex flex-wrap gap-2">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-10 w-24" />
    </div>

    {/* Grid skeleton */}
    <div className="grid grid-cols-4 gap-4 md:grid-cols-6 lg:grid-cols-8">
      {Array.from({ length: 24 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  </div>
);

interface UnifiedPhotoSystemProps {
  className?: string;
  enableUpload?: boolean;
  enableBulkOperations?: boolean;
}

export function UnifiedPhotoSystemLazy(props: UnifiedPhotoSystemProps) {
  return (
    <Suspense fallback={<UnifiedPhotoSystemSkeleton />}>
      <UnifiedPhotoSystemCore {...props} />
    </Suspense>
  );
}

export default UnifiedPhotoSystemLazy;
