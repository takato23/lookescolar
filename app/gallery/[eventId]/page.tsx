import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { GalleryHeader } from '@/components/public/GalleryHeader';
import { PublicGallery } from '@/components/gallery/PublicGallery';
import { UnifiedGallery } from '@/components/gallery/UnifiedGallery';
import { CartDrawer } from '@/components/public/CartDrawer';
import { CartInitializer } from '@/components/public/CartInitializer';
import { featureFlags } from '@/lib/feature-flags';
import { AlertTriangleIcon, CameraIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PublicGalleryPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function PublicGalleryPage({ params }: PublicGalleryPageProps) {
  const { eventId } = await params;

  // Validación robusta del eventId
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!eventId) {
    return <InvalidEventError message="ID de evento requerido" />;
  }
  
  if (!uuidRegex.test(eventId)) {
    return <InvalidEventError message="ID de evento inválido" />;
  }

  // Verificar que el evento existe y está activo (SSR con service client)
  let supabase;
  let event;
  let photoCount = 0;
  
  try {
    supabase = await createServerSupabaseServiceClient();
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    return <DatabaseError />;
  }

  type EventRow = { id: string; name: string; school: string; date: string; status: string; created_at: string };

  try {
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, name, school, date, status, created_at')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Event query error:', eventError);
      if (eventError.code === 'PGRST116') {
        return <EventNotFoundError />;
      }
      return <DatabaseError />;
    }

    if (!eventData) {
      return <EventNotFoundError />;
    }

    // Verificar estado del evento
    if (eventData.status !== 'active') {
      return <EventInactiveError eventName={eventData.name} />;
    }

    event = eventData;

    // Obtener conteo rápido de fotos
    const { count, error: countError } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('approved', true);

    if (countError) {
      console.warn('Photo count error:', countError);
      // No es crítico, continuamos
    } else {
      photoCount = count || 0;
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return <DatabaseError />;
  }



  const formattedDate = new Date(event.date).toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-yellow-300 to-orange-300">
      {/* Header */}
      <Suspense fallback={<HeaderSkeleton />}>
        <GalleryHeader
          event={event as EventRow}
          photoCount={photoCount}
          formattedDate={formattedDate}
        />
      </Suspense>

      {/* Contenido principal */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Galería de fotos */}
        <Suspense fallback={<GallerySkeleton />}>
          {featureFlags.UNIFIED_GALLERY_ENABLED ? (
            <UnifiedGallery eventId={eventId} initialEvent={event} />
          ) : (
            <PublicGallery eventId={eventId} />
          )}
        </Suspense>
      </div>

      {/* Inicializador del carrito */}
      <CartInitializer eventId={eventId} />
      
      {/* Carrito lateral */}
      <CartDrawer />
    </div>
  );
}

// Skeleton de carga para el header - Liquid glass design
function HeaderSkeleton() {
  return (
    <div className="bg-white/70 backdrop-blur-md border-b border-white/30 shadow-xl shadow-cyan-500/5 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-14 w-14 animate-pulse rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300" />
            <div className="space-y-2">
              <div className="h-8 w-48 animate-pulse rounded-lg bg-gradient-to-br from-gray-200 to-gray-300" />
              <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl px-6 py-4 shadow-lg">
              <div className="h-6 w-32 animate-pulse rounded bg-gray-200 mb-2" />
              <div className="flex gap-4">
                <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="h-12 w-72 animate-pulse rounded-2xl bg-white/60 border border-white/40" />
            <div className="h-12 w-48 animate-pulse rounded-2xl bg-white/60 border border-white/40" />
            <div className="h-12 w-16 animate-pulse rounded-2xl bg-white/60 border border-white/40" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton de carga para la galería - Liquid glass design
function GallerySkeleton() {
  const gradients = [
    'from-orange-300 to-yellow-400',
    'from-cyan-300 to-blue-400', 
    'from-purple-300 to-pink-400',
    'from-green-300 to-emerald-400',
    'from-rose-300 to-red-400',
    'from-indigo-300 to-purple-400'
  ];

  return (
    <div className="space-y-8">
      {/* Tabs skeleton */}
      <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-3 shadow-xl shadow-cyan-500/10">
        <div className="flex space-x-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 h-16 animate-pulse rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300" />
          ))}
        </div>
      </div>
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => {
          const gradient = gradients[i % gradients.length];
          return (
            <div key={i} className="group">
              <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-4 shadow-xl shadow-cyan-500/10">
                <div className={`aspect-square animate-pulse rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`} />
                <div className="mt-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded-lg w-2/3 animate-pulse" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Estados de error mejorados
function InvalidEventError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-yellow-300 to-orange-300 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-12 shadow-xl shadow-red-500/10 text-center">
          <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-red-400 via-orange-400 to-yellow-400 shadow-2xl shadow-red-500/20">
            <AlertTriangleIcon className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Enlace inválido</h1>
          <p className="text-gray-600 text-lg mb-8">{message}</p>
          <Button
            onClick={() => window.location.href = '/'}
            className="rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 px-8 py-4 font-bold text-white shadow-2xl shadow-blue-500/25 transition-all duration-300 hover:scale-110"
          >
            <RefreshCwIcon className="h-5 w-5 mr-2" />
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  );
}

function EventNotFoundError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-yellow-300 to-orange-300 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-12 shadow-xl shadow-yellow-500/10 text-center">
          <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 shadow-2xl shadow-yellow-500/20">
            <CameraIcon className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Evento no encontrado</h1>
          <p className="text-gray-600 text-lg mb-8">
            Este evento no existe o ya no está disponible. Verifica el enlace proporcionado por el fotógrafo.
          </p>
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 mb-8">
            <p className="text-sm text-gray-600 mb-2">💡 <strong>Sugerencias:</strong></p>
            <ul className="text-sm text-gray-600 space-y-1 text-left">
              <li>• Verifica que el enlace sea correcto</li>
              <li>• Contacta con el fotógrafo para un nuevo enlace</li>
              <li>• El evento puede haber finalizado</li>
            </ul>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="rounded-3xl bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 px-8 py-4 font-bold text-white shadow-2xl shadow-orange-500/25 transition-all duration-300 hover:scale-110"
          >
            <RefreshCwIcon className="h-5 w-5 mr-2" />
            Intentar de nuevo
          </Button>
        </div>
      </div>
    </div>
  );
}

