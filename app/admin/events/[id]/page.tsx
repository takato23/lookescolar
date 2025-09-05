'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SubjectsSection from './subjects-section';
import { StudentCSVUploader } from '@/components/admin/StudentCSVUploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Box as Download,
  Edit3,
  Eye,
  AlertCircle,
  RefreshCw,
  Home,
  Mail,
  Package,
  Wrench,
  Link as LinkIcon,
  Settings,
  FileUser,
} from 'lucide-react';
import { fetchEventMetrics } from './actions';
import { computePhotoAdminUrl } from '@/lib/routes/admin';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Restaurado: NO redirigir automáticamente - mantener gestión de eventos específica
  const id = params['id'] as string;
  // Enhanced state management with proper typing
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams?.get('tab') || 'overview');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [refreshSubjects, setRefreshSubjects] = useState(0);
  const [metrics, setMetrics] = useState<{
    orders: { total: number; paid: number; pending: number };
    students: { total: number };
    photos: { total: number; unassigned: number | null };
  } | null>(null);
  
  // Performance monitoring state
  const [loadTime, setLoadTime] = useState<number>(0);

  useEffect(() => {
    if (id) {
      fetchEvent();
      fetchSubjects();
    }
  }, [id]);

  useEffect(() => {
    if (refreshSubjects > 0) {
      fetchSubjects();
    }
  }, [refreshSubjects]);

  const fetchEvent = async () => {
    const startTime = performance.now();
    
    try {
      setLoading(true);
      setError(null);
      
      // Enhanced error handling with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      let response = await fetch(`/api/admin/events/${id}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`Primary endpoint failed (${response.status}), trying fallback`);
        
        // Fallback with timeout
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), 6000);
        
        response = await fetch(`/api/admin/events?id=${id}`, {
          signal: fallbackController.signal,
          headers: { 'Content-Type': 'application/json' },
        });
        
        clearTimeout(fallbackTimeout);
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch event: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setEvent(data.event || data);
      
      const fetchTime = performance.now() - startTime;
      setLoadTime(fetchTime);
      console.debug(`[Performance] Event loaded in ${fetchTime.toFixed(2)}ms`);
      
    } catch (err) {
      const fetchTime = performance.now() - startTime;
      console.error(`[Performance] Event fetch failed after ${fetchTime.toFixed(2)}ms:`, err);
      
      const errorMessage = err instanceof Error 
        ? err.name === 'AbortError' 
          ? 'Request timed out. Please check your connection.'
          : err.message
        : 'Error loading event';
        
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`/api/admin/subjects?event_id=${id}`, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
      } else {
        console.warn(`Subjects fetch failed: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error fetching subjects:', error);
      }
    }
  };

  const handleStudentsAdded = (newStudents: any[]) => {
    setSubjects(prev => [...prev, ...newStudents]);
    setRefreshSubjects(prev => prev + 1);
  };

  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabValue);
    window.history.replaceState({}, '', url.toString());
  };

  // Load metrics with performance monitoring and retry logic
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 2;
    
    const loadMetrics = async () => {
      try {
        const startTime = performance.now();
        const m = await fetchEventMetrics(id);
        const metricsTime = performance.now() - startTime;
        
        console.debug(`[Performance] Metrics loaded in ${metricsTime.toFixed(2)}ms`);
        setMetrics(m);
      } catch (e) {
        console.warn(`Metrics load failed (attempt ${retryCount + 1}):`, e);
        
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(loadMetrics, 1000 * retryCount); // Exponential backoff
        }
      }
    };
    
    loadMetrics();
  }, [id]);

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
        {/* Enhanced Header with Breadcrumbs */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-3xl" />
          <div className="relative liquid-card p-6">
            {/* Enhanced Breadcrumbs */}
            <nav className="liquid-description mb-6 flex items-center gap-2 text-sm">
              <Link
                href="/admin"
                className="flex items-center gap-1 liquid-nav-text transition-colors hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <span className="text-gray-400">›</span>
              <Link
                href="/admin/events"
                className="liquid-nav-text transition-colors hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Eventos
              </Link>
              <span className="text-gray-400">›</span>
              <span className="liquid-nav-text font-semibold px-3 py-2 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg">
                {event.school || event.name}
              </span>
            </nav>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/admin/events')}
                  className="liquid-button liquid-button-secondary rounded-full p-3"
                  title="Volver a eventos"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="liquid-title mb-3 text-3xl font-bold md:text-4xl">
                    {event.school || event.name}
                  </h1>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 liquid-description">
                      <Calendar className="h-4 w-4" />
                      {new Date(event.date).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        weekday: 'long'
                      })}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 liquid-description">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                    )}
                    <Badge variant={event.active ? 'secondary' : 'outline'} className="liquid-label">
                      {event.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Primary Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/admin/events/${id}/edit`)}
                  className="gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Editar Información
                </Button>
                <button
                  onClick={() => router.push(`/admin/events/${id}/unified`)}
                  className="liquid-button liquid-button-primary px-6 py-3 rounded-xl flex items-center gap-2 font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                >
                  <Camera className="h-5 w-5" />
                  <span className="liquid-button-text">🚀 Nueva Interfaz Unificada</span>
                </button>
                
                <button
                  onClick={() => {
                    const url = computePhotoAdminUrl(
                      id,
                      (event?.settings?.general?.rootFolderId as string | undefined) || undefined
                    );
                    router.push(url);
                  }}
                  className="liquid-button liquid-button-secondary px-4 py-3 rounded-xl flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  <span className="liquid-button-text">AdminFotos (Actual)</span>
                </button>
                
                <button
                  onClick={() => router.push(`/gallery/${id}`)}
                  className="liquid-button liquid-button-secondary px-4 py-3 rounded-xl flex items-center gap-2"
                  aria-label="Vista cliente"
                >
                  <Eye className="h-4 w-4" />
                  <span className="liquid-button-text">Vista Cliente</span>
                </button>
                
                <button
                  onClick={async () => {
                    const publicUrl = `${window.location.origin}/gallery/${id}`;
                    try {
                      await navigator.clipboard.writeText(publicUrl);
                      alert('Link público copiado al portapapeles');
                    } catch (error) {
                      alert('No se pudo copiar el link');
                    }
                  }}
                  className="liquid-button liquid-button-secondary p-3 rounded-xl"
                  title="Copiar link público"
                >
                  <LinkIcon className="h-4 w-4" />
                </button>
                
                <button
                  onClick={fetchEvent}
                  className="liquid-button liquid-button-secondary p-3 rounded-xl"
                  title="Actualizar datos"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid animate-slide-up grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card variant="glass" className="group hover:scale-105 transition-transform cursor-pointer"
                onClick={() => router.push(`/gallery/${id}`)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fotos</p>
                  <p className="text-2xl font-bold">{metrics?.photos.total ?? event.stats?.totalPhotos ?? 0}</p>
                  <p className="text-xs mt-1">
                    {metrics?.photos.unassigned === null ? (
                      <span className="text-gray-500" title="No disponible (esquema legacy)">—</span>
                    ) : (
                      <span className="text-amber-600">{metrics?.photos.unassigned ?? 0} sin asignar</span>
                    )}
                  </p>
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
                  <p className="text-2xl font-bold">{metrics?.students.total ?? event.stats?.totalSubjects ?? 0}</p>
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
                  <p className="text-2xl font-bold">{metrics?.orders.total ?? event.stats?.totalOrders ?? 0}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    {metrics?.orders.pending ?? event.stats?.pendingOrders ?? 0} pendientes
                  </p>
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
                onClick={() => router.push(`/admin/events/${id}/unified`)}
              >
                <Upload className="mb-2 h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Gestionar Fotos</span>
                <span className="text-xs text-muted-foreground">Admin/Subida/Tags</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col py-4 hover:bg-purple-50 hover:border-purple-300 group"
                onClick={() => router.push(`/gallery/${id}`)}
              >
                <Eye className="mb-2 h-6 w-6 text-purple-600 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Ver Galería</span>
                <span className="text-xs text-muted-foreground">Vista cliente</span>
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

              <Button
                variant="outline"
                className="h-auto flex-col py-4 hover:bg-rose-50 hover:border-rose-300 group"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/admin/photos/repair-previews', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ eventId: id }),
                    });
                    if (!res.ok) throw new Error('Error reparando previews');
                    alert('Reparador ejecutado: previews/watermarks regenerados');
                  } catch (e) {
                    alert('No se pudo ejecutar el reparador');
                  }
                }}
              >
                <Wrench className="mb-2 h-6 w-6 text-rose-600 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Reparar previews</span>
                <span className="text-xs text-muted-foreground">Watermark fuerte</span>
              </Button>
            </div>
          </CardContent>
        </Card>



        {/* Main Content Tabs */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Resumen</span>
              </TabsTrigger>
              <TabsTrigger value="students" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Estudiantes</span>
                {subjects.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {subjects.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="photos" className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Fotos</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Configuración</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6">
              <div className="space-y-6">
                {/* School Distribution Section */}
                <Card variant="glass">
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

                      <Button
                        variant="outline"
                        className="h-auto flex-col py-4 hover:bg-indigo-50 hover:border-indigo-300 group"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/gallery/${id}`);
                          alert('Link público copiado');
                        }}
                      >
                        <LinkIcon className="mb-2 h-6 w-6 text-indigo-600 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Copiar Link Público</span>
                        <span className="text-xs text-muted-foreground">/gallery/{id}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students" className="mt-6">
              <div className="space-y-6">
                {/* Prominent CSV Upload Hero Section */}
                <div className="relative overflow-hidden" data-csv-uploader>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-primary-500/10 blur-2xl" />
                  <Card variant="glass" className="relative border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-purple-50/30 dark:from-blue-900/20 dark:to-purple-900/20">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50">
                              <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            Importar Estudiantes
                          </CardTitle>
                          <p className="text-muted-foreground mt-2">
                            La forma más rápida de agregar estudiantes es usando un archivo CSV
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                          Recomendado
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <StudentCSVUploader
                        eventId={id}
                        eventName={event?.name || event?.school}
                        onStudentsAdded={handleStudentsAdded}
                        className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-6 border border-blue-200/30"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Students Management Section */}
                <Card variant="glass">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Estudiantes Registrados
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {subjects.length > 0 
                            ? `${subjects.length} estudiante${subjects.length !== 1 ? 's' : ''} con tokens generados`
                            : 'No hay estudiantes registrados aún'
                          }
                        </p>
                      </div>
                      {subjects.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {subjects.length} activo{subjects.length !== 1 ? 's' : ''}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Export students list
                              fetch(`/api/admin/events/${id}/tokens/export`)
                                .then(res => res.blob())
                                .then(blob => {
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `estudiantes-${event?.name || id}.csv`;
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                })
                                .catch(err => console.error('Error exporting:', err));
                            }}
                            className="gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Exportar CSV
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className={subjects.length === 0 ? "py-12" : ""}>
                    {subjects.length === 0 ? (
                      <div className="text-center">
                        <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                          <FileUser className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                          ¡Comienza importando estudiantes!
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                          Usa el importador CSV de arriba para agregar estudiantes rápidamente. 
                          También puedes agregarlos uno por uno o con una lista de texto.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            // Scroll to CSV uploader
                            document.querySelector('[data-csv-uploader]')?.scrollIntoView({ 
                              behavior: 'smooth', 
                              block: 'start' 
                            });
                          }}
                          className="gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Ir al importador
                        </Button>
                      </div>
                    ) : (
                      <SubjectsSection eventId={id} />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos" className="mt-6">
              <Card variant="glass">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Gestión de Fotos</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/gallery/${id}`)}
                      >
                        Ver galería
                        <Eye className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          const url = computePhotoAdminUrl(
                            id,
                            (event?.settings?.general?.rootFolderId as string | undefined) || undefined
                          );
                          router.push(url);
                        }}
                      >
                        Administrar
                        <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Camera className="mx-auto h-12 w-12 mb-3 opacity-50" />
                    <p className="text-muted-foreground mb-4">{event?.stats?.totalPhotos || 0} fotos subidas</p>
                    {event?.stats?.untaggedPhotos > 0 && (
                      <p className="text-sm text-amber-600 mb-4">
                        {event.stats.untaggedPhotos} fotos necesitan ser etiquetadas
                      </p>
                    )}
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="secondary"
                        onClick={() => router.push(`/gallery/${id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Galería
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/admin/events/${id}/unified`)}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Administrar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="mt-6">
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Configuración del Evento</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Ajustes avanzados y herramientas de mantenimiento
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className="h-auto flex-col py-4 hover:bg-rose-50 hover:border-rose-300 group"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/admin/photos/repair-previews', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ eventId: id }),
                          });
                          if (!res.ok) throw new Error('Error reparando previews');
                          alert('Reparador ejecutado: previews/watermarks regenerados');
                        } catch (e) {
                          alert('No se pudo ejecutar el reparador');
                        }
                      }}
                    >
                      <Wrench className="mb-2 h-6 w-6 text-rose-600 group-hover:scale-110 transition-transform" />
                      <span className="font-medium">Reparar previews</span>
                      <span className="text-xs text-muted-foreground">Watermark fuerte</span>
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
            </TabsContent>
          </Tabs>
        </div>


      </div>
    </div>
  );
}
