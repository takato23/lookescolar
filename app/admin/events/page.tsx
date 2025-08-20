import { EventsPageClient } from '@/components/admin/EventsPageClient';
import { absoluteUrl } from '@/lib/absoluteUrl';

// Obtiene eventos desde el backend usando ruta relativa.
// En desarrollo usa el endpoint simple que no requiere service role.
async function getEvents() {
  try {
    // Usar siempre el endpoint completo con estadísticas para mostrar conteos reales
    const path = '/api/admin/events?include_stats=true';

    const response = await fetch(
      path.startsWith('/') ? await absoluteUrl(path) : path,
      {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }

    const data = await response.json();
    
    // El endpoint devuelve directamente un array, no un objeto con propiedad 'events'
    const events = Array.isArray(data) ? data : (data.events || []);
    return { events, error: null };
  } catch (error) {
    console.error('[Service] Error obteniendo eventos:', error);
    return { events: null, error };
  }
}

// Force dynamic rendering para que se actualice con router.refresh()
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EventsPage() {
  const { events, error } = await getEvents();
  return <EventsPageClient events={events as any[]} error={error} />;
}
