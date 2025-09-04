import { Suspense } from 'react';
import EventPhotoManager from '@/components/admin/EventPhotoManager';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * 🔄 RESTAURADO - Gestión de Fotos del Evento
 * 
 * Interfaz específica para gestionar fotos de un evento particular.
 * Proporciona contexto completo del evento y gestión de fotos integrada.
 */
export default async function EventLibraryPage({ params }: PageProps) {
  const { id: eventId } = await params;
  
  return (
    <div className="h-screen flex flex-col">
      <Suspense fallback={<EventPhotoManagerSkeleton />}>
        <EventPhotoManager eventId={eventId} />
      </Suspense>
    </div>
  );
}

function EventPhotoManagerSkeleton() {
  return (
    <div className="h-screen flex flex-col">
      <div className="border-b p-4">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex-1 p-4">
        <div className="grid grid-cols-4 gap-4 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Gestión de Fotos del Evento',
  description: 'Gestionar fotos, carpetas y organización del evento'
};
