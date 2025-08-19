'use client';

import Link from 'next/link';
import { Plus, Calendar, ArrowLeft, Home } from 'lucide-react';
import { EventCard } from '@/components/admin/EventCard';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    if (!confirm(`¿Estás seguro de que quieres eliminar el evento "${event.school}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingEventId(event.id);
    
    try {
      const response = await fetch(`/api/admin/events/${event.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar el evento');
      }

      // Refresh the page to show updated events list
      router.refresh();
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
  return (
    <div className="liquid-glass-app min-h-screen">
      <div className="container mx-auto space-y-6 lg:space-y-8 p-6">
        {/* Header with Breadcrumbs */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-3xl" />
          <div className="relative liquid-card p-8">
            {/* Breadcrumbs */}
            <nav className="liquid-description mb-4 flex items-center gap-2 text-sm">
              <Link
                href="/admin"
                className="flex items-center gap-1 liquid-nav-text transition-colors hover:text-primary-600"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <span>/</span>
              <span className="liquid-nav-text font-medium">Eventos</span>
            </nav>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Link href="/admin">
                  <button className="liquid-button rounded-full p-2">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                </Link>
                <div>
                  <h1 className="liquid-title mb-2 text-3xl md:text-4xl">
                    Eventos
                  </h1>
                  <p className="liquid-subtitle">
                    Gestiona tus sesiones fotográficas y organiza por colegios
                  </p>
                </div>
              </div>
              <Link href="/admin/events/new">
                <button className="liquid-button liquid-shine shadow-lg px-6 py-3 rounded-2xl flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  <span className="liquid-button-text font-semibold">Nuevo Evento</span>
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="liquid-card animate-slide-up border-red-200 bg-red-50/50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-700 dark:text-red-300">
              Error al cargar eventos: {error.message}
            </p>
          </div>
        )}

        {/* Events Content */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {!events || events.length === 0 ? (
            <div className="liquid-card p-8 text-center">
              <EmptyState
                icon={Calendar}
                title="No hay eventos creados"
                description="Crea tu primer evento para comenzar a organizar tus sesiones fotográficas."
              >
                <Link href="/admin/events/new" className="inline-block">
                  <button className="liquid-button liquid-shine px-6 py-3 rounded-2xl">
                    <span className="liquid-button-text font-medium">Crear primer evento</span>
                  </button>
                </Link>
              </EmptyState>
            </div>
          ) : (
            <div className="scrollbar-elevated grid max-h-[70vh] gap-6 overflow-auto pr-1">
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                >
                  <EventCard 
                    event={event} 
                    onDelete={handleDeleteEvent}
                    onEdit={handleEditEvent}
                    onView={handleViewEvent}
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
