/**
 * Página de galería unificada con fallback a componentes legacy
 * Se activa gradualmente via feature flags
 */

import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { detectGalleryContext } from '@/lib/utils/gallery-context';

// Componentes existentes (fallback)
import { GalleryHeader } from '@/components/public/GalleryHeader';
import { PublicGallery } from '@/components/gallery/PublicGallery';
import { CartDrawer } from '@/components/public/CartDrawer';

// Nuevo componente unificado
import { UnifiedGallery } from '@/components/gallery/UnifiedGallery';

interface UnifiedGalleryPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UnifiedGalleryPage({ 
  params, 
  searchParams 
}: UnifiedGalleryPageProps) {
  const { eventId } = await params;
  const searchParamsResolved = await searchParams;
  const token = Array.isArray(searchParamsResolved.token) 
    ? searchParamsResolved.token[0] 
    : searchParamsResolved.token;

  // Validar eventId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!eventId || !uuidRegex.test(eventId)) {
    notFound();
  }

  // Verificar evento existe
  const supabase = await createServerSupabaseServiceClient();
  
  type EventRow = { 
    id: string; 
    name: string; 
    school: string; 
    date: string; 
    status: string; 
    created_at: string;
  };

  const { data: event, error } = await supabase
    .from('events')
    .select('id, name, school, date, status, created_at')
    .eq('id', eventId)
    .eq('status', 'active')
    .single();

  if (error || !event) {
    notFound();
  }

  // Detectar contexto (público vs familiar)
  const galleryContext = detectGalleryContext({
    eventId,
    token,
    pathname: `/gallery/${eventId}`,
  });

  // Obtener conteo de fotos
  const { count: photoCount } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('approved', true);

  // Decidir qué componente usar
  const shouldUseUnified = isFeatureEnabled('UNIFIED_GALLERY_ENABLED');
  const supportsFamilyInPublic = isFeatureEnabled('FAMILY_IN_GALLERY_ROUTE');

  // Si es acceso familiar pero la feature no está habilitada, redirigir
  if (galleryContext.context === 'family' && !supportsFamilyInPublic && token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-yellow-300 to-orange-300 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Redirigiendo...</h2>
          <p className="text-gray-600 mb-6">
            Este enlace requiere acceso familiar. Serás redirigido a tu galería personalizada.
          </p>
          <script dangerouslySetInnerHTML={{
            __html: `window.location.href = '/f/${token}';`
          }} />
        </div>
      </div>
    );
  }

  // Datos del estudiante para contexto familiar
  let subjectInfo = null;
  if (galleryContext.context === 'family' && token) {
    try {
      // Obtener información del estudiante desde el token
      const { data: tokenData } = await supabase
        .from('family_tokens')
        .select(`
          student:students(
            id,
            name,
            grade_section,
            subject:subjects(
              id,
              name,
              grade_section,
              event:events(name, school_name:school)
            )
          )
        `)
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (tokenData?.student?.subject) {
        subjectInfo = {
          id: tokenData.student.subject.id,
          name: tokenData.student.name,
          grade_section: tokenData.student.subject.grade_section,
          event: {
            name: tokenData.student.subject.event.name,
            school_name: tokenData.student.subject.event.school_name,
          },
        };
      }
    } catch (err) {
      console.error('Error loading subject info:', err);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-yellow-300 to-orange-300">
      {/* Header unificado */}
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
          isFamily={galleryContext.context === 'family'}
          familyName={subjectInfo?.name}
        />
      </Suspense>

      {/* Contenido principal */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Suspense fallback={<GallerySkeleton />}>
          {shouldUseUnified ? (
            <UnifiedGallery
              eventId={eventId}
              token={token}
              context={galleryContext.context}
              subjectInfo={subjectInfo}
              enableFamilyFeatures={galleryContext.context === 'family'}
              className="unified-gallery-main"
            />
          ) : (
            // Fallback a componente legacy
            <PublicGallery eventId={eventId} />
          )}
        </Suspense>
      </div>

      {/* Carrito (solo para público por ahora) */}
      {galleryContext.context === 'public' && <CartDrawer />}
      
      {/* Debug info en desarrollo */}
      {process.env.NODE_ENV === 'development' && isFeatureEnabled('DEBUG_MIGRATION') && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono">
          <div>Context: {galleryContext.context}</div>
          <div>EventId: {eventId}</div>
          <div>Token: {token ? '***' : 'none'}</div>
          <div>Unified: {shouldUseUnified ? 'ON' : 'OFF'}</div>
          <div>Family Route: {supportsFamilyInPublic ? 'ON' : 'OFF'}</div>
        </div>
      )}
    </div>
  );
}

// Skeletons reutilizados
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

function GallerySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex space-x-1 bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-24 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
      
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

// Metadata optimizada
export async function generateMetadata({ params, searchParams }: UnifiedGalleryPageProps) {
  const { eventId } = await params;
  const searchParamsResolved = await searchParams;
  const token = Array.isArray(searchParamsResolved.token) 
    ? searchParamsResolved.token[0] 
    : searchParamsResolved.token;

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

  const isFamily = !!token;
  const titlePrefix = isFamily ? 'Tu Galería Familiar' : 'Fotos del evento';
  const title = `${titlePrefix} ${event.name} - ${event.school} | Look Escolar`;
  const description = `${isFamily ? 'Accede a tus fotos personalizadas del' : 'Ve las fotos profesionales del'} evento ${event.name} en ${event.school}. Fotografía escolar de calidad por Melisa.`;

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