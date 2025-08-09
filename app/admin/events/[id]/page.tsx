import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SubjectsSection from './subjects-section';

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Obtener evento
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (eventError || !event) {
    notFound();
  }

  // Obtener estadísticas
  const { count: subjectsCount } = await supabase
    .from('subjects')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id);

  const { count: photosCount } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id);

  const { count: ordersCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id)
    .eq('status', 'completed');

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link
            href="/admin/events"
            className="mb-4 inline-block text-white/70 transition-colors hover:text-white"
          >
            ← Volver a eventos
          </Link>
          <h1 className="mb-2 text-4xl font-bold text-white">{event.school}</h1>
          <div className="flex items-center space-x-4 text-white/70">
            <span aria-label="fecha del evento">
              📅 {new Date(event.date).toLocaleDateString('es-AR')}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                event.active
                  ? 'border border-green-500/50 bg-green-500/20 text-green-200'
                  : 'border border-gray-500/50 bg-gray-500/20 text-gray-200'
              }`}
            >
              {event.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/admin/events/${id}/edit`}
            className="rounded-xl px-4 py-2 text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
          <div className="mb-2 text-3xl">👥</div>
          <div className="mb-1 text-2xl font-bold text-white">
            {subjectsCount || 0}
          </div>
          <div className="text-white/70">Alumnos</div>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
          <div className="mb-2 text-3xl">📸</div>
          <div className="mb-1 text-2xl font-bold text-white">
            {photosCount || 0}
          </div>
          <div className="text-white/70">Fotos</div>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
          <div className="mb-2 text-3xl">🛍️</div>
          <div className="mb-1 text-2xl font-bold text-white">
            {ordersCount || 0}
          </div>
          <div className="text-white/70">Pedidos</div>
        </div>

        {/* Precio por foto no disponible en el esquema actual */}
      </div>

      {/* Tabs */}
      <div className="space-y-8">
        {/* Sujetos Section */}
        <SubjectsSection eventId={id} />

        {/* Quick Actions */}
        <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-xl font-semibold text-white">
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link
              href={`/admin/photos?event=${id}`}
              className="flex transform items-center space-x-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 p-4 text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            >
              <span className="text-2xl">📤</span>
              <span className="font-medium">Subir Fotos</span>
            </Link>

            <Link
              href={`/admin/events/${id}/qr`}
              className="flex transform items-center space-x-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 p-4 text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            >
              <span className="text-2xl">📄</span>
              <span className="font-medium">Generar PDF QRs</span>
            </Link>

            <Link
              href={`/admin/orders?event=${id}`}
              className="flex transform items-center space-x-3 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 p-4 text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            >
              <span className="text-2xl">📦</span>
              <span className="font-medium">Ver Pedidos</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
