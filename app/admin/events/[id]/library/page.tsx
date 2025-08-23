'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { featureFlags } from '@/lib/feature-flags';
import { EventLibraryMain } from './components/EventLibraryMain';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Folder, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  const eventId = params.id as string;
  const folderId = searchParams.get('folderId');

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check feature flag
  if (!featureFlags.EVENT_PHOTO_LIBRARY_ENABLED) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push(`/admin/events/${eventId}`)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al evento
            </Button>
          </div>

          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center text-amber-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Función no disponible
              </CardTitle>
              <CardDescription className="text-amber-700">
                La nueva biblioteca de fotos está actualmente deshabilitada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-amber-700 mb-4">
                Esta función se encuentra en desarrollo y no está disponible en este momento.
                Por favor, usa la interfaz tradicional de gestión de fotos.
              </p>
              <Button
                onClick={() => router.push(`/admin/photos`)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Ir a gestión de fotos tradicional
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Load event data
  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/events/${eventId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load event');
        }

        if (!data.success || !data.event) {
          throw new Error('Event not found');
        }

        setEvent(data.event);
      } catch (error) {
        console.error('Error loading event:', error);
        setError(error instanceof Error ? error.message : 'Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando biblioteca de fotos...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/events')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a eventos
            </Button>
          </div>

          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Error al cargar evento
              </CardTitle>
              <CardDescription className="text-red-700">
                No se pudo cargar la información del evento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-4">
                {error || 'El evento solicitado no fue encontrado o no tienes permisos para accederlo.'}
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
                  className="bg-red-600 hover:bg-red-700 text-white"
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
      <EventLibraryMain 
        event={event}
        initialFolderId={folderId}
        onNavigateBack={() => router.push(`/admin/events/${eventId}`)}
      />
    </div>
  );
}