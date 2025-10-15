'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import '@/styles/admin-photos.css';
import '@/styles/admin-dark-mode-fixes.css';
import { Toaster } from 'sonner';
import { ErrorBoundaryWrapper } from '@/components/admin/ErrorBoundary';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Dynamic import of PhotoAdmin with client-only rendering and loader
const PhotoAdmin = dynamic(() => import('@/components/admin/PhotoAdmin'), {
  ssr: false,
  loading: () => <PhotoSystemLoader />,
});

// Loading component for Suspense
function PhotoSystemLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading Unified Photo System...</p>
      </div>
    </div>
  );
}

// Error fallback component
function PhotoSystemError() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 p-4">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium text-foreground">System Error</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          There was an error loading the unified photo management system.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

/**
 * Unified Photos Page - NEW FOLDER-FIRST ARCHITECTURE
 *
 * This is the SINGLE ENTRY POINT for all photo management:
 * - Folder-based hierarchy navigation
 * - 3-panel layout (Folders + Photos + Inspector)
 * - Mouse-first interactions (Shift+Click, Ctrl+Click, Drag & Drop)
 * - Unified assets system with checksum deduplication
 * - Album generation and public access
 *
 * Replaces:
 * - /admin/events/[id]/library (event-specific photo management)
 * - Previous photo management interfaces
 *
 * Features:
 * - Unified folder hierarchy with optional event metadata
 * - Mouse-optimized selection and bulk operations
 * - Real-time search across all photos
 * - Drag & drop photo organization
 * - Album creation for family access
 * - Preview processing with watermarks
 * - Checksum-based deduplication
 */
export default function UnifiedPhotosPage() {
  const search = useSearchParams();
  const eventId = search?.get('event_id') ?? search?.get('eventId');
  const backHref = eventId ? `/admin/events/${eventId}?from=photos` : null;
  // Create a query client per mount to avoid cross-session leakage
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: 3,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      {/* Global Notifications */}
      <Toaster position="top-right" />

      {backHref && (
        <div className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Contexto de evento</span>
            <Link href={backHref}>
              <Button size="sm" variant="outline">Volver al evento</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Main Photo System - New Architecture */}
      <div className="admin-photos">
      <ErrorBoundaryWrapper
        level="page"
        name="PhotoAdmin"
        fallback={<PhotoSystemError />}
      >
        <Suspense fallback={<PhotoSystemLoader />}>
          <PhotoAdmin
            className="h-screen"
            enableUpload={true}
            enableBulkOperations={true}
          />
        </Suspense>
      </ErrorBoundaryWrapper>
      </div>
    </QueryClientProvider>
  );
}

/**
 * Performance Notes:
 * - Uses React Query for intelligent caching and background updates
 * - Suspense for code splitting and progressive loading
 * - Error boundaries for graceful failure handling
 * - Virtualization handles infinite scroll without memory leaks
 * - All operations are in-place, no page navigation
 *
 * Migration Notes:
 * - This page replaces the need for multiple photo interfaces
 * - Old routes should redirect here with appropriate filters
 * - Feature flags can be removed once this is stable
 * - Event-specific views are handled via filters, not separate pages
 */
