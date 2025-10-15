import { Suspense } from 'react';
import { PublicGallery } from '@/components/gallery/PublicGallery';
import { Camera } from 'lucide-react';

interface PublicGalleryPageProps {
  params: { eventId: string };
}

export default async function PublicGalleryPage({ params }: PublicGalleryPageProps) {
  const { eventId } = params;

  // Validación robusta del eventId
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!eventId) {
    return <InvalidEventError message="ID de evento requerido" />;
  }
  
  if (!uuidRegex.test(eventId)) {
    return <InvalidEventError message="ID de evento inválido" />;
  }

  // Use public gallery component
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <PublicGallery eventId={eventId} />
    </Suspense>
  );
}

// Error Components
function InvalidEventError({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Error de Evento</h1>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}