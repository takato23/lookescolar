'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import HierarchicalNavigation from '@/components/admin/hierarchical-navigation';
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
  // (removed unused activeView state)

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
        globalThis.fetch(`/api/admin/events/${id}`),
        globalThis.fetch(`/api/admin/events/${id}/stats`),
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
      setError('Error loading event data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="gradient-mesh min-h-screen">
        <div className="container mx-auto px-4 py-8 sm:px-6">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <RefreshCw className="text-primary mx-auto mb-4 h-8 w-8 animate-spin" />
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
        <div className="container mx-auto px-4 py-8 sm:px-6">
          <Card variant="glass" className="border-red-200 bg-red-50/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 shrink-0 text-red-600" />
                <div>
                  <p className="font-medium text-red-700">
                    Error al cargar el evento
                  </p>
                  <p className="text-sm text-red-600">
                    {error || 'Evento no encontrado'}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => router.push('/admin/events')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
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
      <div className="container mx-auto space-y-6 px-4 py-4 sm:space-y-8 sm:px-6 sm:py-8">
        {/* Mobile-optimized Header */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl" />
          <div className="relative">
            {/* Breadcrumbs - Mobile responsive */}
            <nav className="text-muted-foreground mb-4 flex items-center gap-1 overflow-x-auto text-xs sm:gap-2 sm:text-sm">
              <Link
                href="/admin"
                className="flex shrink-0 items-center gap-1 transition-colors hover:text-blue-600"
              >
                <Home className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <span className="text-muted-foreground/50">/</span>
              <Link
                href="/admin/events"
                className="shrink-0 transition-colors hover:text-blue-600"
              >
                Eventos
              </Link>
              <span className="text-muted-foreground/50">/</span>
              <span className="text-foreground truncate font-medium">
                {event.school || event.name}
              </span>
            </nav>

            {/* Header Content - Mobile responsive */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/admin/events')}
                  className="shrink-0 rounded-full p-2"
                >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-gradient mb-2 truncate bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent sm:text-3xl md:text-4xl">
                    {event.school || event.name}
                  </h1>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                      <span className="truncate">
                        {new Date(event.date).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {event.location && (
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    <Badge
                      variant={event.active ? 'secondary' : 'outline'}
                      className="shrink-0"
                    >
                      {event.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Mobile responsive */}
              <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadEventData}
                  className="glass-button shrink-0"
                >
                  <RefreshCw className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Actualizar</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/gallery/${id}`)}
                  className="shrink-0"
                >
                  <Eye className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Vista</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/events/${id}/edit`)}
                  className="glass-button shrink-0"
                >
                  <Settings className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
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
            <Card
              variant="glass"
              className="glass-card mb-6 border border-border/20"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">
                    Resumen del Evento
                  </CardTitle>
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                  <div className="glass-card rounded-lg border border-blue-200/30 bg-blue-50/20 p-3 text-center">
                    <Users className="mx-auto mb-2 h-6 w-6 text-blue-500 sm:h-8 sm:w-8" />
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300 sm:text-2xl">
                      {stats.active_students || 0}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 sm:text-sm">
                      Estudiantes
                    </p>
                  </div>

                  <div className="glass-card rounded-lg border border-purple-200/30 bg-purple-50/20 p-3 text-center">
                    <BookOpen className="mx-auto mb-2 h-6 w-6 text-purple-500 sm:h-8 sm:w-8" />
                    <p className="text-lg font-bold text-purple-700 dark:text-purple-300 sm:text-2xl">
                      {stats.active_courses || 0}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 sm:text-sm">
                      Cursos
                    </p>
                  </div>

                  <div className="glass-card rounded-lg border border-orange-200/30 bg-orange-50/20 p-3 text-center">
                    <Camera className="mx-auto mb-2 h-6 w-6 text-orange-500 sm:h-8 sm:w-8" />
                    <p className="text-lg font-bold text-orange-700 dark:text-orange-300 sm:text-2xl">
                      {stats.approved_photos || 0}
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 sm:text-sm">
                      Fotos
                    </p>
                    {stats.untagged_photos > 0 && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        {stats.untagged_photos} sin tags
                      </p>
                    )}
                  </div>

                  <div className="glass-card rounded-lg border border-green-200/30 bg-green-50/20 p-3 text-center">
                    <ShoppingCart className="mx-auto mb-2 h-6 w-6 text-green-500 sm:h-8 sm:w-8" />
                    <p className="text-lg font-bold text-green-700 dark:text-green-300 sm:text-2xl">
                      {stats.total_orders || 0}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 sm:text-sm">
                      Pedidos
                    </p>
                    {stats.pending_orders > 0 && (
                      <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                        {stats.pending_orders} pendientes
                      </p>
                    )}
                  </div>

                  <div className="glass-card col-span-2 rounded-lg border border-emerald-200/30 bg-emerald-50/20 p-3 text-center sm:col-span-1">
                    <DollarSign className="mx-auto mb-2 h-6 w-6 text-emerald-500 sm:h-8 sm:w-8" />
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 sm:text-2xl">
                      ${(stats.total_revenue || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 sm:text-sm">
                      Ingresos
                    </p>
                  </div>
                </div>

                {/* Progress Indicators - Mobile responsive */}
                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border/20 pt-4 sm:grid-cols-3">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Progreso de etiquetado</span>
                      <span className="font-medium">
                        {stats.photo_tagging_progress || 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/30 dark:bg-secondary/50">
                      <div
                        className="h-2 rounded-full bg-blue-500 transition-all"
                        style={{
                          width: `${stats.photo_tagging_progress || 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Tasa de pedidos</span>
                      <span className="font-medium">
                        {stats.order_conversion_rate || 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/30 dark:bg-secondary/50">
                      <div
                        className="h-2 rounded-full bg-green-500 transition-all"
                        style={{
                          width: `${stats.order_conversion_rate || 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Organización</span>
                      <span className="font-medium">
                        {stats.active_students > 0
                          ? Math.round(
                              (stats.students_with_course /
                                stats.active_students) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/30 dark:bg-secondary/50">
                      <div
                        className="h-2 rounded-full bg-purple-500 transition-all"
                        style={{
                          width: `${
                            stats.active_students > 0
                              ? Math.round(
                                  (stats.students_with_course /
                                    stats.active_students) *
                                    100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity - Mobile responsive */}
            {stats.recent_activity && (
              <Card
                variant="glass"
                className="glass-card mb-6 border border-border/20"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">
                    Actividad Reciente (7 días)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="glass-card rounded-lg p-3">
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400 sm:text-2xl">
                        {stats.recent_activity.new_students}
                      </p>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        Nuevos estudiantes
                      </p>
                    </div>
                    <div className="glass-card rounded-lg p-3">
                      <p className="text-xl font-bold text-orange-600 dark:text-orange-400 sm:text-2xl">
                        {stats.recent_activity.new_photos}
                      </p>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        Fotos subidas
                      </p>
                    </div>
                    <div className="glass-card rounded-lg p-3">
                      <p className="text-xl font-bold text-green-600 dark:text-green-400 sm:text-2xl">
                        {stats.recent_activity.new_orders}
                      </p>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        Nuevos pedidos
                      </p>
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
            eventSnapshot={event}
            analytics={stats}
          />
        </div>
      </div>
    </div>
  );
}
