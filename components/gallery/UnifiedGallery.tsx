// Galería Unificada que maneja tanto contexto público como familiar
// FASE 1: Infraestructura base, funcionalidad idéntica a sistemas existentes

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { featureFlags, debugMigration } from '@/lib/feature-flags';
import { detectGalleryContext, type GalleryContextData } from '@/lib/gallery-context';
import { PublicGallery } from './PublicGallery';
import { FamilyGallery } from './FamilyGallery';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';

interface UnifiedGalleryProps {
  eventId: string;
  initialPhotos?: any[];
  initialEvent?: any;
}

export function UnifiedGallery({ eventId, initialPhotos, initialEvent }: UnifiedGalleryProps) {
  const searchParams = useSearchParams();
  const [context, setContext] = useState<GalleryContextData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setContext: setCartContext } = useUnifiedCartStore();
  
  useEffect(() => {
    debugMigration('UnifiedGallery mounting', { eventId, hasInitialPhotos: !!initialPhotos });
    
    // Solo proceder si unified gallery está habilitado
    if (!featureFlags.UNIFIED_GALLERY_ENABLED) {
      debugMigration('Unified gallery disabled, skipping context detection');
      setIsLoading(false);
      return;
    }
    
    try {
      const detectedContext = detectGalleryContext({
        eventId,
        searchParams,
      });
      
      setContext(detectedContext);
      setCartContext(detectedContext); // Sincronizar con cart store unificado
      debugMigration('Context detected successfully', detectedContext);
      
    } catch (error) {
      debugMigration('Error detecting context', error);
      
      // Fallback a contexto público en caso de error
      const fallbackContext = {
        context: 'public' as const,
        eventId,
      };
      setContext(fallbackContext);
      setCartContext(fallbackContext);
    }
    
    setIsLoading(false);
  }, [eventId, searchParams]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Detectando contexto...</span>
      </div>
    );
  }
  
  // Si unified gallery está desactivado, usar galería pública normal
  if (!featureFlags.UNIFIED_GALLERY_ENABLED || !context) {
    debugMigration('Falling back to PublicGallery', { unifiedEnabled: featureFlags.UNIFIED_GALLERY_ENABLED, hasContext: !!context });
    
    return (
      <PublicGallery 
        eventId={eventId}
        // Pasar props iniciales si están disponibles
        {...(initialPhotos && { initialPhotos })}
        {...(initialEvent && { initialEvent })}
      />
    );
  }
  
  // FASE 1: Por ahora, siempre usar PublicGallery
  // En fases futuras aquí implementaremos la lógica de contexto familiar
  debugMigration('Rendering unified gallery', { context });
  
  switch (context.context) {
    case 'family':
      debugMigration('Family context detected, rendering FamilyGallery');
      
      return (
        <div className="space-y-4">
          {featureFlags.DEBUG_MIGRATION && (
            <div className="bg-green-100 border border-green-300 p-3 rounded-lg text-sm">
              🎉 <strong>Fase 2 Activa:</strong> Contexto familiar detectado (token: {context.token?.slice(0, 8)}...)<br/>
              Renderizando galería familiar unificada.
            </div>
          )}
          <FamilyGallery context={context} />
        </div>
      );
      
    case 'public':
    default:
      debugMigration('Public context, rendering PublicGallery');
      return (
        <PublicGallery 
          eventId={eventId}
          {...(initialPhotos && { initialPhotos })}
          {...(initialEvent && { initialEvent })}
        />
      );
  }
}