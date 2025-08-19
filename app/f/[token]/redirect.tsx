// FASE 3: Redirección automática desde /f/[token] a galería unificada
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { featureFlags, debugMigration } from '@/lib/feature-flags';

interface TokenValidationResponse {
  valid: boolean;
  eventId?: string;
  student?: {
    id: string;
    name: string;
    event: {
      id: string;
      name: string;
    };
  };
  error?: string;
}

export default function TokenRedirect() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const token = params?.token as string;

  useEffect(() => {
    debugMigration('TokenRedirect component mounted', { token: token?.slice(0, 8) + '...' });

    if (!featureFlags.FAMILY_IN_GALLERY_ROUTE) {
      debugMigration('Family in gallery route disabled, staying in /f/ route');
      setLoading(false);
      return;
    }

    if (!token) {
      setError('Token no proporcionado');
      setLoading(false);
      return;
    }

    validateTokenAndRedirect();
  }, [token]);

  const validateTokenAndRedirect = async () => {
    try {
      debugMigration('Validating token for redirect', { token: token.slice(0, 8) + '...' });
      
      // Validar token y obtener eventId
      const response = await fetch(`/api/family/validate-token/${token}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token inválido');
      }

      const data: TokenValidationResponse = await response.json();
      
      if (!data.valid || !data.eventId) {
        throw new Error('Token inválido o evento no encontrado');
      }

      debugMigration('Token validated, redirecting to unified gallery', { 
        eventId: data.eventId,
        token: token.slice(0, 8) + '...'
      });

      // Redireccionar a la galería unificada con token como query parameter
      const redirectUrl = `/gallery/${data.eventId}?token=${token}&from=legacy`;
      
      debugMigration('Redirecting to unified gallery', { redirectUrl });
      
      router.replace(redirectUrl);
      
    } catch (err) {
      console.error('Error validating token:', err);
      setError(err instanceof Error ? err.message : 'Error validando token');
      setLoading(false);
      
      debugMigration('Token validation failed', { error: err });
    }
  };

  if (!featureFlags.FAMILY_IN_GALLERY_ROUTE) {
    // Feature flag deshabilitado, mostrar mensaje
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full text-center">
          <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">🔧</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sistema en mantenimiento</h2>
          <p className="text-gray-600 mb-4">
            La redirección automática está temporalmente deshabilitada.
          </p>
          <p className="text-sm text-gray-500">
            Por favor usa el enlace original o contacta al administrador.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <div>
            <p className="text-lg font-medium text-gray-700">Redirigiendo a tu galería...</p>
            <p className="text-sm text-gray-500 mt-1">Un momento por favor</p>
          </div>
          {featureFlags.DEBUG_MIGRATION && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-left max-w-md mx-auto">
              <strong>Debug:</strong> Validando token {token.slice(0, 8)}... y redirigiendo a galería unificada
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full">
          <div className="flex items-start space-x-3">
            <div className="h-6 w-6 text-red-500 mt-1 flex-shrink-0">⚠️</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">No pudimos acceder a tu galería</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Posibles soluciones:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Verifica que el enlace sea correcto</li>
                  <li>Asegúrate de usar el QR o código proporcionado</li>
                  <li>El enlace puede haber expirado</li>
                  <li>Contacta con el fotógrafo</li>
                </ul>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 w-full rounded-lg bg-purple-600 px-4 py-2 text-white font-medium hover:bg-purple-700 transition-colors"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null; // Esto no debería mostrar nunca, pero por si acaso
}