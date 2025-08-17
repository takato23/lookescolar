import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { PublicGallery } from '@/components/gallery/PublicGallery';
import { GalleryHeader } from '@/components/gallery/GalleryHeader';
import { ContactForm } from '@/components/gallery/ContactForm';

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header con información del evento */}
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

        {/* Galería de fotos */}
        <div className="mt-8">
          <Suspense fallback={<GallerySkeleton />}>
            <PublicGallery eventId={eventId} />
          </Suspense>
        </div>

        {/* Contact Section */}
        <div className="mt-16">
          <Suspense fallback={<ContactFormSkeleton />}>
            <ContactForm
              eventName={event.name}
              schoolName={event.school}
              totalPhotos={photoCount || 0}
            />
          </Suspense>
        </div>

        {/* Información adicional */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 text-center shadow-lg backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500">
              <span className="text-2xl text-white">📱</span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-800">
              Calidad Profesional
            </h3>
            <p className="text-sm text-gray-600">
              Todas las fotos están tomadas con equipos profesionales y editadas
              con cuidado para obtener los mejores resultados.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 text-center shadow-lg backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-500">
              <span className="text-2xl text-white">⚡</span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-800">
              Entrega Rápida
            </h3>
            <p className="text-sm text-gray-600">
              Una vez coordinado, las fotos originales se entregan en formato
              digital de alta resolución listas para imprimir.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 text-center shadow-lg backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500">
              <span className="text-2xl text-white">💝</span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-800">
              Momentos Únicos
            </h3>
            <p className="text-sm text-gray-600">
              Cada foto captura un momento especial que será un recuerdo
              invaluable para toda la familia.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
          <div className="flex flex-col items-center justify-center space-y-2 sm:flex-row sm:space-x-6 sm:space-y-0">
            <span>© 2024 Look Escolar - Fotografía Profesional</span>
            <span className="hidden sm:block">•</span>
            <a
              href="mailto:melisa@lookescolar.com"
              className="transition-colors hover:text-purple-600"
            >
              melisa@lookescolar.com
            </a>
            <span className="hidden sm:block">•</span>
            <a
              href="https://wa.me/541234567890"
              className="transition-colors hover:text-purple-600"
            >
              WhatsApp
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Skeleton de carga para el header
function HeaderSkeleton() {
  return (
    <div className="animate-pulse space-y-4 text-center">
      <div className="mx-auto h-12 w-96 rounded-lg bg-gray-200" />
      <div className="mx-auto h-6 w-64 rounded bg-gray-200" />
      <div className="mx-auto h-4 w-32 rounded bg-gray-200" />
    </div>
  );
}

// Skeleton de carga para el formulario de contacto
function ContactFormSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 p-8 text-center shadow-2xl">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="mx-auto h-8 w-80 rounded-lg bg-white/20" />
        <div className="mx-auto h-6 w-96 rounded bg-white/10" />
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="h-12 w-48 rounded-full bg-white/20" />
          <div className="h-12 w-48 rounded-full bg-white/10" />
        </div>
        <div className="mx-auto h-4 w-64 rounded bg-white/10" />
      </div>
    </div>
  );
}

// Skeleton de carga para la galería
function GallerySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-xl bg-gray-200"
          />
        ))}
      </div>
      <div className="flex justify-center">
        <div className="h-10 w-32 animate-pulse rounded bg-gray-200" />
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
