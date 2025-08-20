import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { GalleryHeader } from '@/components/public/GalleryHeader';
import { PublicGallery } from '@/components/gallery/PublicGallery';
import { CartDrawer } from '@/components/public/CartDrawer';

interface PublicGalleryPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function PublicGalleryPage({ params }: PublicGalleryPageProps) {
  const { eventId } = await params;

  // Validar que eventId tiene formato UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!eventId || !uuidRegex.test(eventId)) {
    notFound();
  }

  // Verificar que el evento existe y está activo (SSR con service client)
  const supabase = await createServerSupabaseServiceClient();

  type EventRow = { id: string; name: string; school: string; date: string; status: string; created_at: string };

  const { data: event, error } = await supabase
    .from('events')
    .select('id, name, school, date, status, created_at')
    .eq('id', eventId)
    .eq('status', 'active')
    .single();

  if (error || !event) {
    notFound();
  }

  // Obtener conteo rápido de fotos para mostrar en header
  const { count: photoCount } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('approved', true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-yellow-300 to-orange-300">
      {/* Header */}
      <Suspense fallback={<HeaderSkeleton />}>
        <GalleryHeader
          event={event as EventRow}
          photoCount={photoCount || 0}
          formattedDate={new Date(event.date).toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        />
      </Suspense>

      {/* Contenido principal */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Galería de fotos */}
        <Suspense fallback={<GallerySkeleton />}>
          <PublicGallery eventId={eventId} />
        </Suspense>
      </div>

      {/* Carrito lateral */}
      <CartDrawer />
    </div>
  );
}

// Skeleton de carga para el header
function HeaderSkeleton() {
  return (
    <div className="animate-pulse bg-white/80 backdrop-blur-sm border-b border-white/20 p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="h-10 w-48 rounded-lg bg-gray-200" />
        <div className="h-8 w-32 rounded bg-gray-200" />
      </div>
    </div>
  );
}

// Skeleton de carga para la galería
function GallerySkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs skeleton */}
      <div className="flex space-x-1 bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-24 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 shadow-lg"
          />
        ))}
      </div>
    </div>
  );
}

// Metadata para SEO
export async function generateMetadata({ params }: PublicGalleryPageProps) {
  const { eventId } = await params;

  const supabase = await createServerSupabaseServiceClient();

  const { data: event } = await supabase
    .from('events')
    .select('name, school, date, status')
    .eq('id', eventId)
    .eq('status', 'active')
    .single();

  if (!event) {
    return {
      title: 'Galería no encontrada | Look Escolar',
    };
  }

  const title = `Fotos del evento ${event.name} - ${event.school} | Look Escolar`;
  const description = `Ve las fotos profesionales del evento ${event.name} en ${event.school}. Fotografía escolar de calidad por Melisa.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'es_AR',
    },
    twitter: {
      title,
      description,
      card: 'summary_large_image',
    },
  };
}
