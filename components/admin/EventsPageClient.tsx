'use client';

import Link from 'next/link';
import { Plus, Calendar, ArrowLeft, Home, Sparkles, TrendingUp, ChevronRight } from 'lucide-react';
import { EventCard } from '@/components/admin/EventCard';
import { EmptyState } from '@/components/ui/empty-state';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface EventsPageClientProps {
  events: any[] | null;
  error: any;
}

export function EventsPageClient({ events, error }: EventsPageClientProps) {
  const router = useRouter();
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const handleDeleteEvent = async (event: any) => {
    const hasPhotos = event.stats?.totalPhotos > 0;
    const hasSubjects = event.stats?.totalSubjects > 0;
    
    // Construir mensaje de confirmación detallado
    let confirmMessage = `¿Estás seguro de que quieres eliminar el evento "${event.school || event.name}"?\n\n`;
    
    if (hasPhotos || hasSubjects) {
      confirmMessage += "⚠️ ATENCIÓN: Este evento contiene datos que se eliminarán:\n";
      if (hasPhotos) {
        confirmMessage += `• ${event.stats.totalPhotos} fotos (se borrarán del almacenamiento)\n`;
      }
      if (hasSubjects) {
        confirmMessage += `• ${event.stats.totalSubjects} estudiantes/familias\n`;
      }
      confirmMessage += "\n";
    }
    
    confirmMessage += "Esta acción NO se puede deshacer.\n\n¿Continuar con la eliminación?";

    if (!confirm(confirmMessage)) {
      return;
    }

    setDeletingEventId(event.id);
    
    try {
      // Usar force=true para eliminar eventos con fotos/sujetos
      const response = await fetch(`/api/admin/events/${event.id}?force=true`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar el evento');
      }

      // Refresh the page to show updated events list
      router.refresh();
      alert('Evento eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar el evento');
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleEditEvent = (event: any) => {
    // TODO: Implement edit functionality
    console.log('Edit event:', event);
    alert('Funcionalidad de edición pendiente de implementar');
  };

  const handleViewEvent = (event: any) => {
    router.push(`/admin/events/${event.id}`);
  };

  // Calculate statistics for the dashboard
  const totalEvents = events?.length || 0;
  const totalPhotos = events?.reduce((sum, event) => sum + (event.stats?.totalPhotos || 0), 0) || 0;
  const totalRevenue = events?.reduce((sum, event) => sum + (event.stats?.revenue || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto space-y-6 lg:space-y-8 p-4 sm:p-6">
        {/* Enhanced Header with Breadcrumbs and Stats */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl" />
          <div className="relative liquid-glass-card-ios26 p-6 sm:p-8 rounded-2xl border border-white/20 shadow-xl">
            {/* Breadcrumbs */}
            <nav className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Link
                href="/admin"
                className="flex items-center gap-1 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">Eventos</span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <Link href="/admin">
                  <button className="liquid-glass-button-ios26 rounded-full p-2 hover:bg-white/10 transition-colors">
                    <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  </button>
                </Link>
                <div>
                  <h1 className="gradient-text-ios26 mb-2 text-2xl sm:text-3xl md:text-4xl font-bold">
                    Eventos
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300 sm:text-base">
                    Gestiona tus sesiones fotográficas y organiza por colegios
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/admin/events/new">
                  <button className="liquid-glass-button-ios26 shadow-lg px-4 py-2 sm:px-6 sm:py-3 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all">
                    <Plus className="h-5 w-5" />
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Nuevo Evento</span>
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Stats Dashboard */}
            {events && events.length > 0 && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-stat-card-ios26 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100/50 dark:bg-blue-900/30">
                    <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Total Eventos</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{totalEvents}</p>
                  </div>
                </div>
                
                <div className="glass-stat-card-ios26 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/30">
                    <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Fotos Totales</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{totalPhotos}</p>
                  </div>
                </div>
                
                <div className="glass-stat-card-ios26 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100/50 dark:bg-green-900/30">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Ingresos Totales</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">${totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="liquid-glass-card-ios26 animate-slide-up border-red-200 bg-red-50/50 dark:bg-red-900/20 p-4 rounded-xl border">
            <p className="text-sm text-red-700 dark:text-red-300">
              Error al cargar eventos: {error.message}
            </p>
          </div>
        )}

        {/* Events Content */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {!events || events.length === 0 ? (
            <div className="liquid-glass-card-ios26 p-8 text-center rounded-2xl border border-white/20 shadow-lg">
              <EmptyState
                icon={Calendar}
                title="No hay eventos creados"
                description="Crea tu primer evento para comenzar a organizar tus sesiones fotográficas."
              >
                <Link href="/admin/events/new" className="inline-block">
                  <button className="liquid-glass-button-ios26 px-6 py-3 rounded-xl hover:bg-white/10 transition-all">
                    <span className="font-medium text-gray-800 dark:text-gray-200">Crear primer evento</span>
                  </button>
                </Link>
              </EmptyState>
            </div>
          ) : (
            // Enhanced grid layout with more columns for better space utilization
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                >
                  <EventCard 
                    event={event} 
                    onDelete={handleDeleteEvent}
                    onEdit={handleEditEvent}
                    onView={handleViewEvent}
                    className="h-full flex flex-col"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}