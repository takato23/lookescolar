'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import '@/styles/admin-photos.css';
import '@/styles/admin-dark-mode-fixes.css';
import { Toaster } from 'sonner';
import { ErrorBoundaryWrapper } from '@/components/admin/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

// Dynamic import of PhotoAdmin with client-only rendering and loader
const PhotoAdmin = dynamic(() => import('@/components/admin/PhotoAdmin'), {
  ssr: false,
  loading: () => <PhotoSystemLoader />,
});

// Dynamic import of MobilePhotoGallery
const MobilePhotoGallery = dynamic<Record<string, never>>(() => import('@/components/admin/mobile/MobilePhotoGallery').then(mod => ({ default: mod.default })), {
  ssr: false,
  loading: () => <PhotoSystemLoader />,
});

// Hook for mobile detection
function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Loading component for Suspense
function PhotoSystemLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="text-gray-500 dark:text-gray-400">
          Loading Unified Photo System...
        </p>
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
        <h3 className="mb-2 text-lg font-medium text-foreground">
          System Error
        </h3>
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
  const router = useRouter();
  const eventId = search?.get('event_id') ?? search?.get('eventId');
  const backHref = eventId ? `/admin/events/${eventId}?from=photos` : null;
  const isMobile = useMobileDetection();
  
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
      <Toaster position="top-right" richColors />

      <div className="admin-photos relative flex h-full flex-1 flex-col bg-transparent">
        <div className="relative flex flex-1 flex-col gap-6 px-4 pb-12 pt-8 sm:px-6 lg:px-10 xl:px-16">
          {backHref && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/60 bg-white/70 px-5 py-3 text-sm text-slate-700 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.55)] backdrop-blur-lg dark:border-emerald-400/40 dark:bg-slate-900/70 dark:text-emerald-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-medium">Contexto de evento activo</span>
              </div>
              <Button
                size="sm"
                type="button"
                variant="modern"
                modernTone="primary"
                onClick={() => router.push(backHref)}
                className="rounded-full px-4"
              >
                Volver al evento
              </Button>
            </div>
          )}

          <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/25 bg-white/75 shadow-[0_32px_90px_-45px_rgba(15,23,42,0.85)] backdrop-blur-xl transition-[box-shadow,transform] duration-300 ease-out dark:border-slate-800/70 dark:bg-slate-950/40">
            <div className="pointer-events-none absolute inset-0 rounded-[32px] border border-white/10 dark:border-slate-800/50" />
            <ErrorBoundaryWrapper
              level="page"
              name="PhotoAdmin"
              fallback={<PhotoSystemError />}
            >
              <Suspense fallback={<PhotoSystemLoader />}>
                {isMobile ? (
                  <MobilePhotoGallery
                    photos={[]} // TODO: Fetch photos from API
                    className="flex-1 min-h-[720px]"
                  />
                ) : (
                  <PhotoAdmin
                    className="flex-1 min-h-[720px] lg:min-h-[calc(100vh-220px)]"
                    enableUpload={true}
                    enableBulkOperations={true}
                  />
                )}
              </Suspense>
            </ErrorBoundaryWrapper>
          </section>
        </div>
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
