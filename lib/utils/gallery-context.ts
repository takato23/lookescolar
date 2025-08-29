/**
 * Sistema de detección automática de contexto de galería
 * Determina si es acceso público o familiar y maneja routing unificado
 */

import { isFeatureEnabled } from '@/lib/config/feature-flags';

export type GalleryContext = 'public' | 'family';

export interface GalleryParams {
  eventId?: string;
  token?: string;
  context: GalleryContext;
  route: string;
}

export interface FamilyTokenData {
  studentId: string;
  eventId: string;
  expiresAt: string;
  isValid: boolean;
}

// Regex para validación
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_REGEX = /^[A-Za-z0-9_-]{20,100}$/;

/**
 * Detecta el contexto de galería basado en parámetros de URL
 */
export const detectGalleryContext = (params: {
  eventId?: string;
  token?: string;
  pathname: string;
}): GalleryParams => {
  const { eventId, token, pathname } = params;

  // Rutas familiares siempre tienen precedencia
  if (pathname.startsWith('/f/') && token) {
    return {
      token,
      context: 'family',
      route: `/f/${token}`,
    };
  }

  // Rutas públicas con eventId
  if (pathname.startsWith('/gallery/') && eventId && UUID_REGEX.test(eventId)) {
    // Si también hay token en query params, podría ser acceso familiar via URL pública
    if (
      token &&
      TOKEN_REGEX.test(token) &&
      isFeatureEnabled('TOKEN_AUTO_DETECTION')
    ) {
      return {
        eventId,
        token,
        context: 'family',
        route: `/gallery/${eventId}?token=${token}`,
      };
    }

    return {
      eventId,
      context: 'public',
      route: `/gallery/${eventId}`,
    };
  }

  // Fallback a contexto público
  return {
    eventId: eventId || undefined,
    token: token || undefined,
    context: 'public',
    route: pathname,
  };
};

/**
 * Valida token familiar y extrae metadata
 */
export const validateFamilyToken = async (
  token: string
): Promise<FamilyTokenData | null> => {
  if (!TOKEN_REGEX.test(token)) {
    return null;
  }

  try {
    const response = await fetch(`/api/family/validate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error validating family token:', error);
    return null;
  }
};

/**
 * Redirige entre contextos manteniendo estado
 */
export const redirectToGalleryContext = (
  params: GalleryParams,
  preserveState: boolean = true
): string => {
  if (params.context === 'family' && params.token) {
    // Si family features están habilitadas en público, usar ruta unificada
    if (isFeatureEnabled('FAMILY_IN_GALLERY_ROUTE') && params.eventId) {
      return `/gallery/${params.eventId}?token=${params.token}`;
    }
    // Usar ruta familiar tradicional
    return `/f/${params.token}`;
  }

  if (params.context === 'public' && params.eventId) {
    return `/gallery/${params.eventId}`;
  }

  return '/';
};

/**
 * Hook para componentes que necesitan contexto de galería
 */
export const useGalleryContext = (
  pathname: string,
  searchParams: URLSearchParams
) => {
  const eventId = searchParams.get('eventId') || pathname.split('/')[2];
  const token = searchParams.get('token') || pathname.split('/')[2];

  return detectGalleryContext({
    eventId: eventId || undefined,
    token: token || undefined,
    pathname,
  });
};

/**
 * Generador de URLs para diferentes contextos
 */
export const generateGalleryUrl = (params: {
  eventId?: string;
  token?: string;
  context?: GalleryContext;
  preserveQueryParams?: Record<string, string>;
}): string => {
  const { eventId, token, context, preserveQueryParams = {} } = params;

  let baseUrl = '';

  if (context === 'family' && token) {
    if (isFeatureEnabled('FAMILY_IN_GALLERY_ROUTE') && eventId) {
      baseUrl = `/gallery/${eventId}`;
      preserveQueryParams.token = token;
    } else {
      baseUrl = `/f/${token}`;
    }
  } else if (context === 'public' && eventId) {
    baseUrl = `/gallery/${eventId}`;
  } else {
    baseUrl = '/';
  }

  // Agregar query parameters
  const queryString = new URLSearchParams(preserveQueryParams).toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Middleware para detectar contexto en API routes
 */
export const detectApiContext = (request: Request): GalleryParams => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // API familiar
  if (pathname.includes('/api/family/')) {
    const tokenMatch = pathname.match(/\/api\/family\/[^/]+\/([^/?]+)/);
    return {
      token: tokenMatch?.[1],
      context: 'family',
      route: pathname,
    };
  }

  // API pública
  if (pathname.includes('/api/gallery/')) {
    const eventIdMatch = pathname.match(/\/api\/gallery\/([^/?]+)/);
    return {
      eventId: eventIdMatch?.[1],
      context: 'public',
      route: pathname,
    };
  }

  return {
    context: 'public',
    route: pathname,
  };
};
