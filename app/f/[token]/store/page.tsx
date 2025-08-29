'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UnifiedStore } from '@/components/store/UnifiedStore';
import { toast } from 'sonner';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
}

interface Subject {
  id: string;
  name: string;
  grade_section: string;
  event: {
    name: string;
    school_name: string;
    theme?: string;
  };
}

export default function UnifiedStorePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadGalleryData();
    }
  }, [token]);

  const loadGalleryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/family/gallery-simple/${token}?page=1&limit=200`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error cargando galería');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error en la respuesta');
      }

      setPhotos(data.photos || []);
      setSubject(data.subject);
    } catch (err) {
      console.error('Error loading gallery:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Error cargando la galería';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToGallery = () => {
    router.push(`/f/${token}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              Cargando tienda...
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Preparando tus opciones de compra
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
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
                onClick={loadGalleryData}
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
      token={token}
      photos={photos}
      subject={subject}
      onBack={handleBackToGallery}
    />
  );
}
