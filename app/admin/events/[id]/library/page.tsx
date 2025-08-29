'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { featureFlags } from '@/lib/feature-flags';
import { EventLibraryMain } from './components/EventLibraryMain';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Folder,
  AlertTriangle,
  InfoIcon,
  ImageIcon,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import PhotoSystemComparison from '@/components/admin/PhotoSystemComparison';

interface Event {
  id: string;
  name: string;
  school: string;
  date: string;
  status: string;
}

export default function EventLibraryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params['id'] as string;
  const folderId = searchParams.get('folderId');

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLegacyNotice, setShowLegacyNotice] = useState(true);

  // Load event data
  useEffect(() => {
    if (!eventId) {
      setError('Event ID is required');
      setLoading(false);
      return;
    }

    const loadEvent = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/events/${eventId}`);

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            data.error || `Failed to load event (${response.status})`
          );
        }

        const data = await response.json();
        if (!data.success || !data.event) {
          throw new Error('Event not found or invalid response format');
        }

        setEvent(data.event);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load event';
        console.error('Error loading event:', error);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  // Check feature flag
  if (!featureFlags.EVENT_PHOTO_LIBRARY_ENABLED) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push(`/admin/events/${eventId}`)}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al evento
            </Button>
          </div>

          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center text-amber-800">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Función no disponible
              </CardTitle>
              <CardDescription className="text-amber-700">
                La nueva biblioteca de fotos está actualmente deshabilitada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-amber-700">
                Esta función se encuentra en desarrollo y no está disponible en
                este momento. Por favor, usa la interfaz tradicional de gestión
                de fotos.
              </p>
              <Button
                onClick={() => router.push(`/admin/photos`)}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                Ir a gestión de fotos tradicional
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Cargando biblioteca de fotos...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/events')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a eventos
            </Button>
          </div>

          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Error al cargar evento
              </CardTitle>
              <CardDescription className="text-red-700">
                No se pudo cargar la información del evento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-red-700">
                {error ||
                  'El evento solicitado no fue encontrado o no tienes permisos para accederlo.'}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Reintentar
                </Button>
                <Button
                  onClick={() => router.push('/admin/events')}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Volver a eventos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main library interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Cross-link notification for legacy photo management */}
      {showLegacyNotice && (
        <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-start space-x-3">
              <InfoIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="flex-1">
                <h3 className="mb-1 text-sm font-medium text-amber-900">
                  💼 También disponible: Gestión Tradicional de Fotos
                </h3>
                <p className="mb-3 text-sm text-amber-700">
                  Si prefieres la interfaz tradicional, puedes acceder al
                  sistema de gestión de fotos clásico que incluye filtros
                  avanzados y vista de lista.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      router.push(`/admin/photos?eventId=${eventId}`)
                    }
                    variant="outline"
                    size="sm"
                    className="border-amber-300 bg-amber-100 text-sm text-amber-800 hover:bg-amber-200"
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Usar Vista Tradicional
                  </Button>
                  <PhotoSystemComparison
                    currentSystem="advanced"
                    eventId={eventId}
                    compact
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm text-amber-700 hover:bg-amber-100"
                    onClick={() => setShowLegacyNotice(false)}
                  >
                    Cerrar aviso
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <EventLibraryMain
        event={event}
        initialFolderId={folderId}
        onNavigateBack={() => router.push(`/admin/events/${eventId}`)}
      />
    </div>
  );
}