function EventInactiveError({ eventName }: { eventName: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-yellow-300 to-orange-300 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-12 shadow-xl shadow-blue-500/10 text-center">
          <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 via-purple-400 to-cyan-400 shadow-2xl shadow-blue-500/20">
            <CameraIcon className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Evento no disponible</h1>
          <p className="text-gray-600 text-lg mb-8">
            El evento <strong>{eventName}</strong> no está actualmente disponible para visualización pública.
          </p>
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 mb-8">
            <p className="text-sm text-gray-600 mb-2">💡 <strong>Posibles razones:</strong></p>
            <ul className="text-sm text-gray-600 space-y-1 text-left">
              <li>• Las fotos están siendo procesadas</li>
              <li>• El evento está temporalmente pausado</li>
              <li>• Se requiere acceso privado con código</li>
            </ul>
          </div>
          <Button
            onClick={() => window.location.href = '/'}
            className="rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 px-8 py-4 font-bold text-white shadow-2xl shadow-blue-500/25 transition-all duration-300 hover:scale-110"
          >
            <RefreshCwIcon className="h-5 w-5 mr-2" />
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  );
}

function DatabaseError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-yellow-300 to-orange-300 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-12 shadow-xl shadow-red-500/10 text-center">
          <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-pink-500 to-purple-500 shadow-2xl shadow-red-500/20">
            <AlertTriangleIcon className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Error del servicio</h1>
          <p className="text-gray-600 text-lg mb-8">
            Hay un problema temporal con el servicio. Por favor, inténtalo de nuevo en unos momentos.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="rounded-3xl bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 px-8 py-4 font-bold text-white shadow-2xl shadow-red-500/25 transition-all duration-300 hover:scale-110"
          >
            <RefreshCwIcon className="h-5 w-5 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}

// Metadata para SEO optimizada
export async function generateMetadata({ params }: PublicGalleryPageProps) {
  const { eventId } = await params;

  // Validaciones básicas
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!eventId || !uuidRegex.test(eventId)) {
    return {
      title: 'Galería no encontrada | LookEscolar',
      description: 'El enlace de galería proporcionado no es válido.',
    };
  }

  try {
    const supabase = await createServerSupabaseServiceClient();

    const { data: event } = await supabase
      .from('events')
      .select('name, school, date, status')
      .eq('id', eventId)
      .single();

    if (!event) {
      return {
        title: 'Galería no encontrada | LookEscolar',
        description: 'Este evento no existe o ya no está disponible.',
      };
    }

    if (event.status !== 'active') {
      return {
        title: `${event.name} - No disponible | LookEscolar`,
        description: `El evento ${event.name} en ${event.school} no está actualmente disponible.`,
      };
    }

    const eventDate = new Date(event.date).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const title = `Fotos de ${event.name} - ${event.school} | LookEscolar`;
    const description = `Explora las fotos profesionales del evento ${event.name} en ${event.school}, realizado el ${eventDate}. Fotografía escolar de calidad por Melisa. ¡Descarga las fotos de tu hijo/a!`;

    return {
      title,
      description,
      keywords: [
        'fotografía escolar',
        'fotos escolares',
        event.school,
        event.name,
        'LookEscolar',
        'Melisa fotógrafa',
        'eventos escolares',
        'galería fotos',
      ].join(', '),
      authors: [{ name: 'Melisa - LookEscolar' }],
      openGraph: {
        title,
        description,
        type: 'website',
        locale: 'es_AR',
        siteName: 'LookEscolar',
        images: [
          {
            url: '/api/og-image?event=' + encodeURIComponent(event.name) + '&school=' + encodeURIComponent(event.school),
            width: 1200,
            height: 630,
            alt: `Fotos del evento ${event.name} en ${event.school}`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ['/api/og-image?event=' + encodeURIComponent(event.name) + '&school=' + encodeURIComponent(event.school)],
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      alternates: {
        canonical: `https://lookescolar.com/gallery/${eventId}`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Error cargando galería | LookEscolar',
      description: 'Hubo un problema cargando la información del evento.',
    };
  }
}
