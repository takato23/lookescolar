// Sistema de detección de contexto para galería unificada
// Determina si es acceso público o familiar basado en parámetros

import { debugMigration } from './feature-flags';

export type GalleryContext = 'public' | 'family';

export interface GalleryContextData {
  context: GalleryContext;
  eventId: string;
  token?: string;
  isLegacyRedirect?: boolean;
}

// Detectar contexto desde URL y parámetros
export function detectGalleryContext(params: {
  eventId?: string;
  token?: string;
  searchParams?: URLSearchParams;
}): GalleryContextData {
  const { eventId, token, searchParams } = params;
  
  debugMigration('Detecting gallery context', { eventId, hasToken: !!token, searchParams: searchParams?.toString() });
  
  // Si viene con token, es contexto familiar
  const tokenFromQuery = searchParams?.get('token') || token;
  
  if (tokenFromQuery && tokenFromQuery.length >= 20) {
    debugMigration('Detected family context', { tokenLength: tokenFromQuery.length });
    
    return {
      context: 'family',
      eventId: eventId || 'unknown',
      token: tokenFromQuery,
      isLegacyRedirect: searchParams?.get('from') === 'legacy',
    };
  }
  
  // UUID validation para eventId público
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!eventId || !uuidRegex.test(eventId)) {
    throw new Error('Invalid eventId format for public gallery');
  }
  
  debugMigration('Detected public context', { eventId });
  
  return {
    context: 'public',
    eventId,
  };
}

// Helper para construir URLs de redirección
export function buildLegacyRedirectUrl(fromPath: string, toPath: string): string {
  const url = new URL(toPath, window.location.origin);
  url.searchParams.set('from', 'legacy');
  
  debugMigration('Building legacy redirect', { fromPath, toPath, finalUrl: url.toString() });
  
  return url.toString();
}

// Mapeo de token familiar a eventId
export async function resolveEventIdFromToken(token: string): Promise<string | null> {
  try {
    debugMigration('Resolving eventId from token', { tokenLength: token.length });
    
    const response = await fetch(`/api/family/resolve-event?token=${token}`);
    
    if (!response.ok) {
      debugMigration('Failed to resolve eventId', { status: response.status });
      return null;
    }
    
    const data = await response.json();
    debugMigration('Resolved eventId successfully', { eventId: data.eventId });
    
    return data.eventId || null;
  } catch (error) {
    debugMigration('Error resolving eventId', error);
    return null;
  }
}

// Validar que el token corresponde al evento
export async function validateTokenForEvent(token: string, eventId: string): Promise<boolean> {
  try {
    debugMigration('Validating token for event', { tokenLength: token.length, eventId });
    
    const response = await fetch(`/api/family/validate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, eventId }),
    });
    
    const isValid = response.ok;
    debugMigration('Token validation result', { isValid });
    
    return isValid;
  } catch (error) {
    debugMigration('Error validating token', error);
    return false;
  }
}

// Hook para usar context en componentes React
import { useState, useEffect } from 'react';

export function useGalleryContext(
  eventId?: string,
  token?: string,
  searchParams?: URLSearchParams
): GalleryContextData | null {
  const [context, setContext] = useState<GalleryContextData | null>(null);
  
  useEffect(() => {
    try {
      const detected = detectGalleryContext({ eventId, token, searchParams });
      setContext(detected);
    } catch (error) {
      debugMigration('Error detecting gallery context', error);
      setContext(null);
    }
  }, [eventId, token, searchParams]);
  
  return context;
}