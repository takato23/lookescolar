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
              <span className="text-foreground font-medium">Eventos</span>
            </nav>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Link href="/admin">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full p-2"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-gradient mb-2 text-3xl font-bold md:text-4xl">
                    Eventos
                  </h1>
                  <p className="text-muted-foreground">
                    Gestiona tus sesiones fotográficas y organiza por colegios
                  </p>
                </div>
              </div>
              <Link href="/admin/events/new">
                <Button
                  variant="primary"
                  size="lg"
                  className="shadow-3d rounded-full px-6"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Nuevo Evento
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card
            variant="glass"
            className="animate-slide-up border-red-200 bg-red-50/50 dark:bg-red-900/20"
          >
            <CardContent className="p-4">
              <p className="text-sm text-red-700 dark:text-red-300">
                Error al cargar eventos: {error.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Events Content */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {!events || events.length === 0 ? (
            <Card variant="glass" className="p-8 text-center">
              <CardContent>
                <EmptyState
                  icon={Calendar}
                  title="No hay eventos creados"
                  description="Crea tu primer evento para comenzar a organizar tus sesiones fotográficas."
                >
                  <Link href="/admin/events/new" className="inline-block">
                    <Button variant="secondary" className="rounded-full">
                      Crear primer evento
                    </Button>
                  </Link>
                </EmptyState>
              </CardContent>
            </Card>
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
