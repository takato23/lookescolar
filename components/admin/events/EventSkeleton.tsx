'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const EventGridSkeleton = () => (
  <Card className="flex h-full flex-col border border-border/60 bg-card/80">
    <CardHeader className="space-y-4 border-none pb-0">
      <div className="space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </CardHeader>
    <CardContent className="flex flex-1 flex-col gap-3 p-6">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>
    </CardContent>
    <CardFooter className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/20 p-4">
      <Skeleton className="h-9 w-28" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </CardFooter>
  </Card>
);

export const EventListSkeleton = () => (
  <Card className="flex items-center gap-4 border border-border/60 bg-card/80 px-4 py-3">
    <Skeleton className="hidden h-20 w-20 rounded-xl sm:block" />
    <div className="flex flex-1 flex-col gap-3">
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </div>
    </div>
    <div className="flex flex-shrink-0 items-center gap-2">
      <Skeleton className="hidden h-9 w-28 sm:block" />
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="h-9 w-20" />
    </div>
  </Card>
);
