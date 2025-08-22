'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircleIcon, ArrowLeftIcon } from 'lucide-react';

export default function GalleryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if this is a direct gallery access attempt
    if (id) {
      // Try to redirect to family access if this is actually a token
      const checkIfToken = async () => {
        try {
          // Check if this ID could be a valid family token
          const response = await fetch(`/api/family/validate-token/${id}`);
          if (response.ok) {
            // It's a valid token, redirect to family gallery
            router.replace(`/f/${id}`);
            return;
          }
          
          // Not a valid token, show error
          setError('Esta galería no existe o no está disponible públicamente.');
        } catch (err) {
          // API error, show generic error
          console.error('Error validating token:', err);
          setError('Error verificando acceso a la galería.');
        }
        
        setLoading(false);
      };

      checkIfToken();
    }
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <div>
            <p className="text-lg font-medium text-gray-700">Cargando...</p>
            <p className="text-sm text-gray-500 mt-1">Verificando acceso a la galería</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <AlertCircleIcon className="mx-auto h-16 w-16 text-orange-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Galería no disponible
            </h1>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-orange-800 font-medium mb-2">
                {error || 'No se puede acceder a esta galería directamente.'}
              </p>
              <p className="text-orange-700 text-sm">
                Las galerías familiares requieren un enlace especial proporcionado por la escuela.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">¿Cómo acceder a tu galería?</h3>
                <ul className="text-sm text-gray-600 space-y-2 text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 font-bold">1.</span>
                    <span>Usa el enlace que te envió la escuela por WhatsApp o email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 font-bold">2.</span>
                    <span>Escanea el código QR si tienes uno</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 font-bold">3.</span>
                    <span>Contacta con la escuela si no recibiste el enlace</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Volver
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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