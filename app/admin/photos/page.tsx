'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import '@/styles/admin-photos.css';
import '@/styles/admin-dark-mode-fixes.css';
import { Toaster } from 'sonner';
import { ErrorBoundaryWrapper } from '@/components/admin/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Layers, ShieldCheck, Sparkles } from 'lucide-react';

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

      <div className="admin-photos layout-modern relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute left-[10%] top-[-10%] h-72 w-72 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-500/20" />
          <div className="absolute right-[-8%] top-1/4 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/15" />
          <div className="absolute bottom-[-12%] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />
        </div>

        <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-6 lg:px-10">
          {backHref && (
            <div className="sticky top-6 z-50 flex items-center justify-between rounded-2xl border border-blue-100/60 bg-white/70 px-5 py-3 text-sm text-blue-700 shadow-lg shadow-blue-500/5 backdrop-blur dark:border-blue-400/30 dark:bg-slate-900/80 dark:text-blue-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-medium">Contexto de evento activo</span>
              </div>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => router.push(backHref)}
              >
                Volver al evento
              </Button>
            </div>
          )}

          <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 px-8 py-8 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-black/40">
            <div className="absolute right-0 top-0 h-40 w-40 -translate-y-1/3 translate-x-1/3 rounded-full bg-blue-500/10 blur-2xl dark:bg-blue-500/20" />
            <div className="relative flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-xl space-y-4">
                <Badge
                  variant="outline"
                  className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/50 dark:bg-blue-500/10 dark:text-blue-100"
                >
                  Nuevo panel unificado
                </Badge>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    Organiza todas tus fotos con un flujo más claro y luminoso
                  </h1>
                  <p className="text-base text-slate-600 dark:text-slate-300">
                    Gestiona carpetas, sube imágenes y revisa estados de
                    procesamiento en un entorno diseñado para enfocarte en el
                    contenido.
                  </p>
                </div>
                <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                  <div className="flex items-start gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm shadow-slate-900/5 dark:border-slate-700/60 dark:bg-slate-900/60 dark:shadow-black/30">
                    <Sparkles className="mt-0.5 h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        Interacciones guiadas
                      </p>
                      <p>
                        Selecciones rápidas, arrastra y suelta y accesos
                        directos visibles.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm shadow-slate-900/5 dark:border-slate-700/60 dark:bg-slate-900/60 dark:shadow-black/30">
                    <Layers className="mt-0.5 h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        Carpetas inteligentes
                      </p>
                      <p>
                        Explora toda la jerarquía con indicadores visuales más
                        limpios.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm shadow-slate-900/5 dark:border-slate-700/60 dark:bg-slate-900/60 dark:shadow-black/30">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-indigo-500" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        Integridad garantizada
                      </p>
                      <p>
                        Estados de carga claros y alertas cuando algo requiere
                        tu atención.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600 shadow-sm shadow-slate-900/5 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200 dark:shadow-black/30">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Accesos rápidos
                </p>
                <Separator className="bg-slate-200 dark:bg-slate-700" />
                <Button
                  size="sm"
                  type="button"
                  variant="secondary"
                  className="justify-start gap-2"
                  onClick={() => router.push('/admin/photos/debug')}
                >
                  <Sparkles className="h-4 w-4" />
                  Modo diagnóstico
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => router.push('/admin/photos/redirect')}
                >
                  <Layers className="h-4 w-4" />
                  Ir al panel clásico
                </Button>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Estos accesos te ayudarán a revisar migraciones, probar cargas
                  masivas o volver a la versión anterior si necesitas una
                  referencia rápida.
                </p>
              </div>
            </div>
          </section>

          {/* Main Photo System - New Architecture */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 shadow-2xl shadow-slate-900/10 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-black/40">
            <div className="border-b border-slate-200/70 bg-white/70 px-6 py-4 text-sm text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300">
              Visualiza, filtra y organiza sin perder de vista el contexto
              general. El panel inferior se adapta al tamaño de tu pantalla para
              mantener el foco en las imágenes.
            </div>
            <div className="h-[calc(100vh-280px)] min-h-[640px] overflow-hidden rounded-3xl rounded-t-none border-t border-transparent bg-white/60 dark:bg-slate-950/40">
              <ErrorBoundaryWrapper
                level="page"
                name="PhotoAdmin"
                fallback={<PhotoSystemError />}
              >
                <Suspense fallback={<PhotoSystemLoader />}>
                  <PhotoAdmin
                    className="min-h-[640px] lg:!h-[calc(100vh-320px)]"
                    enableUpload={true}
                    enableBulkOperations={true}
                  />
                </Suspense>
              </ErrorBoundaryWrapper>
            </div>
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
