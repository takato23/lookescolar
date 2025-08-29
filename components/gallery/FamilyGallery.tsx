// Galería familiar adaptada para el sistema unificado
// Se integra con el diseño y funcionalidades de PublicGallery

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  ShoppingCartIcon,
  HeartIcon,
  CheckCircleIcon,
  ZoomInIcon,
  AlertCircleIcon,
} from 'lucide-react';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';
import { EmptyState } from '@/components/public/EmptyState';
import { PhotoModal } from '@/components/public/PhotoModal';
import {
  CartButton,
  ShoppingCart as FamilyCartDrawer,
} from '@/components/family/ShoppingCart';
import { StickyCTA } from '@/components/public/StickyCTA';
import type { GalleryContextData } from '@/lib/gallery-context';
import { debugMigration } from '@/lib/feature-flags';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
}

interface Subject {
  id: string;
  name: string;
  grade_section: string;
  event: {
    name: string;
    school_name: string;
  };
}

interface FamilyGalleryProps {
  context: GalleryContextData;
}

async function submitSelection(payload: {
  token: string;
  selectedPhotoIds: string[];
  package: string;
  contact?: { name?: string; email?: string; phone?: string };
}) {
  const res = await fetch('/api/public/selection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error enviando selección');
  return (await res.json()) as { ok: boolean; orderId: string };
}

