'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { UnifiedStore } from '@/components/store/UnifiedStore';
import { LoadingScreen } from '@/components/ui/LoadingStates';
import { toast } from 'sonner';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
}

interface EventInfo {
  id: string;
  name: string;
  school_name: string;
  theme?: string;
}

export default function PublicGalleryStorePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get selected photos from URL params (if coming from gallery)
  const selectedPhotoIds = searchParams.get('selected')?.split(',') || [];

  useEffect(() => {
    if (eventId) {
      loadStoreData();
    }
  }, [eventId]);

  const loadStoreData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load event info
      const eventResponse = await fetch(`/api/public/gallery/event/${eventId}`);
      if (!eventResponse.ok) {
        throw new Error('Evento no encontrado');
      }
      
      const eventData = await eventResponse.json();
      if (!eventData.success) {
        throw new Error(eventData.error || 'Error cargando evento');
      }

      // Load photos
      const photosResponse = await fetch(`/api/public/gallery/event/${eventId}/photos?limit=200`);
      if (!photosResponse.ok) {
        throw new Error('Error cargando fotos');
      }

      const photosData = await photosResponse.json();
      if (!photosData.success) {
        throw new Error(photosData.error || 'Error cargando fotos');
      }

      setEventInfo({
        id: eventData.event.id,
        name: eventData.event.name,
        school_name: 'Escuela', // Default if not provided
        theme: 'default', // Will be updated based on event data
      });

      setPhotos(photosData.photos || []);
    } catch (err) {
      console.error('Error loading store data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error cargando la tienda';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToGallery = () => {
    router.push(`/gallery/${eventId}/public`);
  };

  // Create a synthetic subject for the UnifiedStore
  const syntheticSubject = eventInfo ? {
    id: `public_${eventInfo.id}`,
    name: 'Compra Pública',
    grade_section: 'Público',
    event: {
      name: eventInfo.name,
      school_name: eventInfo.school_name,
      theme: eventInfo.theme,
    },
  } : null;

  // Create a synthetic token for public purchases
  const syntheticToken = `public_${eventId}_${Date.now()}`;

  if (loading) {
    return (
      <LoadingScreen
        title="Preparando tienda..."
        description="Configurando opciones de compra"
        type="store"
      />
    );
  }

  if (error || !eventInfo || !syntheticSubject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
          <div className="text-center">
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Error cargando tienda
            </h2>
            <p className="mb-4 text-gray-600">
              {error || 'No se pudo cargar la información del evento'}
            </p>
            <div className="space-y-2">
              <button
                onClick={loadStoreData}
                className="w-full rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700"
              >
                Intentar de nuevo
              </button>
              <button
                onClick={handleBackToGallery}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Volver a la galería
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <UnifiedStore
      token={syntheticToken}
      photos={photos}
      subject={syntheticSubject}
      onBack={handleBackToGallery}
    />
  );
}
