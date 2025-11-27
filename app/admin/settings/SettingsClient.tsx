'use client';

import React, { Suspense } from 'react';
import { CleanSkeletonGrid } from '@/components/admin/shared/CleanComponents';
import CleanSettingsPage from '@/components/admin/settings/CleanSettingsPage';

// Loading state for settings page
function SettingsLoadingState() {
  return (
    <div className="clean-app">
      <div className="clean-content">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        </div>

        {/* Settings cards skeleton */}
        <div className="flex gap-8">
          {/* Sidebar skeleton */}
          <div className="w-64 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>

          {/* Content skeleton */}
          <div className="flex-1">
            <CleanSkeletonGrid count={4} type="card" cols={2} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsClient() {
  return (
    <Suspense fallback={<SettingsLoadingState />}>
      <CleanSettingsPage />
    </Suspense>
  );
}
