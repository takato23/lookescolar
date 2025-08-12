import { EventsPageClient } from '@/components/admin/EventsPageClient';
import { absoluteUrl } from '@/lib/absoluteUrl';

// Obtiene eventos desde el backend usando ruta relativa.
// En desarrollo usa el endpoint simple que no requiere service role.
async function getEvents() {
  try {
    const path =
      process.env.NODE_ENV === 'production'
        ? '/api/admin/events?include_stats=true'
        : '/api/admin/events-simple';

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

    const data = (await response.json()) as { events: unknown };
    return { events: (data as { events: unknown }).events, error: null };
  } catch (error) {
    console.error('[Service] Error obteniendo eventos:', error);
    return { events: null, error };
  }
}

export default async function EventsPage() {
  const { events, error } = await getEvents();
  return <EventsPageClient events={events as any[]} error={error} />;
}
