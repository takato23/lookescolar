'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const DashboardSkeleton = React.memo(function DashboardSkeleton() {
  return (
    <div className="bg-background min-h-screen">
      {/* Header Skeleton */}
      <div className="border-border bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="bg-muted h-8 w-48 animate-pulse rounded" />
              <div className="bg-muted mt-2 h-4 w-64 animate-pulse rounded" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-muted h-9 w-32 animate-pulse rounded" />
            <div className="bg-muted h-9 w-40 animate-pulse rounded" />
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* Quick Actions Skeleton - Mobile */}
        <div className="mb-8 lg:hidden">
          <div className="bg-muted mb-4 h-7 w-40 animate-pulse rounded" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"
              />
            ))}
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>

        {/* Quick Actions Skeleton - Desktop */}
        <div className="mb-8 hidden lg:block">
          <div className="bg-muted mb-4 h-7 w-40 animate-pulse rounded" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"
              />
            ))}
          </div>
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Recent Activity Skeleton */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="bg-muted h-6 w-40 animate-pulse rounded" />
                  <div className="bg-muted h-8 w-24 animate-pulse rounded" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <ActivityItemSkeleton key={i} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel Skeleton */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="bg-muted h-6 w-32 animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-muted h-4 w-full animate-pulse rounded" />
                  <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-5/6 animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Keyboard Shortcuts Skeleton */}
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="bg-muted h-6 w-6 animate-pulse rounded" />
                    <div className="bg-muted h-6 w-6 animate-pulse rounded" />
                    <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                  </div>
                ))}
              </div>
              <div className="bg-muted h-3 w-32 animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

const StatsCardSkeleton = React.memo(function StatsCardSkeleton() {
  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-muted mt-2 h-8 w-32 animate-pulse rounded" />
            <div className="bg-muted mt-1 h-3 w-20 animate-pulse rounded" />
          </div>
          <div className="bg-muted h-8 w-8 animate-pulse rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
});

const ActivityItemSkeleton = React.memo(function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg p-3">
      <div className="bg-muted h-10 w-10 animate-pulse rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="bg-muted mb-1 h-4 w-3/4 animate-pulse rounded" />
        <div className="bg-muted h-3 w-24 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-8 w-8 animate-pulse rounded" />
    </div>
  );
});

StatsCardSkeleton.displayName = 'StatsCardSkeleton';
ActivityItemSkeleton.displayName = 'ActivityItemSkeleton';
