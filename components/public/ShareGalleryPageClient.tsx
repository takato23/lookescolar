"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VirtualizedPhotoGrid } from '@/components/ui/virtualized-photo-grid';
import { useCartStore } from '@/lib/stores/cart-store';
import { toast } from 'sonner';

type GalleryItem = {
  id: string;
  filename: string;
  preview_url: string;
  created_at: string;
  size: number | null;
  mime: string | null;
  folder_id: string;
};

export default function ShareGalleryClient({
  token,
  initial,
}: {
  token: string;
  initial: {
    token: { shareType: string; allowDownload: boolean; allowComments: boolean; expiresAt: string | null };
    eventId: string;
    items: GalleryItem[];
    pagination?: { page: number; limit: number; total: number; total_pages: number; has_more: boolean };
    eventName?: string | null;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<GalleryItem[]>(initial.items || []);
  const [page, setPage] = useState<number>(initial.pagination?.page || 1);
  const [limit] = useState<number>(initial.pagination?.limit || 60);
  const [hasMore, setHasMore] = useState<boolean>(initial.pagination?.has_more || false);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    (searchParams.get('view') as 'grid' | 'list') || 'grid'
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const { addItem, getTotalItems, clearCart } = useCartStore();

  useEffect(() => {
    setItems(initial.items || []);
    setPage(initial.pagination?.page || 1);
    setHasMore(initial.pagination?.has_more || false);
  }, [initial]);

  // Sync URL params for q/view
  useEffect(() => {
    const sp = new URLSearchParams(Array.from(searchParams.entries()));
    if (query) sp.set('q', query); else sp.delete('q');
    if (viewMode && viewMode !== 'grid') sp.set('view', viewMode); else sp.delete('view');
    router.replace(`?${sp.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, viewMode]);

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    const base = showOnlyFavorites
      ? items.filter((i) => favorites.has(i.id))
      : items;
    if (!q) return base;
    return base.filter((i) => i.filename.toLowerCase().includes(q));
  }, [items, query, showOnlyFavorites, favorites]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/public/share/${token}/gallery?page=${nextPage}&limit=${limit}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Error cargando más');
      const data = await res.json();
      if (data?.success && data.gallery) {
        setItems((prev) => [...prev, ...(data.gallery.items || [])]);
        setPage(data.gallery.pagination?.page || nextPage);
        setHasMore(data.gallery.pagination?.has_more || false);
      }
    } catch (e) {
      console.error(e);
      toast.error('No se pudo cargar más contenido');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page, limit, token]);

  // IntersectionObserver sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { root: null, rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  // Load favorites on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/share/${token}/favorites`, { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && data?.favorites) {
          setFavorites(new Set<string>(data.favorites as string[]));
        }
      } catch {}
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
          const r = await fetch(`/api/public/share/${token}/favorites?assetId=${encodeURIComponent(id)}`, {
            method: 'DELETE',
          });
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
          <h1 className="text-2xl font-bold">{initial.eventName || 'Galería'}</h1>
          <p className="text-sm text-gray-600">
            {initial.token?.shareType === 'event'
              ? 'Galería del evento'
              : initial.token?.shareType === 'folder'
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
          <Button variant={viewMode === 'grid' ? 'default' : 'outline'} onClick={() => setViewMode('grid')}>Grid</Button>
          <Button variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')}>Lista</Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Enlace copiado al portapapeles');
              } catch {
                toast.error('No se pudo copiar el enlace');
              }
            }}
          >
            Compartir
          </Button>
          <span className="ml-2 text-sm text-gray-500">Carrito: {getTotalItems()} ítems</span>
          {getTotalItems() > 0 && (
            <Button variant="outline" onClick={clearCart}>Vaciar</Button>
          )}
          <Button
            onClick={() => {
              window.location.href = `/store-unified/${token}`;
            }}
          >
            Comprar (Opción A/B)
          </Button>
        </div>
      </header>

      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Seleccionadas: {selected.size} / {filteredItems.length} {showOnlyFavorites ? '(solo favoritos)' : ''}
        </div>
        <div className="flex gap-2">
          <Button
            variant={showOnlyFavorites ? 'default' : 'outline'}
            onClick={() => setShowOnlyFavorites((v) => !v)}
          >
            {showOnlyFavorites ? 'Ver todas' : 'Ver favoritos'}
          </Button>
          <Button
            variant="outline"
            disabled={selected.size === 0}
            onClick={() => {
              const map = new Map(items.map((i) => [i.id, i] as const));
              let count = 0;
              selected.forEach((id) => {
                const it = map.get(id);
                if (it) {
                  addItem({ photoId: it.id, filename: it.filename, price: 0, watermarkUrl: it.preview_url });
                  count++;
                }
              });
              toast.success(`Añadidas ${count} foto(s) al carrito`);
            }}
          >
            Añadir seleccionadas al carrito
          </Button>
          <Button variant="outline" disabled={selected.size === 0} onClick={addSelectedToFavorites}>
            Marcar favoritas
          </Button>
          <Button variant="outline" disabled={selected.size === 0} onClick={removeSelectedFromFavorites}>
            Quitar favoritas
          </Button>
        </div>
      </div>

      <VirtualizedPhotoGrid
        items={filteredItems.map((i) => ({
          id: i.id,
          original_filename: i.filename,
          preview_url: i.preview_url,
          file_size: i.size || 0,
          created_at: i.created_at,
          approved: true,
          tagged: false,
        }))}
        hasNextPage={hasMore}
        isLoading={isLoading}
        hideActions
        onLoadMore={loadMore}
        onPhotoClick={(p) => {
          // Toggle selection on click
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
            return next;
          });
        }}
        onPhotoSelect={(photoId, _index, _shift) => {
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(photoId)) next.delete(photoId); else next.add(photoId);
            return next;
          });
        }}
        selectedPhotos={selected}
        enableSelection
        viewMode={viewMode}
        itemSize={200}
        className="min-h-[70vh]"
      />

      {hasMore && <div ref={sentinelRef} className="h-8" />}
    </div>
  );
}