export function FamilyGallery({ context }: FamilyGalleryProps) {
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [pkg, setPkg] = useState<string>('Combo A');
  const [sending, setSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { addItem, getTotalItems, openCart, items, clearCart, setContext } =
    useUnifiedCartStore();

  const BLUR_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

  const token = context.token!; // Ya sabemos que es contexto familiar

  useEffect(() => {
    debugMigration('FamilyGallery mounting', {
      token: token.slice(0, 8) + '...',
      eventId: context.eventId,
    });

    // Configurar contexto en el cart store unificado
    setContext(context);

    if (token) {
      const already = localStorage.getItem(`selection_submitted:${token}`);
      setSubmitted(already === '1');
      // Cargar primera página
      void loadGallery(1);
    }
  }, [token, context, setContext]);

  const loadGallery = async (targetPage: number) => {
    try {
      debugMigration('Loading family gallery', {
        targetPage,
        token: token.slice(0, 8) + '...',
      });

      const response = await fetch(
        `/api/family/gallery-simple/${token}?page=${targetPage}&limit=60`
      );

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Error cargando galería');
        setLoading(false);
        return;
      }

      const data = await response.json();
      const newPhotos = (data.photos || []) as Photo[];
      setPhotos((prev) =>
        targetPage === 1 ? newPhotos : [...prev, ...newPhotos]
      );
      setHasMore(Boolean(data.pagination?.has_more ?? newPhotos.length >= 60));
      setPage(targetPage);
      setSubject(data.subject);

      // Cargar favoritos del localStorage
      const savedFavorites = localStorage.getItem(`favorites_${token}`);
      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      }

      // Cargar selección del sessionStorage
      const savedSelection = sessionStorage.getItem(`cart_${token}`);
      if (savedSelection) {
        setSelectedPhotos(new Set(JSON.parse(savedSelection)));
      }

      debugMigration('Family gallery loaded', {
        photoCount: newPhotos.length,
        hasMore: data.pagination?.has_more,
      });
    } catch (err) {
      console.error('Error:', err);
      setError('Error cargando la galería');
      debugMigration('Error loading family gallery', err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // IntersectionObserver para infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const sentinel = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          void loadGallery(page + 1);
        }
      },
      { root: null, rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.unobserve(sentinel);
  }, [page, hasMore, isLoadingMore]);

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
    sessionStorage.setItem(
      `cart_${token}`,
      JSON.stringify(Array.from(newSelection))
    );
  };

  const toggleFavorite = (photoId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(photoId)) {
      newFavorites.delete(photoId);
    } else {
      newFavorites.add(photoId);
    }
    setFavorites(newFavorites);
    localStorage.setItem(
      `favorites_${token}`,
      JSON.stringify(Array.from(newFavorites))
    );
  };

  const handleSend = async () => {
    try {
      setSending(true);
      const ids = Array.from(selectedPhotos);
      if (ids.length === 0 || !pkg) {
        alert('Selecciona al menos una foto y un paquete');
        setSending(false);
        return;
      }
      const result = await submitSelection({
        token,
        selectedPhotoIds: ids,
        package: pkg,
      });
      if (result.ok) {
        localStorage.setItem(`selection_submitted:${token}`, '1');
        setSubmitted(true);
      }
    } catch (e) {
      console.error(e);
      alert('No se pudo enviar la selección');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              Cargando tu galería...
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Esto puede tomar unos segundos
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
          <div className="flex items-start space-x-3">
            <AlertCircleIcon className="mt-1 h-6 w-6 flex-shrink-0 text-red-500" />
            <div className="flex-1">
              <h2 className="mb-2 text-xl font-bold text-gray-900">
                No pudimos cargar tu galería
              </h2>
              <p className="mb-4 text-gray-600">{error}</p>
              <div className="space-y-2 rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">
                  Posibles soluciones:
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                  <li>Verifica que el enlace sea correcto</li>
                  <li>Asegúrate de usar el QR o código proporcionado</li>
                  <li>Contacta con el fotógrafo si el problema persiste</li>
                </ul>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const priceText = pkg
    ? pkg === 'Combo A'
      ? '$' + 1000
      : pkg === 'Combo B'
        ? '$' + 1800
        : 'sin precio online'
    : 'sin precio online';

  return (
    <div className="space-y-6">
      <div aria-live="polite" className="sr-only">
        {submitted ? '¡Listo! Recibimos tu selección.' : ''}
      </div>

      {/* Family Header */}
      <div className="rounded-2xl border border-white/20 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
        {/* Main Header Row */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🖼️ Tus Fotos</h1>
            {subject?.event && (
              <p className="mt-1 text-sm text-gray-600">
                {subject.event.name} • {subject.event.school_name}
              </p>
            )}
          </div>
          <CartButton />
        </div>

        {/* Status Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600">
                {photos.length} fotos disponibles
              </span>
            </div>
            {selectedPhotos.size > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1">
                <ShoppingCartIcon className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-600">
                  {selectedPhotos.size} seleccionadas para comprar
                </span>
              </div>
            )}
            {favorites.size > 0 && (
              <div className="flex items-center gap-2 text-red-500">
                <HeartIcon className="h-4 w-4 fill-current" />
                <span>{favorites.size} favoritas</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-500">
            💡 Tip: ❤️ para favoritos • ✅ para comprar • 🔍 para ampliar
          </div>
        </div>
      </div>

      {submitted && (
        <div className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 p-1">
          <div className="rounded-lg bg-white p-6">
            <div className="flex items-start space-x-3">
              <CheckCircleIcon className="h-8 w-8 flex-shrink-0 text-green-500" />
              <div className="flex-1">
                <h2 className="mb-1 text-xl font-bold text-gray-900">
                  ¡Selección enviada con éxito!
                </h2>
                <p className="mb-4 text-gray-600">
                  Hemos recibido tu selección de fotos. El fotógrafo se pondrá
                  en contacto contigo pronto.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Ver galería nuevamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Gallery */}
      {photos.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="group relative transform overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              {/* Image Container */}
              <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-gray-100">
                <Image
                  src={photo.preview_url}
                  alt={photo.filename}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />

                {/* Zoom button on hover */}
                <button
                  onClick={() => setZoomIndex(idx)}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors hover:bg-black/30 group-hover:opacity-100"
                  aria-label="Ver foto en tamaño completo"
                >
                  <ZoomInIcon className="h-8 w-8 text-white drop-shadow-lg" />
                </button>

                {/* Watermark Badge */}
                <div className="absolute left-3 top-3 rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white shadow-lg">
                  MUESTRA
                </div>

                {/* Selection Indicator */}
                <div className="absolute right-3 top-3 z-10">
                  <div
                    className={`flex h-6 w-6 transform cursor-pointer items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 ${
                      selectedPhotos.has(photo.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/90 text-gray-600 backdrop-blur-sm'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const wasSelected = selectedPhotos.has(photo.id);
                      togglePhotoSelection(photo.id);
                      if (!wasSelected) {
                        addItem({
                          photoId: photo.id,
                          filename: photo.filename,
                          price: 0,
                          watermarkUrl: photo.preview_url,
                        });
                      }
                    }}
                  >
                    {selectedPhotos.has(photo.id) && (
                      <CheckCircleIcon className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Photo Info */}
              <div className="rounded-b-2xl bg-white p-3">
                <div className="flex items-center justify-between">
                  {/* Photo filename */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {photo.filename}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {Math.round(photo.size / 1024)} KB
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="ml-2 flex gap-2">
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(photo.id);
                      }}
                      className={`transform rounded-full p-1.5 transition-all hover:scale-110 ${
                        favorites.has(photo.id)
                          ? 'bg-red-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                      }`}
                      aria-label={
                        favorites.has(photo.id)
                          ? 'Quitar de favoritos'
                          : 'Agregar a favoritos'
                      }
                    >
                      <HeartIcon
                        className="h-4 w-4"
                        fill={favorites.has(photo.id) ? 'currentColor' : 'none'}
                      />
                    </button>

                    {/* Cart Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const wasSelected = selectedPhotos.has(photo.id);
                        togglePhotoSelection(photo.id);
                        if (!wasSelected) {
                          addItem({
                            photoId: photo.id,
                            filename: photo.filename,
                            price: 0,
                            watermarkUrl: photo.preview_url,
                          });
                        }
                      }}
                      className={`transform rounded-full p-1.5 transition-all hover:scale-110 ${
                        selectedPhotos.has(photo.id)
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-blue-50'
                      }`}
                      aria-label={
                        selectedPhotos.has(photo.id)
                          ? 'Quitar de la selección'
                          : 'Agregar a la selección'
                      }
                    >
                      <ShoppingCartIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-lg"
            >
              <div className="aspect-square rounded-t-2xl bg-gray-200" />
              <div className="p-3">
                <div className="mb-2 h-4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex h-20 items-center justify-center"
        >
          {isLoadingMore && (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-sm">Cargando más fotos...</span>
            </div>
          )}
        </div>
      )}

      {/* Sticky CTA */}
      {!submitted && selectedPhotos.size > 0 && (
        <StickyCTA
          selectedCount={selectedPhotos.size}
          pkg={pkg}
          setPkg={setPkg}
          onContinue={handleSend}
          disabled={sending || selectedPhotos.size === 0 || !pkg}
          priceText={priceText}
        />
      )}

      {/* Cart Drawer for checkout */}
      <FamilyCartDrawer
        onCheckout={async () => {
          try {
            const response = await fetch('/api/family/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token,
                contactInfo: { name: 'Cliente', email: 'cliente@example.com' },
                items: items.map((it) => ({
                  photoId: it.photoId,
                  quantity: it.quantity,
                  priceType: 'base',
                })),
              }),
            });
            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.error || 'Error en checkout');
            }
            const data = await response.json();
            clearCart();
            window.location.href = data.redirectUrl;
          } catch (err) {
            console.error('[Service] Family checkout error:', err);
            alert('No se pudo iniciar el pago');
          }
        }}
      />

      {/* Photo Modal */}
      {zoomIndex !== null && photos[zoomIndex] && (
        <PhotoModal
          photo={{
            id: photos[zoomIndex].id,
            preview_url: photos[zoomIndex].preview_url,
            filename: photos[zoomIndex].filename,
          }}
          isOpen={true}
          onClose={() => setZoomIndex(null)}
          onPrev={() =>
            setZoomIndex((i) => (i === null || i === 0 ? i : i - 1))
          }
          onNext={() =>
            setZoomIndex((i) =>
              i === null || i === photos.length - 1 ? i : i + 1
            )
          }
          hasNext={zoomIndex < photos.length - 1}
          hasPrev={zoomIndex > 0}
          currentIndex={zoomIndex + 1}
          totalPhotos={photos.length}
          isSelected={selectedPhotos.has(photos[zoomIndex].id)}
          isFavorite={favorites.has(photos[zoomIndex].id)}
          onToggleSelection={() => togglePhotoSelection(photos[zoomIndex].id)}
          onToggleFavorite={() => toggleFavorite(photos[zoomIndex].id)}
        />
      )}
    </div>
  );
}
