/**
 * UNIFIED STORE PAGE - /store-unified/[token]
 * 
 * Página unificada de tienda que maneja TODOS los tipos de tokens:
 * - Event tokens (/s/[token])
 * - Course tokens (/s/[token]) 
 * - Family tokens (/f/[token])
 * - Store tokens (/store/[token])
 * 
 * Características:
 * - Una sola interfaz para todas las familias
 * - Misma experiencia de usuario
 * - Contenido filtrado según el token
 * - Sistema de carrito unificado
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { UnifiedStore } from '@/components/store/UnifiedStore';
import { hierarchicalGalleryService } from '@/lib/services/hierarchical-gallery.service';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generar metadata dinámica basada en el token
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  
  try {
    // Validar token y obtener contexto
    const validation = await hierarchicalGalleryService.validateAccess(token);
    
    if (!validation.isValid || !validation.context) {
      return {
        title: 'Tienda no disponible - LookEscolar',
        description: 'El enlace de la tienda no es válido o ha expirado.',
        robots: 'noindex, nofollow'
      };
    }

    const { context } = validation;
    const scopeName = context.scope === 'event' ? 'Evento' : 
                     context.scope === 'course' ? 'Curso' : 'Familia';

    return {
      title: `${scopeName}: ${context.resourceName} - Tienda de Fotos | LookEscolar`,
      description: `Compra fotos profesionales de ${context.resourceName}. Galería de fotos con opciones de paquetes y copias adicionales.`,
      openGraph: {
        title: `${context.resourceName} - Tienda de Fotos`,
        description: `Compra fotos profesionales de ${context.resourceName}`,
        type: 'website',
        url: `/store-unified/${token}`,
      },
      robots: {
        index: false, // No indexar por privacidad
        follow: false,
        nocache: true,
        noarchive: true,
        nosnippet: true
      },
      referrer: 'no-referrer'
    };

  } catch (error) {
    return {
      title: 'Tienda de Fotos - LookEscolar',
      description: 'Galería de fotos profesionales con opciones de compra.',
      robots: { index: false, follow: false, nocache: true },
      referrer: 'no-referrer'
    };
  }
}

export default async function UnifiedStorePage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const searchParamsObj = await searchParams;

  try {
    // Validar token y obtener contexto
    const validation = await hierarchicalGalleryService.validateAccess(token);
    
    if (!validation.isValid) {
      console.error('Token validation failed:', validation.reason);
      notFound();
    }

    const context = validation.context!;
    console.log('✅ [UNIFIED STORE] Token válido:', {
      scope: context.scope,
      resourceName: context.resourceName,
      canDownload: context.canDownload,
      queryParams: searchParamsObj
    });

    // Obtener datos según el scope del token
    const [folders, assets] = await Promise.all([
      hierarchicalGalleryService.getFolders(token),
      hierarchicalGalleryService.getAssetsPaginated(token, undefined, 100, 0) // Primeros 100 assets
    ]);

    // Mapear assets a formato de fotos para UnifiedStore
    const photos = assets.assets.map(asset => ({
      id: asset.id,
      filename: asset.filename,
      preview_url: asset.previewUrl || asset.thumbnailUrl || '',
      size: asset.fileSize || 0,
      width: asset.width || 800,
      height: asset.height || 600,
    }));

    // Crear subject unificado basado en el contexto
    const subject = {
      id: context.resourceId,
      name: context.resourceName,
      grade_section: context.scope === 'event' ? 'Evento' : 
                    context.scope === 'course' ? 'Curso' : 'Familia',
      event: {
        name: context.resourceName,
        school_name: context.scope === 'event' ? context.resourceName : 'Escuela',
        theme: 'default' // Se puede mejorar obteniendo el tema del evento
      }
    };

    // Log de acceso exitoso
    await hierarchicalGalleryService.logAccess(token, 'store_access', {
      success: true,
      responseTimeMs: 0, // SSR
      notes: `Unified store access to ${context.scope} gallery with params: ${JSON.stringify(searchParamsObj)}`
    });

    // Mostrar información de debug en desarrollo
    const isDevelopment = process.env.NODE_ENV === 'development';
    const debugInfo = isDevelopment ? {
      token: token.slice(0, 8) + '...',
      scope: context.scope,
      resourceName: context.resourceName,
      photosCount: photos.length,
      queryParams: searchParamsObj,
      redirectSource: searchParamsObj.source || 'direct'
    } : null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        {/* Debug info en desarrollo */}
        {isDevelopment && debugInfo && (
          <div className="fixed top-4 right-4 z-50 bg-blue-100 border border-blue-300 rounded-lg p-3 text-xs max-w-xs">
            <div className="font-semibold text-blue-800 mb-2">🔧 Debug Info</div>
            <div className="space-y-1 text-blue-700">
              <div><strong>Token:</strong> {debugInfo.token}</div>
              <div><strong>Scope:</strong> {debugInfo.scope}</div>
              <div><strong>Resource:</strong> {debugInfo.resourceName}</div>
              <div><strong>Photos:</strong> {debugInfo.photosCount}</div>
              <div><strong>Source:</strong> {debugInfo.redirectSource}</div>
            </div>
          </div>
        )}

        <UnifiedStore
          token={token}
          photos={photos}
          subject={subject}
          onBack={() => window.history.back()}
        />
      </div>
    );

  } catch (error) {
    console.error('Error loading unified store:', error);
    notFound();
  }
}

// Habilitar ISR para mejor rendimiento
export const revalidate = 300; // 5 minutos
