import { useState, useEffect, useRef, useCallback } from 'react';

interface EngagementInfo {
  is_favorite?: boolean;
}

export interface FavoriteAwarePhoto {
  id: string;
  engagement?: EngagementInfo | null;
}

export function useTemplateFavorites(
  photos: FavoriteAwarePhoto[],
  token: string
) {
  const favoritesRef = useRef<Set<string>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const canPersistFavorites = /^[a-f0-9]{64}$/i.test(token);

  useEffect(() => {
    const next = new Set(
      photos
        .filter((photo) => photo.engagement?.is_favorite)
        .map((photo) => photo.id)
    );
    favoritesRef.current = next;
    setFavoriteIds(Array.from(next));
  }, [photos]);

  const toggleFavorite = useCallback(
    async (photoId: string) => {
      const current = new Set(favoritesRef.current);
      const isFavorite = current.has(photoId);
      const optimistic = new Set(current);

      if (isFavorite) {
        optimistic.delete(photoId);
      } else {
        optimistic.add(photoId);
      }

      favoritesRef.current = optimistic;
      setFavoriteIds(Array.from(optimistic));

      try {
        if (!canPersistFavorites) {
          return;
        }
        const response = isFavorite
          ? await fetch(
              `/api/public/share/${token}/favorites?assetId=${photoId}`,
              { method: 'DELETE' }
            )
          : await fetch(`/api/public/share/${token}/favorites`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ assetId: photoId }),
            });

        if (!response.ok) {
          throw new Error('La API de favoritos devolvió un error');
        }
      } catch (error) {
        favoritesRef.current = current;
        setFavoriteIds(Array.from(current));
        throw error;
      }
    },
    [token, canPersistFavorites]
  );

  return {
    favorites: favoriteIds,
    favoritesSet: new Set(favoritesRef.current),
    isFavorite: (photoId: string) => favoritesRef.current.has(photoId),
    favoriteCount: favoriteIds.length,
    toggleFavorite,
  };
}
