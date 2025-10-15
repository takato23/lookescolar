'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  VirtualizedPhotoGrid,
  type PhotoGridItem,
} from '@/components/ui/virtualized-photo-grid';
import { useFamilyCartStore } from '@/lib/stores/unified-cart-store';
import { toast } from 'sonner';

interface GalleryAssetPayload {
  id: string;
  filename: string;
  previewUrl: string | null;
  signedUrl: string | null;
  downloadUrl: string | null;
  createdAt: string | null;
  size: number | null;
  mimeType: string | null;
  folderId: string | null;
  type: string | null;
}

interface GalleryPaginationPayload {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface ShareGalleryInitialPayload {
  token: {
    token: string;
    accessType: string;
    isLegacy: boolean;
    isActive: boolean;
    expiresAt: string | null;
    maxViews: number | null;
    viewCount: number;
  };
  event: { id: string; name: string } | null;
  share?: {
    shareType: string;
    allowDownload: boolean;
    allowComments: boolean;
    metadata: Record<string, any>;
  };
  items: GalleryAssetPayload[];
  pagination: GalleryPaginationPayload;
  rateLimit: {
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter: number;
  };
}

function toPhotoGridItem(asset: GalleryAssetPayload): PhotoGridItem {
  return {
    id: asset.id,
    original_filename: asset.filename,
    preview_url: asset.previewUrl ?? asset.signedUrl ?? '',
    file_size: asset.size ?? 0,
    created_at: asset.createdAt ?? new Date().toISOString(),
    approved: true,
    tagged: true,
  };
}

export default function ShareGalleryClient({
  token,
  initial,
}: {
  token: string;
  initial: ShareGalleryInitialPayload;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialItems = useMemo(
    () => initial.items.map(toPhotoGridItem),
    [initial.items]
  );

  const [items, setItems] = useState<PhotoGridItem[]>(initialItems);
  const [page, setPage] = useState<number>(initial.pagination?.page ?? 1);
  const [limit] = useState<number>(initial.pagination?.limit ?? 60);
  const [hasMore, setHasMore] = useState<boolean>(
    initial.pagination?.hasMore ?? false
  );
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    (searchParams.get('view') as 'grid' | 'list') || 'grid'
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const addItem = useFamilyCartStore((state) => state.addItem);
  const setContext = useFamilyCartStore((state) => state.setContext);
  const setEventId = useFamilyCartStore((state) => state.setEventId);
  const initialEventId = initial.event?.id ?? null;

  useEffect(() => {
    if (!token) return;

    if (initialEventId) {
      setContext({ context: 'family', eventId: initialEventId, token });
      setEventId(initialEventId);
    } else {
      setContext({ context: 'family', eventId: token, token });
    }
  }, [initialEventId, setContext, setEventId, token]);

  useEffect(() => {
    setItems(initial.items.map(toPhotoGridItem));
    setPage(initial.pagination?.page ?? 1);
    setHasMore(initial.pagination?.hasMore ?? false);
  }, [initial]);

  useEffect(() => {
    const sp = new URLSearchParams(Array.from(searchParams.entries()));
    if (query) {
      sp.set('q', query);
    } else {
      sp.delete('q');
    }
    if (viewMode && viewMode !== 'grid') {
      sp.set('view', viewMode);
    } else {
      sp.delete('view');
    }
    router.replace(`?${sp.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, viewMode]);

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    const base = showOnlyFavorites
      ? items.filter((item) => favorites.has(item.id))
      : items;
    if (!q) return base;
    return base.filter((item) =>
      item.original_filename.toLowerCase().includes(q)
    );
  }, [items, query, showOnlyFavorites, favorites]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(
        `/api/public/share/${token}/gallery?page=${nextPage}&limit=${limit}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('Error cargando más');
      const data = await res.json();
      if (data?.success && data.gallery) {
        const payload = data.gallery as ShareGalleryInitialPayload;
        const newItems = (payload.items || []).map(toPhotoGridItem);
        setItems((prev) => [...prev, ...newItems]);
        setPage(payload.pagination?.page ?? nextPage);
        setHasMore(payload.pagination?.hasMore ?? false);
      }
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar más contenido');
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, limit, page, token]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: '300px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/public/share/${token}/favorites`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (res.ok && data?.favorites) {
          setFavorites(new Set<string>(data.favorites as string[]));
        }
      } catch (error) {
        console.warn('No se pudo cargar favoritos', error);
      }
    })();
  }, [token]);

  const addSelectedToFavorites = useCallback(async () => {
    try {
      const ids = Array.from(selected);
      if (ids.length === 0) return;
      const results = await Promise.all(
        ids.map(async (id) => {
          const r = await fetch(`/api/public/share/${token}/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assetId: id }),
          });
          return r.ok;
        })
      );
      const ok = results.filter(Boolean).length;
      if (ok > 0) {
        setFavorites((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.add(id));
          return next;
        });
        toast.success(`Marcadas ${ok} foto(s) como favoritas`);
      }
    } catch {
      toast.error('No se pudo guardar favoritos');
    }
  }, [selected, token]);

  const removeSelectedFromFavorites = useCallback(async () => {
    try {
      const ids = Array.from(selected).filter((id) => favorites.has(id));
      if (ids.length === 0) return;
      const results = await Promise.all(
        ids.map(async (id) => {
          const r = await fetch(
            `/api/public/share/${token}/favorites?assetId=${encodeURIComponent(
              id
            )}`,
            {
              method: 'DELETE',
            }
          );
          return r.ok;
        })
      );
      const ok = results.filter(Boolean).length;
      if (ok > 0) {
        setFavorites((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        toast.success(`Quitadas ${ok} foto(s) de favoritos`);
      }
    } catch {
      toast.error('No se pudo quitar de favoritos');
    }
  }, [selected, token, favorites]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {initial.event?.name || 'Galería fotográfica'}
          </h1>
          <p className="text-sm text-gray-600">
            {initial.share?.shareType === 'event'
              ? 'Galería del evento'
              : initial.share?.shareType === 'folder'
              ? 'Álbum compartido'
              : 'Fotos seleccionadas'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar por nombre de archivo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-64"
          />
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            Lista
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Enlace copiado');
              } catch {
                toast.error('No se pudo copiar el enlace');
              }
            }}
          >
            Compartir
          </Button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setShowOnlyFavorites((prev) => !prev)}
        >
          {showOnlyFavorites ? 'Ver todas' : 'Ver favoritos'}
        </Button>
        <Button variant="outline" onClick={addSelectedToFavorites}>
          Añadir a favoritos
        </Button>
        <Button
          variant="outline"
          onClick={removeSelectedFromFavorites}
          disabled={selected.size === 0}
        >
          Quitar de favoritos
        </Button>
      </div>

      <VirtualizedPhotoGrid
        items={filteredItems}
        hasNextPage={hasMore}
        isLoading={isLoading}
        onLoadMore={loadMore}
        selectedPhotos={selected}
        enableSelection
        viewMode={viewMode}
        onPhotoSelect={(id) =>
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
              next.delete(id);
            } else {
              next.add(id);
            }
            return next;
          })
        }
        onPhotoClick={(photo) => {
          addItem({
            photoId: photo.id,
            filename: photo.original_filename,
            price: 0,
            watermarkUrl: photo.preview_url,
          });
          toast.success('Foto agregada al carrito');
        }}
      />

      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
