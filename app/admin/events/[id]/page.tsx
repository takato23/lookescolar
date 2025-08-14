'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SubjectsSection from './subjects-section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  DollarSign,
  Camera,
  Users,
  ShoppingCart,
  ArrowLeft,
  Upload,
  QrCode,
  Package,
  Edit3,
  Eye,
  AlertCircle,
  RefreshCw,
  Home,
  Mail,
} from 'lucide-react';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/events/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch event');
      }
      
      const data = await response.json();
      setEvent(data.event);
    } catch (err) {
      console.error('Error fetching event:', err);
      setError(err instanceof Error ? err.message : 'Error loading event');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="gradient-mesh min-h-screen">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
            <span className="ml-2 text-lg">Cargando evento...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="gradient-mesh min-h-screen">
        <div className="container mx-auto px-6 py-8">
          <Card variant="glass" className="border-red-200 bg-red-50/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-medium text-red-700">Error al cargar el evento</p>
                  <p className="text-sm text-red-600">{error || 'Evento no encontrado'}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => router.push('/admin/events')}
              >
                Volver a eventos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-mesh min-h-screen">
      <div className="container mx-auto space-y-8 px-6 py-8">
        {/* Header with Breadcrumbs */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-3xl" />
          <div className="relative">
            {/* Breadcrumbs */}
            <nav className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
              <Link
                href="/admin"
                className="flex items-center gap-1 transition-colors hover:text-primary-600"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <span>/</span>
              <Link
                href="/admin/events"
                className="transition-colors hover:text-primary-600"
              >
                Eventos
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">
                {event.school || event.name}
              </span>
            </nav>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/admin/events')}
                  className="rounded-full p-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-gradient mb-2 text-3xl font-bold md:text-4xl">
                    {event.school || event.name}
                  </h1>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(event.date).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                    )}
                    <Badge variant={event.active ? 'secondary' : 'outline'}>
                      {event.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/admin/events/${id}/edit`)}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  onClick={fetchEvent}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid animate-slide-up grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card variant="glass" className="group hover:scale-105 transition-transform cursor-pointer"
                onClick={() => router.push(`/admin/photos?event=${id}`)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fotos</p>
                  <p className="text-2xl font-bold">{event.stats?.totalPhotos || 0}</p>
                  {event.stats?.untaggedPhotos > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {event.stats.untaggedPhotos} sin etiquetar
                    </p>
                  )}
                </div>
                <Camera className="h-8 w-8 text-blue-500 opacity-50 group-hover:opacity-100" />
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" className="group hover:scale-105 transition-transform cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Familias</p>
                  <p className="text-2xl font-bold">{event.stats?.totalSubjects || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Con tokens</p>
                </div>
                <Users className="h-8 w-8 text-purple-500 opacity-50 group-hover:opacity-100" />
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" className="group hover:scale-105 transition-transform cursor-pointer"
                onClick={() => router.push(`/admin/orders?event=${id}`)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos</p>
                  <p className="text-2xl font-bold">{event.stats?.totalOrders || 0}</p>
                  {event.stats?.pendingOrders > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      {event.stats.pendingOrders} pendientes
                    </p>
                  )}
                </div>
                <ShoppingCart className="h-8 w-8 text-green-500 opacity-50 group-hover:opacity-100" />
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" className="group hover:scale-105 transition-transform">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ingresos</p>
                  <p className="text-2xl font-bold">
                    ${(event.stats?.revenue || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Total recaudado</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500 opacity-50 group-hover:opacity-100" />
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Precio/Foto</p>
                  <p className="text-2xl font-bold">
                    ${event.photo_price || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Por unidad</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card variant="glass" className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Button
                variant="outline"
                className="h-auto flex-col py-4 hover:bg-blue-50 hover:border-blue-300 group"
                onClick={() => router.push(`/admin/photos?event=${id}`)}
              >
                <Upload className="mb-2 h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Subir Fotos</span>
                <span className="text-xs text-muted-foreground">Con watermark</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col py-4 hover:bg-purple-50 hover:border-purple-300 group"
                onClick={() => router.push(`/admin/photos?event=${id}&view=gallery`)}
              >
                <Eye className="mb-2 h-6 w-6 text-purple-600 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Ver Galería</span>
                <span className="text-xs text-muted-foreground">Todas las fotos</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col py-4 hover:bg-amber-50 hover:border-amber-300 group"
                onClick={() => router.push(`/admin/events/${id}/qr`)}
              >
                <QrCode className="mb-2 h-6 w-6 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="font-medium">QRs (Opcional)</span>
                <span className="text-xs text-muted-foreground">PDF para escuela</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col py-4 hover:bg-orange-50 hover:border-orange-300 group"
                onClick={() => router.push(`/admin/events/${id}/secuencial`)}
              >
                <Edit3 className="mb-2 h-6 w-6 text-orange-600 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Secuencial</span>
                <span className="text-xs text-muted-foreground">Sin QR</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col py-4 hover:bg-green-50 hover:border-green-300 group"
                onClick={() => router.push(`/admin/orders?event=${id}`)}
              >
                <Package className="mb-2 h-6 w-6 text-green-600 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Ver Pedidos</span>
                <span className="text-xs text-muted-foreground">Gestionar ventas</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* School Distribution Section */}
        <Card variant="glass" className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <CardHeader>
            <CardTitle>Distribución Escolar</CardTitle>
            <p className="text-sm text-muted-foreground">
              Exporta tokens/links para que la escuela distribuya a los padres
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Button
                variant="outline"
                className="h-auto flex-col py-4 hover:bg-blue-50 hover:border-blue-300 group"
                onClick={() => {
                  // Export tokens as CSV for school distribution
                  fetch(`/api/admin/events/${id}/tokens/export`)
                    .then(res => res.blob())
                    .then(blob => {
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `tokens-${event?.name || id}.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    })
                    .catch(err => console.error('Error exporting tokens:', err));
                }}
              >
                <Download className="mb-2 h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Exportar CSV</span>
                <span className="text-xs text-muted-foreground">Lista para escuela</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col py-4 hover:bg-green-50 hover:border-green-300 group"
                onClick={() => {
                  // Generate and send email template
                  fetch(`/api/admin/events/${id}/tokens/email-template`)
                    .then(res => res.json())
                    .then(data => {
                      navigator.clipboard.writeText(data.template);
                      alert('Plantilla de email copiada al portapapeles');
                    })
                    .catch(err => console.error('Error getting email template:', err));
                }}
              >
                <Mail className="mb-2 h-6 w-6 text-green-600 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Plantilla Email</span>
                <span className="text-xs text-muted-foreground">Para envío masivo</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subjects Section */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <SubjectsSection eventId={id} />
        </div>

        {/* Photos Preview Section */}
        {event.stats?.totalPhotos > 0 && (
          <Card variant="glass" className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Fotos del Evento</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/admin/photos?event=${id}`)}
                >
                  Ver todas
                  <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>{event.stats.totalPhotos} fotos subidas</p>
                {event.stats.untaggedPhotos > 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    {event.stats.untaggedPhotos} fotos necesitan ser etiquetadas
                  </p>
                )}
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => router.push(`/admin/photos?event=${id}`)}
                >
                  Gestionar Fotos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
