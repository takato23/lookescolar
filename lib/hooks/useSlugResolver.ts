/**
 * 🏷️ USE SLUG RESOLVER - Hook para resolver slugs en el client
 */

import { useState, useEffect } from 'react';
import { isUUID } from '@/lib/utils/slug-resolver';

/**
 * Hook to resolve event slug to UUID on client side
 */
export function useEventIdResolver(identifier: string) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveId() {
      if (!identifier) {
        setError('No identifier provided');
        return;
      }

      // If it's already a UUID, use it directly
      if (isUUID(identifier)) {
        setEventId(identifier);
        return;
      }

      // It's a slug, need to resolve
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/events/resolve-slug?slug=${encodeURIComponent(identifier)}`);
        
        if (!response.ok) {
          throw new Error('Failed to resolve event slug');
        }

        const data = await response.json();
        
        if (!data.eventId) {
          throw new Error('Event not found');
        }

        setEventId(data.eventId);
      } catch (err) {
        console.error('Error resolving event slug:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setEventId(null);
      } finally {
        setIsLoading(false);
      }
    }

    resolveId();
  }, [identifier]);

  return {
    eventId,
    isLoading,
    error,
    isResolved: !isLoading && !error && eventId !== null,
  };
}

/**
 * Hook to resolve folder slug to UUID on client side
 */
export function useFolderIdResolver(eventId: string | null, identifier: string | null) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveId() {
      if (!eventId || !identifier) {
        setFolderId(null);
        return;
      }

      // If it's already a UUID, use it directly
      if (isUUID(identifier)) {
        setFolderId(identifier);
        return;
      }

      // It's a slug, need to resolve
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/folders/resolve-slug?eventId=${encodeURIComponent(eventId)}&slug=${encodeURIComponent(identifier)}`);
        
        if (!response.ok) {
          throw new Error('Failed to resolve folder slug');
        }

        const data = await response.json();
        
        if (!data.folderId) {
          throw new Error('Folder not found');
        }

        setFolderId(data.folderId);
      } catch (err) {
        console.error('Error resolving folder slug:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setFolderId(null);
      } finally {
        setIsLoading(false);
      }
    }

    resolveId();
  }, [eventId, identifier]);

  return {
    folderId,
    isLoading,
    error,
    isResolved: !isLoading && !error && folderId !== null,
  };
}