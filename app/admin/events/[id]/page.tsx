'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import HolisticEventDashboard from './holistic-dashboard';
import { featureFlags } from '@/lib/feature-flags';
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
  FolderOpen
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
    pending_photos: 0
  });
  const [isLibraryEnabled, setIsLibraryEnabled] = useState(false);

  useEffect(() => {
    if (id) {
      // Check if library feature is enabled
      const checkLibraryFeature = async () => {
        try {
          const enabled = await featureFlags.isEnabled('event_photo_library');
          setIsLibraryEnabled(enabled);
        } catch (error) {
          console.warn('Failed to check library feature flag:', error);
          setIsLibraryEnabled(false);
        }
      };
      
      checkLibraryFeature();
      
      // Load event data for legacy mode
      Promise.all([
        fetch(`/api/admin/events/${id}`),
        fetch(`/api/admin/events/${id}/stats`)
      ])
        .then(async ([eventRes, statsRes]) => {
          if (!eventRes.ok) throw new Error('Event not found');
          
          const eventData = await eventRes.json();
          setEvent(eventData.event || eventData);
          
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setStats(statsData.stats || statsData);
          }
          
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-blue-950/30 dark:to-purple-950/20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-screen">
            <div className="glass-health-island text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-lg font-medium gradient-text-ios26">Cargando evento...</p>
              <p className="text-sm text-muted-foreground mt-2">Obteniendo información del evento</p>
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
          <div className="flex items-center justify-center min-h-screen">
            <div className="glass-health-island border-red-200 bg-red-50/10 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-red-700">Error al cargar evento</p>
              <p className="text-sm text-red-600 mt-2">{error}</p>
              <div className="flex gap-3 mt-6 justify-center">
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin/events')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
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
        <div className="bg-white border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/admin/events')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{event.school || event.name}</h1>
                  <p className="text-gray-600">{event.location} • {new Date(event.date).toLocaleDateString('es-AR')}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Fotos</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total_photos}</p>
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
                    <p className="text-3xl font-bold text-gray-900">{stats.total_students}</p>
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
                    <p className="text-3xl font-bold text-gray-900">{stats.approved_photos}</p>
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
                    <p className="text-3xl font-bold text-gray-900">{stats.pending_photos}</p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Photo Library Card - Show if feature is enabled */}
            {isLibraryEnabled && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200 bg-blue-50/50" onClick={() => router.push(`/admin/events/${id}/library`)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <FolderOpen className="h-5 w-5" />
                    Biblioteca de Fotos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-600 text-sm mb-4">Nueva interfaz unificada para gestionar fotos y carpetas</p>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Abrir Biblioteca
                  </Button>
                </CardContent>
              </Card>
            )}
            
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/admin/photos?eventId=${id}`)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Gestionar Fotos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">
                  {isLibraryEnabled ? 'Interfaz clásica para gestión de fotos' : 'Subir, organizar y aprobar fotos del evento'}
                </p>
                <Button className={`w-full`} variant={isLibraryEnabled ? 'outline' : 'default'}>
                  <Camera className="h-4 w-4 mr-2" />
                  {isLibraryEnabled ? 'Modo Clásico' : 'Ir a Fotos'}
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Estudiantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">Ver y gestionar estudiantes del evento</p>
                <Button variant="outline" className="w-full" onClick={() => router.push(`/admin/events/${id}?view=students`)}>
                  <Users className="h-4 w-4 mr-2" />
                  Ver Estudiantes
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Códigos QR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">Generar códigos de acceso para familias</p>
                <Button variant="outline" className="w-full">
                  <QrCode className="h-4 w-4 mr-2" />
                  Gestionar QR
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">Ajustar configuraciones del evento</p>
                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Vista Previa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">Ver cómo las familias ven el evento</p>
                <Button variant="outline" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Vista Familia
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Ventas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">Ver reportes de ventas y pedidos</p>
                <Button variant="outline" className="w-full">
                  <DollarSign className="h-4 w-4 mr-2" />
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
