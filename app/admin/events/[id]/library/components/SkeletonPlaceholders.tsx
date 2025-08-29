'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

// Base skeleton animation
const skeletonBaseClass =
  'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]';

interface SkeletonItemProps {
  style: React.CSSProperties;
  type: 'folder' | 'photo';
}

// Skeleton for individual grid items
export const SkeletonGridItem = memo<SkeletonItemProps>(({ style, type }) => (
  <div style={style} className="p-2">
    <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white">
      {type === 'folder' ? <SkeletonFolderContent /> : <SkeletonPhotoContent />}
    </div>
  </div>
));

SkeletonGridItem.displayName = 'SkeletonGridItem';

// Skeleton for folder items
const SkeletonFolderContent = memo(() => (
  <div className="flex h-full flex-col p-4">
    <div className="flex flex-1 items-center justify-center">
      <div className={cn(skeletonBaseClass, 'h-12 w-12 rounded')} />
    </div>

    <div className="mt-2 space-y-2">
      <div className={cn(skeletonBaseClass, 'h-4 w-3/4 rounded')} />
      <div className={cn(skeletonBaseClass, 'h-3 w-1/2 rounded')} />
    </div>
  </div>
));

SkeletonFolderContent.displayName = 'SkeletonFolderContent';

// Skeleton for photo items
const SkeletonPhotoContent = memo(() => (
  <div className="flex h-full flex-col">
    {/* Image area */}
    <div className="relative flex-1 overflow-hidden rounded-t-lg bg-gray-100">
      <div className={cn(skeletonBaseClass, 'absolute inset-0')} />
    </div>

    {/* Photo info */}
    <div className="space-y-1 rounded-b-lg bg-white p-2">
      <div className={cn(skeletonBaseClass, 'h-3 w-4/5 rounded')} />
      <div className={cn(skeletonBaseClass, 'h-3 w-2/3 rounded')} />
    </div>
  </div>
));

SkeletonPhotoContent.displayName = 'SkeletonPhotoContent';

// Skeleton for folder tree items
export const SkeletonTreeItem = memo<{ level?: number }>(({ level = 0 }) => (
  <div
    className="flex items-center gap-1 px-2 py-1"
    style={{ paddingLeft: `${level * 16 + 8}px` }}
  >
    <div className="h-4 w-4 flex-shrink-0">
      <div className={cn(skeletonBaseClass, 'h-3 w-3 rounded')} />
    </div>

    <div className="flex-shrink-0">
      <div className={cn(skeletonBaseClass, 'h-4 w-4 rounded')} />
    </div>

    <div className="min-w-0 flex-1">
      <div className={cn(skeletonBaseClass, 'h-4 w-3/4 rounded')} />
    </div>

    <div className="flex-shrink-0">
      <div className={cn(skeletonBaseClass, 'h-4 w-6 rounded')} />
    </div>
  </div>
));

SkeletonTreeItem.displayName = 'SkeletonTreeItem';

// Skeleton for breadcrumb
export const SkeletonBreadcrumb = memo(() => (
  <div className="flex items-center gap-2">
    <div className={cn(skeletonBaseClass, 'h-4 w-4 rounded')} />
    <div className={cn(skeletonBaseClass, 'h-4 w-32 rounded')} />
    <div className={cn(skeletonBaseClass, 'h-3 w-3 rounded')} />
    <div className={cn(skeletonBaseClass, 'h-4 w-24 rounded')} />
  </div>
));

SkeletonBreadcrumb.displayName = 'SkeletonBreadcrumb';

// Skeleton for details panel
export const SkeletonDetailsPanel = memo(() => (
  <div className="space-y-4 p-4">
    {/* Image preview */}
    <div className="aspect-square overflow-hidden rounded-lg">
      <div className={cn(skeletonBaseClass, 'h-full w-full')} />
    </div>

    {/* Title */}
    <div className="space-y-2">
      <div className={cn(skeletonBaseClass, 'h-5 w-4/5 rounded')} />
      <div className={cn(skeletonBaseClass, 'h-4 w-3/5 rounded')} />
    </div>

    {/* Properties */}
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between">
          <div className={cn(skeletonBaseClass, 'h-4 w-1/3 rounded')} />
          <div className={cn(skeletonBaseClass, 'h-4 w-1/4 rounded')} />
        </div>
      ))}
    </div>

    {/* Actions */}
    <div className="space-y-2">
      <div className={cn(skeletonBaseClass, 'h-9 w-full rounded')} />
      <div className={cn(skeletonBaseClass, 'h-9 w-full rounded')} />
    </div>
  </div>
));

SkeletonDetailsPanel.displayName = 'SkeletonDetailsPanel';

// Skeleton for content grid loading state
export const SkeletonContentGrid = memo<{
  columnCount: number;
  rowCount: number;
  itemSize: number;
}>(({ columnCount, rowCount, itemSize }) => {
  const items = [];

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < columnCount; col++) {
      const index = row * columnCount + col;
      if (index >= 20) break; // Limit to 20 skeleton items

      items.push(
        <SkeletonGridItem
          key={`skeleton-${index}`}
          type={Math.random() > 0.7 ? 'folder' : 'photo'} // Mix folders and photos
          style={{
            position: 'absolute',
            left: col * itemSize,
            top: row * itemSize,
            width: itemSize,
            height: itemSize,
          }}
        />
      );
    }
  }

  return <div className="relative">{items}</div>;
});

SkeletonContentGrid.displayName = 'SkeletonContentGrid';

// Skeleton for header stats
export const SkeletonHeaderStats = memo(() => (
  <div className="flex items-center gap-4">
    <div className={cn(skeletonBaseClass, 'h-4 w-24 rounded')} />
    <div className={cn(skeletonBaseClass, 'h-4 w-16 rounded')} />
  </div>
));

SkeletonHeaderStats.displayName = 'SkeletonHeaderStats';

// Skeleton for upload progress
export const SkeletonUploadItem = memo(() => (
  <div className="flex items-center gap-3 border-b border-gray-100 p-3">
    <div className={cn(skeletonBaseClass, 'h-8 w-8 rounded')} />

    <div className="flex-1 space-y-2">
      <div className={cn(skeletonBaseClass, 'h-4 w-3/4 rounded')} />
      <div className={cn(skeletonBaseClass, 'h-2 w-full rounded')} />
    </div>

    <div className={cn(skeletonBaseClass, 'h-5 w-5 rounded-full')} />
  </div>
));

SkeletonUploadItem.displayName = 'SkeletonUploadItem';
