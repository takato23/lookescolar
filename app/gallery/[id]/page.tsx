'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircleIcon, ArrowLeftIcon } from 'lucide-react';

export default function GalleryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.['id'] as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const checkAccess = async () => {
      try {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (uuidRegex.test(id)) {
          // This is an eventId: redirect to public gallery
          const res = await fetch(`/api/public/gallery/event/${id}`);
          if (res.ok) {
            const json = await res.json();
            if (json?.redirect) {
              router.replace(json.redirect);
              return;
            }
          }
          // Fallback: redirect directly to public gallery
          router.replace(`/gallery/${id}/public`);
          return;
        }

        // If not a UUID, try to validate as a family token
        if (id.length >= 20) {
          const response = await fetch(`/api/family/validate-token/${id}`);
          if (response.ok) {
            // It's a valid token, redirect to family gallery
            router.replace(`/f/${id}`);
            return;
          }
        }

        setError('Esta galería no existe o no está disponible públicamente.');
      } catch (err) {
        console.error('Error validating access:', err);
        setError('Error verificando acceso a la galería.');
      }
      setLoading(false);
    };

    checkAccess();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <div>
            <p className="text-lg font-medium text-gray-700">Cargando...</p>
            <p className="mt-1 text-sm text-gray-500">
              Verificando acceso a la galería
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="text-center">
            <AlertCircleIcon className="mx-auto mb-4 h-16 w-16 text-orange-500" />
            <h1 className="mb-4 text-2xl font-bold text-gray-900">
              Galería no disponible
            </h1>

            <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <p className="mb-2 font-medium text-orange-800">
                {error || 'No se puede acceder a esta galería directamente.'}
              </p>
              <p className="text-sm text-orange-700">
                Las galerías familiares requieren un enlace especial
                proporcionado por la escuela.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-gray-900">
                  ¿Cómo acceder a tu galería?
                </h3>
                <ul className="space-y-2 text-left text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-500">1.</span>
                    <span>
                      Usa el enlace que te envió la escuela por WhatsApp o email
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-500">2.</span>
                    <span>Escanea el código QR si tienes uno</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-500">3.</span>
                    <span>
                      Contacta con la escuela si no recibiste el enlace
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-200"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Volver
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
                >
                  Ir al inicio
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
