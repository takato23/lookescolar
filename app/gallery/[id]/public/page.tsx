'use client';

import { useParams } from 'next/navigation';
import UnifiedGallery from '@/components/gallery/UnifiedGallery';

export default function PublicGalleryPage() {
  const params = useParams();
  const eventId = params?.['id'] as string;

  if (!eventId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">ID de evento no válido</p>
        </div>
      </div>
    );
  }

  return (
    <UnifiedGallery
      mode="public"
      eventId={eventId}
      title="Galería Pública"
      description="Fotos del evento disponibles para visualización"
    />
  );
}