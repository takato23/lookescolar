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
import { absoluteUrl } from '@/lib/absoluteUrl';
import { UnifiedStore } from '@/components/store/UnifiedStore';
import { hierarchicalGalleryService } from '@/lib/services/hierarchical-gallery.service';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generar metadata dinámica basada en el token
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;

  try {
    // Validar token y obtener contexto
    const validation = await hierarchicalGalleryService.validateAccess(token);

    if (!validation.isValid || !validation.context) {
      // Fallback para tokens de sharing público
      const isShareToken = /^[a-f0-9]{64}$/i.test(token);
      const isFolderShareToken = !isShareToken && token.length >= 16 && token.length <= 64;
      try {
        const endpoint = isShareToken
          ? `/api/public/share/${token}/gallery?page=1&limit=1`
          : isFolderShareToken
            ? `/api/public/folder-share/${token}/gallery?page=1&limit=1`
            : null;
        if (endpoint) {
          const apiUrl = await absoluteUrl(endpoint);
          const res = await fetch(apiUrl, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            const eventName = data?.gallery?.eventName || 'Galería';
            const img = data?.gallery?.items?.[0]?.preview_url;
            return {
              title: `${eventName} - Tienda de Fotos | LookEscolar`,
              description: 'Compra fotos seleccionadas de esta galería',
              openGraph: img ? { images: [{ url: img }] } : undefined,
              robots: 'noindex, nofollow',
              referrer: 'no-referrer',
            } as any;
          }
        }
      } catch {}
      return {
        title: 'Tienda no disponible - LookEscolar',
        description: 'El enlace de la tienda no es válido o ha expirado.',
        robots: 'noindex, nofollow',
      };
    }

    const { context } = validation;
    const scopeName =
      context.scope === 'event'
        ? 'Evento'
        : context.scope === 'course'
          ? 'Curso'
          : 'Familia';

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
        nosnippet: true,
      },
      referrer: 'no-referrer',
    };
  } catch (error) {
    return {
      title: 'Tienda de Fotos - LookEscolar',
      description: 'Galería de fotos profesionales con opciones de compra.',
      robots: { index: false, follow: false, nocache: true },
      referrer: 'no-referrer',
    };
  }
}

export default async function UnifiedStorePage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const searchParamsObj = await searchParams;
  const page = Math.max(1, parseInt((searchParamsObj?.page as string) || '1'));
  const limit = Math.min(100, Math.max(1, parseInt((searchParamsObj?.limit as string) || '60')));
  const stepParam = (searchParamsObj?.step as string) || '';
  const allowedSteps = new Set(['package', 'photos', 'extras', 'contact', 'payment']);
  const initialStep = allowedSteps.has(stepParam) ? (stepParam as any) : undefined;

  try {
    // Validar token y obtener contexto
    const validation = await hierarchicalGalleryService.validateAccess(token);

    let photos:
      | Array<{ id: string; filename: string; preview_url: string; size: number; width: number; height: number }>
      | null = null;
    let subject: any = null;
    let isShareToken = false;
    let ctx: any = null;

    if (!validation.isValid) {
      // Fallback: tokens de sharing
      isShareToken = /^[a-f0-9]{64}$/i.test(token);
      const isFolderShareToken = !isShareToken && token.length >= 16 && token.length <= 64;
      const endpoint = isShareToken
        ? `/api/public/share/${token}/gallery?page=${page}&limit=${limit}`
        : isFolderShareToken
          ? `/api/public/folder-share/${token}/gallery?page=${page}&limit=${limit}`
          : null;

      if (!endpoint) {
        console.error('Token validation failed:', validation.reason);
        notFound();
      }

      const apiUrl = await absoluteUrl(endpoint!);
      const res = await fetch(apiUrl, { cache: 'no-store' });
      if (!res.ok) notFound();
      const data = await res.json();
      const gallery = data?.gallery;
      if (!gallery) notFound();

      photos = (gallery.items || []).map((a: any) => ({
        id: a.id,
        filename: a.filename,
        preview_url: a.preview_url,
        size: a.size || 0,
        width: 800,
        height: 600,
      }));

      subject = {
        id: gallery.eventId,
        name: gallery.eventName || 'Evento',
        grade_section: 'Evento',
        event: {
          name: gallery.eventName || 'Evento',
          school_name: 'Escuela',
          theme: 'default',
        },
      };

      // Log store access for share-based fallback as well
      try {
        await hierarchicalGalleryService.logAccess(token, 'list_assets', {
          success: true,
          responseTimeMs: 0,
          notes: 'Unified store (fallback share) loaded',
        });
      } catch {}
    } else {
      const context = validation.context!;
      ctx = context;
      console.log('✅ [UNIFIED STORE] Token válido:', {
        scope: context.scope,
        resourceName: context.resourceName,
        canDownload: context.canDownload,
        queryParams: searchParamsObj,
      });

      // Obtener datos según el scope del token
      const offset = (page - 1) * limit;
      const assets = await hierarchicalGalleryService.getAssetsPaginated(
        token,
        undefined,
        limit,
        offset
      );

      photos = assets.assets.map((asset) => ({
        id: asset.id,
        filename: asset.filename,
        // Use hierarchical preview endpoint (validates scope and signs URL)
        preview_url: `/api/hierarchical/${token}/preview/${asset.id}`,
        size: asset.fileSize || 0,
        // Width/height may be unknown at this stage; use sensible defaults
        width: 800,
        height: 600,
      }));

      // Crear subject unificado basado en el contexto
      subject = {
        id: context.resourceId,
        name: context.resourceName,
        grade_section:
          context.scope === 'event'
            ? 'Evento'
            : context.scope === 'course'
              ? 'Curso'
              : 'Familia',
        event: {
          name: context.resourceName,
          school_name:
            context.scope === 'event' ? context.resourceName : 'Escuela',
          theme: 'default',
        },
      };

      // Log de acceso exitoso
      await hierarchicalGalleryService.logAccess(token, 'store_access', {
        success: true,
        responseTimeMs: 0,
        notes: `Unified store access to ${context.scope} gallery with params: ${JSON.stringify(searchParamsObj)}`,
      });
    }

    // Mostrar información de debug en desarrollo
    const isDevelopment = process.env.NODE_ENV === 'development';
    const debugScope = ctx?.scope || (isShareToken ? 'share' : 'unknown');
    const debugResourceName = ctx?.resourceName || subject?.name || 'Galería';
    const debugInfo = isDevelopment
      ? {
          token: token.slice(0, 8) + '...',
          scope: debugScope,
          resourceName: debugResourceName,
          photosCount: photos?.length || 0,
          queryParams: searchParamsObj,
          redirectSource: (searchParamsObj as any).source || 'direct',
        }
      : null;

    // Debug logging for the page
    console.log('📄 UnifiedStorePage rendering:', {
      token: token.slice(0, 8) + '...',
      photosCount: photos?.length || 0,
      subjectName: subject?.event?.name,
      debugScope
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <UnifiedStore
          token={token}
          photos={photos || []}
          subject={subject}
          // Mantener callbacks existentes bajo /f/[token]/payment/*
          callbackBase="f"
          // Permite deep-linkear a un paso específico del checkout
          initialStep={initialStep}
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
