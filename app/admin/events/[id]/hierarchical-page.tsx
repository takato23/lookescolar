'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import HierarchicalNavigation from '@/components/admin/hierarchical-navigation';
import VirtualizedStudentGrid from '@/components/admin/virtualized-student-grid';
import CourseManagement from '@/components/admin/course-management';
import {
  ArrowLeft,
  RefreshCw,
  Home,
  Eye,
  Settings,
  AlertCircle,
  TrendingUp,
  Users,
  BookOpen,
  Camera,
  DollarSign,
  Calendar,
  MapPin,
  ShoppingCart,
} from 'lucide-react';

export default function HierarchicalEventPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params['id'] as string;

  // State
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [activeView, setActiveView] = useState('navigation');

  // Initialize from URL params
  useEffect(() => {
    const view = searchParams?.get('view') || 'navigation';
    setActiveView(view);
  }, [searchParams]);

  // Load event data
  useEffect(() => {
    if (id) {
      loadEventData();
    }
  }, [id]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const [eventRes, statsRes] = await Promise.all([
        fetch(`/api/admin/events/${id}`),
        fetch(`/api/admin/events/${id}/stats`),
      ]);

      if (eventRes.ok) {
        const eventData = await eventRes.json();
        setEvent(eventData.event);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }
    } catch (err) {
      console.error('Error loading event data:', err);
      setError('Error loading event data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="gradient-mesh min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg">Cargando evento...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="gradient-mesh min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <Card variant="glass" className="border-red-200 bg-red-50/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
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
                <ArrowLeft className="h-4 w-4 mr-2" />
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
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Mobile-optimized Header */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-3xl" />
          <div className="relative">
            {/* Breadcrumbs - Mobile responsive */}
            <nav className="text-muted-foreground mb-4 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm overflow-x-auto">
              <Link
                href="/admin"
                className="flex items-center gap-1 transition-colors hover:text-primary-600 shrink-0"
              >
                <Home className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <span className="text-muted-foreground/50">/</span>
              <Link
                href="/admin/events"
                className="transition-colors hover:text-primary-600 shrink-0"
              >
                Eventos
              </Link>
              <span className="text-muted-foreground/50">/</span>
              <span className="text-foreground font-medium truncate">
                {event.school || event.name}
              </span>
            </nav>

            {/* Header Content - Mobile responsive */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/admin/events')}
                  className="rounded-full p-2 shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-gradient mb-2 text-xl sm:text-3xl md:text-4xl font-bold truncate">
                    {event.school || event.name}
                  </h1>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      <span className="truncate">
                        {new Date(event.date).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    <Badge variant={event.active ? 'secondary' : 'outline'} className="shrink-0">
                      {event.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Mobile responsive */}
              <div className="flex gap-2 shrink-0 overflow-x-auto pb-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadEventData}
                  className="shrink-0"
                >
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Actualizar</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/gallery/${id}`)}
                  className="shrink-0"
                >
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Vista</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/events/${id}/edit`)}
                  className="shrink-0"
                >
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Config</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile-optimized Stats Dashboard */}
        {stats && (
          <div className="animate-slide-up">
            {/* Performance Overview - Mobile first */}
            <Card variant="glass" className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Resumen del Evento</CardTitle>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">
                      {stats.performance?.health_score || 0}% Salud
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Mobile-optimized grid - 2 columns on mobile, more on larger screens */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  <div className="text-center p-3 rounded-lg bg-blue-50/50 border border-blue-200/50">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-blue-500" />
                    <p className="text-lg sm:text-2xl font-bold text-blue-700">
                      {stats.active_students || 0}
                    </p>
                    <p className="text-xs sm:text-sm text-blue-600">Estudiantes</p>
                  </div>
                  
                  <div className="text-center p-3 rounded-lg bg-purple-50/50 border border-purple-200/50">
                    <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-purple-500" />
                    <p className="text-lg sm:text-2xl font-bold text-purple-700">
                      {stats.active_courses || 0}
                    </p>
                    <p className="text-xs sm:text-sm text-purple-600">Cursos</p>
                  </div>
                  
                  <div className="text-center p-3 rounded-lg bg-orange-50/50 border border-orange-200/50">
                    <Camera className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-orange-500" />
                    <p className="text-lg sm:text-2xl font-bold text-orange-700">
                      {stats.approved_photos || 0}
                    </p>
                    <p className="text-xs sm:text-sm text-orange-600">Fotos</p>
                    {stats.untagged_photos > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        {stats.untagged_photos} sin tags
                      </p>
                    )}
                  </div>
                  
                  <div className="text-center p-3 rounded-lg bg-green-50/50 border border-green-200/50">
                    <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-lg sm:text-2xl font-bold text-green-700">
                      {stats.total_orders || 0}
                    </p>
                    <p className="text-xs sm:text-sm text-green-600">Pedidos</p>
                    {stats.pending_orders > 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        {stats.pending_orders} pendientes
                      </p>
                    )}
                  </div>
                  
                  <div className="text-center p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/50 col-span-2 sm:col-span-1">
                    <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-emerald-500" />
                    <p className="text-lg sm:text-2xl font-bold text-emerald-700">
                      ${(stats.total_revenue || 0).toLocaleString()}
                    </p>
                    <p className="text-xs sm:text-sm text-emerald-600">Ingresos</p>
                  </div>
                </div>

                {/* Progress Indicators - Mobile responsive */}
                <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progreso de etiquetado</span>
                      <span className="font-medium">{stats.photo_tagging_progress || 0}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-2 bg-blue-500 rounded-full transition-all"
                        style={{ width: `${stats.photo_tagging_progress || 0}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Tasa de pedidos</span>
                      <span className="font-medium">{stats.order_conversion_rate || 0}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-2 bg-green-500 rounded-full transition-all"
                        style={{ width: `${stats.order_conversion_rate || 0}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Organización</span>
                      <span className="font-medium">
                        {stats.active_students > 0 
                          ? Math.round((stats.students_with_course / stats.active_students) * 100)
                          : 0
                        }%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-2 bg-purple-500 rounded-full transition-all"
                        style={{ 
                          width: `${stats.active_students > 0 
                            ? Math.round((stats.students_with_course / stats.active_students) * 100)
                            : 0
                          }%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity - Mobile responsive */}
            {stats.recent_activity && (
              <Card variant="glass" className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Actividad Reciente (7 días)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">
                        {stats.recent_activity.new_students}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Nuevos estudiantes</p>
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-orange-600">
                        {stats.recent_activity.new_photos}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Fotos subidas</p>
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        {stats.recent_activity.new_orders}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Nuevos pedidos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Main Hierarchical Navigation - Mobile responsive */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <HierarchicalNavigation
            eventId={id}
            eventName={event.school || event.name}
            initialView="overview"
          />
        </div>
      </div>
    </div>
  );
}