'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import HolisticEventDashboard from './holistic-dashboard';
import { featureFlags } from '@/lib/feature-flags';
import { SchoolFolderTemplateSelector } from '@/components/admin/SchoolFolderTemplateSelector';
import {
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Camera,
  Users,
  Settings,
  Upload,
  Eye,
  DollarSign,
  Calendar,
  MapPin,
  Grid3X3,
  List,
  QrCode,
  FolderOpen,
  FolderPlus,
  School,
} from 'lucide-react';

interface Event {
  id: string;
  name: string;
  school: string;
  location: string;
  date: string;
  status: string;
  created_at: string;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params['id'] as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLegacyMode, setShowLegacyMode] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState({
    total_photos: 0,
    total_students: 0,
    approved_photos: 0,
    pending_photos: 0,
  });
  const [isLibraryEnabled, setIsLibraryEnabled] = useState(false);
  const [templateApplied, setTemplateApplied] = useState(false);

  useEffect(() => {
    if (!id) return;

    const initializeEventData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check feature flags and load event data in parallel
        const [libraryFeatureResult, eventResponse, statsResponse] =
          await Promise.allSettled([
            featureFlags.isEnabled('EVENT_PHOTO_LIBRARY_ENABLED'),
            fetch(`/api/admin/events/${id}`),
            fetch(`/api/admin/events/${id}/stats`),
          ]);

        // Handle library feature flag
        if (libraryFeatureResult.status === 'fulfilled') {
          setIsLibraryEnabled(libraryFeatureResult.value);
        } else {
          console.warn(
            'Failed to check library feature flag:',
            libraryFeatureResult.reason
          );
          setIsLibraryEnabled(false);
        }

        // Handle event data
        if (eventResponse.status === 'fulfilled' && eventResponse.value.ok) {
          const eventData = await eventResponse.value.json();
          setEvent(eventData.event || eventData);
        } else {
          throw new Error('Event not found');
        }

        // Handle stats data
        if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
          const statsData = await statsResponse.value.json();
          setStats(statsData.stats || statsData);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load event data';
        setError(message);
        console.error('Error initializing event data:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeEventData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-blue-950/30 dark:to-purple-950/20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex min-h-screen items-center justify-center">
            <div className="glass-health-island text-center">
              <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-500" />
              <p className="gradient-text-ios26 text-lg font-medium">
                Cargando evento...
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                Obteniendo información del evento
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-blue-950/30 dark:to-purple-950/20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex min-h-screen items-center justify-center">
            <div className="glass-health-island border-red-200 bg-red-50/10 text-center">
              <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-500" />
              <p className="text-lg font-medium text-red-700">
                Error al cargar evento
              </p>
              <p className="mt-2 text-sm text-red-600">{error}</p>
              <div className="mt-6 flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin/events')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a eventos
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowLegacyMode(true)}
                >
                  Modo Simplificado
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show simplified mode
  if (showLegacyMode && event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="border-b bg-white">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/admin/events')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {event.school || event.name}
                  </h1>
                  <p className="text-gray-600">
                    {event.location} •{' '}
                    {new Date(event.date).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{event.status}</Badge>
                <Button
                  variant="outline"
                  onClick={() => setShowLegacyMode(false)}
                >
                  Modo Avanzado
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8">
          {/* Stats Cards */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Fotos</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.total_photos}
                    </p>
                  </div>
                  <Camera className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Estudiantes</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.total_students}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Aprobadas</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.approved_photos}
                    </p>
                  </div>
                  <Eye className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pendientes</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.pending_photos}
                    </p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Photo Library Card - Show if feature is enabled */}
            {isLibraryEnabled && (
              <Card
                className="cursor-pointer border-blue-200 bg-blue-50/50 transition-shadow hover:shadow-lg"
                onClick={() => router.push(`/admin/events/${id}/library`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <FolderOpen className="h-5 w-5" />
                    Biblioteca de Fotos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-blue-600">
                    Nueva interfaz unificada para gestionar fotos y carpetas
                  </p>
                  <div className="space-y-2">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => router.push(`/admin/events/${id}/library`)}
                    >
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Abrir Biblioteca
                    </Button>
                    {/* Quick Template Selector */}
                    <SchoolFolderTemplateSelector
                      eventId={id}
                      eventName={event?.name || 'Evento'}
                      onTemplateApplied={(template, folders) => {
                        // Refresh the page or show a success message
                        console.log(`Applied template: ${template.name}, created ${folders.length} folders`);
                      }}
                      triggerButton={
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FolderPlus className="mr-2 h-3 w-3" />
                          Aplicar Estructura Escolar
                        </Button>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card
              className="cursor-pointer transition-shadow hover:shadow-lg"
              onClick={() => router.push(`/admin/photos?eventId=${id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Gestionar Fotos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-gray-600">
                  {isLibraryEnabled
                    ? 'Interfaz clásica para gestión de fotos'
                    : 'Subir, organizar y aprobar fotos del evento'}
                </p>
                <Button
                  className={`w-full`}
                  variant={isLibraryEnabled ? 'outline' : 'default'}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {isLibraryEnabled ? 'Modo Clásico' : 'Ir a Fotos'}
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Estudiantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-gray-600">
                  Ver y gestionar estudiantes del evento
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    router.push(`/admin/events/${id}?view=students`)
                  }
                >
                  <Users className="mr-2 h-4 w-4" />
                  Ver Estudiantes
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Códigos QR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-gray-600">
                  Generar códigos de acceso para familias
                </p>
                <Button variant="outline" className="w-full">
                  <QrCode className="mr-2 h-4 w-4" />
                  Gestionar QR
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5" />
                  Estructura Escolar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-gray-600">
                  Organizar carpetas por niveles educativos
                </p>
                <SchoolFolderTemplateSelector
                  eventId={id}
                  eventName={event?.name || 'Evento'}
                  onTemplateApplied={(template, folders) => {
                    // Show success message or refresh
                    console.log(`Applied template: ${template.name}, created ${folders.length} folders`);
                    // You could add a toast notification here
                  }}
                  triggerButton={
                    <Button variant="outline" className="w-full">
                      <FolderPlus className="mr-2 h-4 w-4" />
                      Configurar Carpetas
                    </Button>
                  }
                />
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-gray-600">
                  Ajustar configuraciones del evento
                </p>
                <Button variant="outline" className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurar
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Vista Previa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-gray-600">
                  Ver cómo las familias ven el evento
                </p>
                <Button variant="outline" className="w-full">
                  <Eye className="mr-2 h-4 w-4" />
                  Vista Familia
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Ventas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-gray-600">
                  Ver reportes de ventas y pedidos
                </p>
                <Button variant="outline" className="w-full">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Ver Ventas
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show new holistic dashboard by default
  return <HolisticEventDashboard />;
}
