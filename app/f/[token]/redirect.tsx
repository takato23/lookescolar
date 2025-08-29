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
    debugMigration('TokenRedirect component mounted', {
      token: token?.slice(0, 8) + '...',
    });

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
      debugMigration('Validating token for redirect', {
        token: token.slice(0, 8) + '...',
      });

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
        token: token.slice(0, 8) + '...',
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <span className="text-xl">🔧</span>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            Sistema en mantenimiento
          </h2>
          <p className="mb-4 text-gray-600">
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 px-4">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              Redirigiendo a tu galería...
            </p>
            <p className="mt-1 text-sm text-gray-500">Un momento por favor</p>
          </div>
          {featureFlags.DEBUG_MIGRATION && (
            <div className="mx-auto max-w-md rounded-lg border border-blue-200 bg-blue-50 p-3 text-left text-sm">
              <strong>Debug:</strong> Validando token {token.slice(0, 8)}... y
              redirigiendo a galería unificada
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
          <div className="flex items-start space-x-3">
            <div className="mt-1 h-6 w-6 flex-shrink-0 text-red-500">⚠️</div>
            <div className="flex-1">
              <h2 className="mb-2 text-xl font-bold text-gray-900">
                No pudimos acceder a tu galería
              </h2>
              <p className="mb-4 text-gray-600">{error}</p>
              <div className="space-y-2 rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">
                  Posibles soluciones:
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                  <li>Verifica que el enlace sea correcto</li>
                  <li>Asegúrate de usar el QR o código proporcionado</li>
                  <li>El enlace puede haber expirado</li>
                  <li>Contacta con el fotógrafo</li>
                </ul>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 w-full rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700"
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
