import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import EventPhotoManager from '@/components/admin/EventPhotoManager';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * 🎨 Modern Event Photo Management
 * 
 * Interfaz moderna para gestionar fotos de eventos con diseño glass morphism.
 * Proporciona una experiencia visual consistente con los mockups.
 */
export default async function EventLibraryPage({ params }: PageProps) {
  const { id: eventId } = await params;
  
  return (
    <Suspense fallback={<EventPhotoManagerSkeleton />}>
      <EventPhotoManager eventId={eventId} />
    </Suspense>
  );
}

function EventPhotoManagerSkeleton() {
  return (
    <div className="gradient-mesh min-h-screen">
      {/* Header skeleton */}
      <div className="glass-header border-b border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <div className="h-6 w-px bg-gray-300/20" />
            <div>
              <Skeleton className="h-7 w-48 mb-2 rounded-lg" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-6 w-12 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main content skeleton */}
      <div className="flex h-[calc(100vh-100px)]">
        {/* Sidebar */}
        <div className="w-80 border-r border-white/10 glass-sidebar p-4">
          <Skeleton className="h-10 w-full mb-4 rounded-xl" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
        
        {/* Photo grid */}
        <div className="flex-1 p-4">
          <Skeleton className="h-12 w-full mb-4 rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-xl" />
            ))}
          </div>
        </div>
        
        {/* Right sidebar */}
        <div className="w-96 border-l border-white/10 glass-sidebar p-4">
          <Skeleton className="h-10 w-full mb-4 rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Gestión de Fotos del Evento',
  description: 'Gestionar fotos, carpetas y organización del evento'
};
