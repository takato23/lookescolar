'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Import the new CleanPhotoAdmin component
import CleanPhotoAdmin from './CleanPhotoAdmin';
import MobilePhotoAdmin from './MobilePhotoAdmin';
import { ErrorBoundaryWrapper } from '@/components/admin/ErrorBoundary';

// Import clean styles
import '@/styles/admin-clean.css';

interface CleanPhotosPageProps {
  className?: string;
}

// Loading skeleton
function PhotosLoadingSkeleton() {
  return (
    <div className="clean-photos-loading">
      <div className="clean-photos-loading-spinner" />
      <p>Cargando sistema de fotos...</p>
    </div>
  );
}

// Error state
function PhotosErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="clean-empty">
      <AlertCircle className="clean-empty-icon text-[var(--clean-error)]" />
      <h3 className="clean-empty-title">Error al cargar</h3>
      <p className="clean-empty-description">
        Hubo un problema al cargar el sistema de fotos. Por favor, intenta nuevamente.
      </p>
      <button onClick={onRetry} className="clean-btn clean-btn--primary">
        <RefreshCw className="clean-btn-icon" />
        Reintentar
      </button>
    </div>
  );
}

// Main component - Now using CleanPhotoAdmin with full-screen layout
export default function CleanPhotosPage({ className }: CleanPhotosPageProps) {
  // Create a query client per mount
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
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
      <Toaster position="top-right" richColors />

      <div className={cn('clean-photos-wrapper', className)}>
        <ErrorBoundaryWrapper
          level="page"
          name="CleanPhotoAdmin"
          fallback={<PhotosErrorState onRetry={() => window.location.reload()} />}
        >
          <React.Suspense fallback={<PhotosLoadingSkeleton />}>
            {/* CleanPhotoAdmin now has full mobile support with responsive sidebar */}
            <div className="hidden md:block h-full">
              <CleanPhotoAdmin
                enableUpload={true}
                enableBulkOperations={true}
              />
            </div>
            <div className="md:hidden h-full">
              <MobilePhotoAdmin />
            </div>
          </React.Suspense>
        </ErrorBoundaryWrapper>
      </div>
    </QueryClientProvider>
  );
}
