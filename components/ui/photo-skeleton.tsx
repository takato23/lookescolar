'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PhotoSkeletonProps {
  className?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'auto';
  showMeta?: boolean;
}

export function PhotoSkeleton({ 
  className, 
  aspectRatio = 'square',
  showMeta = false 
}: PhotoSkeletonProps) {
  const aspectClasses = {
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]',
    auto: 'h-32'
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className={cn(
        'rounded-lg overflow-hidden bg-muted',
        aspectClasses[aspectRatio]
      )}>
        <Skeleton className="w-full h-full" />
      </div>
      {showMeta && (
        <div className="space-y-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      )}
    </div>
  );
}

interface PhotoGridSkeletonProps {
  count?: number;
  className?: string;
  itemClassName?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'auto';
  showMeta?: boolean;
}

export function PhotoGridSkeleton({
  count = 12,
  className,
  itemClassName,
  aspectRatio = 'square',
  showMeta = false
}: PhotoGridSkeletonProps) {
  return (
    <div className={cn(
      'grid gap-4',
      'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
      className
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <PhotoSkeleton
          key={i}
          className={itemClassName}
          aspectRatio={aspectRatio}
          showMeta={showMeta}
        />
      ))}
    </div>
  );
}

interface MasonrySkeletonProps {
  count?: number;
  className?: string;
}

export function MasonryPhotoSkeleton({ count = 12, className }: MasonrySkeletonProps) {
  // Heights for varied masonry effect
  const heights = [
    'h-48', 'h-64', 'h-56', 'h-72', 'h-52', 'h-60', 
    'h-68', 'h-44', 'h-80', 'h-56', 'h-64', 'h-48'
  ];

  return (
    <div className={cn(
      'columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4',
      className
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="break-inside-avoid mb-4">
          <Skeleton className={cn(
            'w-full rounded-lg',
            heights[i % heights.length]
          )} />
        </div>
      ))}
    </div>
  );
}

interface ProductCardSkeletonProps {
  className?: string;
}

export function ProductCardSkeleton({ className }: ProductCardSkeletonProps) {
  return (
    <div className={cn('space-y-4 p-6 border rounded-lg', className)}>
      <div className="flex items-center justify-center">
        <Skeleton className="w-16 h-16 rounded-full" />
      </div>
      <div className="text-center space-y-2">
        <Skeleton className="h-6 w-24 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-8 w-20 mx-auto" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

interface ProductGridSkeletonProps {
  count?: number;
  className?: string;
}

export function ProductGridSkeleton({ count = 3, className }: ProductGridSkeletonProps) {
  return (
    <div className={cn(
      'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8',
      className
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}