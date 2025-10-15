// Utilidades para generar enlaces correctos del sistema de galerías
import { featureFlags } from '@/lib/feature-flags';

interface GenerateGalleryLinkParams {
  token: string;
  eventId?: string;
  origin?: string;
}

/**
 * Genera el enlace correcto para acceder a la galería familiar
 * basado en los feature flags activos
 */
export function generateFamilyGalleryLink({
  token,
  eventId,
  origin,
}: GenerateGalleryLinkParams): string {
  const baseOrigin =
    origin || (typeof window !== 'undefined' ? window.location.origin : '');

  // Si el sistema unificado está habilitado y tenemos eventId, usar el nuevo formato
  if (
    featureFlags.UNIFIED_GALLERY_ENABLED &&
    featureFlags.FAMILY_IN_GALLERY_ROUTE &&
    eventId
  ) {
    return `${baseOrigin}/gallery/${eventId}?token=${token}`;
  }

  // Fallback al sistema legacy
  return `${baseOrigin}/f/${token}/simple-page`;
}

/**
 * Genera un enlace para QR basado en el token
 */
export function generateQRLink(token: string, origin?: string): string {
  const baseOrigin =
    origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const encodedToken = encodeURIComponent(token);
  return `${baseOrigin}/access?token=${encodedToken}`;
}

/**
 * Determina si un enlace es del sistema legacy o unificado
 */
export function isLegacyGalleryLink(url: string): boolean {
  return url.includes('/f/') && url.includes('/simple-page');
}

/**
 * Convierte un enlace legacy a formato unificado si es posible
 */
export function migrateLegacyLink(legacyUrl: string, eventId?: string): string {
  if (!isLegacyGalleryLink(legacyUrl) || !eventId) {
    return legacyUrl;
  }

  try {
    const url = new URL(legacyUrl);
    const pathParts = url.pathname.split('/');
    const token = pathParts[2]; // /f/[token]/simple-page

    if (token && token.length >= 20) {
      return generateFamilyGalleryLink({
        token,
        eventId,
        origin: url.origin,
      });
    }
  } catch (error) {
    console.warn('Failed to migrate legacy link:', error);
  }

  return legacyUrl;
}
